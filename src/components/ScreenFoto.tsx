import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PhotoEntry, MediaType } from '../types';
import { Icon } from './Icons';
import { generateVideoThumbnailAndDuration, formatDuration } from '../utils/mediaStorage';

interface ScreenFotoProps {
  photos: PhotoEntry[];
  onAddPhoto: (photo: Omit<PhotoEntry, 'id'>) => void;
  onDeletePhoto: (id: string) => void;
  onModalOpenChange?: (open: boolean) => void;
}

type ViewMode = 'grid' | 'timeline';
type TagFilter = 'tutti' | PhotoEntry['tag'];
type MediaFilter = 'tutti' | 'photo' | 'video';

const TAG_LABELS: Record<PhotoEntry['tag'], string> = {
  fronte: 'Fronte',
  schiena: 'Schiena',
  fianco: 'Fianco',
  libero: 'Libero',
};

const TAG_COLORS: Record<PhotoEntry['tag'], string> = {
  fronte: 'bg-[#84cc16]/20 text-[#386a00]',
  schiena: 'bg-blue-100 text-blue-700',
  fianco: 'bg-purple-100 text-purple-700',
  libero: 'bg-orange-100 text-orange-700',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

/* ─── Add Media Modal (Foto & Video) ─────────────────────────────── */
interface AddMediaModalProps {
  onClose: () => void;
  onSave: (p: Omit<PhotoEntry, 'id'>) => void;
}

const AddMediaModal: React.FC<AddMediaModalProps> = ({ onClose, onSave }) => {
  const [mediaType, setMediaType] = useState<MediaType>('photo');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(undefined);
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tag, setTag] = useState<PhotoEntry['tag']>('fronte');
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const isVid = file.type.startsWith('video');
    const detectedType: MediaType = isVid ? 'video' : 'photo';
    setMediaType(detectedType);

    if (isVid) {
      try {
        const { thumbnailUrl: thumb, durationSec: dur } = await generateVideoThumbnailAndDuration(file);
        setThumbnailUrl(thumb);
        setDurationSec(dur);
      } catch (err) {
        console.warn('Thumbnail generation failed', err);
      }
    } else {
      setThumbnailUrl(undefined);
      setDurationSec(undefined);
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setDataUrl(ev.target?.result as string);
      setIsProcessing(false);
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);

    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!dataUrl) return;
    onSave({
      dataUrl,
      mediaType,
      thumbnailUrl,
      durationSec,
      date: new Date().toISOString(),
      weightKg: weightKg ? Number(weightKg) : undefined,
      note: note.trim() || undefined,
      tag,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-[#17211D]/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8e4] z-10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#eceeed] flex items-center justify-between bg-[#f8faf9] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-[#416900]">
              <Icon name={mediaType === 'video' ? 'videocam' : 'photo_camera'} className="w-4 h-4" />
            </div>
            <h2 className="text-[18px] font-bold text-[#191c1c]">
              {mediaType === 'video' ? 'Aggiungi Video' : 'Aggiungi Foto'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="w-8 h-8 rounded-full bg-[#f2f4f3] flex items-center justify-center text-[#56615c] hover:bg-[#eceeed] transition-colors cursor-pointer"
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Media Type Switcher */}
          <div className="flex bg-[#e6e9e8] p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMediaType('photo');
                setDataUrl(null);
                setThumbnailUrl(undefined);
                setDurationSec(undefined);
              }}
              className={`flex-1 py-1.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mediaType === 'photo'
                  ? 'bg-white text-[#191c1c] shadow-xs'
                  : 'text-[#56615c] hover:text-[#191c1c]'
              }`}
            >
              <Icon name="photo_camera" className="w-4 h-4 text-[#386a00]" />
              <span>Foto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaType('video');
                setDataUrl(null);
                setThumbnailUrl(undefined);
                setDurationSec(undefined);
              }}
              className={`flex-1 py-1.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mediaType === 'video'
                  ? 'bg-white text-[#191c1c] shadow-xs'
                  : 'text-[#56615c] hover:text-[#191c1c]'
              }`}
            >
              <Icon name="videocam" className="w-4 h-4 text-[#0284c7]" />
              <span>Video</span>
            </button>
          </div>

          {/* Hidden inputs: Camera (scatto istantaneo) e Galleria (libreria media) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept={mediaType === 'video' ? 'video/*' : 'image/*'}
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept={mediaType === 'video' ? 'video/*' : 'image/*'}
            className="hidden"
            onChange={handleFile}
          />

          <div className="relative w-full p-4 rounded-2xl border-2 border-dashed border-[#d7e2dc] bg-[#f2f4f3] flex flex-col items-center justify-center gap-3 overflow-hidden shrink-0">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="w-8 h-8 border-3 border-[#84cc16] border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] text-[#56615c] font-medium">Elaborazione media...</span>
              </div>
            ) : dataUrl ? (
              mediaType === 'video' ? (
                <div className="relative w-full h-52">
                  <video
                    src={dataUrl}
                    playsInline
                    muted
                    autoPlay
                    loop
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold backdrop-blur-xs">
                    <Icon name="videocam" className="w-3.5 h-3.5 text-[#84cc16]" />
                    <span>{formatDuration(durationSec)}</span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-full bg-white/95 hover:bg-white text-[#191c1c] text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Registra di nuovo"
                    >
                      <Icon name="videocam" className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Registra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-full bg-white/95 hover:bg-white text-[#191c1c] text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Scegli dalla galleria"
                    >
                      <Icon name="image" className="w-3.5 h-3.5 text-[#386a00]" />
                      <span>Galleria</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-52">
                  <img src={dataUrl} alt="Anteprima" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-full bg-white/95 hover:bg-white text-[#191c1c] text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Scatta di nuovo"
                    >
                      <Icon name="photo_camera" className="w-3.5 h-3.5 text-[#386a00]" />
                      <span>Scatta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-full bg-white/95 hover:bg-white text-[#191c1c] text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Scegli dalla galleria"
                    >
                      <Icon name="image" className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Galleria</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full flex flex-col items-center py-2">
                <div className="w-12 h-12 rounded-full bg-[#84cc16]/15 flex items-center justify-center mb-2">
                  <Icon
                    name={mediaType === 'video' ? 'videocam' : 'photo_camera'}
                    className="w-6 h-6 text-[#386a00]"
                  />
                </div>
                <span className="text-[14px] font-bold text-[#191c1c] mb-0.5">
                  {mediaType === 'video' ? 'Aggiungi Video' : 'Aggiungi Foto'}
                </span>
                <span className="text-[11px] text-[#56615c] mb-3 text-center">
                  {mediaType === 'video'
                    ? 'Registra subito con la fotocamera o carica un video dalla galleria'
                    : 'Scatta subito con la fotocamera o carica una foto dalla galleria'}
                </span>

                <div className="w-full grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-white border border-[#d7e2dc] hover:border-[#84cc16] text-[#191c1c] hover:text-[#386a00] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Icon
                      name={mediaType === 'video' ? 'videocam' : 'photo_camera'}
                      className="w-4 h-4 text-[#386a00]"
                    />
                    <span>{mediaType === 'video' ? 'Registra ora' : 'Scatta foto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-white border border-[#d7e2dc] hover:border-[#0284c7] text-[#191c1c] hover:text-[#0284c7] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <Icon name="image" className="w-4 h-4 text-[#0284c7]" />
                    <span>Dalla Galleria</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#56615c] uppercase tracking-wider mb-2 block">
              Posizione / Posa
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(TAG_LABELS) as PhotoEntry['tag'][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                    tag === t
                      ? 'bg-[#84cc16] text-[#102000] shadow-sm font-bold'
                      : 'bg-[#f2f4f3] text-[#56615c] hover:bg-[#eceeed]'
                  }`}
                >
                  {TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#56615c] uppercase tracking-wider mb-1 block">
              Peso corporeo attuale (opzionale)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="es. 78.5"
                className="w-full px-4 py-3 pr-10 rounded-xl bg-[#f2f4f3] border border-transparent focus:border-[#84cc16] focus:bg-white text-[#191c1c] text-[14px] outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#56615c] font-medium">kg</span>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#56615c] uppercase tracking-wider mb-1 block">
              Note (opzionale)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Come ti senti? Noti miglioramenti su spalle o dorso..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-[#f2f4f3] border border-transparent focus:border-[#84cc16] focus:bg-white text-[#191c1c] text-[14px] outline-none resize-none transition-all"
            />
          </div>
        </div>

        {/* Pinned Action Footer */}
        <div className="p-4 border-t border-[#eceeed] bg-[#f8faf9] shrink-0 pb-safe">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dataUrl || isProcessing}
            className="w-full py-4 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[16px] font-bold shadow-lg shadow-[#84cc16]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Icon name="check" className="w-5 h-5" />
            <span>{mediaType === 'video' ? 'Salva Video' : 'Salva Foto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Fullscreen Viewer (Foto & Video Player) ───────────────────────────── */
interface FullscreenViewerProps {
  photo: PhotoEntry;
  onClose: () => void;
  onDelete: () => void;
}

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ photo, onClose, onDelete }) => {
  const isVideo = photo.mediaType === 'video';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 shrink-0 z-10">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors"
        >
          <Icon name="close" className="w-5 h-5 text-white" />
        </button>
        <div className="text-center">
          <div className="text-[13px] font-semibold text-white">{formatDate(photo.date)}</div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TAG_COLORS[photo.tag]}`}>
              {TAG_LABELS[photo.tag]}
            </span>
            {isVideo && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0284c7]/30 text-[#38bdf8] flex items-center gap-1">
                <Icon name="videocam" className="w-3 h-3" />
                <span>Video {formatDuration(photo.durationSec)}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center cursor-pointer hover:bg-red-500/30 text-white hover:text-red-300 transition-colors"
        >
          <Icon name="delete" className="w-5 h-5" />
        </button>
      </div>

      {/* Main media viewport */}
      <div className="flex-1 flex items-center justify-center px-2 relative min-h-0">
        {isVideo ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={photo.dataUrl}
              poster={photo.thumbnailUrl}
              controls
              playsInline
              autoPlay
              loop
              className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <img
            src={photo.dataUrl}
            alt="Foto progresso"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        )}
      </div>

      {/* Footer details */}
      <div className="px-5 pb-10 pt-4 shrink-0 z-10">
        {photo.weightKg && (
          <div className="flex items-center gap-2 mb-2">
            <Icon name="scale" className="w-4 h-4 text-[#84cc16]" />
            <span className="text-white font-semibold text-[14px]">{photo.weightKg} kg</span>
          </div>
        )}
        {photo.note && <p className="text-white/70 text-[13px] leading-relaxed">{photo.note}</p>}
      </div>
    </div>
  );
};

/* ─── Drag Reveal Slider (Foto) ─────────────────────────── */
interface SliderProps {
  left: PhotoEntry;
  right: PhotoEntry;
}

const DragRevealSlider: React.FC<SliderProps> = ({ left, right }) => {
  const [pct, setPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePct = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const raw = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.max(2, Math.min(98, raw)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updatePct(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) updatePct(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-2xl select-none touch-none">
      {/* Right (After) image — full width behind */}
      <img
        src={right.thumbnailUrl || right.dataUrl}
        alt="Dopo"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Left (Before) image — clipped */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <img
          src={left.thumbnailUrl || left.dataUrl}
          alt="Prima"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (pct / 100)}%`, maxWidth: 'none' }}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center gap-0.5 cursor-ew-resize"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <svg viewBox="0 0 20 20" className="w-5 h-5 text-[#191c1c]" fill="currentColor">
            <path
              d="M7 4l-4 6 4 6M13 4l4 6-4 6"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/50 text-white text-[11px] font-bold backdrop-blur-sm">
        PRIMA
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/50 text-white text-[11px] font-bold backdrop-blur-sm">
        DOPO
      </div>
    </div>
  );
};

/* ─── Media Picker Row ───────────────────────────── */
interface PhotoPickerProps {
  photos: PhotoEntry[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}

const PhotoPickerRow: React.FC<PhotoPickerProps> = ({ photos, selected, onSelect, label }) => (
  <div>
    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">{label}</div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {[...photos].reverse().map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={`shrink-0 flex flex-col items-center gap-1 cursor-pointer transition-all ${
            selected === p.id ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div
            className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
              selected === p.id
                ? 'border-[#84cc16] shadow-lg shadow-[#84cc16]/40'
                : 'border-transparent'
            }`}
          >
            <img src={p.thumbnailUrl || p.dataUrl} alt="thumb" className="w-full h-full object-cover" />
            {p.mediaType === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Icon name="play_arrow" className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <span className="text-[9px] text-white/60 font-medium">{formatDateShort(p.date)}</span>
        </button>
      ))}
    </div>
  </div>
);

/* ─── Compare Modal (Foto & Video Side-by-Side Sync) ──────────────────────────────── */
interface CompareModalProps {
  photos: PhotoEntry[];
  onClose: () => void;
}

const CompareModal: React.FC<CompareModalProps> = ({ photos, onClose }) => {
  const [leftId, setLeftId] = useState(photos[photos.length - 1]?.id ?? '');
  const [rightId, setRightId] = useState(photos[0]?.id ?? '');
  const [mode, setMode] = useState<'slider' | 'sidebyside'>('slider');

  const left = photos.find((p) => p.id === leftId);
  const right = photos.find((p) => p.id === rightId);

  const hasAnyVideo = left?.mediaType === 'video' || right?.mediaType === 'video';

  // Video sync controls
  const leftVidRef = useRef<HTMLVideoElement>(null);
  const rightVidRef = useRef<HTMLVideoElement>(null);
  const [isSyncPlaying, setIsSyncPlaying] = useState(false);

  const toggleSyncPlayback = () => {
    if (isSyncPlaying) {
      leftVidRef.current?.pause();
      rightVidRef.current?.pause();
      setIsSyncPlaying(false);
    } else {
      if (leftVidRef.current) {
        leftVidRef.current.currentTime = 0;
        leftVidRef.current.play();
      }
      if (rightVidRef.current) {
        rightVidRef.current.currentTime = 0;
        rightVidRef.current.play();
      }
      setIsSyncPlaying(true);
    }
  };

  const weightDelta =
    left?.weightKg && right?.weightKg ? right.weightKg - left.weightKg : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#111816] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 shrink-0">
        <div>
          <h2 className="text-white text-[17px] font-bold">Confronta Progressi</h2>
          {weightDelta !== null && (
            <span
              className={`text-[12px] font-semibold ${
                weightDelta > 0 ? 'text-[#84cc16]' : 'text-red-400'
              }`}
            >
              {weightDelta > 0 ? '+' : ''}
              {weightDelta.toFixed(1)} kg nel periodo
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
        >
          <Icon name="close" className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Mode toggle / Video Sync CTA */}
      <div className="flex items-center gap-2 px-5 mb-3 shrink-0">
        {!hasAnyVideo && (
          <div className="flex flex-1 gap-2">
            <button
              type="button"
              onClick={() => setMode('slider')}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'slider' ? 'bg-[#84cc16] text-[#102000]' : 'bg-white/10 text-white/60'
              }`}
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="10" y1="2" x2="10" y2="18" />
                <polyline points="6 6 2 10 6 14" />
                <polyline points="14 6 18 10 14 14" />
              </svg>
              Slider
            </button>
            <button
              type="button"
              onClick={() => setMode('sidebyside')}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'sidebyside' ? 'bg-[#84cc16] text-[#102000]' : 'bg-white/10 text-white/60'
              }`}
            >
              <Icon name="compare" className="w-4 h-4" />
              Fianco a fianco
            </button>
          </div>
        )}

        {hasAnyVideo && (
          <div className="flex-1 flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10">
            <span className="text-[12px] text-white/70 font-medium">
              Confronto video fianco a fianco
            </span>
            <button
              type="button"
              onClick={toggleSyncPlayback}
              className="py-1.5 px-3 rounded-lg bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Icon name={isSyncPlaying ? 'pause' : 'play_arrow'} className="w-4 h-4" />
              <span>{isSyncPlaying ? 'Pausa' : 'Play Sincronizzato'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main comparison area */}
      <div className="flex-1 px-3 min-h-0">
        {!hasAnyVideo && mode === 'slider' ? (
          left && right ? (
            <DragRevealSlider left={left} right={right} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="image" className="w-12 h-12 text-white/20" />
            </div>
          )
        ) : (
          <div className="flex h-full gap-2">
            {[
              { photo: left, label: 'PRIMA', ref: leftVidRef },
              { photo: right, label: 'DOPO', ref: rightVidRef },
            ].map(({ photo, label, ref }) => (
              <div key={label} className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-[10px] font-bold text-white/40 text-center uppercase tracking-wider">
                  {label}
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center relative">
                  {photo ? (
                    photo.mediaType === 'video' ? (
                      <video
                        ref={ref}
                        src={photo.dataUrl}
                        poster={photo.thumbnailUrl}
                        playsInline
                        muted
                        loop
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={photo.dataUrl}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <Icon name="image" className="w-8 h-8 text-white/20" />
                  )}
                </div>
                {photo && (
                  <div className="text-center pt-0.5">
                    <div className="text-[10px] text-white/50">{formatDateShort(photo.date)}</div>
                    {photo.weightKg && (
                      <div className="text-[11px] text-[#84cc16] font-bold">
                        {photo.weightKg} kg
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo & Video pickers */}
      <div className="px-4 pt-3 pb-8 pb-safe flex flex-col gap-2.5 shrink-0 border-t border-white/10 mt-2">
        <PhotoPickerRow photos={photos} selected={leftId} onSelect={setLeftId} label="Prima (scorri per scegliere)" />
        <PhotoPickerRow photos={photos} selected={rightId} onSelect={setRightId} label="Dopo (scorri per scegliere)" />
      </div>
    </div>
  );
};

/* ─── Main Screen (Foto & Video Progressi) ─────────────────────────────────── */
export const ScreenFoto: React.FC<ScreenFotoProps> = ({
  photos,
  onAddPhoto,
  onDeletePhoto,
  onModalOpenChange,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewedPhoto, setViewedPhoto] = useState<PhotoEntry | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [tagFilter, setTagFilter] = useState<TagFilter>('tutti');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('tutti');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const isAnyOpen = showAddModal || Boolean(viewedPhoto) || showCompare;
    onModalOpenChange?.(isAnyOpen);
  }, [showAddModal, viewedPhoto, showCompare, onModalOpenChange]);

  const filteredPhotos = photos.filter((p) => {
    const matchesTag = tagFilter === 'tutti' || p.tag === tagFilter;
    const isVid = p.mediaType === 'video';
    const matchesMedia = mediaFilter === 'tutti' || (mediaFilter === 'video' ? isVid : !isVid);
    return matchesTag && matchesMedia;
  });

  const groupedByMonth: Record<string, PhotoEntry[]> = {};
  [...filteredPhotos].reverse().forEach((p) => {
    const key = new Date(p.date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(p);
  });

  const photoCount = photos.filter((p) => p.mediaType !== 'video').length;
  const videoCount = photos.filter((p) => p.mediaType === 'video').length;

  return (
    <>
      <div className="w-full min-h-screen bg-[#f8faf9] pb-36">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-[22px] font-extrabold text-[#191c1c] tracking-tight">
                Progressi Fisici
              </h1>
              <p className="text-[13px] text-[#56615c] mt-0.5">
                {photos.length === 0
                  ? 'Nessun media salvato'
                  : `${photos.length} totali (${photoCount} foto, ${videoCount} video)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
                className="w-9 h-9 rounded-full bg-white border border-[#e2e8e4] shadow-sm flex items-center justify-center text-[#56615c] cursor-pointer hover:bg-[#f2f4f3] transition-colors"
                title={viewMode === 'grid' ? 'Vista Cronologia' : 'Vista Griglia'}
              >
                <Icon name={viewMode === 'grid' ? 'format_list_bulleted' : 'image'} className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Type Filter Chips (Tutti / Foto / Video) */}
        {photos.length > 0 && (
          <div className="flex gap-2 px-5 pb-2.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'tutti', label: `Tutti (${photos.length})` },
              { id: 'photo', label: `📷 Foto (${photoCount})` },
              { id: 'video', label: `🎥 Video (${videoCount})` },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMediaFilter(m.id as MediaFilter)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                  mediaFilter === m.id
                    ? 'bg-[#191c1c] text-white shadow-xs'
                    : 'bg-white border border-[#e2e8e4] text-[#56615c] hover:text-[#191c1c]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Compare Banner — prominent CTA when >=2 media */}
        {photos.length >= 2 && (
          <div className="px-5 mb-3">
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              id="compare-photos-btn"
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#17211D] text-white cursor-pointer active:scale-[0.98] transition-all shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-[#84cc16]/20 flex items-center justify-center shrink-0">
                <Icon name="compare" className="w-5 h-5 text-[#84cc16]" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[14px] font-bold">Confronta Prima &amp; Dopo</div>
                <div className="text-[12px] text-white/50">Slider per foto + riproduzione sincronizzata per video</div>
              </div>
              <Icon name="chevron_right" className="w-5 h-5 text-white/40 shrink-0" />
            </button>
          </div>
        )}

        {/* Pose Tag Filter Chips */}
        {photos.length > 0 && (
          <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
            {(['tutti', 'fronte', 'schiena', 'fianco', 'libero'] as TagFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                  tagFilter === t
                    ? 'bg-[#84cc16] text-[#102000] shadow-sm font-bold'
                    : 'bg-white border border-[#e2e8e4] text-[#56615c]'
                }`}
              >
                {t === 'tutti' ? 'Tutte le pose' : TAG_LABELS[t as PhotoEntry['tag']]}
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="flex flex-col items-center justify-center px-8 pt-14 text-center">
            <div className="w-24 h-24 rounded-3xl bg-[#84cc16]/10 flex items-center justify-center mb-5">
              <Icon name="videocam" className="w-12 h-12 text-[#386a00]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#191c1c] mb-2">Nessun progresso registrato</h2>
            <p className="text-[14px] text-[#56615c] leading-relaxed max-w-xs mb-8">
              Documenta la tua trasformazione fisica con foto e brevi video di posing o esecuzione esercizi.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#84cc16] text-[#102000] text-[15px] font-bold shadow-lg shadow-[#84cc16]/30 cursor-pointer active:scale-[0.98] transition-all"
            >
              <Icon name="photo_camera" className="w-5 h-5" />
              <span>Aggiungi Foto o Video</span>
            </button>
          </div>
        )}

        {/* Grid View */}
        {filteredPhotos.length > 0 && viewMode === 'grid' && (
          <div className="px-5">
            <div className="grid grid-cols-2 gap-3">
              {[...filteredPhotos].reverse().map((photo) => {
                const isVid = photo.mediaType === 'video';
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setViewedPhoto(photo)}
                    className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#eceeed] cursor-pointer group shadow-sm text-left"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.dataUrl}
                      alt={isVid ? 'Video progresso' : `Foto ${TAG_LABELS[photo.tag]}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                    {/* Video Duration Badge */}
                    {isVid && (
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        <Icon name="videocam" className="w-3 h-3 text-[#84cc16]" />
                        <span>{formatDuration(photo.durationSec)}</span>
                      </div>
                    )}

                    {/* Video Center Play Overlay */}
                    {isVid && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-xs text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-[#84cc16] group-hover:text-[#102000] transition-all shadow-md">
                          <Icon name="play_arrow" className="w-5 h-5 ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <div className="flex items-end justify-between">
                        <div>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
                              TAG_COLORS[photo.tag]
                            }`}
                          >
                            {TAG_LABELS[photo.tag]}
                          </span>
                          <div className="text-white text-[11px] font-medium">{formatDateShort(photo.date)}</div>
                        </div>
                        {photo.weightKg && (
                          <div className="text-white/90 text-[11px] font-semibold">{photo.weightKg}kg</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {filteredPhotos.length > 0 && viewMode === 'timeline' && (
          <div className="px-5 flex flex-col gap-5">
            {Object.entries(groupedByMonth).map(([month, monthPhotos]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[12px] font-bold text-[#56615c] uppercase tracking-wider">{month}</div>
                  <div className="flex-1 h-px bg-[#e2e8e4]" />
                  <span className="text-[11px] text-[#56615c]">{monthPhotos.length} media</span>
                </div>
                <div className="flex flex-col gap-3">
                  {monthPhotos.map((photo) => {
                    const isVid = photo.mediaType === 'video';
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setViewedPhoto(photo)}
                        className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-[#e2e8e4] cursor-pointer hover:bg-[#f8faf9] transition-colors text-left"
                      >
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#eceeed] shrink-0">
                          <img
                            src={photo.thumbnailUrl || photo.dataUrl}
                            alt="Media"
                            className="w-full h-full object-cover"
                          />
                          {isVid && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                              <Icon name="play_arrow" className="w-5 h-5 ml-0.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                TAG_COLORS[photo.tag]
                              }`}
                            >
                              {TAG_LABELS[photo.tag]}
                            </span>
                            {isVid && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0284c7]/20 text-[#0284c7]">
                                <Icon name="videocam" className="w-3 h-3" />
                                {formatDuration(photo.durationSec)}
                              </span>
                            )}
                            {photo.weightKg && (
                              <span className="text-[11px] text-[#56615c] font-semibold">
                                {photo.weightKg} kg
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] font-semibold text-[#191c1c]">
                            {formatDate(photo.date)}
                          </div>
                          {photo.note && (
                            <p className="text-[12px] text-[#56615c] truncate mt-0.5">{photo.note}</p>
                          )}
                        </div>
                        <Icon name="chevron_right" className="w-4 h-4 text-[#b0b8b4] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && filteredPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center px-8 pt-12 text-center">
            <Icon name="movie" className="w-12 h-12 text-[#b0b8b4] mb-3" />
            <p className="text-[14px] text-[#56615c]">Nessun media per i filtri selezionati</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {!showAddModal && !viewedPhoto && !showCompare && (
        <button
          type="button"
          id="add-photo-fab"
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-[#84cc16] shadow-xl shadow-[#84cc16]/40 flex items-center justify-center text-[#102000] cursor-pointer active:scale-95 transition-all z-20 hover:bg-[#91db2a]"
          title="Aggiungi Foto o Video"
        >
          <Icon name="photo_camera" className="w-6 h-6" />
        </button>
      )}

      {showAddModal && (
        <AddMediaModal
          onClose={() => setShowAddModal(false)}
          onSave={(p) => {
            onAddPhoto(p);
            setShowAddModal(false);
          }}
        />
      )}

      {viewedPhoto && (
        <FullscreenViewer
          photo={viewedPhoto}
          onClose={() => setViewedPhoto(null)}
          onDelete={() => {
            onDeletePhoto(viewedPhoto.id);
            setViewedPhoto(null);
          }}
        />
      )}

      {showCompare && photos.length >= 2 && (
        <CompareModal photos={photos} onClose={() => setShowCompare(false)} />
      )}
    </>
  );
};
