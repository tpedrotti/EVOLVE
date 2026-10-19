import type { WorkoutRoutine, UserProfile } from '../types';

export type WorkoutSessionStatus = 'scheduled' | 'completed' | 'skipped' | 'rescheduled' | 'rest_day';

export interface TimeZoneDateInfo {
  date: Date;
  dateKey: string; // YYYY-MM-DD in user timezone
  dayOfWeekShort: 'Lun' | 'Mar' | 'Mer' | 'Gio' | 'Ven' | 'Sab' | 'Dom';
  dayOfWeekFull: string;
  dayIndex: number; // 0 = Lun, 6 = Dom
  hour: number;
  minute: number;
  timeZone: string;
  isDST: boolean;
}

export interface DayScheduleResult {
  dateKey: string;
  dayOfWeek: 'Lun' | 'Mar' | 'Mer' | 'Gio' | 'Ven' | 'Sab' | 'Dom';
  dayName: string;
  isRestDay: boolean;
  status: WorkoutSessionStatus;
  routine: WorkoutRoutine | null;
  routineOrder: number | null;
  routineId: string | null;
  nextScheduledRoutine: WorkoutRoutine | null;
  nextScheduledDate: string | null;
  notes?: string;
  isToday: boolean;
}

const IT_DAYS_MAP: Record<string, { short: 'Lun' | 'Mar' | 'Mer' | 'Gio' | 'Ven' | 'Sab' | 'Dom'; full: string; index: number }> = {
  lun: { short: 'Lun', full: 'Lunedì', index: 0 },
  mar: { short: 'Mar', full: 'Martedì', index: 1 },
  mer: { short: 'Mer', full: 'Mercoledì', index: 2 },
  gio: { short: 'Gio', full: 'Giovedì', index: 3 },
  ven: { short: 'Ven', full: 'Venerdì', index: 4 },
  sab: { short: 'Sab', full: 'Sabato', index: 5 },
  dom: { short: 'Dom', full: 'Domenica', index: 6 },
};

/**
 * Parses a date in the given timezone (defaults to Europe/Rome), with daylight saving time detection.
 */
export function getTimeZoneDate(
  dateInput: Date = new Date(),
  timeZone: string = 'Europe/Rome'
): TimeZoneDateInfo {
  const safeTz = timeZone && timeZone.trim() !== '' ? timeZone.trim() : 'Europe/Rome';

  let resolvedTz = safeTz;
  try {
    // Validate timezone string with Intl
    Intl.DateTimeFormat(undefined, { timeZone: safeTz });
  } catch {
    resolvedTz = 'Europe/Rome';
  }

  // Use Intl to format components accurately in the requested timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const weekdayFormatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: resolvedTz,
    weekday: 'short',
  });

  const weekdayFullFormatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: resolvedTz,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(dateInput);
  let year = '';
  let month = '';
  let day = '';
  let hour = '0';
  let minute = '0';

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
  }

  const dateKey = `${year}-${month}-${day}`;
  const rawWdShort = weekdayFormatter.format(dateInput).toLowerCase().replace('.', '').slice(0, 3);
  const rawWdFull = weekdayFullFormatter.format(dateInput);

  const itDay = IT_DAYS_MAP[rawWdShort] || {
    short: 'Lun',
    full: 'Lunedì',
    index: 0,
  };

  // Daylight saving time check using Intl timeZone offsets
  let isDST = false;
  try {
    const tzOffsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      timeZoneName: 'shortOffset',
    });
    const partsTz = tzOffsetFormatter.formatToParts(dateInput);
    const tzNamePart = partsTz.find((p) => p.type === 'timeZoneName')?.value || '';
    if (resolvedTz === 'Europe/Rome') {
      // Europe/Rome winter is GMT+1 / CET; summer DST is GMT+2 / CEST
      isDST = tzNamePart.includes('+2') || tzNamePart.includes('CEST');
    } else {
      const janParts = tzOffsetFormatter.formatToParts(new Date(dateInput.getFullYear(), 0, 15));
      const janOffset = janParts.find((p) => p.type === 'timeZoneName')?.value || '';
      isDST = tzNamePart !== janOffset;
    }
  } catch {
    isDST = false;
  }

  return {
    date: dateInput,
    dateKey,
    dayOfWeekShort: itDay.short,
    dayOfWeekFull: itDay.full.charAt(0).toUpperCase() + itDay.full.slice(1),
    dayIndex: itDay.index,
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
    timeZone: resolvedTz,
    isDST,
  };
}

/**
 * Returns the effective Date object representing "today".
 * If the user's profile specifies a declared simulatedDate (e.g. '2026-10-17' in demo mode),
 * it returns that simulated date; otherwise returns standard new Date().
 */
export function getEffectiveToday(profile: UserProfile): Date {
  if (profile.simulatedDate && profile.simulatedDate.trim() !== '') {
    const trimmed = profile.simulatedDate.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      // Return midday UTC (12:00 CEST in Rome)
      return new Date(Date.UTC(year, month, day, 10, 0, 0));
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Maps routines to the user's selected weekly training days.
 * For example:
 * selectedDays = ['Lun', 'Mar', 'Gio', 'Ven']
 * - Routine 0 (order 1) -> Lun
 * - Routine 1 (order 2) -> Mar
 * - Routine 2 (order 3) -> Gio
 * - Routine 3 (order 4) -> Ven
 * Mer, Sab, Dom -> Rest Days!
 */
export function getScheduledWorkoutForDate(
  routines: WorkoutRoutine[],
  profile: UserProfile,
  targetDate: Date = new Date(),
  timeZone: string = 'Europe/Rome',
  rescheduledOverrides: Record<string, string> = {}, // dateKey -> routineId or 'rest'
  completedSessions: Record<string, boolean> = {} // dateKey -> boolean
): DayScheduleResult {
  const tzInfo = getTimeZoneDate(targetDate, timeZone);
  const effectiveTodayDate = getEffectiveToday(profile);
  const currentTz = getTimeZoneDate(effectiveTodayDate, timeZone);
  const isToday = tzInfo.dateKey === currentTz.dateKey;
  const isPast = tzInfo.dateKey < currentTz.dateKey;

  const trainingDays = Array.isArray(profile.selectedDays) && profile.selectedDays.length > 0
    ? profile.selectedDays
    : ['Lun', 'Mar', 'Gio', 'Ven'];

  // 1. Check if there is an explicit override for this date
  const override = rescheduledOverrides[tzInfo.dateKey];
  if (override === 'rest') {
    return {
      dateKey: tzInfo.dateKey,
      dayOfWeek: tzInfo.dayOfWeekShort,
      dayName: tzInfo.dayOfWeekFull,
      isRestDay: true,
      status: 'rest_day',
      routine: null,
      routineOrder: null,
      routineId: null,
      nextScheduledRoutine: routines[0] || null,
      nextScheduledDate: null,
      notes: 'Giorno di riposo riprogrammato',
      isToday,
    };
  }

  if (override && override !== 'rest') {
    const overriddenRoutine = routines.find((r) => r.id === override);
    if (overriddenRoutine) {
      const order = routines.findIndex((r) => r.id === override) + 1;
      const isCompleted = Boolean(completedSessions[tzInfo.dateKey]);
      const sessionStatus: WorkoutSessionStatus = isCompleted ? 'completed' : 'rescheduled';
      return {
        dateKey: tzInfo.dateKey,
        dayOfWeek: tzInfo.dayOfWeekShort,
        dayName: tzInfo.dayOfWeekFull,
        isRestDay: false,
        status: sessionStatus,
        routine: overriddenRoutine,
        routineOrder: overriddenRoutine.order || order,
        routineId: overriddenRoutine.id,
        nextScheduledRoutine: null,
        nextScheduledDate: null,
        notes: 'Sessione spostata a oggi',
        isToday,
      };
    }
  }

  // 2. Find index in profile.selectedDays
  const trainingDayIndex = trainingDays.indexOf(tzInfo.dayOfWeekShort);

  if (trainingDayIndex === -1) {
    // Target date is a REST DAY!
    // Find the next scheduled routine in the weekly cycle
    const allDaysOrdered: ('Lun' | 'Mar' | 'Mer' | 'Gio' | 'Ven' | 'Sab' | 'Dom')[] = [
      'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'
    ];
    let nextRoutine: WorkoutRoutine | null = null;
    let nextDateKey: string | null = null;

    for (let offset = 1; offset <= 7; offset++) {
      const checkDayIdx = (tzInfo.dayIndex + offset) % 7;
      const checkDayShort = allDaysOrdered[checkDayIdx];
      const matchIndex = trainingDays.indexOf(checkDayShort);
      if (matchIndex !== -1) {
        const routineIndex = matchIndex % routines.length;
        nextRoutine = routines[routineIndex] || null;

        const nextD = new Date(targetDate);
        nextD.setDate(targetDate.getDate() + offset);
        nextDateKey = getTimeZoneDate(nextD, timeZone).dateKey;
        break;
      }
    }

    return {
      dateKey: tzInfo.dateKey,
      dayOfWeek: tzInfo.dayOfWeekShort,
      dayName: tzInfo.dayOfWeekFull,
      isRestDay: true,
      status: 'rest_day',
      routine: null,
      routineOrder: null,
      routineId: null,
      nextScheduledRoutine: nextRoutine,
      nextScheduledDate: nextDateKey,
      notes: `Giorno di riposo programmato (${tzInfo.dayOfWeekFull}). Recupero attivo e mobilità.`,
      isToday,
    };
  }

  // 3. This day is a training day!
  const routineIndex = trainingDayIndex % routines.length;
  const routine = routines[routineIndex] || routines[0] || null;
  const order = routine?.order || (routineIndex + 1);

  // Determine status: completed, skipped (if in the past without completion), or scheduled
  let sessionStatus: WorkoutSessionStatus = 'scheduled';
  if (completedSessions[tzInfo.dateKey]) {
    sessionStatus = 'completed';
  } else if (isPast) {
    sessionStatus = 'skipped';
  }

  return {
    dateKey: tzInfo.dateKey,
    dayOfWeek: tzInfo.dayOfWeekShort,
    dayName: tzInfo.dayOfWeekFull,
    isRestDay: false,
    status: sessionStatus,
    routine,
    routineOrder: order,
    routineId: routine ? routine.id : null,
    nextScheduledRoutine: null,
    nextScheduledDate: null,
    isToday,
  };
}

/**
 * Returns the full 7-day schedule for the calendar week of referenceDate.
 */
export function getWeeklyWorkoutSchedule(
  routines: WorkoutRoutine[],
  profile: UserProfile,
  referenceDate: Date = new Date(),
  timeZone: string = 'Europe/Rome',
  rescheduledOverrides: Record<string, string> = {}
): DayScheduleResult[] {
  const refTz = getTimeZoneDate(referenceDate, timeZone);

  // Monday = 0, Sunday = 6
  const mondayOffset = refTz.dayIndex;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - mondayOffset);

  const results: DayScheduleResult[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const daySchedule = getScheduledWorkoutForDate(
      routines,
      profile,
      d,
      timeZone,
      rescheduledOverrides
    );
    results.push(daySchedule);
  }

  return results;
}

export interface CoachExerciseAdvice {
  exerciseId: string;
  exerciseName: string;
  routineTitle: string;
  adviceText: string;
  hasSufficientData: boolean;
  questionForAthlete?: string;
}

/**
 * Formulates specific, safe exercise advice tied strictly to the real exercise ID
 * and routine version. Does NOT invent arbitrary weight increases or HRV/sleep data.
 */
export function generateCoachFirstExerciseAdvice(
  routine: WorkoutRoutine | null,
  previousLoggedRpe?: number
): CoachExerciseAdvice {
  if (!routine || !routine.exercises || routine.exercises.length === 0) {
    return {
      exerciseId: 'none',
      exerciseName: 'Recupero Attivo',
      routineTitle: 'Giorno di Riposo',
      adviceText: 'Oggi non sono previsti esercizi con sovraccarico: dedica la giornata a recupero attivo, mobilità articolare e riposo neuromuscolare.',
      hasSufficientData: true,
    };
  }

  const firstEx = routine.exercises[0];

  // If we have verified previous RPE data
  if (typeof previousLoggedRpe === 'number' && previousLoggedRpe <= 7.0) {
    return {
      exerciseId: firstEx.id,
      exerciseName: firstEx.name,
      routineTitle: routine.title,
      adviceText: `Primo esercizio: ${firstEx.name} (${firstEx.setsReps}${firstEx.targetWeightKg ? `, ${firstEx.targetWeightKg}kg` : ''}). Avendo completato la scorsa sessione con RPE ${previousLoggedRpe} (margine ampio), puoi valutare un incremento graduale di carico mantenendo la tecnica impeccabile.`,
      hasSufficientData: true,
    };
  }

  // If we lack previous logs, DO NOT invent arbitrary +2.5kg! Ask the athlete.
  return {
    exerciseId: firstEx.id,
    exerciseName: firstEx.name,
    routineTitle: routine.title,
    adviceText: `Oggi la scheda inizia con ${firstEx.name} (${firstEx.setsReps}${firstEx.targetWeightKg ? `, target ${firstEx.targetWeightKg}kg` : ''}). Come hai percepito lo sforzo nelle ultime serie della sessione precedente? Se avevi almeno 2 ripetizioni di riserva (RPE ≤ 7) puoi salire leggermente di carico, altrimenti consolida il volume attuale prima di aumentare.`,
    hasSufficientData: false,
    questionForAthlete: `Come hai percepito l'RPE su ${firstEx.name} nell'ultima sessione?`,
  };
}
