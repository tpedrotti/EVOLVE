import type { MealEntry, UserProfile } from '../types';

export interface MealFormDraft {
  name: string;
  mealType: MealEntry['mealType'];
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  sugarsG?: number;
  fiberG?: number;
  date?: string; // Formato 'YYYY-MM-DD'
  imageUrl?: string;
  notes?: string;
}

export const DEFAULT_MEAL_DRAFT: MealFormDraft = {
  name: '',
  mealType: 'pranzo',
  calories: 450,
  proteinG: 35,
  carbsG: 45,
  fatsG: 12,
  sugarsG: 0,
  fiberG: 0,
};

export const MEAL_CONSTRAINTS = {
  calories: { min: 0, max: 3000, unit: 'kcal', label: 'chilocalorie' },
  protein: { min: 0, max: 300, unit: 'g', label: 'grammi' },
  carbs: { min: 0, max: 500, unit: 'g', label: 'grammi' },
  fats: { min: 0, max: 300, unit: 'g', label: 'grammi' },
  sugars: { min: 0, max: 300, unit: 'g', label: 'grammi' },
  fiber: { min: 0, max: 150, unit: 'g', label: 'grammi' },
};

export interface MealValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates meal form fields with explicit Italian error messages.
 */
export function validateMealInput(draft: MealFormDraft): MealValidationResult {
  const errors: Record<string, string> = {};

  if (!draft.name || draft.name.trim() === '') {
    errors.name = 'Inserisci il nome del piatto o alimento prima di continuare.';
  }

  if (typeof draft.calories !== 'number' || isNaN(draft.calories) || draft.calories < MEAL_CONSTRAINTS.calories.min || draft.calories > MEAL_CONSTRAINTS.calories.max) {
    errors.calories = `Le calorie devono essere comprese tra ${MEAL_CONSTRAINTS.calories.min} e ${MEAL_CONSTRAINTS.calories.max.toLocaleString('it-IT')} kcal.`;
  }

  if (typeof draft.proteinG !== 'number' || isNaN(draft.proteinG) || draft.proteinG < MEAL_CONSTRAINTS.protein.min || draft.proteinG > MEAL_CONSTRAINTS.protein.max) {
    errors.proteinG = `I grammi di proteine devono essere compresi tra ${MEAL_CONSTRAINTS.protein.min} e ${MEAL_CONSTRAINTS.protein.max}g.`;
  }

  if (typeof draft.carbsG !== 'number' || isNaN(draft.carbsG) || draft.carbsG < MEAL_CONSTRAINTS.carbs.min || draft.carbsG > MEAL_CONSTRAINTS.carbs.max) {
    errors.carbsG = `I grammi di carboidrati devono essere compresi tra ${MEAL_CONSTRAINTS.carbs.min} e ${MEAL_CONSTRAINTS.carbs.max}g.`;
  }

  if (typeof draft.fatsG !== 'number' || isNaN(draft.fatsG) || draft.fatsG < MEAL_CONSTRAINTS.fats.min || draft.fatsG > MEAL_CONSTRAINTS.fats.max) {
    errors.fatsG = `I grammi di grassi devono essere compresi tra ${MEAL_CONSTRAINTS.fats.min} e ${MEAL_CONSTRAINTS.fats.max}g.`;
  }

  if (draft.sugarsG !== undefined && (typeof draft.sugarsG !== 'number' || isNaN(draft.sugarsG) || draft.sugarsG < MEAL_CONSTRAINTS.sugars.min || draft.sugarsG > MEAL_CONSTRAINTS.sugars.max)) {
    errors.sugarsG = `I grammi di zuccheri devono essere compresi tra ${MEAL_CONSTRAINTS.sugars.min} e ${MEAL_CONSTRAINTS.sugars.max}g.`;
  }

  if (draft.fiberG !== undefined && (typeof draft.fiberG !== 'number' || isNaN(draft.fiberG) || draft.fiberG < MEAL_CONSTRAINTS.fiber.min || draft.fiberG > MEAL_CONSTRAINTS.fiber.max)) {
    errors.fiberG = `I grammi di fibre devono essere compresi tra ${MEAL_CONSTRAINTS.fiber.min} e ${MEAL_CONSTRAINTS.fiber.max}g.`;
  }

  if (draft.date !== undefined && draft.date.trim() !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date.trim())) {
      errors.date = 'Inserisci una data valida nel formato AAAA-MM-GG.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Determines whether the user has modified any field from initial baseline.
 * If false, the draft is pristine/empty and the modal can close directly on Escape.
 * If true, closing would cause loss of user-entered data and requires confirmation.
 */
export function isMealDraftDirty(
  current: MealFormDraft,
  baseline: MealFormDraft = DEFAULT_MEAL_DRAFT
): boolean {
  return (
    current.name.trim() !== baseline.name.trim() ||
    current.mealType !== baseline.mealType ||
    current.calories !== baseline.calories ||
    current.proteinG !== baseline.proteinG ||
    current.carbsG !== baseline.carbsG ||
    current.fatsG !== baseline.fatsG ||
    (current.sugarsG ?? 0) !== (baseline.sugarsG ?? 0) ||
    (current.fiberG ?? 0) !== (baseline.fiberG ?? 0) ||
    Boolean(current.date && baseline.date && current.date !== baseline.date) ||
    (current.imageUrl || '') !== (baseline.imageUrl || '') ||
    (current.notes || '').trim() !== (baseline.notes || '').trim()
  );
}

/**
 * Computes next radio index for Arrow keyboard navigation within meal type group.
 */
export function getMealTypeNextIndex(
  currentIndex: number,
  totalItems: number,
  direction: 'next' | 'prev'
): number {
  if (totalItems <= 0) return 0;
  if (direction === 'next') {
    return (currentIndex + 1) % totalItems;
  }
  return (currentIndex - 1 + totalItems) % totalItems;
}

/**
 * Standard WAI-ARIA accessible DOM identifiers for Dieta > Registra Alimento form.
 */
export const MEAL_A11Y_IDS = {
  dialogTitle: 'add-meal-modal-title',
  dialogDesc: 'add-meal-modal-desc',
  nameInput: 'meal-name-input',
  nameLabel: 'meal-name-label',
  nameError: 'meal-name-error',
  nameHint: 'meal-name-hint',
  dateInput: 'meal-date-input',
  dateLabel: 'meal-date-label',
  dateError: 'meal-date-error',
  dateHelp: 'meal-date-help',
  mealTypeGroupLabel: 'meal-type-radiogroup-label',
  mealTypeButton: (type: string) => `meal-type-btn-${type}`,
  caloriesInput: 'meal-calories-input',
  caloriesUnit: 'meal-calories-unit',
  caloriesError: 'meal-calories-error',
  caloriesHelp: 'meal-calories-help',
  proteinInput: 'meal-protein-input',
  proteinUnit: 'meal-protein-unit',
  proteinError: 'meal-protein-error',
  proteinHelp: 'meal-protein-help',
  carbsInput: 'meal-carbs-input',
  carbsUnit: 'meal-carbs-unit',
  carbsError: 'meal-carbs-error',
  carbsHelp: 'meal-carbs-help',
  fatsInput: 'meal-fats-input',
  fatsUnit: 'meal-fats-unit',
  fatsError: 'meal-fats-error',
  fatsHelp: 'meal-fats-help',
  sugarsInput: 'meal-sugars-input',
  sugarsUnit: 'meal-sugars-unit',
  sugarsError: 'meal-sugars-error',
  sugarsHelp: 'meal-sugars-help',
  fiberInput: 'meal-fiber-input',
  fiberUnit: 'meal-fiber-unit',
  fiberError: 'meal-fiber-error',
  fiberHelp: 'meal-fiber-help',
  discardDialogTitle: 'discard-confirm-title',
  discardDialogDesc: 'discard-confirm-desc',
} as const;

const IT_WEEKDAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const IT_WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const IT_MONTHS_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const IT_MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/**
 * Returns today's ISO date string 'YYYY-MM-DD', respecting simulated date or user timezone.
 */
export function getEffectiveTodayKey(profile?: UserProfile): string {
  if (profile?.simulatedDate && profile.simulatedDate.trim() !== '') {
    return profile.simulatedDate.trim();
  }
  const now = new Date();
  const tz = profile?.timeZone || 'Europe/Rome';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Shifts an ISO date string 'YYYY-MM-DD' by deltaDays.
 */
export function getShiftedDateKey(dateKey: string, deltaDays: number): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(Date.UTC(year, month, day + deltaDays, 12, 0, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

/**
 * Formats an ISO date into full Italian date: e.g. "Oggi · Domenica 18 Ottobre 2026"
 */
export function formatFullMealDate(dateKey: string, todayKey?: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const d = new Date(year, month - 1, day);
  const weekday = IT_WEEKDAYS[d.getDay()];
  const monthName = IT_MONTHS_FULL[month - 1];

  let prefix = '';
  if (todayKey) {
    if (dateKey === todayKey) {
      prefix = 'Oggi · ';
    } else if (dateKey === getShiftedDateKey(todayKey, -1)) {
      prefix = 'Ieri · ';
    } else if (dateKey === getShiftedDateKey(todayKey, 1)) {
      prefix = 'Domani · ';
    }
  }

  return `${prefix}${weekday} ${day} ${monthName} ${year}`;
}

/**
 * Formats an ISO date into short Italian date: e.g. "Oggi · Dom 18 Ott" or "Ieri · Sab 17 Ott"
 */
export function formatShortMealDate(dateKey: string, todayKey?: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const d = new Date(year, month - 1, day);
  const wd = IT_WEEKDAYS_SHORT[d.getDay()];
  const mo = IT_MONTHS_SHORT[month - 1];

  if (todayKey) {
    if (dateKey === todayKey) return `Oggi · ${wd} ${day} ${mo}`;
    if (dateKey === getShiftedDateKey(todayKey, -1)) return `Ieri · ${wd} ${day} ${mo}`;
    if (dateKey === getShiftedDateKey(todayKey, 1)) return `Domani · ${wd} ${day} ${mo}`;
  }

  return `${wd} ${day} ${mo}`;
}
