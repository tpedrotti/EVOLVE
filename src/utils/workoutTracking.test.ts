import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEstimated1RM,
  getExerciseLoadType,
  getLoadTypeLabel,
  calculateSetVolume,
  getLastExerciseSession,
  getExerciseHistory,
  calculateExercisePRs,
  calculateProgressionProposal,
  isSetModified,
  parseTargetRepsRange,
  loadWorkoutHistory,
  type RpeLevel,
  RPE_SCALE,
  getExerciseProgressionData,
  getGymGlobalTrendMetrics,
  getEffectiveWorkoutHistory,
  getCalibratedDemoWorkoutHistory,
} from './workoutTracking.ts';
import type { WorkoutSessionLog, ExerciseItem } from '../types/index.ts';

test('1. calculateEstimated1RM correctly handles exact 1 rep measurement without estimation', () => {
  const result = calculateEstimated1RM(100, 1, 'total');
  assert.equal(result.isApplicable, true);
  assert.equal(result.isExactMeasurement, true);
  assert.equal(result.estimated1RM, 100);
  assert.match(result.formulaName, /1RM reale/);
});

test('2. calculateEstimated1RM computes Epley formula for standard 2-12 rep range', () => {
  // 100 kg * (1 + 10/30) = 133.33 -> 133.3 kg
  const res100x10 = calculateEstimated1RM(100, 10, 'total');
  assert.equal(res100x10.isApplicable, true);
  assert.equal(res100x10.isExactMeasurement, false);
  assert.equal(res100x10.estimated1RM, 133.3);
  assert.match(res100x10.formulaName, /Epley/);

  // 26 kg * (1 + 6/30) = 26 * 1.2 = 31.2 kg
  const resDumbbell = calculateEstimated1RM(26, 6, 'dumbbell');
  assert.equal(resDumbbell.isApplicable, true);
  assert.equal(resDumbbell.estimated1RM, 31.2);
});

test('3. calculateEstimated1RM strictly excludes incompatible cases (reps > 12, 0 load, bodyweight without load)', () => {
  // Reps > 12 (scientific unreliability for 1RM)
  const highReps = calculateEstimated1RM(50, 15, 'total');
  assert.equal(highReps.isApplicable, false);
  assert.equal(highReps.estimated1RM, null);
  assert.match(highReps.reasonNotApplicable || '', /> 12 rep/);

  // 0 kg load
  const zeroLoad = calculateEstimated1RM(0, 10, 'total');
  assert.equal(zeroLoad.isApplicable, false);
  assert.equal(zeroLoad.estimated1RM, null);

  // Negative reps or load
  const negReps = calculateEstimated1RM(60, -2, 'total');
  assert.equal(negReps.isApplicable, false);

  // Bodyweight with 0 added load
  const bwZero = calculateEstimated1RM(0, 10, 'bodyweight');
  assert.equal(bwZero.isApplicable, false);
  assert.match(bwZero.reasonNotApplicable || '', /corpo libero/);
});

test('4. getExerciseLoadType and labels distinguish dumbbell, total, and bodyweight', () => {
  // Dumbbell
  const dumbbellEx = { name: 'Panca inclinata 30° con manubri' };
  assert.equal(getExerciseLoadType(dumbbellEx), 'dumbbell');
  assert.equal(getLoadTypeLabel('dumbbell'), 'Kg per manubrio');

  // Barbell / Machine / Cable
  const chestPressEx = { name: 'Chest Press convergente' };
  assert.equal(getExerciseLoadType(chestPressEx), 'total');
  assert.equal(getLoadTypeLabel('total'), 'Kg totali');

  // Bodyweight
  const hyperextEx = { name: 'Hyperextension' };
  assert.equal(getExerciseLoadType(hyperextEx), 'bodyweight');
  assert.equal(getLoadTypeLabel('bodyweight'), 'Peso corporeo (+kg zavorra)');

  // Explicit override
  const customEx = { name: 'Press speciale', loadType: 'dumbbell' as const };
  assert.equal(getExerciseLoadType(customEx), 'dumbbell');
});

test('5. calculateSetVolume accounts for both dumbbells on dumbbell exercises', () => {
  // Dumbbell: 2 * 26 kg * 10 reps = 520 kg
  assert.equal(calculateSetVolume(26, 10, 'dumbbell'), 520);

  // Total (barbell/machine): 65 kg * 10 reps = 650 kg
  assert.equal(calculateSetVolume(65, 10, 'total'), 650);

  // Edge cases
  assert.equal(calculateSetVolume(0, 10, 'total'), 0);
  assert.equal(calculateSetVolume(50, 0, 'total'), 0);
});

test('6. getExerciseHistory isolates data and does NOT mix different exercises', () => {
  const mockHistory: WorkoutSessionLog[] = [
    {
      id: 'session-1',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto',
      date: '2026-10-12',
      startTime: '18:00',
      durationSeconds: 3600,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's1', setNum: 1, weightKg: 65, reps: 10, isCompleted: true },
            { setId: 's2', setNum: 2, weightKg: 65, reps: 10, isCompleted: true },
            { setId: 's3', setNum: 3, weightKg: 65, reps: 10, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-102',
          exerciseName: 'Panca inclinata 30° con manubri',
          muscleGroup: 'Pettorali',
          loadType: 'dumbbell',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's4', setNum: 1, weightKg: 26, reps: 10, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'session-2',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto',
      date: '2026-10-05',
      startTime: '18:00',
      durationSeconds: 3600,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-05',
          sets: [
            { setId: 's5', setNum: 1, weightKg: 60, reps: 10, isCompleted: true },
          ],
        },
      ],
    },
  ];

  // History for ex-101 must have 2 entries and never contain ex-102
  const hist101 = getExerciseHistory('ex-101', mockHistory);
  assert.equal(hist101.length, 2);
  assert.equal(hist101[0].exerciseLog.exerciseId, 'ex-101');
  assert.equal(hist101[1].exerciseLog.exerciseId, 'ex-101');

  // History for ex-102 must have only 1 entry
  const hist102 = getExerciseHistory('ex-102', mockHistory);
  assert.equal(hist102.length, 1);
  assert.equal(hist102[0].exerciseLog.exerciseId, 'ex-102');

  // Last session for ex-101 returns the newest (session-1 with 65kg)
  const last101 = getLastExerciseSession('ex-101', mockHistory);
  assert.ok(last101);
  assert.equal(last101?.sets[0].weightKg, 65);

  // Unknown exercise returns empty/null
  assert.equal(getLastExerciseSession('ex-unknown', mockHistory), null);
  assert.equal(getExerciseHistory('ex-unknown', mockHistory).length, 0);
});

test('7. calculateExercisePRs links each PR directly to the exact set and session that created it', () => {
  const mockHistory: WorkoutSessionLog[] = [
    {
      id: 'session-2026-10-12',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto',
      date: '2026-10-12',
      startTime: '18:00',
      durationSeconds: 3600,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's1', setNum: 1, weightKg: 65, reps: 10, isCompleted: true },
            { setId: 's2', setNum: 2, weightKg: 70, reps: 8, isCompleted: true }, // Max weight set
            { setId: 's3', setNum: 3, weightKg: 65, reps: 12, isCompleted: true }, // Max set volume: 65 * 12 = 780
          ],
        },
      ],
    },
  ];

  const prs = calculateExercisePRs('ex-101', mockHistory);
  assert.ok(prs.length >= 2);

  const maxWeightPR = prs.find((p) => p.metric === 'max_weight');
  assert.ok(maxWeightPR);
  assert.equal(maxWeightPR?.value, 70);
  assert.equal(maxWeightPR?.sessionId, 'session-2026-10-12');
  assert.equal(maxWeightPR?.setNum, 2);
  assert.equal(maxWeightPR?.date, '2026-10-12');
  assert.equal(maxWeightPR?.reps, 8);

  const maxSetVolPR = prs.find((p) => p.metric === 'max_volume_set');
  assert.ok(maxSetVolPR);
  assert.equal(maxSetVolPR?.value, 780);
  assert.equal(maxSetVolPR?.setNum, 3);
});

test('8. calculateProgressionProposal handles insufficient data and target completion correctly', () => {
  const exercise: ExerciseItem = {
    id: 'ex-101',
    name: 'Chest Press convergente',
    setsReps: '3 × 6-10',
    targetWeightKg: 65,
    muscleGroup: 'Pettorali',
  };

  // Case A: 0 past sessions -> insufficient data
  const emptyProposal = calculateProgressionProposal(exercise, []);
  assert.equal(emptyProposal.hasSufficientData, false);
  assert.equal(emptyProposal.canProgress, false);
  assert.match(emptyProposal.ruleDescription, /Non ci sono ancora sessioni registrate/);

  // Case B: Completed session hit top of range on all 3 sets (10 reps) -> canProgress true
  const successHistory: WorkoutSessionLog[] = [
    {
      id: 'session-win',
      routineId: 'push-day',
      routineTitle: 'Giorno 1',
      date: '2026-10-12',
      startTime: '18:00',
      durationSeconds: 3000,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's1', setNum: 1, weightKg: 65, reps: 10, isCompleted: true },
            { setId: 's2', setNum: 2, weightKg: 65, reps: 10, isCompleted: true },
            { setId: 's3', setNum: 3, weightKg: 65, reps: 10, isCompleted: true },
          ],
        },
      ],
    },
  ];

  const winProposal = calculateProgressionProposal(exercise, successHistory);
  assert.equal(winProposal.hasSufficientData, true);
  assert.equal(winProposal.canProgress, true);
  assert.equal(winProposal.deltaKg, 5); // >= 60 kg total load -> +5 kg
  assert.equal(winProposal.proposedWeightKg, 70);
  assert.match(winProposal.ruleName, /Doppia Progressione/);

  // Case C: Target not fully reached on all sets (e.g. 10, 9, 8 reps) -> canProgress false
  const partialHistory: WorkoutSessionLog[] = [
    {
      id: 'session-part',
      routineId: 'push-day',
      routineTitle: 'Giorno 1',
      date: '2026-10-12',
      startTime: '18:00',
      durationSeconds: 3000,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's1', setNum: 1, weightKg: 65, reps: 10, isCompleted: true },
            { setId: 's2', setNum: 2, weightKg: 65, reps: 9, isCompleted: true },
            { setId: 's3', setNum: 3, weightKg: 65, reps: 8, isCompleted: true },
          ],
        },
      ],
    },
  ];

  const partProposal = calculateProgressionProposal(exercise, partialHistory);
  assert.equal(partProposal.hasSufficientData, true);
  assert.equal(partProposal.canProgress, false);
  assert.match(partProposal.ruleName, /Consolidamento/);
  assert.match(partProposal.ruleDescription, /10-9-8/);
});

test('9. isSetModified protects user changes from silent overwrite', () => {
  // Pristine set
  assert.equal(isSetModified(65, 10, 65, 10), false);

  // Modified weight
  assert.equal(isSetModified(67.5, 10, 65, 10), true);

  // Modified reps
  assert.equal(isSetModified(65, 8, 65, 10), true);
});

test('10. RPE_SCALE includes clear Italian descriptions and RIR mapping', () => {
  assert.ok(RPE_SCALE.length >= 8);
  const rpe10 = RPE_SCALE.find((r) => r.rpe === 10);
  assert.equal(rpe10?.rir, 0);
  assert.match(rpe10?.description || '', /Cedimento muscolare/);

  const rpe8 = RPE_SCALE.find((r) => r.rpe === 8);
  assert.equal(rpe8?.rir, 2);
  assert.match(rpe8?.description || '', /2 ripetizioni in riserva/);
});

test('11. getExerciseProgressionData computes weight gain, 1RM progression and volume from sets', () => {
  const demoHistory = getCalibratedDemoWorkoutHistory();
  const chestPressData = getExerciseProgressionData('ex-101', demoHistory);

  assert.ok(chestPressData !== null);
  assert.equal(chestPressData.exerciseName, 'Chest Press convergente');
  assert.equal(chestPressData.muscleGroup, 'Pettorali');
  assert.equal(chestPressData.initialWeightKg, 55);
  assert.equal(chestPressData.currentWeightKg, 65);
  assert.equal(chestPressData.deltaWeightKg, 10);
  assert.equal(chestPressData.deltaWeightPercent, 18.2); // (65-55)/55 * 100 = 18.18% -> 18.2%
  assert.ok(chestPressData.current1RM > chestPressData.initial1RM);
  assert.ok(chestPressData.totalVolumeLiftedKg > 0);
  assert.ok(chestPressData.sessions.length >= 4);
  assert.ok(chestPressData.personalRecords.length >= 1);
});

test('12. getGymGlobalTrendMetrics aggregates total tonnage, sets, and muscle group breakdown', () => {
  const demoHistory = getCalibratedDemoWorkoutHistory();
  const metrics = getGymGlobalTrendMetrics(demoHistory, 'mese', '2026-10-18');

  assert.ok(metrics.totalTonnageKg > 5000);
  assert.ok(metrics.totalSetsCompleted > 10);
  assert.ok(metrics.totalWorkouts >= 4);
  assert.ok(metrics.avgRpe >= 7.5 && metrics.avgRpe <= 9.5);
  assert.ok(metrics.muscleGroupVolumes.length >= 3);
  assert.ok(metrics.weeklyTonnageDays.length === 7);
  assert.ok(metrics.annualStrengthGains.length >= 1);
});

test('13. getEffectiveWorkoutHistory preserves real user sessions without data loss', () => {
  const customUserSession: WorkoutSessionLog = {
    id: 'user-real-session-1',
    routineId: 'push-day',
    routineTitle: 'Giorno 1: Petto',
    date: '2026-10-18',
    startTime: '19:00',
    durationSeconds: 3600,
    isCompleted: true,
    exercises: [
      {
        exerciseId: 'ex-101',
        exerciseName: 'Chest Press convergente',
        muscleGroup: 'Pettorali',
        loadType: 'total',
        completedAt: '2026-10-18',
        sets: [
          { setId: 's1', setNum: 1, weightKg: 70, reps: 10, rpe: 9, isCompleted: true },
        ],
      },
    ],
  };

  const effective = getEffectiveWorkoutHistory([customUserSession]);
  assert.equal(effective.realSessionsCount, 1);
  assert.equal(effective.history[0].id, 'user-real-session-1');

  // Exercise progression with custom user session included
  const prog = getExerciseProgressionData('ex-101', effective.history);
  assert.ok(prog !== null);
  assert.equal(prog.currentWeightKg, 70); // updated by user's new set!
});

