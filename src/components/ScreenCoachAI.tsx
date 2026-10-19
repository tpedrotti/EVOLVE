import React, { useState, useRef, useEffect } from 'react';
import type { CoachMessage, UserProfile, CoachMealEstimate } from '../types';
import { Icon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { cleanCoachText } from '../services/geminiCoach';
import {
  type ProcessedCoachMedia,
  validateMediaFile,
  compressImageForCoach,
  processVideoForCoach,
} from '../utils/coachMediaUtils';

interface ScreenCoachAIProps {
  profile: UserProfile;
  messages: CoachMessage[];
  onSendMessage: (text: string, media?: ProcessedCoachMedia) => void;
  onBack?: () => void;
  onClearHistory?: () => void;
  onAddMealFromCoach?: (meal: CoachMealEstimate) => void;
  isLoading?: boolean;
}

export const ScreenCoachAI: React.FC<ScreenCoachAIProps> = ({
  profile,
  messages,
  onSendMessage,
  onBack,
  onClearHistory,
  onAddMealFromCoach,
  isLoading = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ProcessedCoachMedia | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [registeredMealIds, setRegisteredMealIds] = useState<Record<string, boolean>>({});
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Stima calorie e macro del mio piatto',
    'Cosa alleno oggi?',
    'Come massimizzare il recupero?',
    'Cosa mangiare subito dopo il workout?',
    'Consigli per riscaldamento',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, selectedMedia]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);

    const validationError = validateMediaFile(file);
    if (validationError) {
      setMediaError(validationError);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      return;
    }

    setIsProcessingMedia(true);
    try {
      if (file.type.startsWith('video/')) {
        const processed = await processVideoForCoach(file);
        setSelectedMedia(processed);
      } else {
        const processed = await compressImageForCoach(file);
        setSelectedMedia(processed);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'elaborazione del file.';
      setMediaError(msg);
    } finally {
      setIsProcessingMedia(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleSend = (text: string) => {
    if ((!text.trim() && !selectedMedia) || isLoading || isProcessingMedia) return;
    onSendMessage(text.trim(), selectedMedia || undefined);
    setInputText('');
    setSelectedMedia(null);
    setMediaError(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8faf9] flex flex-col items-center">
      {/* Fixed Sticky Header */}
      <header className="sticky top-0 inset-x-0 z-40 bg-[#f8faf9]/90 backdrop-blur-xl border-b border-[#e2e8e4]/80 w-full flex justify-center">
        <div className="w-full max-w-md h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Torna indietro"
                className="w-10 h-10 rounded-full hover:bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon name="arrow_back_ios_new" className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#84cc16]/20 flex items-center justify-center text-[#416900] shadow-2xs shrink-0">
                <Icon name="neurology" className="w-6 h-6 text-[#416900]" />
              </div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[17px] font-bold text-[#191c1c] tracking-tight">
                  EVOLVE Coach AI
                </h1>
                <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse"></span>
              </div>
            </div>
          </div>

          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Azzera cronologia conversazione"
              aria-label="Azzera cronologia"
              className="w-10 h-10 rounded-full hover:bg-red-50 text-[#56615c] hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Icon name="restart_alt" className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="w-full max-w-md px-4 pt-4 pb-36 space-y-4 flex-1 flex flex-col">
        {/* Quick Prompts Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#f2f4f3] text-[12px] font-medium text-[#191c1c] border border-[#e2e8e4] whitespace-nowrap shadow-2xs transition-colors cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
            >
              💬 {q}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="space-y-3 pt-1 flex-1">
          {messages.map((m) => {
            const isAI = m.sender === 'ai';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
              >
                {/* AI Avatar */}
                {isAI && (
                  <div className="w-8 h-8 rounded-xl bg-[#84cc16]/20 flex items-center justify-center text-[#416900] shrink-0 mt-1 shadow-2xs">
                    <Icon name="neurology" className="w-4 h-4 text-[#416900]" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-[14px] leading-relaxed shadow-xs ${
                    isAI
                      ? 'bg-white text-[#191c1c] rounded-tl-sm border border-[#e2e8e4]'
                      : 'bg-[#416900] text-white rounded-tr-sm shadow-sm'
                  }`}
                >
                  {isAI && (
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#416900] uppercase tracking-wider">
                        <Icon name="verified" className="w-3.5 h-3.5 text-[#416900]" />
                        <span>Coach Biometrico</span>
                      </div>
                      {m.dateContext && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#56615c] font-medium pt-0.5">
                          <span className="flex items-center gap-1 bg-[#84cc16]/15 text-[#386a00] px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            <Icon name="calendar_today" className="w-3 h-3 text-[#386a00]" />
                            {m.dateContext}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Attached Media in Message */}
                  {m.mediaUrl && (
                    <div className="mb-2 mt-1 rounded-xl overflow-hidden border border-black/10 bg-black/5">
                      {m.mediaType === 'video' ? (
                        <div className="relative group">
                          <img
                            src={m.mediaUrl}
                            alt="Video allegato"
                            className="w-full max-h-56 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/90 text-[#102000] flex items-center justify-center shadow-md">
                              <Icon name="play_arrow" className="w-6 h-6" />
                            </div>
                          </div>
                          {m.mediaDurationSec ? (
                            <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/70 text-white px-2 py-0.5 rounded-md">
                              {m.mediaDurationSec}s
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <img
                          src={m.mediaUrl}
                          alt="Foto allegata"
                          className="w-full max-h-56 object-cover"
                        />
                      )}
                    </div>
                  )}

                  {m.text ? <p className="whitespace-pre-wrap">{cleanCoachText(m.text)}</p> : null}

                  {/* Interactive Meal Estimation Card */}
                  {isAI && m.mealEstimate && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#f2f4f3] dark:bg-[#1a2420] border border-[#e2e8e4] dark:border-[#2a3832] text-[#191c1c] dark:text-[#f8faf9] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-[#84cc16]/20 flex items-center justify-center text-[#416900] dark:text-[#84cc16]">
                            <Icon name="restaurant" className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[13px] font-bold tracking-tight">
                            {m.mealEstimate.name}
                          </span>
                        </div>
                        <span className="text-[12px] font-black text-[#386a00] dark:text-[#84cc16] bg-[#84cc16]/20 px-2.5 py-0.5 rounded-full">
                          ~{m.mealEstimate.calories} kcal
                        </span>
                      </div>

                      {/* Macros row */}
                      <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-white/70 dark:bg-black/20 rounded-lg border border-[#e2e8e4]/60 dark:border-[#2a3832]/60 text-[11px]">
                        <div className="p-1">
                          <span className="text-[#56615c] dark:text-[#94a3b8] block text-[10px]">Proteine</span>
                          <span className="font-bold text-[#191c1c] dark:text-white">{m.mealEstimate.proteinG}g</span>
                        </div>
                        <div className="p-1 border-x border-[#e2e8e4]/60 dark:border-[#2a3832]/60">
                          <span className="text-[#56615c] dark:text-[#94a3b8] block text-[10px]">Carbo</span>
                          <span className="font-bold text-[#191c1c] dark:text-white">{m.mealEstimate.carbsG}g</span>
                        </div>
                        <div className="p-1">
                          <span className="text-[#56615c] dark:text-[#94a3b8] block text-[10px]">Grassi</span>
                          <span className="font-bold text-[#191c1c] dark:text-white">{m.mealEstimate.fatsG}g</span>
                        </div>
                      </div>

                      {/* Secondary: Zuccheri & Fibre */}
                      {(typeof m.mealEstimate.sugarsG === 'number' || typeof m.mealEstimate.fiberG === 'number') && (
                        <div className="grid grid-cols-2 gap-1.5 py-1 text-center bg-white/70 dark:bg-black/20 rounded-lg border border-[#e2e8e4]/60 dark:border-[#2a3832]/60 text-[11px]">
                          <div className="p-1 border-r border-[#e2e8e4]/60 dark:border-[#2a3832]/60">
                            <span className="text-[#56615c] dark:text-[#94a3b8] block text-[10px]">Zuccheri</span>
                            <span className="font-bold text-[#7e22ce] dark:text-[#c084fc]">{m.mealEstimate.sugarsG ?? 0}g</span>
                          </div>
                          <div className="p-1">
                            <span className="text-[#56615c] dark:text-[#94a3b8] block text-[10px]">Fibre</span>
                            <span className="font-bold text-[#059669] dark:text-[#34d399]">{m.mealEstimate.fiberG ?? 0}g</span>
                          </div>
                        </div>
                      )}

                      {/* Action Button: Register Meal */}
                      {onAddMealFromCoach && (
                        <button
                          type="button"
                          disabled={registeredMealIds[m.id]}
                          onClick={() => {
                            if (!registeredMealIds[m.id] && m.mealEstimate) {
                              onAddMealFromCoach(m.mealEstimate);
                              setRegisteredMealIds((prev) => ({ ...prev, [m.id]: true }));
                            }
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                            registeredMealIds[m.id]
                              ? 'bg-[#e2e8e4] dark:bg-[#25332d] text-[#56615c] dark:text-[#9ca3af] cursor-default'
                              : 'bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] active:scale-98'
                          }`}
                        >
                          <Icon
                            name={registeredMealIds[m.id] ? 'check_circle' : 'add_circle'}
                            className="w-4 h-4"
                          />
                          <span>
                            {registeredMealIds[m.id]
                              ? 'Pasto registrato nella Dieta ✓'
                              : 'Registra nella Dieta'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  <span
                    className={`text-[10px] mt-2 block text-right font-medium ${
                      isAI ? 'text-[#8c9992]' : 'text-white/70'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {/* User Avatar */}
                {!isAI && (
                  <div className="w-8 h-8 shrink-0 mt-1">
                    <UserAvatar
                      avatarUrl={profile.avatarUrl}
                      name={profile.name}
                      className="w-8 h-8 ring-1 ring-[#416900]/30 shadow-2xs"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator when Coach is typing */}
          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-[#84cc16]/20 flex items-center justify-center text-[#416900] shrink-0 mt-1">
                <Icon name="neurology" className="w-4 h-4 text-[#416900]" />
              </div>
              <div className="p-3.5 px-4 rounded-2xl bg-white text-[#191c1c] rounded-tl-sm border border-[#e2e8e4] shadow-xs flex items-center gap-2">
                <span className="text-[13px] text-[#56615c] font-medium">
                  Il Coach sta analizzando i tuoi dati...
                </span>
                <span className="inline-flex gap-1 items-center ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Input Dock */}
        <div className="fixed bottom-4 inset-x-0 flex flex-col items-center px-4 pointer-events-none z-50 gap-2">
          {/* Error Banner */}
          {mediaError && (
            <div className="w-full max-w-md pointer-events-auto p-2.5 px-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[12px] text-amber-900 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2 pr-2">
                <Icon name="info" className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{mediaError}</span>
              </div>
              <button
                type="button"
                onClick={() => setMediaError(null)}
                aria-label="Chiudi avviso"
                className="text-amber-700 hover:text-amber-900 cursor-pointer shrink-0"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Media Attachment Preview Chip */}
          {selectedMedia && (
            <div className="w-full max-w-md pointer-events-auto p-2 rounded-2xl bg-white shadow-xl border border-[#e2e8e4] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/10 relative shrink-0">
                  <img
                    src={selectedMedia.thumbnailUrl}
                    alt="Anteprima"
                    className="w-full h-full object-cover"
                  />
                  {selectedMedia.mediaType === 'video' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                      <Icon name="play_arrow" className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#416900]">
                      {selectedMedia.mediaType === 'video' ? 'Video Esercizio' : 'Foto Allegata'}
                    </span>
                    {selectedMedia.durationSec ? (
                      <span className="text-[10px] text-[#56615c] bg-[#e6e9e8] px-1.5 py-0.2 rounded font-mono">
                        {selectedMedia.durationSec}s
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12px] text-[#191c1c] truncate font-medium">{selectedMedia.fileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMedia(null)}
                title="Rimuovi allegato"
                aria-label="Rimuovi allegato"
                className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-red-50 hover:text-red-600 text-[#56615c] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="w-full max-w-md pointer-events-auto bg-white/95 backdrop-blur-xl rounded-full p-2 pl-3 shadow-xl border border-[#e2e8e4] flex items-center gap-2"
          >
            {/* Popover Menu per Scelta Fotocamera o Galleria */}
            {showMediaPicker && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMediaPicker(false)}
                />
                <div className="absolute bottom-16 left-4 bg-white dark:bg-[#1a2420] p-1.5 rounded-2xl shadow-2xl border border-[#e2e8e4] dark:border-[#2f4039] flex flex-col gap-1 z-40 animate-scaleIn min-w-[185px]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMediaPicker(false);
                      cameraInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#191c1c] dark:text-[#f8faf9] hover:bg-[#f2f4f3] dark:hover:bg-[#25332d] transition-colors cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#84cc16]/20 flex items-center justify-center text-[#386a00] shrink-0">
                      <Icon name="photo_camera" className="w-4 h-4" />
                    </div>
                    <span>Scatta Foto/Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMediaPicker(false);
                      galleryInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#191c1c] dark:text-[#f8faf9] hover:bg-[#f2f4f3] dark:hover:bg-[#25332d] transition-colors cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-[#0284c7] shrink-0">
                      <Icon name="image" className="w-4 h-4" />
                    </div>
                    <span>Dalla Galleria</span>
                  </button>
                </div>
              </>
            )}

            {/* Hidden File Inputs: Fotocamera e Galleria */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Media Attachment Button */}
            <button
              type="button"
              onClick={() => setShowMediaPicker((prev) => !prev)}
              disabled={isLoading || isProcessingMedia}
              title="Allega foto o video (max 15 MB / 30s)"
              aria-label="Allega foto o video"
              className="w-9 h-9 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#424936] flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 relative z-20"
            >
              {isProcessingMedia ? (
                <span className="w-4 h-4 border-2 border-[#84cc16] border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Icon name="photo_camera" className="w-5 h-5 text-[#424936]" />
              )}
            </button>

            <input
              type="text"
              value={inputText}
              placeholder={
                selectedMedia
                  ? 'Aggiungi un commento (opzionale)...'
                  : `Chiedi o allega video/foto, ${profile.name || 'Atleta'}...`
              }
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || isProcessingMedia}
              className="flex-1 text-[14px] text-[#191c1c] outline-none bg-transparent placeholder:text-[#56615c]/60 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedMedia) || isLoading || isProcessingMedia}
              aria-label="Invia messaggio"
              className="w-10 h-10 rounded-full bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] disabled:opacity-40 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
            >
              <Icon name="arrow_forward" className="w-5 h-5 text-[#102000]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
