export const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB
export const MAX_VIDEO_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_DURATION_SEC = 30; // 30 seconds

export interface ProcessedCoachMedia {
  dataUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
  fileName: string;
}

/**
 * Validates file size and format, returning an error string in Italian if invalid.
 */
export function validateMediaFile(file: File): string | null {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    return 'Formato non supportato. Puoi allegare solo immagini (JPG, PNG, WEBP) o video (MP4, MOV, WEBM).';
  }

  if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Foto troppo pesante (${sizeMb} MB). Il limite massimo consentito è di 12 MB.`;
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Video troppo pesante (${sizeMb} MB). Il limite massimo consentito è di 15 MB. Per consentire un'analisi rapida e ottimale, allega una clip breve della serie (5-15 secondi).`;
  }

  return null;
}

/**
 * Resizes and compresses an image in browser using an HTML5 canvas.
 * Reduces 5-10MB mobile photos to ~250KB JPEG while keeping sharpness for AI analysis.
 */
export function compressImageForCoach(file: File): Promise<ProcessedCoachMedia> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback to original dataUrl
            const originalUrl = e.target?.result as string;
            resolve({
              dataUrl: originalUrl,
              thumbnailUrl: originalUrl,
              mimeType: file.type || 'image/jpeg',
              mediaType: 'image',
              fileName: file.name,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          resolve({
            dataUrl: compressedDataUrl,
            thumbnailUrl: compressedDataUrl,
            mimeType: 'image/jpeg',
            mediaType: 'image',
            fileName: file.name,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Impossibile caricare l\'immagine.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Errore durante la lettura del file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Processes a video file: validates duration (max 30s), generates thumbnail, and prepares base64 data.
 */
export function processVideoForCoach(file: File): Promise<ProcessedCoachMedia> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const cleanUp = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      const durationSec = Math.round(video.duration || 0);

      if (durationSec > MAX_VIDEO_DURATION_SEC) {
        cleanUp();
        reject(
          new Error(
            `Il video dura ${durationSec} secondi. Il limite massimo è di ${MAX_VIDEO_DURATION_SEC} secondi. Per un'analisi tecnica ottimale, taglia o registra solo la serie di interesse (5-15 sec).`
          )
        );
        return;
      }

      // Seek to 25% or 0.5s to get a good action frame (avoid black opening frame)
      const targetTime = Math.min(Math.max(0.5, video.duration * 0.25), Math.max(0.1, video.duration - 0.1));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 480, 720);
        canvas.height = Math.round((canvas.width * (video.videoHeight || 640)) / (video.videoWidth || 480));
        const ctx = canvas.getContext('2d');

        let thumbnailUrl = '';
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.82);
        }

        const durationSec = Math.round(video.duration || 0);

        // Read file as base64 dataUrl for Gemini inlineData
        const reader = new FileReader();
        reader.onload = () => {
          cleanUp();
          resolve({
            dataUrl: reader.result as string,
            thumbnailUrl: thumbnailUrl || (reader.result as string),
            mimeType: file.type || 'video/mp4',
            mediaType: 'video',
            durationSec,
            fileName: file.name,
          });
        };
        reader.onerror = () => {
          cleanUp();
          reject(new Error('Errore nella lettura del video.'));
        };
        reader.readAsDataURL(file);
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanUp();
      reject(new Error('Impossibile elaborare il file video selezionato.'));
    };
  });
}
