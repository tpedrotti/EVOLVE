import type {
  LoadType,
  ExerciseItem,
  ExerciseSetLog,
  ExerciseSessionLog,
  WorkoutSessionLog,
  PersonalRecord,
  ProgressionProposal,
} from '../types';

export const WORKOUT_HISTORY_STORAGE_KEY = 'evolve_workout_history';

/**
 * RPE and RIR standard definitions for strength & hypertrophy training.
 */
export interface RpeLevel {
  rpe: number;
  rir: number;
  label: string;
  description: string;
  intensity: 'cedimento' | 'alto' | 'ottimale' | 'moderato' | 'leggero';
}

export const RPE_SCALE: RpeLevel[] = [
  {
    rpe: 10,
    rir: 0,
    label: 'RPE 10 · 0 RIR',
    description: 'Cedimento muscolare: nessuna ripetizione aggiuntiva possibile.',
    intensity: 'cedimento',
  },
  {
    rpe: 9.5,
    rir: 0.5,
    label: 'RPE 9.5 · ~0 RIR',
    description: 'Quasi cedimento: forse mezza rep con tecnica al limite.',
    intensity: 'cedimento',
  },
  {
    rpe: 9,
    rir: 1,
    label: 'RPE 9 · 1 RIR',
    description: 'Molto pesante: avresti potuto eseguire al massimo 1 ripetizione in più.',
    intensity: 'alto',
  },
  {
    rpe: 8.5,
    rir: 1.5,
    label: 'RPE 8.5 · 1-2 RIR',
    description: 'Pesante: 1 o 2 ripetizioni in riserva.',
    intensity: 'alto',
  },
  {
    rpe: 8,
    rir: 2,
    label: 'RPE 8 · 2 RIR',
    description: 'Ottimale per ipertrofia: esattamente 2 ripetizioni in riserva con tecnica solida.',
    intensity: 'ottimale',
  },
  {
    rpe: 7.5,
    rir: 2.5,
    label: 'RPE 7.5 · 2-3 RIR',
    description: 'Moderato-pesante: 2-3 ripetizioni in riserva.',
    intensity: 'ottimale',
  },
  {
    rpe: 7,
    rir: 3,
    label: 'RPE 7 · 3 RIR',
    description: 'Moderato: 3 ripetizioni in riserva, ottima velocità di esecuzione.',
    intensity: 'moderato',
  },
  {
    rpe: 6,
    rir: 4,
    label: 'RPE 6 · 4+ RIR',
    description: 'Riscaldamento o lavoro tecnico: 4 o più ripetizioni in riserva.',
    intensity: 'leggero',
  },
];

/**
 * Determines whether an exercise uses dumbbells, total load (barbell/machine), or bodyweight.
 */
export function getExerciseLoadType(exercise: { name: string; loadType?: LoadType }): LoadType {
  if (exercise.loadType) {
    return exercise.loadType;
  }
  const name = exercise.name.toLowerCase();
  if (name.includes('manubri') || name.includes('manubrio') || name.includes('dumbbell')) {
    return 'dumbbell';
  }
  if (
    name.includes('hyperextension') ||
    name.includes('corpo libero') ||
    name.includes('piegamenti') ||
    name.includes('trazioni') ||
    name.includes('dips') ||
    name.includes('crunch') ||
    name.includes('plank')
  ) {
    return 'bodyweight';
  }
  return 'total';
}

export function getLoadTypeLabel(loadType: LoadType): string {
  switch (loadType) {
    case 'dumbbell':
      return 'Kg per manubrio';
    case 'bodyweight':
      return 'Peso corporeo (+kg zavorra)';
    case 'total':
    default:
      return 'Kg totali';
  }
}

export function getLoadTypeShortBadge(loadType: LoadType): string {
  switch (loadType) {
    case 'dumbbell':
      return 'kg/manubrio';
    case 'bodyweight':
      return 'corpo libero';
    case 'total':
    default:
      return 'kg totali';
  }
}

/**
 * Result of 1RM estimation with explicit formula and applicability criteria.
 */
export interface Estimated1RMResult {
  isApplicable: boolean;
  estimated1RM: number | null;
  formulaName: string;
  explanation: string;
  isExactMeasurement: boolean;
  reasonNotApplicable?: string;
}

/**
 * Calculates theoretical 1RM using standard Epley formula: Load * (1 + Reps / 30).
 * Excludes incompatible cases:
 * - Reps > 12: high-rep endurance sets lose scientific reliability for 1RM estimation.
 * - Reps < 1 or invalid numbers.
 * - 0 kg load or bodyweight exercises without measurable added load.
 */
export function calculateEstimated1RM(
  weightKg: number,
  reps: number,
  loadType: LoadType = 'total'
): Estimated1RMResult {
  if (typeof reps !== 'number' || isNaN(reps) || reps < 1 || typeof weightKg !== 'number' || isNaN(weightKg)) {
    return {
      isApplicable: false,
      estimated1RM: null,
      formulaName: 'Formula Epley',
      explanation: 'I valori di carico o ripetizioni non sono validi.',
      isExactMeasurement: false,
      reasonNotApplicable: 'Le ripetizioni devono essere un numero intero positivo (≥ 1).',
    };
  }

  if (loadType === 'bodyweight' && weightKg <= 0) {
    return {
      isApplicable: false,
      estimated1RM: null,
      formulaName: 'Formula Epley',
      explanation: 'Stima non calcolabile per esercizi a corpo libero puro senza carico addizionale (zavorra).',
      isExactMeasurement: false,
      reasonNotApplicable: 'Esercizio a corpo libero senza zavorra misurabile in kg.',
    };
  }

  if (weightKg <= 0) {
    return {
      isApplicable: false,
      estimated1RM: null,
      formulaName: 'Formula Epley',
      explanation: 'Carico non specificato o pari a 0 kg.',
      isExactMeasurement: false,
      reasonNotApplicable: 'Il carico sollevato deve essere superiore a 0 kg.',
    };
  }

  if (reps > 12) {
    return {
      isApplicable: false,
      estimated1RM: null,
      formulaName: 'Formula Epley',
      explanation:
        'Le formule di stima 1RM (Epley/Brzycki) perdono validità scientifica sopra le 12 ripetizioni a causa della componente di resistenza muscolare.',
      isExactMeasurement: false,
      reasonNotApplicable: 'Non applicabile: serie ad alte ripetizioni (> 12 rep).',
    };
  }

  if (reps === 1) {
    return {
      isApplicable: true,
      estimated1RM: weightKg,
      formulaName: 'Carico Effettivo Singola (1RM reale)',
      explanation: 'Misura effettiva su ripetizione singola eseguita, senza necessità di stima teorica.',
      isExactMeasurement: true,
    };
  }

  const raw1RM = weightKg * (1 + reps / 30);
  const rounded1RM = Math.round(raw1RM * 10) / 10;

  return {
    isApplicable: true,
    estimated1RM: rounded1RM,
    formulaName: 'Formula Epley: Carico × (1 + Reps / 30)',
    explanation: 'Stima teorica del massimale basata sulla formula scientifica Epley per il range 2–12 ripetizioni.',
    isExactMeasurement: false,
  };
}

/**
 * Calculates total volume for a set considering load type:
 * - dumbbell: 2 * weightKg * reps (two dumbbells moved simultaneously)
 * - total: weightKg * reps
 * - bodyweight: weightKg * reps (if weightKg is added load)
 */
export function calculateSetVolume(weightKg: number, reps: number, loadType: LoadType = 'total'): number {
  if (reps <= 0 || weightKg < 0) return 0;
  if (loadType === 'dumbbell') {
    return Math.round(2 * weightKg * reps * 10) / 10;
  }
  return Math.round(weightKg * reps * 10) / 10;
}

/**
 * Loads workout history safely from LocalStorage without creating synthetic past data.
 */
export function loadWorkoutHistory(): WorkoutSessionLog[] {
  try {
    const raw = localStorage.getItem(WORKOUT_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Errore lettura evolve_workout_history:', err);
  }
  return [];
}

/**
 * Saves a completed or partial workout session to LocalStorage non-destructively.
 */
export function saveWorkoutSession(session: WorkoutSessionLog): void {
  try {
    const history = loadWorkoutHistory();
    const existingIndex = history.findIndex((s) => s.id === session.id);
    let updated: WorkoutSessionLog[];
    if (existingIndex >= 0) {
      updated = [...history];
      updated[existingIndex] = session;
    } else {
      updated = [session, ...history];
    }
    localStorage.setItem(WORKOUT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Errore salvataggio evolve_workout_history:', err);
  }
}

/**
 * Finds the latest session log for a specific exercise ID from history.
 */
export function getLastExerciseSession(
  exerciseId: string,
  history: WorkoutSessionLog[] = loadWorkoutHistory()
): ExerciseSessionLog | null {
  for (const session of history) {
    const exLog = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (exLog && exLog.sets && exLog.sets.length > 0) {
      return exLog;
    }
  }
  return null;
}

/**
 * Retrieves all chronological sessions for a specific exercise ID (newest first).
 * Strictly filters by exerciseId to avoid data leakage between different exercises.
 */
export function getExerciseHistory(
  exerciseId: string,
  history: WorkoutSessionLog[] = loadWorkoutHistory()
): { session: WorkoutSessionLog; exerciseLog: ExerciseSessionLog }[] {
  const result: { session: WorkoutSessionLog; exerciseLog: ExerciseSessionLog }[] = [];
  for (const session of history) {
    const exLog = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (exLog) {
      result.push({ session, exerciseLog: exLog });
    }
  }
  return result;
}

/**
 * Calculates Personal Records (PR) linking each PR directly to the exact set and session that created it.
 */
export function calculateExercisePRs(
  exerciseId: string,
  history: WorkoutSessionLog[] = loadWorkoutHistory()
): PersonalRecord[] {
  const exSessions = getExerciseHistory(exerciseId, history);
  if (exSessions.length === 0) return [];

  let maxWeightRecord: PersonalRecord | null = null;
  let maxVolumeSetRecord: PersonalRecord | null = null;
  let maxVolumeSessionRecord: PersonalRecord | null = null;

  for (const item of exSessions) {
    const { session, exerciseLog } = item;
    const completedSets = exerciseLog.sets.filter((s) => s.isCompleted);
    if (completedSets.length === 0) continue;

    let sessionTotalVolume = 0;

    for (const set of completedSets) {
      const setVol = calculateSetVolume(set.weightKg, set.reps, exerciseLog.loadType);
      sessionTotalVolume += setVol;

      // Check Max Weight PR
      if (!maxWeightRecord || set.weightKg > maxWeightRecord.value) {
        const est1RM = calculateEstimated1RM(set.weightKg, set.reps, exerciseLog.loadType);
        maxWeightRecord = {
          id: `pr-weight-${session.id}-${set.setNum}`,
          exerciseId,
          exerciseName: exerciseLog.exerciseName,
          metric: 'max_weight',
          metricLabel: 'Carico Massimo',
          value: set.weightKg,
          unit: exerciseLog.loadType === 'dumbbell' ? 'kg/manubrio' : 'kg',
          date: session.date,
          sessionId: session.id,
          setNum: set.setNum,
          weightKg: set.weightKg,
          reps: set.reps,
          estimated1RM: est1RM.isApplicable && est1RM.estimated1RM ? est1RM.estimated1RM : undefined,
          loadType: exerciseLog.loadType,
        };
      }

      // Check Max Volume per Set PR
      if (!maxVolumeSetRecord || setVol > maxVolumeSetRecord.value) {
        maxVolumeSetRecord = {
          id: `pr-vol-set-${session.id}-${set.setNum}`,
          exerciseId,
          exerciseName: exerciseLog.exerciseName,
          metric: 'max_volume_set',
          metricLabel: 'Volume Singola Serie',
          value: setVol,
          unit: 'kg',
          date: session.date,
          sessionId: session.id,
          setNum: set.setNum,
          weightKg: set.weightKg,
          reps: set.reps,
          loadType: exerciseLog.loadType,
        };
      }
    }

    // Check Max Session Volume PR
    if (!maxVolumeSessionRecord || sessionTotalVolume > maxVolumeSessionRecord.value) {
      maxVolumeSessionRecord = {
        id: `pr-vol-session-${session.id}`,
        exerciseId,
        exerciseName: exerciseLog.exerciseName,
        metric: 'max_volume_session',
        metricLabel: 'Volume Totale Sessione',
        value: sessionTotalVolume,
        unit: 'kg',
        date: session.date,
        sessionId: session.id,
        weightKg: 0,
        reps: 0,
        loadType: exerciseLog.loadType,
      };
    }
  }

  const prs: PersonalRecord[] = [];
  if (maxWeightRecord) prs.push(maxWeightRecord);
  if (maxVolumeSetRecord) prs.push(maxVolumeSetRecord);
  if (maxVolumeSessionRecord) prs.push(maxVolumeSessionRecord);

  return prs;
}

/**
 * Parses target repetition bounds from strings like "3 × 6-10" or "4 × 12".
 */
export function parseTargetRepsRange(setsRepsStr: string): {
  setCount: number;
  minReps: number;
  maxReps: number;
} {
  const match = setsRepsStr.match(/(\d+)\s*[×x*]\s*(\d+)(?:\s*-\s*(\d+))?/i);
  if (!match) {
    return { setCount: 3, minReps: 10, maxReps: 10 };
  }
  const setCount = parseInt(match[1], 10) || 3;
  const minReps = parseInt(match[2], 10) || 10;
  const maxReps = match[3] ? parseInt(match[3], 10) : minReps;
  return { setCount, minReps, maxReps };
}

/**
 * Computes progressive overload suggestion using the Double Progression method.
 * Strict conditions:
 * - Requires sufficient data (at least 1 completed session for the exercise).
 * - User must hit the top of the rep range (maxReps) on all sets of the latest session.
 * - Always explain the rule used and never apply automatically.
 */
export function calculateProgressionProposal(
  exercise: ExerciseItem,
  history: WorkoutSessionLog[] = loadWorkoutHistory()
): ProgressionProposal {
  const loadType = getExerciseLoadType(exercise);
  const targetBounds = parseTargetRepsRange(exercise.setsReps);
  const lastSessionLog = getLastExerciseSession(exercise.id, history);

  const baseCurrentWeight = exercise.targetWeightKg || 0;

  if (!lastSessionLog || !lastSessionLog.sets || lastSessionLog.sets.length === 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      hasSufficientData: false,
      canProgress: false,
      currentWeightKg: baseCurrentWeight,
      proposedWeightKg: baseCurrentWeight,
      deltaKg: 0,
      ruleName: 'Dati Non Sufficienti',
      ruleDescription:
        'Non ci sono ancora sessioni registrate per questo esercizio. Completa almeno un allenamento per calcolare la progressione.',
      reasoning: 'La progressione si attiva dopo aver registrato le serie effettive nel diario.',
      loadType,
      status: 'pending',
    };
  }

  const completedSets = lastSessionLog.sets.filter((s) => s.isCompleted);

  if (completedSets.length === 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      hasSufficientData: false,
      canProgress: false,
      currentWeightKg: baseCurrentWeight,
      proposedWeightKg: baseCurrentWeight,
      deltaKg: 0,
      ruleName: 'Sessione Incompleta',
      ruleDescription: 'L’ultima sessione non contiene serie completate con successo.',
      reasoning: 'Completa le serie previste per abilitare la valutazione della progressione.',
      loadType,
      status: 'pending',
    };
  }

  // Weight used in last session
  const lastWeight = completedSets[0].weightKg;
  const currentWeightKg = lastWeight > 0 ? lastWeight : baseCurrentWeight;

  // Check if user hit maxReps on all completed sets
  const allSetsHitTop = completedSets.every((s) => s.reps >= targetBounds.maxReps);
  const setsCountMet = completedSets.length >= targetBounds.setCount;

  if (allSetsHitTop && setsCountMet) {
    // Determine controlled increment based on equipment
    let deltaKg = 2.5;
    if (loadType === 'dumbbell') {
      deltaKg = currentWeightKg >= 18 ? 2 : 1;
    } else if (loadType === 'bodyweight') {
      deltaKg = 2.5;
    } else {
      deltaKg = currentWeightKg >= 60 ? 5 : 2.5;
    }

    const proposedWeightKg = currentWeightKg + deltaKg;

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      hasSufficientData: true,
      canProgress: true,
      currentWeightKg,
      proposedWeightKg,
      deltaKg,
      ruleName: 'Doppia Progressione (Double Progression Method)',
      ruleDescription: `Hai completato tutte le ${completedSets.length} serie al target massimo di ${targetBounds.maxReps} ripetizioni. Si propone di aumentare il carico di +${deltaKg} ${loadType === 'dumbbell' ? 'kg a manubrio' : 'kg'} e ripartire dalla parte bassa del range (${targetBounds.minReps} reps).`,
      reasoning: `Saturazione del range (${targetBounds.maxReps} rep per serie) raggiunta con successo. L'incremento del carico stimola il sovraccarico progressivo mantenendo l'esecuzione controllata.`,
      loadType,
      status: 'pending',
    };
  }

  // User completed sets but has not yet hit maxReps on all sets
  const actualRepsSummary = completedSets.map((s) => s.reps).join('-');
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    hasSufficientData: true,
    canProgress: false,
    currentWeightKg,
    proposedWeightKg: currentWeightKg,
    deltaKg: 0,
    ruleName: 'Consolidamento del Carico Attuale',
    ruleDescription: `La regola della Doppia Progressione richiede di raggiungere il limite massimo di ${targetBounds.maxReps} ripetizioni su TUTTE le serie (ripetizioni registrate: ${actualRepsSummary}).`,
    reasoning: `Continua ad allenarti con ${currentWeightKg} kg finché non completerai tutte le serie con ${targetBounds.maxReps} ripetizioni piene prima di aumentare il peso.`,
    loadType,
    status: 'pending',
  };
}

/**
 * Checks whether user has already modified weight or reps away from default/target.
 * Used to avoid silently overwriting entered data when copying previous session.
 */
export function isSetModified(
  currentWeight: number,
  currentReps: number,
  initialWeight: number,
  initialReps: number
): boolean {
  return currentWeight !== initialWeight || currentReps !== initialReps;
}

/* ═════════════════════════════════════════════════════════════
   PALESTRA & TREND ANALYTICS: PROGRESSIONE DAI DATI DELLE SERIE
   ═════════════════════════════════════════════════════════════ */

export interface ExerciseSessionProgressionPoint {
  sessionId: string;
  date: string; // 'YYYY-MM-DD'
  formattedDate: string; // '12 Ott'
  maxWeightKg: number;
  best1RMKg: number;
  totalVolumeKg: number;
  setsCount: number;
  bestSet: {
    setNum: number;
    weightKg: number;
    reps: number;
    rpe?: number;
    rir?: number;
    loadType: LoadType;
  };
  avgRpe?: number;
}

export interface ExerciseProgressionSummary {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  loadType: LoadType;
  sessions: ExerciseSessionProgressionPoint[];
  initialWeightKg: number;
  currentWeightKg: number;
  deltaWeightKg: number;
  deltaWeightPercent: number;
  initial1RM: number;
  current1RM: number;
  delta1RM: number;
  delta1RMPercent: number;
  totalVolumeLiftedKg: number;
  bestEverSet?: {
    date: string;
    weightKg: number;
    reps: number;
    estimated1RM: number;
    loadType: LoadType;
    rpe?: number;
  };
  personalRecords: PersonalRecord[];
}

export interface GymGlobalTrendMetrics {
  totalTonnageKg: number;
  totalSetsCompleted: number;
  totalWorkouts: number;
  avgRpe: number;
  allPRs: PersonalRecord[];
  muscleGroupVolumes: { muscleGroup: string; volumeKg: number; percentage: number }[];
  weeklyTonnageDays: { day: string; date: string; volumeKg: number; setsCount: number; isWorkoutDay: boolean }[];
  monthlyVolumeWeeks: { weekLabel: string; volumeKg: number; setsCount: number }[];
  annualStrengthGains: { exerciseName: string; gainKg: number; gainPercent: number; currentWeightKg: number }[];
}

/**
 * Formats ISO date 'YYYY-MM-DD' to short Italian date '12 Ott'.
 */
export function formatShortDateIt(isoDate: string): string {
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      return `${d} ${months[m - 1] || ''}`;
    }
  } catch {}
  return isoDate;
}

/**
 * Calibrated realistic demonstration workout history spanning recent microcycles.
 * Gives immediate rich trend graphs while clearly tagged as calibrated baseline data.
 */
export function getCalibratedDemoWorkoutHistory(): WorkoutSessionLog[] {
  return [
    {
      id: 'demo-session-4-push',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto, Tricipiti e Avambracci',
      date: '2026-10-12',
      startTime: '18:15',
      durationSeconds: 3840,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's-401-1', setNum: 1, weightKg: 65, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-401-2', setNum: 2, weightKg: 65, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-401-3', setNum: 3, weightKg: 65, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-102',
          exerciseName: 'Panca inclinata 30° con manubri',
          muscleGroup: 'Pettorali',
          loadType: 'dumbbell',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's-402-1', setNum: 1, weightKg: 26, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-402-2', setNum: 2, weightKg: 26, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-402-3', setNum: 3, weightKg: 26, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-103',
          exerciseName: 'Pec Deck / Chest Fly Machine',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's-403-1', setNum: 1, weightKg: 45, reps: 12, rpe: 8, isCompleted: true },
            { setId: 's-403-2', setNum: 2, weightKg: 45, reps: 11, rpe: 8.5, isCompleted: true },
            { setId: 's-403-3', setNum: 3, weightKg: 45, reps: 10, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-5',
          exerciseName: 'Pushdown tricipiti con barra',
          muscleGroup: 'Tricipiti',
          loadType: 'total',
          completedAt: '2026-10-12',
          sets: [
            { setId: 's-405-1', setNum: 1, weightKg: 30, reps: 12, rpe: 8, isCompleted: true },
            { setId: 's-405-2', setNum: 2, weightKg: 30, reps: 10, rpe: 8.5, isCompleted: true },
            { setId: 's-405-3', setNum: 3, weightKg: 30, reps: 10, rpe: 9, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-4-pull',
      routineId: 'pull-day',
      routineTitle: 'Giorno 2: Schiena, Bicipiti e Avambracci',
      date: '2026-10-13',
      startTime: '18:00',
      durationSeconds: 4100,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-201',
          exerciseName: 'Lat Machine presa neutra',
          muscleGroup: 'Dorsali',
          loadType: 'total',
          completedAt: '2026-10-13',
          sets: [
            { setId: 's-421-1', setNum: 1, weightKg: 65, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-421-2', setNum: 2, weightKg: 65, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-421-3', setNum: 3, weightKg: 65, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-202',
          exerciseName: 'Rematore Chest-Supported Machine',
          muscleGroup: 'Dorsali',
          loadType: 'total',
          completedAt: '2026-10-13',
          sets: [
            { setId: 's-422-1', setNum: 1, weightKg: 55, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-422-2', setNum: 2, weightKg: 55, reps: 10, rpe: 8.5, isCompleted: true },
            { setId: 's-422-3', setNum: 3, weightKg: 55, reps: 9, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-303',
          exerciseName: 'Curl manubri su panca inclinata',
          muscleGroup: 'Bicipiti',
          loadType: 'dumbbell',
          completedAt: '2026-10-13',
          sets: [
            { setId: 's-423-1', setNum: 1, weightKg: 14, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-423-2', setNum: 2, weightKg: 14, reps: 10, rpe: 8.5, isCompleted: true },
            { setId: 's-423-3', setNum: 3, weightKg: 14, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-4-shoulders',
      routineId: 'shoulders-arms',
      routineTitle: 'Giorno 3: Spalle, Braccia e Avambracci',
      date: '2026-10-15',
      startTime: '18:30',
      durationSeconds: 3900,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-301',
          exerciseName: 'Shoulder Press Machine',
          muscleGroup: 'Spalle',
          loadType: 'total',
          completedAt: '2026-10-15',
          sets: [
            { setId: 's-431-1', setNum: 1, weightKg: 45, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-431-2', setNum: 2, weightKg: 45, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-431-3', setNum: 3, weightKg: 45, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-4',
          exerciseName: 'Alzate laterali ai cavi o manubri',
          muscleGroup: 'Deltoidi laterali',
          loadType: 'dumbbell',
          completedAt: '2026-10-15',
          sets: [
            { setId: 's-432-1', setNum: 1, weightKg: 10, reps: 14, rpe: 8, isCompleted: true },
            { setId: 's-432-2', setNum: 2, weightKg: 10, reps: 12, rpe: 8.5, isCompleted: true },
            { setId: 's-432-3', setNum: 3, weightKg: 10, reps: 12, rpe: 9, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-4-legs',
      routineId: 'legs-day',
      routineTitle: 'Giorno 4: Gambe',
      date: '2026-10-16',
      startTime: '17:45',
      durationSeconds: 4200,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-401',
          exerciseName: 'Leg Press 45°',
          muscleGroup: 'Quadricipiti',
          loadType: 'total',
          completedAt: '2026-10-16',
          sets: [
            { setId: 's-441-1', setNum: 1, weightKg: 160, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-441-2', setNum: 2, weightKg: 160, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-441-3', setNum: 3, weightKg: 160, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-403',
          exerciseName: 'Leg Curl seduto',
          muscleGroup: 'Ischiocrurali',
          loadType: 'total',
          completedAt: '2026-10-16',
          sets: [
            { setId: 's-443-1', setNum: 1, weightKg: 50, reps: 12, rpe: 8, isCompleted: true },
            { setId: 's-443-2', setNum: 2, weightKg: 50, reps: 10, rpe: 8.5, isCompleted: true },
            { setId: 's-443-3', setNum: 3, weightKg: 50, reps: 10, rpe: 9, isCompleted: true },
          ],
        },
      ],
    },
    // Week 3 (5-9 Ottobre)
    {
      id: 'demo-session-3-push',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto, Tricipiti e Avambracci',
      date: '2026-10-05',
      startTime: '18:10',
      durationSeconds: 3750,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-10-05',
          sets: [
            { setId: 's-301-1', setNum: 1, weightKg: 60, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-301-2', setNum: 2, weightKg: 60, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-301-3', setNum: 3, weightKg: 60, reps: 9, rpe: 8.5, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-102',
          exerciseName: 'Panca inclinata 30° con manubri',
          muscleGroup: 'Pettorali',
          loadType: 'dumbbell',
          completedAt: '2026-10-05',
          sets: [
            { setId: 's-302-1', setNum: 1, weightKg: 24, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-302-2', setNum: 2, weightKg: 24, reps: 10, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-3-pull',
      routineId: 'pull-day',
      routineTitle: 'Giorno 2: Schiena, Bicipiti e Avambracci',
      date: '2026-10-06',
      startTime: '18:15',
      durationSeconds: 3950,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-201',
          exerciseName: 'Lat Machine presa neutra',
          muscleGroup: 'Dorsali',
          loadType: 'total',
          completedAt: '2026-10-06',
          sets: [
            { setId: 's-321-1', setNum: 1, weightKg: 60, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-321-2', setNum: 2, weightKg: 60, reps: 10, rpe: 8.5, isCompleted: true },
            { setId: 's-321-3', setNum: 3, weightKg: 60, reps: 9, rpe: 9, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-3-legs',
      routineId: 'legs-day',
      routineTitle: 'Giorno 4: Gambe',
      date: '2026-10-09',
      startTime: '17:30',
      durationSeconds: 4050,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-401',
          exerciseName: 'Leg Press 45°',
          muscleGroup: 'Quadricipiti',
          loadType: 'total',
          completedAt: '2026-10-09',
          sets: [
            { setId: 's-341-1', setNum: 1, weightKg: 150, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-341-2', setNum: 2, weightKg: 150, reps: 10, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
    // Week 2 (28 Set - 2 Ottobre)
    {
      id: 'demo-session-2-push',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto, Tricipiti e Avambracci',
      date: '2026-09-28',
      startTime: '18:00',
      durationSeconds: 3600,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-09-28',
          sets: [
            { setId: 's-201-1', setNum: 1, weightKg: 57.5, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-201-2', setNum: 2, weightKg: 57.5, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-201-3', setNum: 3, weightKg: 57.5, reps: 9, rpe: 8.5, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-102',
          exerciseName: 'Panca inclinata 30° con manubri',
          muscleGroup: 'Pettorali',
          loadType: 'dumbbell',
          completedAt: '2026-09-28',
          sets: [
            { setId: 's-202-1', setNum: 1, weightKg: 24, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-202-2', setNum: 2, weightKg: 24, reps: 8, rpe: 9, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-2-pull',
      routineId: 'pull-day',
      routineTitle: 'Giorno 2: Schiena, Bicipiti e Avambracci',
      date: '2026-09-29',
      startTime: '18:20',
      durationSeconds: 3800,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-201',
          exerciseName: 'Lat Machine presa neutra',
          muscleGroup: 'Dorsali',
          loadType: 'total',
          completedAt: '2026-09-29',
          sets: [
            { setId: 's-221-1', setNum: 1, weightKg: 57.5, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-221-2', setNum: 2, weightKg: 57.5, reps: 10, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-2-legs',
      routineId: 'legs-day',
      routineTitle: 'Giorno 4: Gambe',
      date: '2026-10-02',
      startTime: '18:00',
      durationSeconds: 4000,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-401',
          exerciseName: 'Leg Press 45°',
          muscleGroup: 'Quadricipiti',
          loadType: 'total',
          completedAt: '2026-10-02',
          sets: [
            { setId: 's-241-1', setNum: 1, weightKg: 145, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-241-2', setNum: 2, weightKg: 145, reps: 9, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
    // Week 1 (21-25 Settembre) - Base Iniziale
    {
      id: 'demo-session-1-push',
      routineId: 'push-day',
      routineTitle: 'Giorno 1: Petto, Tricipiti e Avambracci',
      date: '2026-09-21',
      startTime: '18:00',
      durationSeconds: 3500,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-101',
          exerciseName: 'Chest Press convergente',
          muscleGroup: 'Pettorali',
          loadType: 'total',
          completedAt: '2026-09-21',
          sets: [
            { setId: 's-101-1', setNum: 1, weightKg: 55, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-101-2', setNum: 2, weightKg: 55, reps: 9, rpe: 8.5, isCompleted: true },
            { setId: 's-101-3', setNum: 3, weightKg: 55, reps: 8, rpe: 8.5, isCompleted: true },
          ],
        },
        {
          exerciseId: 'ex-102',
          exerciseName: 'Panca inclinata 30° con manubri',
          muscleGroup: 'Pettorali',
          loadType: 'dumbbell',
          completedAt: '2026-09-21',
          sets: [
            { setId: 's-102-1', setNum: 1, weightKg: 22, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-102-2', setNum: 2, weightKg: 22, reps: 9, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-1-pull',
      routineId: 'pull-day',
      routineTitle: 'Giorno 2: Schiena, Bicipiti e Avambracci',
      date: '2026-09-22',
      startTime: '18:15',
      durationSeconds: 3600,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-201',
          exerciseName: 'Lat Machine presa neutra',
          muscleGroup: 'Dorsali',
          loadType: 'total',
          completedAt: '2026-09-22',
          sets: [
            { setId: 's-121-1', setNum: 1, weightKg: 55, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-121-2', setNum: 2, weightKg: 55, reps: 9, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
    {
      id: 'demo-session-1-legs',
      routineId: 'legs-day',
      routineTitle: 'Giorno 4: Gambe',
      date: '2026-09-25',
      startTime: '17:30',
      durationSeconds: 3900,
      isCompleted: true,
      exercises: [
        {
          exerciseId: 'ex-401',
          exerciseName: 'Leg Press 45°',
          muscleGroup: 'Quadricipiti',
          loadType: 'total',
          completedAt: '2026-09-25',
          sets: [
            { setId: 's-141-1', setNum: 1, weightKg: 140, reps: 10, rpe: 8, isCompleted: true },
            { setId: 's-141-2', setNum: 2, weightKg: 140, reps: 9, rpe: 8.5, isCompleted: true },
          ],
        },
      ],
    },
  ];
}

/**
 * Merges real user session logs with calibrated baseline demo history non-destructively.
 */
export function getEffectiveWorkoutHistory(
  customHistory?: WorkoutSessionLog[]
): { history: WorkoutSessionLog[]; isDemoData: boolean; realSessionsCount: number } {
  const loaded = customHistory !== undefined ? customHistory : loadWorkoutHistory();
  const realSessions = loaded.filter(
    (s) => s.isCompleted || (s.exercises && s.exercises.some((e) => e.sets && e.sets.some((st) => st.isCompleted)))
  );

  const demo = getCalibratedDemoWorkoutHistory();

  if (realSessions.length === 0) {
    return {
      history: demo,
      isDemoData: true,
      realSessionsCount: 0,
    };
  }

  // Real sessions take precedence; merge with earlier demo sessions if real sessions are recent
  const realDates = new Set(realSessions.map((s) => s.date));
  const merged = [...realSessions];
  for (const demoSession of demo) {
    if (!realDates.has(demoSession.date)) {
      merged.push(demoSession);
    }
  }
  merged.sort((a, b) => b.date.localeCompare(a.date));

  return {
    history: merged,
    isDemoData: realSessions.length < demo.length,
    realSessionsCount: realSessions.length,
  };
}

/**
 * Computes deep exercise progression metrics derived directly from entered set logs.
 */
export function getExerciseProgressionData(
  exerciseId: string,
  history: WorkoutSessionLog[] = loadWorkoutHistory()
): ExerciseProgressionSummary | null {
  const exSessions = getExerciseHistory(exerciseId, history);
  if (exSessions.length === 0) return null;

  // Chronological order: oldest to newest
  const sorted = [...exSessions].sort((a, b) => a.session.date.localeCompare(b.session.date));

  const progressionPoints: ExerciseSessionProgressionPoint[] = [];
  let totalVolumeAccumulator = 0;
  let bestEver1RM = 0;
  let bestEverSet: ExerciseProgressionSummary['bestEverSet'] = undefined;

  for (const item of sorted) {
    const { session, exerciseLog } = item;
    const completedSets = exerciseLog.sets.filter((s) => s.isCompleted && s.weightKg > 0);
    if (completedSets.length === 0) continue;

    let sessionMaxWeight = 0;
    let sessionBest1RM = 0;
    let sessionVolume = 0;
    let bestSet = completedSets[0];
    let rpeSum = 0;
    let rpeCount = 0;

    for (const set of completedSets) {
      const setVol = calculateSetVolume(set.weightKg, set.reps, exerciseLog.loadType);
      sessionVolume += setVol;

      if (set.weightKg > sessionMaxWeight) {
        sessionMaxWeight = set.weightKg;
      }

      const est1RM = calculateEstimated1RM(set.weightKg, set.reps, exerciseLog.loadType);
      const estVal = est1RM.isApplicable && est1RM.estimated1RM ? est1RM.estimated1RM : set.weightKg;

      if (estVal > sessionBest1RM) {
        sessionBest1RM = estVal;
        bestSet = set;
      }

      if (estVal > bestEver1RM) {
        bestEver1RM = estVal;
        bestEverSet = {
          date: session.date,
          weightKg: set.weightKg,
          reps: set.reps,
          estimated1RM: estVal,
          loadType: exerciseLog.loadType,
          rpe: set.rpe,
        };
      }

      if (set.rpe) {
        rpeSum += set.rpe;
        rpeCount++;
      }
    }

    totalVolumeAccumulator += sessionVolume;

    progressionPoints.push({
      sessionId: session.id,
      date: session.date,
      formattedDate: formatShortDateIt(session.date),
      maxWeightKg: sessionMaxWeight,
      best1RMKg: Math.round(sessionBest1RM * 10) / 10,
      totalVolumeKg: Math.round(sessionVolume),
      setsCount: completedSets.length,
      bestSet: {
        setNum: bestSet.setNum,
        weightKg: bestSet.weightKg,
        reps: bestSet.reps,
        rpe: bestSet.rpe,
        rir: bestSet.rir,
        loadType: exerciseLog.loadType,
      },
      avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : undefined,
    });
  }

  if (progressionPoints.length === 0) return null;

  const firstPoint = progressionPoints[0];
  const lastPoint = progressionPoints[progressionPoints.length - 1];

  const initialWeightKg = firstPoint.maxWeightKg;
  const currentWeightKg = lastPoint.maxWeightKg;
  const deltaWeightKg = Math.round((currentWeightKg - initialWeightKg) * 10) / 10;
  const deltaWeightPercent =
    initialWeightKg > 0 ? Math.round(((currentWeightKg - initialWeightKg) / initialWeightKg) * 1000) / 10 : 0;

  const initial1RM = firstPoint.best1RMKg;
  const current1RM = lastPoint.best1RMKg;
  const delta1RM = Math.round((current1RM - initial1RM) * 10) / 10;
  const delta1RMPercent =
    initial1RM > 0 ? Math.round(((current1RM - initial1RM) / initial1RM) * 1000) / 10 : 0;

  const firstExLog = exSessions[0].exerciseLog;
  const personalRecords = calculateExercisePRs(exerciseId, history);

  return {
    exerciseId,
    exerciseName: firstExLog.exerciseName,
    muscleGroup: firstExLog.muscleGroup,
    loadType: firstExLog.loadType,
    sessions: progressionPoints,
    initialWeightKg,
    currentWeightKg,
    deltaWeightKg,
    deltaWeightPercent,
    initial1RM,
    current1RM,
    delta1RM,
    delta1RMPercent,
    totalVolumeLiftedKg: Math.round(totalVolumeAccumulator),
    bestEverSet,
    personalRecords,
  };
}

/**
 * Calculates global gym performance and set compliance metrics across a period.
 */
export function getGymGlobalTrendMetrics(
  history: WorkoutSessionLog[] = loadWorkoutHistory(),
  period: 'settimana' | 'mese' | 'anno' = 'settimana',
  referenceDateStr: string = '2026-10-18'
): GymGlobalTrendMetrics {
  const refDate = new Date(referenceDateStr + 'T12:00:00Z');

  // Days threshold based on period
  let daysThreshold = 7;
  if (period === 'mese') daysThreshold = 30;
  if (period === 'anno') daysThreshold = 365;

  const startDate = new Date(refDate);
  startDate.setDate(startDate.getDate() - daysThreshold + 1);
  const startDateStr = startDate.toISOString().split('T')[0];

  const filteredSessions = history.filter((s) => s.date >= startDateStr && s.date <= referenceDateStr);

  let totalTonnageKg = 0;
  let totalSetsCompleted = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  const muscleVolumes: Record<string, number> = {};
  const exerciseIds = new Set<string>();

  for (const session of filteredSessions) {
    for (const ex of session.exercises) {
      exerciseIds.add(ex.exerciseId);
      for (const set of ex.sets) {
        if (!set.isCompleted || set.weightKg <= 0) continue;
        totalSetsCompleted++;
        const vol = calculateSetVolume(set.weightKg, set.reps, ex.loadType);
        totalTonnageKg += vol;

        const muscle = ex.muscleGroup || 'Generale';
        muscleVolumes[muscle] = (muscleVolumes[muscle] || 0) + vol;

        if (set.rpe) {
          rpeSum += set.rpe;
          rpeCount++;
        }
      }
    }
  }

  // Calculate muscle group breakdown
  const muscleGroupVolumes = Object.entries(muscleVolumes)
    .map(([muscleGroup, volumeKg]) => ({
      muscleGroup,
      volumeKg: Math.round(volumeKg),
      percentage: totalTonnageKg > 0 ? Math.round((volumeKg / totalTonnageKg) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.volumeKg - a.volumeKg);

  // Weekly Tonnage Days (Lun-Dom of the reference week)
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const dayIndex = (refDate.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(refDate);
  monday.setUTCDate(monday.getUTCDate() - dayIndex);

  const weeklyTonnageDays = daysOfWeek.map((dayName, idx) => {
    const cur = new Date(monday);
    cur.setUTCDate(cur.getUTCDate() + idx);
    const curDateStr = cur.toISOString().split('T')[0];

    const sessionToday = history.find((s) => s.date === curDateStr);
    let dayVol = 0;
    let daySets = 0;

    if (sessionToday) {
      for (const ex of sessionToday.exercises) {
        for (const s of ex.sets) {
          if (s.isCompleted && s.weightKg > 0) {
            daySets++;
            dayVol += calculateSetVolume(s.weightKg, s.reps, ex.loadType);
          }
        }
      }
    }

    return {
      day: dayName,
      date: curDateStr,
      volumeKg: Math.round(dayVol),
      setsCount: daySets,
      isWorkoutDay: daySets > 0,
    };
  });

  // Monthly Volume by 4 Weeks
  const monthlyVolumeWeeks = [
    { weekLabel: 'Sett 1', volumeKg: 0, setsCount: 0 },
    { weekLabel: 'Sett 2', volumeKg: 0, setsCount: 0 },
    { weekLabel: 'Sett 3', volumeKg: 0, setsCount: 0 },
    { weekLabel: 'Sett 4', volumeKg: 0, setsCount: 0 },
  ];

  for (const session of history) {
    const diffDays = Math.floor((refDate.getTime() - new Date(session.date + 'T12:00:00Z').getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 28) {
      const weekIdx = 3 - Math.floor(diffDays / 7);
      if (weekIdx >= 0 && weekIdx < 4) {
        for (const ex of session.exercises) {
          for (const s of ex.sets) {
            if (s.isCompleted && s.weightKg > 0) {
              monthlyVolumeWeeks[weekIdx].setsCount++;
              monthlyVolumeWeeks[weekIdx].volumeKg += calculateSetVolume(s.weightKg, s.reps, ex.loadType);
            }
          }
        }
      }
    }
  }

  // Annual strength gains on key exercises
  const annualStrengthGains: GymGlobalTrendMetrics['annualStrengthGains'] = [];
  for (const id of Array.from(exerciseIds)) {
    const prog = getExerciseProgressionData(id, history);
    if (prog && prog.sessions.length >= 2) {
      annualStrengthGains.push({
        exerciseName: prog.exerciseName,
        gainKg: prog.deltaWeightKg,
        gainPercent: prog.deltaWeightPercent,
        currentWeightKg: prog.currentWeightKg,
      });
    }
  }
  annualStrengthGains.sort((a, b) => b.gainPercent - a.gainPercent);

  // Collect PRs across all exercises
  const allPRs: PersonalRecord[] = [];
  for (const id of Array.from(exerciseIds)) {
    const prs = calculateExercisePRs(id, history);
    allPRs.push(...prs);
  }

  return {
    totalTonnageKg: Math.round(totalTonnageKg),
    totalSetsCompleted,
    totalWorkouts: filteredSessions.length,
    avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : 8.0,
    allPRs,
    muscleGroupVolumes,
    weeklyTonnageDays,
    monthlyVolumeWeeks: monthlyVolumeWeeks.map((w) => ({ ...w, volumeKg: Math.round(w.volumeKg) })),
    annualStrengthGains,
  };
}
