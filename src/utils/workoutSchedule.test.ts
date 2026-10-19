import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeZoneDate,
  getScheduledWorkoutForDate,
  getWeeklyWorkoutSchedule,
  generateCoachFirstExerciseAdvice,
  getEffectiveToday,
} from './workoutSchedule.ts';
import { INITIAL_USER_PROFILE, INITIAL_WORKOUT_ROUTINES } from '../data/mockData.ts';
import type { WorkoutRoutine, UserProfile } from '../types';

test('1. Sabato 17/10/2026 is recognized as Rest Day and does NOT assign Giorno 1', () => {
  // 17 Ottobre 2026: Sabato
  // In Europe/Rome (CEST, UTC+2), 12:00 UTC = 14:00 Rome
  const saturday = new Date(Date.UTC(2026, 9, 17, 12, 0, 0));

  const schedule = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    saturday,
    'Europe/Rome'
  );

  assert.equal(schedule.dateKey, '2026-10-17');
  assert.equal(schedule.dayOfWeek, 'Sab');
  assert.equal(schedule.isRestDay, true);
  assert.equal(schedule.status, 'rest_day');
  assert.equal(schedule.routine, null);
  assert.equal(schedule.routineId, null);
  assert.equal(schedule.routineOrder, null);

  // Next scheduled session must be Monday Giorno 1
  assert.ok(schedule.nextScheduledRoutine !== null);
  assert.equal(schedule.nextScheduledRoutine?.id, 'push-day');
  assert.equal(schedule.nextScheduledDate, '2026-10-19');
});

test('2. Un lunedi (19/10/2026) is recognized as Scheduled Giorno 1 (Push Day)', () => {
  // 19 Ottobre 2026: Lunedì
  const monday = new Date(Date.UTC(2026, 9, 19, 10, 0, 0));

  const schedule = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    monday,
    'Europe/Rome'
  );

  assert.equal(schedule.dateKey, '2026-10-19');
  assert.equal(schedule.dayOfWeek, 'Lun');
  assert.equal(schedule.isRestDay, false);
  assert.equal(schedule.status, 'scheduled');
  assert.ok(schedule.routine !== null);
  assert.equal(schedule.routine?.id, 'push-day');
  assert.equal(schedule.routineOrder, 1);
  assert.equal(schedule.routineId, 'push-day');
});

test('3. Passaggio di mezzanotte: precise rollover between Domenica and Lunedi in Europe/Rome', () => {
  // On 18-19 October 2026, Rome is in CEST (UTC+2)
  // 21:59:58 UTC = 23:59:58 Rome on Sunday 18 Oct
  const sundayBeforeMidnight = new Date(Date.UTC(2026, 9, 18, 21, 59, 58));
  // 22:00:02 UTC = 00:00:02 Rome on Monday 19 Oct
  const mondayAfterMidnight = new Date(Date.UTC(2026, 9, 18, 22, 0, 2));

  const tzSunday = getTimeZoneDate(sundayBeforeMidnight, 'Europe/Rome');
  assert.equal(tzSunday.dateKey, '2026-10-18');
  assert.equal(tzSunday.dayOfWeekShort, 'Dom');
  assert.equal(tzSunday.hour, 23);
  assert.equal(tzSunday.minute, 59);

  const tzMonday = getTimeZoneDate(mondayAfterMidnight, 'Europe/Rome');
  assert.equal(tzMonday.dateKey, '2026-10-19');
  assert.equal(tzMonday.dayOfWeekShort, 'Lun');
  assert.equal(tzMonday.hour, 0);
  assert.equal(tzMonday.minute, 0);

  const scheduleSun = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    sundayBeforeMidnight,
    'Europe/Rome'
  );
  assert.equal(scheduleSun.isRestDay, true);
  assert.equal(scheduleSun.status, 'rest_day');

  const scheduleMon = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    mondayAfterMidnight,
    'Europe/Rome'
  );
  assert.equal(scheduleMon.isRestDay, false);
  assert.equal(scheduleMon.status, 'scheduled');
  assert.equal(scheduleMon.routineId, 'push-day');
  assert.equal(scheduleMon.routineOrder, 1);
});

test('4. Giorno di riposo: correctly detects rest days across the week', () => {
  // Weekly training days: ['Lun', 'Mar', 'Gio', 'Ven']
  // Rest days: Mercoledì, Sabato, Domenica
  const wednesday = new Date(Date.UTC(2026, 9, 21, 10, 0, 0)); // 21/10/2026 = Mer
  const thursday = new Date(Date.UTC(2026, 9, 22, 10, 0, 0)); // 22/10/2026 = Gio

  const scheduleWed = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    wednesday,
    'Europe/Rome'
  );
  assert.equal(scheduleWed.isRestDay, true);
  assert.equal(scheduleWed.status, 'rest_day');
  assert.equal(scheduleWed.dayOfWeek, 'Mer');
  // Next session is Thursday Giorno 3 (Shoulders & Arms)
  assert.equal(scheduleWed.nextScheduledRoutine?.id, 'shoulders-arms');
  assert.equal(scheduleWed.nextScheduledDate, '2026-10-22');

  const scheduleThu = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    thursday,
    'Europe/Rome'
  );
  assert.equal(scheduleThu.isRestDay, false);
  assert.equal(scheduleThu.status, 'scheduled');
  assert.equal(scheduleThu.routineId, 'shoulders-arms');
  assert.equal(scheduleThu.routineOrder, 3);
});

test('5. Sessione ripianificata: supports moving workouts and days override', () => {
  const saturday = new Date(Date.UTC(2026, 9, 17, 10, 0, 0));

  // Override: athlete moved pull-day to Saturday 17/10/2026
  const overrides: Record<string, string> = {
    '2026-10-17': 'pull-day',
  };

  const schedule = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    saturday,
    'Europe/Rome',
    overrides
  );

  assert.equal(schedule.isRestDay, false);
  assert.equal(schedule.status, 'rescheduled');
  assert.equal(schedule.routineId, 'pull-day');
  assert.equal(schedule.routineOrder, 2);

  // Override: athlete rescheduled scheduled Monday to rest
  const monday = new Date(Date.UTC(2026, 9, 19, 10, 0, 0));
  const mondayOverrides: Record<string, string> = {
    '2026-10-19': 'rest',
  };
  const mondaySchedule = getScheduledWorkoutForDate(
    INITIAL_WORKOUT_ROUTINES,
    INITIAL_USER_PROFILE,
    monday,
    'Europe/Rome',
    mondayOverrides
  );
  assert.equal(mondaySchedule.isRestDay, true);
  assert.equal(mondaySchedule.status, 'rest_day');
});

test('6. Consiglio riferito al corretto primo esercizio (Chest Press convergente, ex-101)', () => {
  const pushDay = INITIAL_WORKOUT_ROUTINES.find((r) => r.id === 'push-day')!;
  assert.ok(pushDay !== undefined);
  assert.equal(pushDay.exercises[0].id, 'ex-101');
  assert.equal(pushDay.exercises[0].name, 'Chest Press convergente');

  // Without verified previous RPE data: does NOT invent +2.5kg, asks the athlete
  const adviceNoData = generateCoachFirstExerciseAdvice(pushDay, undefined);
  assert.equal(adviceNoData.exerciseId, 'ex-101');
  assert.equal(adviceNoData.exerciseName, 'Chest Press convergente');
  assert.equal(adviceNoData.hasSufficientData, false);
  assert.ok(adviceNoData.questionForAthlete !== undefined);
  assert.match(adviceNoData.adviceText, /Chest Press convergente/);
  assert.doesNotMatch(adviceNoData.adviceText, /panca piana con bilanciere/i);
  assert.doesNotMatch(adviceNoData.adviceText, /HRV/);
  assert.doesNotMatch(adviceNoData.adviceText, /94%/);

  // With verified previous RPE <= 7.0: gradual increase recommendation
  const adviceWithRpe = generateCoachFirstExerciseAdvice(pushDay, 6.5);
  assert.equal(adviceWithRpe.exerciseId, 'ex-101');
  assert.equal(adviceWithRpe.hasSufficientData, true);
  assert.match(adviceWithRpe.adviceText, /RPE 6\.5/);
  assert.match(adviceWithRpe.adviceText, /incremento graduale/);

  // On Rest Day (routine is null): advises active recovery without overload
  const adviceRest = generateCoachFirstExerciseAdvice(null);
  assert.equal(adviceRest.exerciseId, 'none');
  assert.match(adviceRest.adviceText, /Recupero/i);
});

test('7. Simulated date and timezone fallback', () => {
  const simulatedProfile: UserProfile = {
    ...INITIAL_USER_PROFILE,
    simulatedDate: '2026-10-17',
    timeZone: 'Europe/Rome',
  };

  const effective = getEffectiveToday(simulatedProfile);
  const tzDate = getTimeZoneDate(effective, simulatedProfile.timeZone);
  assert.equal(tzDate.dateKey, '2026-10-17');
  assert.equal(tzDate.dayOfWeekShort, 'Sab');

  // Fallback test for invalid timezone
  const invalidTzDate = getTimeZoneDate(new Date(), 'Invalid/TimeZone');
  assert.equal(invalidTzDate.timeZone, 'Europe/Rome');
});
