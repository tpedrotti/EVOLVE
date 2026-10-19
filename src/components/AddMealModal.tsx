import React, { useState, useRef } from 'react';
import type { MealEntry, UserProfile } from '../types';
import { Icon } from './Icons';
import { useA11yDialog } from '../utils/useA11yDialog';
import { estimateMealWithAI } from '../services/geminiCoach';
import {
  validateMediaFile,
  compressImageForCoach,
  type ProcessedCoachMedia,
} from '../utils/coachMediaUtils';

import {
  validateMealInput,
  isMealDraftDirty,
  getMealTypeNextIndex,
  DEFAULT_MEAL_DRAFT,
  MEAL_A11Y_IDS,
  getEffectiveTodayKey,
  getShiftedDateKey,
  formatFullMealDate,
  type MealFormDraft,
} from '../utils/mealValidation';

interface AddMealModalProps {
  onClose: () => void;
  onAddMeal: (meal: Omit<MealEntry, 'id'>) => void;
  initialMeal?: Partial<Omit<MealEntry, 'id'>>;
  profile?: UserProfile;
  initialDate?: string;
}

const MEAL_TYPES: { key: MealEntry['mealType']; label: string; desc: string }[] = [
  { key: 'colazione', label: 'Colazione', desc: 'Pasto del mattino' },
  { key: 'pranzo', label: 'Pranzo', desc: 'Pasto di metà giornata' },
  { key: 'spuntino', label: 'Spuntino', desc: 'Spuntino o pre-workout' },
  { key: 'cena', label: 'Cena', desc: 'Pasto serale' },
];

export const AddMealModal: React.FC<AddMealModalProps> = ({
  onClose,
  onAddMeal,
  initialMeal,
  profile,
  initialDate,
}) => {
  const todayKey = getEffectiveTodayKey(profile);
  const yesterdayKey = getShiftedDateKey(todayKey, -1);
  const [date, setDate] = useState<string>(
    initialMeal?.date || initialDate || todayKey
  );
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialMeal?.name || '');
  const [mealType, setMealType] = useState<MealEntry['mealType']>(
    initialMeal?.mealType || DEFAULT_MEAL_DRAFT.mealType
  );
  const [calories, setCalories] = useState<number>(
    typeof initialMeal?.calories === 'number' ? initialMeal.calories : DEFAULT_MEAL_DRAFT.calories
  );
  const [proteinG, setProteinG] = useState<number>(
    typeof initialMeal?.proteinG === 'number' ? initialMeal.proteinG : DEFAULT_MEAL_DRAFT.proteinG
  );
  const [carbsG, setCarbsG] = useState<number>(
    typeof initialMeal?.carbsG === 'number' ? initialMeal.carbsG : DEFAULT_MEAL_DRAFT.carbsG
  );
  const [fatsG, setFatsG] = useState<number>(
    typeof initialMeal?.fatsG === 'number' ? initialMeal.fatsG : DEFAULT_MEAL_DRAFT.fatsG
  );
  const [sugarsG, setSugarsG] = useState<number>(
    typeof initialMeal?.sugarsG === 'number' ? initialMeal.sugarsG : (DEFAULT_MEAL_DRAFT.sugarsG ?? 0)
  );
  const [fiberG, setFiberG] = useState<number>(
    typeof initialMeal?.fiberG === 'number' ? initialMeal.fiberG : (DEFAULT_MEAL_DRAFT.fiberG ?? 0)
  );
  const [notes, setNotes] = useState<string>(initialMeal?.notes || '');

  // AI Estimation State (Foto, cibo e peso)
  const [aiPhoto, setAiPhoto] = useState<ProcessedCoachMedia | null>(null);
  const [aiFoodText, setAiFoodText] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [aiBreakdown, setAiBreakdown] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Discard confirmation state (nested modal)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Focus references
  const nameInputRef = useRef<HTMLInputElement>(null);
  const continueEditingBtnRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiError(null);
    setAiSuccessMessage(null);
    setAiBreakdown([]);

    const validationError = validateMediaFile(file);
    if (validationError) {
      setAiError(validationError);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      return;
    }

    try {
      const compressed = await compressImageForCoach(file);
      setAiPhoto(compressed);
      setAiError(null);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Impossibile elaborare l\'immagine.');
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setAiPhoto(null);
    setAiError(null);
    setAiSuccessMessage(null);
    setAiBreakdown([]);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleEstimateAI = async () => {
    const query = aiFoodText.trim() || name.trim();
    if (!query && !aiPhoto) {
      setAiError('Scatta o carica una foto oppure indica gli alimenti e i grammi (es. pasta 80g e tonno 100g).');
      return;
    }

    setIsEstimating(true);
    setAiError(null);
    setAiSuccessMessage(null);
    setAiBreakdown([]);

    try {
      const result = await estimateMealWithAI({
        foodDescription: query,
        media: aiPhoto
          ? {
              dataUrl: aiPhoto.dataUrl,
              thumbnailUrl: aiPhoto.thumbnailUrl,
              mimeType: aiPhoto.mimeType,
              mediaType: 'image',
            }
          : undefined,
        profile,
        currentMealType: mealType,
      });

      if (result.mealEstimate) {
        setName(result.mealEstimate.name);
        setCalories(result.mealEstimate.calories);
        setProteinG(result.mealEstimate.proteinG);
        setCarbsG(result.mealEstimate.carbsG);
        setFatsG(result.mealEstimate.fatsG);
        setSugarsG(result.mealEstimate.sugarsG ?? 0);
        setFiberG(result.mealEstimate.fiberG ?? 0);
        if (result.mealEstimate.mealType) {
          setMealType(result.mealEstimate.mealType);
        }
        setAiSuccessMessage(
          `${result.mealEstimate.name} • ${result.mealEstimate.calories} kcal (P: ${result.mealEstimate.proteinG}g | C: ${result.mealEstimate.carbsG}g | G: ${result.mealEstimate.fatsG}g | Zucch: ${result.mealEstimate.sugarsG ?? 0}g | Fib: ${result.mealEstimate.fiberG ?? 0}g)`
        );

        // Extract individual recognized item breakdown
        const lines = (result.text || '')
          .split('\n')
          .filter((l) => l.trim().startsWith('•') || l.trim().startsWith('-'))
          .map((l) => l.replace(/^[•\-]\s*/, '').trim())
          .filter(Boolean);
        setAiBreakdown(lines);

        // Clear previous validation errors as valid AI values were loaded
        setErrors({});
      } else {
        setAiError('Impossibile stimare i nutrienti automaticamente. Puoi compilare i campi sottostanti manualmente.');
      }
    } catch (err: unknown) {
      setAiError('Errore durante la stima. Puoi compilare i valori manualmente.');
    } finally {
      setIsEstimating(false);
    }
  };

  const currentDraft: MealFormDraft = {
    name,
    mealType,
    calories,
    proteinG,
    carbsG,
    fatsG,
    sugarsG,
    fiberG,
    date,
    imageUrl: aiPhoto ? (aiPhoto.thumbnailUrl || aiPhoto.dataUrl) : initialMeal?.imageUrl,
    notes,
  };

  const initialDraft: MealFormDraft = {
    name: initialMeal?.name || DEFAULT_MEAL_DRAFT.name,
    mealType: initialMeal?.mealType || DEFAULT_MEAL_DRAFT.mealType,
    calories: initialMeal?.calories ?? DEFAULT_MEAL_DRAFT.calories,
    proteinG: initialMeal?.proteinG ?? DEFAULT_MEAL_DRAFT.proteinG,
    carbsG: initialMeal?.carbsG ?? DEFAULT_MEAL_DRAFT.carbsG,
    fatsG: initialMeal?.fatsG ?? DEFAULT_MEAL_DRAFT.fatsG,
    sugarsG: initialMeal?.sugarsG ?? DEFAULT_MEAL_DRAFT.sugarsG ?? 0,
    fiberG: initialMeal?.fiberG ?? DEFAULT_MEAL_DRAFT.fiberG ?? 0,
    date: initialMeal?.date || initialDate || todayKey,
    imageUrl: initialMeal?.imageUrl || '',
    notes: initialMeal?.notes || '',
  };

  // Check if draft has unsaved changes compared to initial baseline
  const isDirty = isMealDraftDirty(currentDraft, initialDraft);

  // Safe close request: if dirty, prompt for confirmation; otherwise close immediately
  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Main dialog accessibility hook
  const { containerRef: mainDialogRef } = useA11yDialog<HTMLDivElement>({
    isOpen: true,
    onClose: handleRequestClose,
    onEscape: handleRequestClose,
    initialFocusRef: nameInputRef,
    isActive: !showDiscardConfirm, // Inactive while nested alertdialog is open
  });

  // Nested discard confirmation alertdialog accessibility hook
  const { containerRef: discardDialogRef } = useA11yDialog<HTMLDivElement>({
    isOpen: showDiscardConfirm,
    onClose: () => setShowDiscardConfirm(false),
    onEscape: () => setShowDiscardConfirm(false),
    initialFocusRef: continueEditingBtnRef,
    isActive: showDiscardConfirm,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    const validation = validateMealInput(currentDraft);
    if (!validation.isValid) {
      setErrors(validation.errors);
      if (validation.errors.name) {
        nameInputRef.current?.focus();
      } else if (validation.errors.date) {
        dateInputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    onAddMeal({
      name: name.trim(),
      mealType,
      calories: Number(calories),
      proteinG: Number(proteinG),
      carbsG: Number(carbsG),
      fatsG: Number(fatsG),
      sugarsG: Number(sugarsG || 0),
      fiberG: Number(fiberG || 0),
      time: timeStr,
      date,
      imageUrl: aiPhoto ? (aiPhoto.thumbnailUrl || aiPhoto.dataUrl) : initialMeal?.imageUrl,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  // Keyboard navigation for mealType radio group (ArrowLeft / ArrowRight / ArrowUp / ArrowDown)
  const handleMealTypeKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = getMealTypeNextIndex(index, MEAL_TYPES.length, 'next');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = getMealTypeNextIndex(index, MEAL_TYPES.length, 'prev');
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextType = MEAL_TYPES[nextIndex].key;
      setMealType(nextType);
      const targetBtn = document.getElementById(MEAL_A11Y_IDS.mealTypeButton(nextType));
      targetBtn?.focus();
    }
  };

  return (
    <>
      {/* Modal Backdrop Layer */}
      <div
        className="fixed inset-0 z-[100] bg-[#17211D]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          // If clicking strictly on the outer backdrop container, request safe close
          if (e.target === e.currentTarget && !showDiscardConfirm) {
            handleRequestClose();
          }
        }}
        aria-hidden={showDiscardConfirm ? 'true' : undefined}
      >
        {/* Dialog Container */}
        <div
          ref={mainDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-meal-modal-title"
          aria-describedby="add-meal-modal-desc"
          tabIndex={-1}
          className="w-full max-w-md bg-white dark:bg-[#18231f] rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8e4] dark:border-[#2b3a33] outline-none"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#eceeed] dark:border-[#2b3a33] flex items-center justify-between bg-[#f8faf9] dark:bg-[#151e1b] shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-[#416900] dark:text-[#84cc16] shrink-0"
                aria-hidden="true"
              >
                <Icon name="restaurant" className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h2
                  id="add-meal-modal-title"
                  className="text-[18px] font-bold text-[#191c1c] dark:text-[#f8faf9] tracking-tight leading-tight"
                >
                  Registra Alimento
                </h2>
                <p id="add-meal-modal-desc" className="text-[11px] text-[#56615c] dark:text-[#94a39b]">
                  Inserisci nome, momento della giornata e valori nutrizionali nel diario.
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleRequestClose}
              aria-label="Chiudi finestra registra alimento"
              className="w-9 h-9 rounded-full bg-[#e6e9e8] dark:bg-[#23312b] text-[#191c1c] dark:text-[#e2e8e4] flex items-center justify-center hover:bg-[#d7e2dc] dark:hover:bg-[#2d3e37] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>


          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* Global Error Banner if submission attempted with errors */}
              {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-red-700 dark:text-red-300 text-[12px]"
                >
                  <Icon name="error" className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Attenzione:</span> Correggi i campi evidenziati per procedere.
                  </div>
                </div>
              )}

              {/* Sezione Stima Automatica con IA (Foto & Pesi) */}
              <div
                role="region"
                aria-labelledby="ai-estimate-section-title"
                className="p-3.5 sm:p-4 rounded-2xl bg-[#f8faf9] dark:bg-[#1a2622] border border-[#d8e2dc] dark:border-[#2b3a33] space-y-3 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg bg-[#84cc16]/20 flex items-center justify-center text-[#416900] dark:text-[#84cc16] shrink-0"
                    aria-hidden="true"
                  >
                    <Icon name="auto_awesome" className="w-4 h-4 text-[#416900] dark:text-[#84cc16]" />
                  </div>
                  <div>
                    <h3
                      id="ai-estimate-section-title"
                      className="text-[13px] font-bold text-[#191c1c] dark:text-[#f8faf9] leading-tight"
                    >
                      Stima con IA (Foto &amp; Pesi)
                    </h3>
                    <p className="text-[10px] text-[#56615c] dark:text-[#94a39b]">
                      Carica una foto e/o indica cibo e peso: l'IA calcola calorie e macro per te.
                    </p>
                  </div>
                </div>

                {/* Hidden File Inputs: Fotocamera e Galleria */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  aria-label="Scatta foto con la fotocamera"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  aria-label="Scegli foto dalla galleria del telefono"
                />

                {/* Photo attachment display or upload buttons */}
                {aiPhoto ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#202d28] border border-[#84cc16]/60 gap-2.5 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={aiPhoto.thumbnailUrl}
                          alt="Anteprima foto del piatto caricata"
                          className="w-11 h-11 rounded-lg object-cover border border-[#e2e8e4] dark:border-[#2f4039] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase text-[#416900] dark:text-[#84cc16] block">
                            Foto piatto allegata ✓
                          </span>
                          <p className="text-[11px] font-medium text-[#191c1c] dark:text-[#e2e8e4] truncate">
                            {aiPhoto.fileName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        aria-label="Rimuovi foto allegata"
                        title="Rimuovi foto"
                        className="w-8 h-8 rounded-full bg-[#f2f4f3] dark:bg-[#283832] text-[#56615c] dark:text-[#94a39b] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <Icon name="close" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      aria-label="Scatta foto con la fotocamera"
                      className="py-2.5 px-3 rounded-xl bg-white dark:bg-[#202d28] border border-dashed border-[#84cc16] hover:bg-[#84cc16]/10 dark:hover:bg-[#84cc16]/15 text-[#416900] dark:text-[#84cc16] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16] active:scale-[0.98]"
                    >
                      <Icon name="photo_camera" className="w-4 h-4 text-[#416900] dark:text-[#84cc16]" />
                      <span>Scatta Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      aria-label="Scegli foto dalla galleria del telefono"
                      className="py-2.5 px-3 rounded-xl bg-white dark:bg-[#202d28] border border-dashed border-[#84cc16] hover:bg-[#84cc16]/10 dark:hover:bg-[#84cc16]/15 text-[#416900] dark:text-[#84cc16] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16] active:scale-[0.98]"
                    >
                      <Icon name="add_photo_alternate" className="w-4 h-4 text-[#416900] dark:text-[#84cc16]" />
                      <span>Dalla Galleria</span>
                    </button>
                  </div>
                )}

                {/* Food description and weight input */}
                <div>
                  <label
                    htmlFor="ai-food-input"
                    className="text-[11px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Cibo &amp; Grammi{' '}
                    <span className="text-[10px] font-normal normal-case text-[#78857e]">
                      (es. pasta 80g e tonno 100g, oppure 150g petto di pollo e 10g olio)
                    </span>
                  </label>
                  <div className="flex items-center bg-white dark:bg-[#202d28] rounded-xl px-3 py-2 border border-[#d8e2dc] dark:border-[#2f4039] focus-within:ring-2 focus-within:ring-[#84cc16] transition-all">
                    <input
                      id="ai-food-input"
                      type="text"
                      value={aiFoodText}
                      onChange={(e) => {
                        setAiFoodText(e.target.value);
                        if (aiError) setAiError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEstimateAI();
                        }
                      }}
                      placeholder={
                        aiPhoto
                          ? 'Grammature o ingredienti (opzionale se visibili in foto)...'
                          : 'es. pasta 80g e tonno 100g e 1 cucchiaio di olio...'
                      }
                      className="w-full text-[13px] font-medium text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent placeholder:text-[#56615c]/60"
                    />
                  </div>
                </div>

                {/* Trigger Button: Calcola Nutrienti con IA */}
                <button
                  type="button"
                  onClick={handleEstimateAI}
                  disabled={isEstimating || (!aiPhoto && !aiFoodText.trim() && !name.trim())}
                  aria-label="Calcola nutrienti con intelligenza artificiale e inseriscili nei campi sottostanti"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#84cc16] hover:bg-[#91db2a] disabled:opacity-40 disabled:cursor-not-allowed text-[#102000] font-bold text-[13px] flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#416900]"
                >
                  {isEstimating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#102000] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span>Stima nutrizionale in corso...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="auto_awesome" className="w-4 h-4 text-[#102000]" />
                      <span>Stima con IA e Inserisci Dati</span>
                    </>
                  )}
                </button>

                {/* Success Feedback Banner with Itemized Breakdown */}
                {aiSuccessMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-3 rounded-xl bg-lime-50 dark:bg-[#1a3324] border border-[#84cc16]/60 flex flex-col gap-2 text-[#274600] dark:text-[#bef264] text-[11px] animate-in fade-in duration-200"
                  >
                    <div className="flex items-start gap-2">
                      <Icon name="check_circle" className="w-4 h-4 text-[#416900] dark:text-[#84cc16] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Valori calcolati inseriti con successo:</span>{' '}
                        <span>{aiSuccessMessage}</span>
                      </div>
                    </div>

                    {/* Itemized breakdown */}
                    {aiBreakdown.length > 0 && (
                      <div className="pt-2 border-t border-[#84cc16]/30 pl-6 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#386a00] dark:text-[#a3e635] block">
                          Alimenti &amp; grammature computati:
                        </span>
                        {aiBreakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-[#191c1c] dark:text-[#f8faf9]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-[#416900] dark:text-[#a3e635] pl-6">
                      Tutti i campi sottostanti sono stati aggiornati. Puoi verificarli e modificarli liberamente prima di salvare.
                    </p>
                  </div>
                )}

                {/* Error Feedback Banner */}
                {aiError && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-red-700 dark:text-red-300 text-[11px]"
                  >
                    <Icon name="error" className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">{aiError}</div>
                  </div>
                )}

                {/* Error Feedback Banner */}
                {aiError && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-red-700 dark:text-red-300 text-[11px]"
                  >
                    <Icon name="error" className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">{aiError}</div>
                  </div>
                )}
              </div>

              {/* 1. Nome Piatto */}
              <div>
                <label
                  htmlFor="meal-name-input"
                  className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                >
                  Nome Piatto o Alimento{' '}
                  <span className="text-red-600 dark:text-red-400 font-bold" aria-hidden="true">
                    *
                  </span>
                  <span className="sr-only">(campo obbligatorio)</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="meal-name-input"
                  name="name"
                  type="text"
                  required
                  aria-required="true"
                  value={name}
                  placeholder="es. Omelette con albumi e avocado"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'meal-name-error' : 'meal-name-hint'}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.name;
                        return next;
                      });
                    }
                  }}
                  className={`w-full px-4 py-3 bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl text-[15px] font-medium text-[#191c1c] dark:text-[#f8faf9] outline-none transition-all ${
                    errors.name
                      ? 'border-2 border-red-500 focus:ring-2 focus:ring-red-400'
                      : 'border border-transparent focus:ring-2 focus:ring-[#84cc16]'
                  }`}
                />
                <span id="meal-name-hint" className="sr-only">
                  Nome descrittivo del pasto o degli ingredienti principali
                </span>
                {errors.name && (
                  <div
                    id="meal-name-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600 dark:text-red-400 mt-1"
                  >
                    <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              {/* 2. Momento della Giornata (Accessible Radiogroup) */}
              <div>
                <span
                  id="meal-type-radiogroup-label"
                  className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                >
                  Momento della Giornata
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="meal-type-radiogroup-label"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {MEAL_TYPES.map((m, index) => {
                    const isSelected = mealType === m.key;
                    return (
                      <button
                        key={m.key}
                        id={`meal-type-btn-${m.key}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        aria-label={`${m.label}: ${m.desc}`}
                        onKeyDown={(e) => handleMealTypeKeyDown(e, index)}
                        onClick={() => setMealType(m.key)}
                        className={`py-2.5 px-2 rounded-xl text-[12px] font-bold capitalize transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 focus:outline-none focus:ring-2 focus:ring-[#84cc16] ${
                          isSelected
                            ? 'bg-[#416900] text-white shadow-sm ring-1 ring-[#84cc16]'
                            : 'bg-[#f2f4f3] dark:bg-[#202d28] text-[#56615c] dark:text-[#94a39b] hover:bg-[#eceeed] dark:hover:bg-[#283933] border border-[#e2e8e4]/60 dark:border-[#2f4039]'
                        }`}
                      >
                        <span>{m.label}</span>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold text-[#d9f99d]">✓ Selezionato</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Giorno del Pasto (Data automatica con possibilità di modifica) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={MEAL_A11Y_IDS.dateInput}
                    id={MEAL_A11Y_IDS.dateLabel}
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] flex items-center gap-1.5"
                  >
                    <Icon name="calendar_today" className="w-3.5 h-3.5 text-[#416900] dark:text-[#84cc16]" />
                    <span>Giorno del Pasto</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDate(todayKey);
                        if (errors.date) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.date;
                            return next;
                          });
                        }
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        date === todayKey
                          ? 'bg-[#416900] text-white shadow-2xs'
                          : 'bg-[#f2f4f3] dark:bg-[#202d28] text-[#56615c] dark:text-[#94a39b] hover:bg-[#eceeed] dark:hover:bg-[#283933]'
                      }`}
                    >
                      Oggi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDate(yesterdayKey);
                        if (errors.date) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.date;
                            return next;
                          });
                        }
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        date === yesterdayKey
                          ? 'bg-[#416900] text-white shadow-2xs'
                          : 'bg-[#f2f4f3] dark:bg-[#202d28] text-[#56615c] dark:text-[#94a39b] hover:bg-[#eceeed] dark:hover:bg-[#283933]'
                      }`}
                    >
                      Ieri
                    </button>
                  </div>
                </div>

                <div
                  className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                    errors.date
                      ? 'border-2 border-red-500'
                      : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                  }`}
                >
                  <input
                    ref={dateInputRef}
                    id={MEAL_A11Y_IDS.dateInput}
                    name="date"
                    type="date"
                    value={date}
                    aria-labelledby={MEAL_A11Y_IDS.dateLabel}
                    aria-describedby={errors.date ? MEAL_A11Y_IDS.dateError : MEAL_A11Y_IDS.dateHelp}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (errors.date) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.date;
                          return next;
                        });
                      }
                    }}
                    className="w-full text-[14px] font-semibold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#56615c] dark:text-[#94a39b] mt-1 px-0.5">
                  <span id={MEAL_A11Y_IDS.dateHelp}>
                    {formatFullMealDate(date, todayKey)}
                  </span>
                  {date !== todayKey && (
                    <span className="font-bold text-[#386a00] dark:text-[#84cc16]">
                      {date === yesterdayKey ? 'Registrazione di Ieri' : 'Data personalizzata'}
                    </span>
                  )}
                </div>

                {errors.date && (
                  <div
                    id={MEAL_A11Y_IDS.dateError}
                    role="alert"
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                  >
                    <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{errors.date}</span>
                  </div>
                )}
              </div>

              {/* 4. Calorie & Proteine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Calorie Totali */}
                <div>
                  <label
                    htmlFor="meal-calories-input"
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Calorie Totali
                  </label>
                  <div
                    className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                      errors.calories
                        ? 'border-2 border-red-500'
                        : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                    }`}
                  >
                    <input
                      id="meal-calories-input"
                      name="calories"
                      type="number"
                      min={0}
                      max={3000}
                      step={1}
                      value={calories}
                      aria-invalid={Boolean(errors.calories)}
                      aria-describedby={
                        errors.calories ? 'meal-calories-error' : 'meal-calories-unit meal-calories-help'
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCalories(val);
                        if (errors.calories) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.calories;
                            return next;
                          });
                        }
                      }}
                      className="w-full text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent"
                    />
                    <span
                      id="meal-calories-unit"
                      className="text-[12px] font-bold text-[#56615c] dark:text-[#94a39b] ml-1 shrink-0"
                    >
                      kcal
                    </span>
                  </div>
                  <span id="meal-calories-help" className="text-[10px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                    Unità: chilocalorie (da 0 a 3.000)
                  </span>
                  {errors.calories && (
                    <div
                      id="meal-calories-error"
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                    >
                      <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{errors.calories}</span>
                    </div>
                  )}
                </div>

                {/* Proteine */}
                <div>
                  <label
                    htmlFor="meal-protein-input"
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Proteine
                  </label>
                  <div
                    className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                      errors.proteinG
                        ? 'border-2 border-red-500'
                        : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                    }`}
                  >
                    <input
                      id="meal-protein-input"
                      name="protein"
                      type="number"
                      min={0}
                      max={300}
                      step={1}
                      value={proteinG}
                      aria-invalid={Boolean(errors.proteinG)}
                      aria-describedby={
                        errors.proteinG ? 'meal-protein-error' : 'meal-protein-unit meal-protein-help'
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProteinG(val);
                        if (errors.proteinG) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.proteinG;
                            return next;
                          });
                        }
                      }}
                      className="w-full text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent"
                    />
                    <span
                      id="meal-protein-unit"
                      className="text-[12px] font-bold text-[#56615c] dark:text-[#94a39b] ml-1 shrink-0"
                    >
                      g
                    </span>
                  </div>
                  <span id="meal-protein-help" className="text-[10px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                    Unità: grammi (da 0 a 300)
                  </span>
                  {errors.proteinG && (
                    <div
                      id="meal-protein-error"
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                    >
                      <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{errors.proteinG}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Carboidrati & Grassi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Carboidrati */}
                <div>
                  <label
                    htmlFor="meal-carbs-input"
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Carboidrati
                  </label>
                  <div
                    className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                      errors.carbsG
                        ? 'border-2 border-red-500'
                        : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                    }`}
                  >
                    <input
                      id="meal-carbs-input"
                      name="carbs"
                      type="number"
                      min={0}
                      max={500}
                      step={1}
                      value={carbsG}
                      aria-invalid={Boolean(errors.carbsG)}
                      aria-describedby={
                        errors.carbsG ? 'meal-carbs-error' : 'meal-carbs-unit meal-carbs-help'
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCarbsG(val);
                        if (errors.carbsG) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.carbsG;
                            return next;
                          });
                        }
                      }}
                      className="w-full text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent"
                    />
                    <span
                      id="meal-carbs-unit"
                      className="text-[12px] font-bold text-[#56615c] dark:text-[#94a39b] ml-1 shrink-0"
                    >
                      g
                    </span>
                  </div>
                  <span id="meal-carbs-help" className="text-[10px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                    Unità: grammi (da 0 a 500)
                  </span>
                  {errors.carbsG && (
                    <div
                      id="meal-carbs-error"
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                    >
                      <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{errors.carbsG}</span>
                    </div>
                  )}
                </div>

                {/* Grassi */}
                <div>
                  <label
                    htmlFor="meal-fats-input"
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Grassi
                  </label>
                  <div
                    className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                      errors.fatsG
                        ? 'border-2 border-red-500'
                        : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                    }`}
                  >
                    <input
                      id="meal-fats-input"
                      name="fats"
                      type="number"
                      min={0}
                      max={300}
                      step={1}
                      value={fatsG}
                      aria-invalid={Boolean(errors.fatsG)}
                      aria-describedby={
                        errors.fatsG ? 'meal-fats-error' : 'meal-fats-unit meal-fats-help'
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFatsG(val);
                        if (errors.fatsG) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.fatsG;
                            return next;
                          });
                        }
                      }}
                      className="w-full text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent"
                    />
                    <span
                      id="meal-fats-unit"
                      className="text-[12px] font-bold text-[#56615c] dark:text-[#94a39b] ml-1 shrink-0"
                    >
                      g
                    </span>
                  </div>
                  <span id="meal-fats-help" className="text-[10px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                    Unità: grammi (da 0 a 300)
                  </span>
                  {errors.fatsG && (
                    <div
                      id="meal-fats-error"
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                    >
                      <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{errors.fatsG}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Zuccheri & Fibre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Zuccheri */}
                <div>
                  <label
                    htmlFor={MEAL_A11Y_IDS.sugarsInput}
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Zuccheri
                  </label>
                  <div
                    className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                      errors.sugarsG
                        ? 'border-2 border-red-500'
                        : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                    }`}
                  >
                    <input
                      id={MEAL_A11Y_IDS.sugarsInput}
                      name="sugars"
                      type="number"
                      min={0}
                      max={300}
                      step={1}
                      value={sugarsG}
                      aria-invalid={Boolean(errors.sugarsG)}
                      aria-describedby={
                        errors.sugarsG ? MEAL_A11Y_IDS.sugarsError : `${MEAL_A11Y_IDS.sugarsUnit} ${MEAL_A11Y_IDS.sugarsHelp}`
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSugarsG(val);
                        if (errors.sugarsG) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.sugarsG;
                            return next;
                          });
                        }
                      }}
                      className="w-full text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent"
                    />
                    <span
                      id={MEAL_A11Y_IDS.sugarsUnit}
                      className="text-[12px] font-bold text-[#56615c] dark:text-[#94a39b] ml-1 shrink-0"
                    >
                      g
                    </span>
                  </div>
                  <span id={MEAL_A11Y_IDS.sugarsHelp} className="text-[10px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                    Unità: grammi (da 0 a 300)
                  </span>
                  {errors.sugarsG && (
                    <div
                      id={MEAL_A11Y_IDS.sugarsError}
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                    >
                      <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{errors.sugarsG}</span>
                    </div>
                  )}
                </div>

                {/* Fibre */}
                <div>
                  <label
                    htmlFor={MEAL_A11Y_IDS.fiberInput}
                    className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] block mb-1"
                  >
                    Fibre
                  </label>
                  <div
                    className={`flex items-center bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border transition-all ${
                      errors.fiberG
                        ? 'border-2 border-red-500'
                        : 'border-transparent focus-within:ring-2 focus-within:ring-[#84cc16]'
                    }`}
                  >
                    <input
                      id={MEAL_A11Y_IDS.fiberInput}
                      name="fiber"
                      type="number"
                      min={0}
                      max={150}
                      step={1}
                      value={fiberG}
                      aria-invalid={Boolean(errors.fiberG)}
                      aria-describedby={
                        errors.fiberG ? MEAL_A11Y_IDS.fiberError : `${MEAL_A11Y_IDS.fiberUnit} ${MEAL_A11Y_IDS.fiberHelp}`
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFiberG(val);
                        if (errors.fiberG) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.fiberG;
                            return next;
                          });
                        }
                      }}
                      className="w-full text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent"
                    />
                    <span
                      id={MEAL_A11Y_IDS.fiberUnit}
                      className="text-[12px] font-bold text-[#56615c] dark:text-[#94a39b] ml-1 shrink-0"
                    >
                      g
                    </span>
                  </div>
                  <span id={MEAL_A11Y_IDS.fiberHelp} className="text-[10px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                    Unità: grammi (da 0 a 150)
                  </span>
                  {errors.fiberG && (
                    <div
                      id={MEAL_A11Y_IDS.fiberError}
                      role="alert"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1"
                    >
                      <Icon name="error" className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{errors.fiberG}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Note o Dettagli (Opzionale) */}
              <div>
                <label
                  htmlFor="meal-notes-input"
                  className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] flex items-center gap-1.5 mb-1"
                >
                  <Icon name="description" className="w-3.5 h-3.5 text-[#416900] dark:text-[#84cc16]" />
                  <span>Note o Ingredienti (Opzionale)</span>
                </label>
                <div className="bg-[#f2f4f3] dark:bg-[#202d28] rounded-xl px-3 py-2 border border-transparent focus-within:ring-2 focus-within:ring-[#84cc16] transition-all">
                  <textarea
                    id="meal-notes-input"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Es. 1 filo d'olio evo a crudo, porzione, ricetta o dettagli..."
                    className="w-full text-[14px] font-medium text-[#191c1c] dark:text-[#f8faf9] outline-none bg-transparent resize-none placeholder:text-[#56615c]/60"
                  />
                </div>
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="p-4 border-t border-[#eceeed] dark:border-[#2b3a33] bg-[#f8faf9] dark:bg-[#151e1b] shrink-0 pb-safe flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[16px] font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#416900]"
              >
                <Icon name="add" className="w-5 h-5" />
                <span>Aggiungi al Diario</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Nested Discard Confirmation AlertDialog */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="presentation"
        >
          <div
            ref={discardDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-confirm-title"
            aria-describedby="discard-confirm-desc"
            tabIndex={-1}
            className="w-full max-w-sm bg-white dark:bg-[#1c2823] rounded-3xl p-5 shadow-2xl border border-[#e2e8e4] dark:border-[#2b3a33] space-y-4 outline-none"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Icon name="warning" className="w-6 h-6" />
              </div>
              <div>
                <h3
                  id="discard-confirm-title"
                  className="text-[17px] font-bold text-[#191c1c] dark:text-[#f8faf9] leading-tight"
                >
                  Modifiche non salvate
                </h3>
                <p
                  id="discard-confirm-desc"
                  className="text-[13px] text-[#56615c] dark:text-[#94a39b] mt-1 leading-normal"
                >
                  Hai inserito o modificato dei dati per questo alimento. Vuoi davvero abbandonare la registrazione?
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                ref={continueEditingBtnRef}
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#f2f4f3] dark:bg-[#25352e] hover:bg-[#e6e9e8] dark:hover:bg-[#2f423a] text-[#191c1c] dark:text-[#e2e8e4] text-[13px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
              >
                Continua a modificare
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Abbandona modifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
