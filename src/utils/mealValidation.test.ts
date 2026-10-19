import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMealInput,
  isMealDraftDirty,
  getMealTypeNextIndex,
  DEFAULT_MEAL_DRAFT,
  MEAL_CONSTRAINTS,
  MEAL_A11Y_IDS,
  getEffectiveTodayKey,
  getShiftedDateKey,
  formatFullMealDate,
  formatShortMealDate,
  type MealFormDraft,
} from './mealValidation.ts';

test('1. validateMealInput with valid draft returns isValid=true and empty errors', () => {
  const validDraft: MealFormDraft = {
    name: 'Petto di pollo con riso basmati',
    mealType: 'pranzo',
    calories: 550,
    proteinG: 45,
    carbsG: 60,
    fatsG: 10,
  };

  const result = validateMealInput(validDraft);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('2. validateMealInput rejects empty or whitespace-only meal name with Italian error', () => {
  const emptyNameDraft: MealFormDraft = {
    ...DEFAULT_MEAL_DRAFT,
    name: '   ',
  };

  const result = validateMealInput(emptyNameDraft);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.name);
  assert.match(result.errors.name, /Inserisci il nome del piatto/);
});

test('3. validateMealInput validates calories bounds (0 to 3000 kcal)', () => {
  // Negative calories
  const negResult = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Mela', calories: -1 });
  assert.equal(negResult.isValid, false);
  assert.match(negResult.errors.calories, /Le calorie devono essere comprese tra 0 e 3[.]?000 kcal/);

  // Excessive calories
  const highResult = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Banchetto', calories: 3500 });
  assert.equal(highResult.isValid, false);
  assert.match(highResult.errors.calories, /3[.]?000 kcal/);

  // NaN / invalid
  const nanResult = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Snack', calories: NaN });
  assert.equal(nanResult.isValid, false);
  assert.ok(nanResult.errors.calories);

  // Exact boundary 0
  const zeroCalResult = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Acqua / Tè', calories: 0 });
  assert.equal(zeroCalResult.isValid, true);

  // Exact boundary 3000
  const maxCalResult = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Pasto calorico', calories: 3000 });
  assert.equal(maxCalResult.isValid, true);
});

test('4. validateMealInput validates protein bounds (0 to 300 g)', () => {
  const negProtein = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Cibo', proteinG: -5 });
  assert.equal(negProtein.isValid, false);
  assert.match(negProtein.errors.proteinG, /I grammi di proteine devono essere compresi tra 0 e 300g/);

  const highProtein = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Cibo', proteinG: 350 });
  assert.equal(highProtein.isValid, false);
  assert.match(highProtein.errors.proteinG, /300g/);
});

test('5. validateMealInput validates carbs bounds (0 to 500 g)', () => {
  const negCarbs = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Pasta', carbsG: -1 });
  assert.equal(negCarbs.isValid, false);
  assert.match(negCarbs.errors.carbsG, /I grammi di carboidrati devono essere compresi tra 0 e 500g/);

  const highCarbs = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Pasta', carbsG: 600 });
  assert.equal(highCarbs.isValid, false);
  assert.match(highCarbs.errors.carbsG, /500g/);
});

test('6. validateMealInput validates fats bounds (0 to 300 g)', () => {
  const negFats = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Olio', fatsG: -2 });
  assert.equal(negFats.isValid, false);
  assert.match(negFats.errors.fatsG, /I grammi di grassi devono essere compresi tra 0 e 300g/);

  const highFats = validateMealInput({ ...DEFAULT_MEAL_DRAFT, name: 'Olio', fatsG: 350 });
  assert.equal(highFats.isValid, false);
  assert.match(highFats.errors.fatsG, /300g/);
});

test('7. isMealDraftDirty detects pristine vs modified draft for safe modal close', () => {
  const baseline: MealFormDraft = {
    name: '',
    mealType: 'pranzo',
    calories: 450,
    proteinG: 35,
    carbsG: 45,
    fatsG: 12,
  };

  // Identical draft is not dirty
  assert.equal(isMealDraftDirty({ ...baseline }, baseline), false);

  // Changing name marks dirty
  assert.equal(isMealDraftDirty({ ...baseline, name: 'Tonno' }, baseline), true);

  // Changing meal type marks dirty
  assert.equal(isMealDraftDirty({ ...baseline, mealType: 'cena' }, baseline), true);

  // Changing any macronutrient marks dirty
  assert.equal(isMealDraftDirty({ ...baseline, calories: 500 }, baseline), true);
  assert.equal(isMealDraftDirty({ ...baseline, proteinG: 40 }, baseline), true);
  assert.equal(isMealDraftDirty({ ...baseline, carbsG: 50 }, baseline), true);
  assert.equal(isMealDraftDirty({ ...baseline, fatsG: 15 }, baseline), true);

  // Trailing whitespace alone does not mark dirty if trim matches
  assert.equal(isMealDraftDirty({ ...baseline, name: '  ' }, baseline), false);
});

test('8. getMealTypeNextIndex handles keyboard arrow navigation with cyclic wrapping', () => {
  const total = 4; // colazione, pranzo, spuntino, cena

  // Forward navigation
  assert.equal(getMealTypeNextIndex(0, total, 'next'), 1);
  assert.equal(getMealTypeNextIndex(1, total, 'next'), 2);
  assert.equal(getMealTypeNextIndex(2, total, 'next'), 3);
  assert.equal(getMealTypeNextIndex(3, total, 'next'), 0); // wrap to first

  // Backward navigation
  assert.equal(getMealTypeNextIndex(0, total, 'prev'), 3); // wrap to last
  assert.equal(getMealTypeNextIndex(3, total, 'prev'), 2);
  assert.equal(getMealTypeNextIndex(2, total, 'prev'), 1);
  assert.equal(getMealTypeNextIndex(1, total, 'prev'), 0);

  // Edge cases
  assert.equal(getMealTypeNextIndex(0, 0, 'next'), 0);
  assert.equal(getMealTypeNextIndex(0, 1, 'next'), 0);
});

test('9. MEAL_CONSTRAINTS and MEAL_A11Y_IDS provide consistent definitions', () => {
  assert.equal(MEAL_CONSTRAINTS.calories.unit, 'kcal');
  assert.equal(MEAL_CONSTRAINTS.protein.unit, 'g');
  assert.equal(MEAL_CONSTRAINTS.carbs.unit, 'g');
  assert.equal(MEAL_CONSTRAINTS.fats.unit, 'g');

  assert.equal(MEAL_A11Y_IDS.dialogTitle, 'add-meal-modal-title');
  assert.equal(MEAL_A11Y_IDS.dialogDesc, 'add-meal-modal-desc');
  assert.equal(MEAL_A11Y_IDS.mealTypeButton('colazione'), 'meal-type-btn-colazione');
  assert.equal(MEAL_A11Y_IDS.mealTypeButton('pranzo'), 'meal-type-btn-pranzo');
  assert.equal(MEAL_A11Y_IDS.discardDialogTitle, 'discard-confirm-title');
  assert.equal(MEAL_A11Y_IDS.dateInput, 'meal-date-input');
  assert.equal(MEAL_A11Y_IDS.dateLabel, 'meal-date-label');
  assert.equal(MEAL_A11Y_IDS.dateError, 'meal-date-error');
  assert.equal(MEAL_A11Y_IDS.dateHelp, 'meal-date-help');
});

test('10. getEffectiveTodayKey respects simulatedDate or returns valid ISO date', () => {
  // Simulated date
  const simProfile: any = { simulatedDate: '2026-10-17' };
  assert.equal(getEffectiveTodayKey(simProfile), '2026-10-17');

  // Without simulated date: returns YYYY-MM-DD
  const regularKey = getEffectiveTodayKey();
  assert.match(regularKey, /^\d{4}-\d{2}-\d{2}$/);
});

test('11. getShiftedDateKey shifts days and crosses month and year boundaries correctly', () => {
  assert.equal(getShiftedDateKey('2026-10-18', -1), '2026-10-17');
  assert.equal(getShiftedDateKey('2026-10-18', 1), '2026-10-19');
  assert.equal(getShiftedDateKey('2026-10-01', -1), '2026-09-30');
  assert.equal(getShiftedDateKey('2026-01-01', -1), '2025-12-31');
  assert.equal(getShiftedDateKey('2026-12-31', 1), '2027-01-01');
});

test('12. formatFullMealDate and formatShortMealDate format Italian dates with relative tags', () => {
  const todayKey = '2026-10-18'; // Domenica
  const yesterdayKey = '2026-10-17'; // Sabato
  const otherKey = '2026-10-15'; // Giovedì

  // Full date with todayKey
  assert.match(formatFullMealDate(todayKey, todayKey), /Oggi · Domenica 18 Ottobre 2026/);
  assert.match(formatFullMealDate(yesterdayKey, todayKey), /Ieri · Sabato 17 Ottobre 2026/);
  assert.match(formatFullMealDate(otherKey, todayKey), /Giovedì 15 Ottobre 2026/);

  // Short date
  assert.equal(formatShortMealDate(todayKey, todayKey), 'Oggi · Dom 18 Ott');
  assert.equal(formatShortMealDate(yesterdayKey, todayKey), 'Ieri · Sab 17 Ott');
  assert.equal(formatShortMealDate(otherKey, todayKey), 'Gio 15 Ott');
});

test('13. validateMealInput validates custom date format if specified', () => {
  const validDraft: MealFormDraft = {
    ...DEFAULT_MEAL_DRAFT,
    name: 'Yogurt',
    date: '2026-10-18',
  };
  assert.equal(validateMealInput(validDraft).isValid, true);

  const invalidDraft: MealFormDraft = {
    ...DEFAULT_MEAL_DRAFT,
    name: 'Yogurt',
    date: '18-10-2026', // wrong format
  };
  const invalidRes = validateMealInput(invalidDraft);
  assert.equal(invalidRes.isValid, false);
  assert.ok(invalidRes.errors.date);
  assert.match(invalidRes.errors.date, /AAAA-MM-GG/);
});

test('14. isMealDraftDirty detects changes in date from baseline', () => {
  const baseline: MealFormDraft = {
    ...DEFAULT_MEAL_DRAFT,
    name: 'Riso',
    date: '2026-10-18',
  };

  assert.equal(isMealDraftDirty({ ...baseline }, baseline), false);
  assert.equal(isMealDraftDirty({ ...baseline, date: '2026-10-17' }, baseline), true);
});

test('15. validateMealInput and isMealDraftDirty support sugars and fiber correctly', () => {
  const validDraft: MealFormDraft = {
    ...DEFAULT_MEAL_DRAFT,
    name: 'Macedonia e Noci',
    sugarsG: 22,
    fiberG: 6,
  };
  const res = validateMealInput(validDraft);
  assert.equal(res.isValid, true);

  // Negative sugars
  const negSugars = validateMealInput({ ...validDraft, sugarsG: -3 });
  assert.equal(negSugars.isValid, false);
  assert.match(negSugars.errors.sugarsG, /zuccheri/i);

  // Negative fiber
  const negFiber = validateMealInput({ ...validDraft, fiberG: -2 });
  assert.equal(negFiber.isValid, false);
  assert.match(negFiber.errors.fiberG, /fibre/i);

  // Dirty detection on sugars and fiber
  assert.equal(isMealDraftDirty({ ...validDraft, sugarsG: 30 }, validDraft), true);
  assert.equal(isMealDraftDirty({ ...validDraft, fiberG: 10 }, validDraft), true);
});

test('16. isMealDraftDirty detects changes in imageUrl and notes', () => {
  const baseline: MealFormDraft = {
    ...DEFAULT_MEAL_DRAFT,
    name: 'Petto di pollo',
    notes: 'Cottura alla piastra',
    imageUrl: 'data:image/jpeg;base64,...',
  };

  assert.equal(isMealDraftDirty({ ...baseline }, baseline), false);
  assert.equal(isMealDraftDirty({ ...baseline, notes: 'Aggiunto limone' }, baseline), true);
  assert.equal(isMealDraftDirty({ ...baseline, imageUrl: 'data:image/jpeg;base64,new...' }, baseline), true);
});

