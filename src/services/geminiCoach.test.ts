import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNutritionFromTextAndImage,
  extractMealEstimate,
  estimateMealWithAI,
} from './geminiCoach';

test('1. parseNutritionFromTextAndImage parses quantities BEFORE food keywords correctly', () => {
  const result = parseNutritionFromTextAndImage('100g riso, 150g petto di pollo e 10g olio');
  const est = result.mealEstimate;

  assert.ok(est);
  // Riso 100g: 7P, 78C, 1G
  // Pollo 150g: 36P, 0C, 3.8G
  // Olio 10g: 0P, 0C, 10G
  // Totals: P: 43g, C: 78g, F: 15g
  // Atwater: 43*4 + 78*4 + 15*9 = 172 + 312 + 135 = 619 kcal
  assert.equal(est.proteinG, 43);
  assert.equal(est.carbsG, 78);
  assert.equal(est.fatsG, 15);
  assert.equal(est.calories, 619);
  // Atwater mathematical identity check
  assert.equal(est.calories, Math.round(est.proteinG * 4 + est.carbsG * 4 + est.fatsG * 9));
  assert.match(est.name, /Riso/);
  assert.match(est.name, /Pollo/);
});

test('2. parseNutritionFromTextAndImage parses quantities AFTER food keywords (bidirectional ordering)', () => {
  // Natural Italian input: food name first, weight second
  const result = parseNutritionFromTextAndImage('pasta 80g e tonno 100g e 1 cucchiaio olio');
  const est = result.mealEstimate;

  assert.ok(est);
  // Pasta 80g: 9.6P, 57.6C, 1.2G
  // Tonno 100g: 24P, 0C, 1G
  // Olio 10g: 0P, 0C, 10G
  // Total P: ~34g, C: ~58g, F: ~12g
  // Atwater: 34*4 + 58*4 + 12*9 = 136 + 232 + 108 = 476 kcal
  assert.ok(est.proteinG >= 33 && est.proteinG <= 35);
  assert.ok(est.carbsG >= 56 && est.carbsG <= 60);
  assert.ok(est.fatsG >= 11 && est.fatsG <= 13);
  assert.equal(est.calories, Math.round(est.proteinG * 4 + est.carbsG * 4 + est.fatsG * 9));
  assert.match(est.name, /Pasta/);
  assert.match(est.name, /Tonno/);
});

test('3. parseNutritionFromTextAndImage detects breakfast items with ml and sets colazione', () => {
  const result = parseNutritionFromTextAndImage('80g avena con 200ml latte e 20g noci');
  const est = result.mealEstimate;

  assert.ok(est);
  assert.equal(est.mealType, 'colazione');
  // Avena 80g (10.4P) + Latte 200ml (6.6P) + Noci 20g (4.0P) = 21g P
  assert.ok(est.proteinG >= 20);
  assert.ok(est.carbsG >= 60);
  assert.ok(est.fatsG >= 15);
  assert.equal(est.calories, Math.round(est.proteinG * 4 + est.carbsG * 4 + est.fatsG * 9));
  assert.match(est.name, /Avena/);
});

test('4. parseNutritionFromTextAndImage handles snack, whey and banana with Atwater consistency', () => {
  const result = parseNutritionFromTextAndImage('30g whey in polvere e 1 banana');
  const est = result.mealEstimate;

  assert.ok(est);
  assert.equal(est.mealType, 'spuntino');
  assert.equal(est.proteinG, 25);
  assert.equal(est.carbsG, 25);
  assert.equal(est.fatsG, 2);
  assert.equal(est.calories, 218);
  assert.equal(est.calories, Math.round(est.proteinG * 4 + est.carbsG * 4 + est.fatsG * 9));
});

test('5. parseNutritionFromTextAndImage handles image attachment without text gracefully', () => {
  const result = parseNutritionFromTextAndImage('', true, 'pranzo');
  const est = result.mealEstimate;

  assert.ok(est);
  assert.equal(est.proteinG, 38);
  assert.equal(est.carbsG, 60);
  assert.equal(est.fatsG, 14);
  assert.equal(est.calories, 518);
  assert.equal(est.calories, Math.round(est.proteinG * 4 + est.carbsG * 4 + est.fatsG * 9));
  assert.equal(est.mealType, 'pranzo');
  assert.match(est.name, /Piatto da Foto/);
});

test('6. parseNutritionFromTextAndImage recognizes extended sports foods (mozzarella, legumi, avocado)', () => {
  const result = parseNutritionFromTextAndImage('mozzarella 125g e pomodori con avocado 50g');
  const est = result.mealEstimate;

  assert.ok(est);
  // Mozzarella 125g: ~24P, 1C, 24G
  // Avocado 50g: ~1P, 5C, 8G
  assert.ok(est.proteinG >= 23);
  assert.ok(est.fatsG >= 30);
  assert.equal(est.calories, Math.round(est.proteinG * 4 + est.carbsG * 4 + est.fatsG * 9));
  assert.match(est.name, /Mozzarella/);
});

test('7. extractMealEstimate parses structured [MEAL_DATA:{...}] correctly', () => {
  const rawText = `Ecco l'analisi nutrizionale del piatto:
Totale calorie: 520 kcal
Proteine: 40g | Carbo: 65g | Grassi: 10g

[MEAL_DATA:{"name":"Omelette e Toast","mealType":"colazione","calories":520,"proteinG":40,"carbsG":65,"fatsG":10}]`;

  const parsed = extractMealEstimate(rawText);
  assert.ok(parsed.mealEstimate);
  assert.equal(parsed.mealEstimate.name, 'Omelette e Toast');
  assert.equal(parsed.mealEstimate.mealType, 'colazione');
  assert.equal(parsed.mealEstimate.calories, 520);
  assert.equal(parsed.mealEstimate.proteinG, 40);
  assert.equal(parsed.mealEstimate.carbsG, 65);
  assert.equal(parsed.mealEstimate.fatsG, 10);
  assert.ok(!parsed.text.includes('MEAL_DATA'));
});

test('8. estimateMealWithAI provides seamless fallback estimation in offline mode', async () => {
  const result = await estimateMealWithAI({
    foodDescription: '2 uova e 80g pane integrale e 10g olio',
    currentMealType: 'colazione',
  });

  assert.ok(result.mealEstimate);
  assert.equal(result.mealEstimate.mealType, 'colazione');
  assert.ok(result.mealEstimate.calories > 350);
  assert.ok(result.mealEstimate.proteinG >= 18);
  assert.equal(result.mealEstimate.calories, Math.round(result.mealEstimate.proteinG * 4 + result.mealEstimate.carbsG * 4 + result.mealEstimate.fatsG * 9));
  assert.ok(result.text.length > 0);
});
