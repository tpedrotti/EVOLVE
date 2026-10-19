import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBMR,
  calculateTDEE,
  calculateTargetNutrition,
  calculate12WeekProjection,
  calculateHydrationGoal,
} from './fitnessLogic.ts';
import type { UserProfile } from '../types/index.ts';

test('calculateBMR calculates correct basal metabolic rate for male and female', () => {
  const maleBMR = calculateBMR('uomo', 78.5, 182, 29);
  assert.equal(maleBMR, 1783);

  const femaleBMR = calculateBMR('donna', 60, 165, 25);
  assert.equal(femaleBMR, 1345);
});

test('calculateTDEE scales with weekly training frequency', () => {
  const bmr = 1783;
  const tdee4 = calculateTDEE(bmr, 4);
  const tdee5 = calculateTDEE(bmr, 5);
  assert.equal(tdee4, 2675);
  assert.equal(tdee5, 2853);
});

test('calculateTargetNutrition returns exact reference target for default Luca profile', () => {
  const defaultProfile: UserProfile = {
    name: 'Luca',
    sex: 'uomo',
    age: 29,
    heightCm: 182,
    weightKg: 78.5,
    targetWeightKg: 82.0,
    goal: 'crescita',
    experience: 'intermediate',
    weeklyDays: 4,
    selectedDays: ['Lun', 'Mar', 'Gio', 'Ven'],
    equipment: ['Palestra completa'],
    dietaryPreferences: ['Onnivoro / Alto contenuto proteico', 'Senza lattosio'],
  };

  const nutrition = calculateTargetNutrition(defaultProfile);
  assert.equal(nutrition.calories, 2850);
  assert.equal(nutrition.surplusDeficitLabel, 'Surplus +300');
  assert.equal(nutrition.proteinGrams, 174);
  assert.equal(nutrition.fatsPct, 25);
  assert.ok(nutrition.carbsGrams > 300);
});

test('calculate12WeekProjection computes proper milestone points', () => {
  const profile: UserProfile = {
    name: 'Luca',
    sex: 'uomo',
    age: 29,
    heightCm: 182,
    weightKg: 78.5,
    targetWeightKg: 82.0,
    goal: 'crescita',
    experience: 'intermediate',
    weeklyDays: 4,
    selectedDays: ['Lun', 'Mar', 'Gio', 'Ven'],
    equipment: ['Palestra completa'],
    dietaryPreferences: ['Onnivoro / Alto contenuto proteico'],
  };

  const projection = calculate12WeekProjection(profile);
  assert.equal(projection.points.length, 3);
  assert.equal(projection.points[0].weightKg, 78.5);
  assert.equal(projection.totalDeltaKg, 3.8);
  assert.equal(projection.points[2].weightKg, 82.3);
});

test('calculateHydrationGoal returns realistic liters per day', () => {
  const hydration = calculateHydrationGoal(78.5);
  assert.equal(hydration, 3.0);
});
