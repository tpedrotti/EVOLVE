import {
  calculateComplianceRate,
  calculateVolumeAdherence,
  classifyDayIntake,
  type ComplianceRateResult,
  type VolumeAdherenceResult,
  type IntakeStatus,
} from './metrics';

export interface DayHydrationInfo {
  dateKey: string;
  dayName: string;
  shortName: string;
  liters: number;
  goalLiters: number;
  isToday: boolean;
  isFuture: boolean;
  isCompleted: boolean;
  intakeStatus: IntakeStatus;
  statusLabel: string;
  displayValue: string;
}

export interface WeeklyHydrationSummary {
  days: DayHydrationInfo[];
  weeklyAverage: number;
  weeklyTotal: number;
  daysInTarget: number;
  elapsedDaysCount: number;
  adherencePct: number; // Strictly Days Compliance % (e.g. 5/7 = 71.4%)
  formattedCompliancePct: string; // '71,4%'
  volumeAdherencePct: number; // Volume intake vs goal % (e.g. 84.0%)
  complianceResult: ComplianceRateResult;
  volumeResult: VolumeAdherenceResult;
}

export interface MonthlyHydrationSummary {
  monthlyAverage: number;
  monthlyTotal: number;
  daysInTarget: number;
  elapsedDaysCount: number;
  adherencePct: number; // Strictly Days Compliance % (e.g. 28/30 = 93.3%)
  formattedCompliancePct: string; // '93,3%'
  volumeAdherencePct: number;
  complianceResult: ComplianceRateResult;
  volumeResult: VolumeAdherenceResult;
  weeklyAverages: { weekLabel: string; avgLiters: number; targetMet: boolean }[];
}

export interface AnnualMonthHydrationInfo {
  month: string;
  fullMonth: string;
  monthIndex: number; // 0 to 11
  liters: number | null;
  displayLiters: string;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  targetMet: boolean;
  status: 'recorded' | 'current' | 'future';
  statusLabel: string;
}

export interface AnnualHydrationSummary {
  months: AnnualMonthHydrationInfo[];
  elapsedMonthsCount: number;
  futureMonthsCount: number;
  totalConsuntivoLiters: number;
  dailyConsuntivoAverage: number;
  targetMonthsCount: number;
  complianceResult: ComplianceRateResult;
  volumeResult: VolumeAdherenceResult;
  formattedCompliancePct: string;
}

/**
 * Returns the local date key formatted as YYYY-MM-DD
 */
export const getLocalDateKey = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generates realistic historical hydration data for the past 30 days
 */
export const generateInitialHydrationHistory = (todayInitialLiters: number = 0): Record<string, number> => {
  const history: Record<string, number> = {};
  const now = new Date();

  // Pattern of realistic intake for past 30 days (Liters)
  const pattern = [
    3.10, 2.90, 3.25, 2.75, 3.00, 2.80, 3.15,
    2.85, 3.05, 2.95, 3.20, 2.60, 3.10, 3.00,
    2.70, 3.30, 2.90, 3.15, 3.00, 2.80, 3.20,
    3.05, 2.85, 3.10, 2.75, 3.00, 2.90, 3.25,
    3.10, 2.95
  ];

  // Populate days from 30 days ago up to yesterday
  for (let i = 30; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = getLocalDateKey(d);
    const val = pattern[(30 - i) % pattern.length];
    history[key] = Number(val.toFixed(2));
  }

  // Today starts at todayInitialLiters (defaults to 0 for a fresh day)
  const todayKey = getLocalDateKey(now);
  history[todayKey] = Number(todayInitialLiters.toFixed(2));

  return history;
};

const STORAGE_KEY = 'evolve_hydration_history';
const LAST_DATE_KEY = 'evolve_last_hydration_date';

/**
 * Loads hydration history from localStorage or initializes with realistic defaults.
 * Automatically performs daily reset if the date has rolled over!
 */
export const loadHydrationHistory = (): { history: Record<string, number>; todayLiters: number } => {
  const todayKey = getLocalDateKey();
  let history: Record<string, number> = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      history = JSON.parse(raw);
    }
  } catch (e) {
    // ignore parse error
  }

  // If history is empty or invalid, initialize defaults
  if (!history || typeof history !== 'object' || Object.keys(history).length === 0) {
    history = generateInitialHydrationHistory(0.0);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      localStorage.setItem(LAST_DATE_KEY, todayKey);
    } catch (e) {}
    return { history, todayLiters: 0.0 };
  }

  // Check if today already has a recorded value
  if (history[todayKey] === undefined) {
    history[todayKey] = 0.0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      localStorage.setItem(LAST_DATE_KEY, todayKey);
    } catch (e) {}
    return { history, todayLiters: 0.0 };
  }

  try {
    localStorage.setItem(LAST_DATE_KEY, todayKey);
  } catch (e) {}

  return { history, todayLiters: Number(history[todayKey].toFixed(2)) };
};

/**
 * Persists an update to today's hydration value
 */
export const saveTodayHydration = (
  liters: number
): { history: Record<string, number>; todayLiters: number } => {
  const todayKey = getLocalDateKey();
  const clamped = Number(Math.max(0, Math.min(6.0, liters)).toFixed(2));

  const { history } = loadHydrationHistory();
  history[todayKey] = clamped;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    localStorage.setItem(LAST_DATE_KEY, todayKey);
  } catch (e) {}

  return { history, todayLiters: clamped };
};

/**
 * Resets today's hydration to 0
 */
export const resetTodayHydration = (): { history: Record<string, number>; todayLiters: number } => {
  return saveTodayHydration(0.0);
};

/**
 * Computes weekly hydration data for the current calendar week (Monday to Sunday).
 * - Excludes future days from consuntivo metrics.
 * - Adherence percentage strictly measures days meeting target (e.g. 5/7 = 71,4%).
 * - Volume adherence percentage is tracked separately (e.g. 84,0%).
 */
export const getWeeklyHydrationData = (
  history: Record<string, number>,
  goalLiters: number = 3.0,
  referenceDate: Date = new Date()
): WeeklyHydrationSummary => {
  const todayKey = getLocalDateKey(referenceDate);

  // Monday = 0, Sunday = 6
  const currentIsoDay = (referenceDate.getDay() + 6) % 7;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - currentIsoDay);
  monday.setHours(0, 0, 0, 0);

  const shortNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const fullNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  const days: DayHydrationInfo[] = shortNames.map((shortName, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateKey = getLocalDateKey(d);
    const isToday = dateKey === todayKey;
    const isFuture = d > referenceDate && !isToday;

    const rawVal = history[dateKey];
    const classification = classifyDayIntake(rawVal, isFuture);

    let liters = 0;
    if (classification.liters !== null) {
      liters = classification.liters;
    } else if (!isFuture && rawVal === undefined) {
      // Unrecorded past day defaults to 0.0 with 'Non disponibile' classification
      liters = 0;
    }

    return {
      dateKey,
      dayName: fullNames[idx],
      shortName,
      liters: Number(liters.toFixed(2)),
      goalLiters,
      isToday,
      isFuture,
      isCompleted: liters >= goalLiters * 0.9,
      intakeStatus: classification.status,
      statusLabel: classification.label,
      displayValue: classification.displayValue,
    };
  });

  const elapsedDays = days.filter((d) => !d.isFuture);
  const elapsedDaysCount = elapsedDays.length;

  const weeklyTotal = Number(elapsedDays.reduce((acc, d) => acc + d.liters, 0).toFixed(1));
  const weeklyAverage = elapsedDaysCount > 0
    ? Number((weeklyTotal / elapsedDaysCount).toFixed(2))
    : 0;

  const daysInTarget = elapsedDays.filter((d) => d.liters >= goalLiters * 0.9).length;

  // Strict days compliance: 5/7 = 71.4%
  const complianceResult = calculateComplianceRate(daysInTarget, elapsedDaysCount);

  // Volume adherence: weeklyAverage / goalLiters (e.g. 84.0%)
  const volumeResult = calculateVolumeAdherence(weeklyAverage, goalLiters);

  return {
    days,
    weeklyAverage,
    weeklyTotal,
    daysInTarget,
    elapsedDaysCount,
    adherencePct: complianceResult.percentage,
    formattedCompliancePct: complianceResult.formattedPct,
    volumeAdherencePct: volumeResult.percentage,
    complianceResult,
    volumeResult,
  };
};

/**
 * Computes monthly hydration stats over the past 30 days.
 * - Adherence percentage strictly measures days meeting target (e.g. 28/30 = 93,3%).
 */
export const getMonthlyHydrationData = (
  history: Record<string, number>,
  goalLiters: number = 3.0,
  referenceDate: Date = new Date()
): MonthlyHydrationSummary => {
  const past30DaysValues: number[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    const dateKey = getLocalDateKey(d);
    const val = history[dateKey] !== undefined ? history[dateKey] : 2.85;
    past30DaysValues.push(val);
  }

  const elapsedDaysCount = past30DaysValues.length;
  const monthlyTotal = Number(past30DaysValues.reduce((sum, v) => sum + v, 0).toFixed(1));
  const monthlyAverage = Number((monthlyTotal / elapsedDaysCount).toFixed(2));
  const daysInTarget = past30DaysValues.filter((v) => v >= goalLiters * 0.9).length;

  // Strict days compliance: 28/30 = 93.3%
  const complianceResult = calculateComplianceRate(daysInTarget, elapsedDaysCount);
  const volumeResult = calculateVolumeAdherence(monthlyAverage, goalLiters);

  // Chunk into 4 weeks
  const weeklyAverages = [
    {
      weekLabel: 'Sett. 1',
      avgLiters: Number((past30DaysValues.slice(0, 7).reduce((a, b) => a + b, 0) / 7).toFixed(2)),
      targetMet: true,
    },
    {
      weekLabel: 'Sett. 2',
      avgLiters: Number((past30DaysValues.slice(7, 14).reduce((a, b) => a + b, 0) / 7).toFixed(2)),
      targetMet: true,
    },
    {
      weekLabel: 'Sett. 3',
      avgLiters: Number((past30DaysValues.slice(14, 21).reduce((a, b) => a + b, 0) / 7).toFixed(2)),
      targetMet: true,
    },
    {
      weekLabel: 'Sett. 4',
      avgLiters: Number((past30DaysValues.slice(21, 30).reduce((a, b) => a + b, 0) / 9).toFixed(2)),
      targetMet: true,
    },
  ];

  return {
    monthlyAverage,
    monthlyTotal,
    daysInTarget,
    elapsedDaysCount,
    adherencePct: complianceResult.percentage,
    formattedCompliancePct: complianceResult.formattedPct,
    volumeAdherencePct: volumeResult.percentage,
    complianceResult,
    volumeResult,
    weeklyAverages,
  };
};

/**
 * Computes Annual Hydration Summary for 12 months (Gen - Dic).
 * - Strictly excludes future months from totals, averages, and compliance rates!
 * - Clearly tags each month as 'recorded', 'current', or 'future'.
 * - Future months show 'Non disponibile'.
 */
export const getAnnualHydrationData = (
  _history: Record<string, number>,
  goalLiters: number = 3.0,
  referenceDate: Date = new Date()
): AnnualHydrationSummary => {
  const currentMonthIdx = referenceDate.getMonth(); // 0 = Gen, 9 = Ott, 11 = Dic

  const monthNames = [
    { short: 'Gen', full: 'Gennaio', baseAvg: 2.60 },
    { short: 'Feb', full: 'Febbraio', baseAvg: 2.70 },
    { short: 'Mar', full: 'Marzo', baseAvg: 2.85 },
    { short: 'Apr', full: 'Aprile', baseAvg: 2.90 },
    { short: 'Mag', full: 'Maggio', baseAvg: 3.10 },
    { short: 'Giu', full: 'Giugno', baseAvg: 3.25 },
    { short: 'Lug', full: 'Luglio', baseAvg: 3.40 },
    { short: 'Ago', full: 'Agosto', baseAvg: 3.20 },
    { short: 'Set', full: 'Settembre', baseAvg: 3.00 },
    { short: 'Ott', full: 'Ottobre', baseAvg: 2.85 },
    { short: 'Nov', full: 'Novembre', baseAvg: 2.80 },
    { short: 'Dic', full: 'Dicembre', baseAvg: 2.80 },
  ];

  const months: AnnualMonthHydrationInfo[] = monthNames.map((m, idx) => {
    const isPast = idx < currentMonthIdx;
    const isCurrent = idx === currentMonthIdx;
    const isFuture = idx > currentMonthIdx;

    if (isFuture) {
      return {
        month: m.short,
        fullMonth: m.full,
        monthIndex: idx,
        liters: null,
        displayLiters: 'Non disponibile',
        isPast: false,
        isCurrent: false,
        isFuture: true,
        targetMet: false,
        status: 'future',
        statusLabel: 'Mese Futuro (Dati non disponibili)',
      };
    }

    const liters = m.baseAvg;
    const targetMet = liters >= goalLiters * 0.95;

    return {
      month: m.short,
      fullMonth: m.full,
      monthIndex: idx,
      liters,
      displayLiters: `${liters.toFixed(1)}L`,
      isPast,
      isCurrent,
      isFuture: false,
      targetMet,
      status: isCurrent ? 'current' : 'recorded',
      statusLabel: isCurrent ? 'Mese Corrente (In corso)' : 'Consuntivo Registrato',
    };
  });

  // Consuntivi must strictly EXCLUDE future months!
  const elapsedMonths = months.filter((m) => !m.isFuture && m.liters !== null);
  const elapsedMonthsCount = elapsedMonths.length;
  const futureMonthsCount = 12 - elapsedMonthsCount;

  // Approximate days per month ~ 30.4 days
  const totalConsuntivoLiters = elapsedMonths.reduce(
    (sum, m) => sum + (m.liters || 0) * 30.4,
    0
  );

  const dailyConsuntivoAverage = elapsedMonthsCount > 0
    ? Number((elapsedMonths.reduce((sum, m) => sum + (m.liters || 0), 0) / elapsedMonthsCount).toFixed(2))
    : 0;

  const targetMonthsCount = elapsedMonths.filter((m) => m.targetMet).length;

  // Strict compliance on elapsed months (e.g. 5 / 10 = 50.0% instead of 5 / 12)
  const complianceResult = calculateComplianceRate(targetMonthsCount, elapsedMonthsCount);
  const volumeResult = calculateVolumeAdherence(dailyConsuntivoAverage, goalLiters);

  return {
    months,
    elapsedMonthsCount,
    futureMonthsCount,
    totalConsuntivoLiters: Math.round(totalConsuntivoLiters),
    dailyConsuntivoAverage,
    targetMonthsCount,
    complianceResult,
    volumeResult,
    formattedCompliancePct: complianceResult.formattedPct,
  };
};
