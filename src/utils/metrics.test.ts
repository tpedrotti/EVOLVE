import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateComplianceRate,
  calculateVolumeAdherence,
  calculateCalorieCycling,
  classifyDayIntake,
  generateLiveNotifications,
} from './metrics.ts';
import {
  getWeeklyHydrationData,
  getMonthlyHydrationData,
  getAnnualHydrationData,
} from './hydration.ts';

test('1. calculateComplianceRate computes exact 5/7 = 71,4%', () => {
  const result = calculateComplianceRate(5, 7);
  assert.equal(result.numerator, 5);
  assert.equal(result.denominator, 7);
  assert.equal(result.percentage, 71.4);
  assert.equal(result.formattedPct, '71,4%');
  assert.equal(result.displayLabel, '5/7 (71,4%)');
  assert.equal(result.isValid, true);
});

test('2. calculateComplianceRate computes exact 28/30 = 93,3%', () => {
  const result = calculateComplianceRate(28, 30);
  assert.equal(result.numerator, 28);
  assert.equal(result.denominator, 30);
  assert.equal(result.percentage, 93.3);
  assert.equal(result.formattedPct, '93,3%');
  assert.equal(result.displayLabel, '28/30 (93,3%)');
  assert.equal(result.isValid, true);
});

test('3. calculateComplianceRate handles denominatore zero safely without crash or NaN', () => {
  const zeroDenom = calculateComplianceRate(5, 0);
  assert.equal(zeroDenom.isValid, false);
  assert.equal(zeroDenom.percentage, 0);
  assert.equal(zeroDenom.displayLabel, 'Non disponibile');

  const zeroBoth = calculateComplianceRate(0, 0);
  assert.equal(zeroBoth.isValid, false);
  assert.equal(zeroBoth.percentage, 0);
  assert.equal(zeroBoth.displayLabel, 'Non disponibile');

  const negativeDenom = calculateComplianceRate(3, -5);
  assert.equal(negativeDenom.isValid, false);
  assert.equal(negativeDenom.displayLabel, 'Non disponibile');

  const nanDenom = calculateComplianceRate(NaN, NaN);
  assert.equal(nanDenom.isValid, false);
  assert.equal(nanDenom.displayLabel, 'Non disponibile');
});

test('4. Cambio periodo generates correct aggregations across Settimana, Mese, Anno', () => {
  const mockHistory: Record<string, number> = {
    '2026-10-12': 3.1, // Lun
    '2026-10-13': 3.0, // Mar
    '2026-10-14': 2.8, // Mer
    '2026-10-15': 3.2, // Gio
    '2026-10-16': 3.0, // Ven
    '2026-10-17': 2.5, // Sab (oggi)
  };
  const refDate = new Date('2026-10-17T12:00:00Z'); // Sabato

  // A. Settimana: Lun-Dom (Lun-Sab are elapsed = 6 elapsed days)
  const weekData = getWeeklyHydrationData(mockHistory, 3.0, refDate);
  assert.equal(weekData.elapsedDaysCount, 6);
  assert.equal(weekData.days.length, 7);
  assert.equal(weekData.days[6].isFuture, true); // Domenica is future

  // B. Mese: 30 days
  const monthData = getMonthlyHydrationData(mockHistory, 3.0, refDate);
  assert.equal(monthData.elapsedDaysCount, 30);
  assert.ok(monthData.complianceResult.isValid);

  // C. Anno: 12 months with future months excluded
  const yearData = getAnnualHydrationData(mockHistory, 3.0, refDate);
  assert.equal(yearData.months.length, 12);
  assert.equal(yearData.elapsedMonthsCount, 10); // Gen-Ott = 10 months
  assert.equal(yearData.futureMonthsCount, 2); // Nov-Dic = 2 months
});

test('5. Esclusione dei mesi futuri dal consuntivo annuale', () => {
  const mockHistory: Record<string, number> = {};
  const refDate = new Date('2026-10-17T12:00:00Z'); // Month is Ottobre (index 9)

  const annual = getAnnualHydrationData(mockHistory, 3.0, refDate);

  // Gen to Ott are elapsed (10 months)
  assert.equal(annual.elapsedMonthsCount, 10);
  assert.equal(annual.futureMonthsCount, 2);

  // Check future months Nov and Dic
  const nov = annual.months[10];
  const dic = annual.months[11];
  assert.equal(nov.isFuture, true);
  assert.equal(nov.liters, null);
  assert.equal(nov.displayLiters, 'Non disponibile');
  assert.equal(nov.status, 'future');

  assert.equal(dic.isFuture, true);
  assert.equal(dic.liters, null);
  assert.equal(dic.displayLiters, 'Non disponibile');

  // Check that consuntivo average is calculated over 10 months, not 12
  assert.ok(annual.dailyConsuntivoAverage > 0);
  assert.ok(annual.complianceResult.denominator === 10); // 10 elapsed months
  assert.notEqual(annual.complianceResult.denominator, 12);
});

test('6. Idratazione coerente tra Home e notifiche con timestamp', () => {
  // Scenario A: Home water is 0.0 L
  const notifsZero = generateLiveNotifications({
    todayWaterLiters: 0.0,
    hydrationGoalLiters: 3.0,
    todayCalories: 2220,
    targetCalories: 2850,
    workoutTitle: 'Push Day',
  });
  const hydraNotifZero = notifsZero.find((n) => n.category === 'hydration');
  assert.ok(hydraNotifZero);
  assert.ok(hydraNotifZero.message.includes('0.0 L'));
  assert.ok(hydraNotifZero.message.includes('0%'));
  assert.ok(hydraNotifZero.timestamp.startsWith('Oggi, '));
  assert.equal(hydraNotifZero.valueContext, '0.0 / 3.0 L');

  // Scenario B: Home water is 2.1 L
  const notifs21 = generateLiveNotifications({
    todayWaterLiters: 2.1,
    hydrationGoalLiters: 3.0,
    todayCalories: 2220,
    targetCalories: 2850,
    workoutTitle: 'Push Day',
  });
  const hydraNotif21 = notifs21.find((n) => n.category === 'hydration');
  assert.ok(hydraNotif21);
  assert.ok(hydraNotif21.message.includes('2.1 L'));
  assert.ok(hydraNotif21.message.includes('70%'));
  assert.equal(hydraNotif21.valueContext, '2.1 / 3.0 L');
});

test('7. Distinzione tra giorno senza registrazioni (undefined) e giorno con valore zero (0.0)', () => {
  const unrecorded = classifyDayIntake(undefined, false);
  assert.equal(unrecorded.status, 'unrecorded');
  assert.equal(unrecorded.displayValue, 'Non disponibile');
  assert.equal(unrecorded.liters, null);
  assert.equal(unrecorded.isAvailable, false);

  const zeroVal = classifyDayIntake(0.0, false);
  assert.equal(zeroVal.status, 'zero');
  assert.equal(zeroVal.displayValue, '0.0 L');
  assert.equal(zeroVal.liters, 0);
  assert.equal(zeroVal.isAvailable, true);

  const recorded = classifyDayIntake(2.8, false);
  assert.equal(recorded.status, 'recorded');
  assert.equal(recorded.displayValue, '2.8 L');
  assert.equal(recorded.liters, 2.8);

  const future = classifyDayIntake(null, true);
  assert.equal(future.status, 'future');
  assert.equal(future.displayValue, 'Non disponibile');
});

test('8. Calorie cycling: weighted average of ON and OFF days matches active daily target', () => {
  const target = 2850;
  const weeklyDays = 4;
  const cycling = calculateCalorieCycling(target, weeklyDays);

  assert.equal(cycling.targetCalories, 2850);
  assert.equal(cycling.weeklyDays, 4);
  assert.equal(cycling.restDays, 3);
  assert.equal(cycling.onCalories, 2900);
  assert.equal(cycling.offCalories, 2783);

  // (4 * 2900 + 3 * 2783) / 7 = (11600 + 8349) / 7 = 19949 / 7 = 2849.85 ~ 2850 kcal!
  assert.equal(Math.round(cycling.weightedAverage), 2850);
});

test('9. Volume adherence vs Days compliance are distinct concepts', () => {
  // Volume adherence: actual average / goal
  const volResult = calculateVolumeAdherence(2.85, 3.0);
  assert.equal(volResult.percentage, 95.0);
  assert.equal(volResult.formattedPct, '95,0%');

  // Days compliance: 5 days met target out of 7 days
  const daysResult = calculateComplianceRate(5, 7);
  assert.equal(daysResult.percentage, 71.4);
  assert.equal(daysResult.formattedPct, '71,4%');

  // Assert they are numerically distinct
  assert.notEqual(volResult.percentage, daysResult.percentage);
});
