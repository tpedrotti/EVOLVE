/**
 * Shared Metric & Aggregation Utilities for EVOLVE
 *
 * Rules:
 * - Deterministic, pure functions without hidden side effects.
 * - Safe handling of zero/negative denominators (no NaN, no Infinity, returns 'Non disponibile').
 * - Strict separation between:
 *   1) Days Compliance Rate (Giorni a target / Giorni trascorsi) -> e.g. 5/7 = 71,4%, 28/30 = 93,3%.
 *   2) Volume Adherence (Volume medio / Target) -> e.g. 2.85 L / 3.0 L = 95,0%.
 *   3) Calorie Cycling (ON training days vs OFF rest days vs Active Daily Target).
 * - Future dates exclusion: future days/months must never pollute completed consuntivi.
 * - Distinction between:
 *   - 'unrecorded': Day with no logged data -> 'Non disponibile'
 *   - 'zero': Day with explicitly recorded 0.0 -> '0.0 L (Registrato)'
 *   - 'recorded': Day with positive logged amount -> 'X.X L'
 *   - 'future': Future calendar date -> 'Non disponibile (Data futura)'
 */

export interface ComplianceRateResult {
  numerator: number;
  denominator: number;
  ratio: number;
  percentage: number;
  formattedPct: string;
  displayLabel: string;
  isValid: boolean;
}

/**
 * Calculates the exact compliance rate (e.g. days meeting target out of total elapsed days).
 * Formats in Italian locale with 1 decimal digit (e.g. '71,4%', '93,3%').
 *
 * Examples:
 * - calculateComplianceRate(5, 7) -> 71.4% ('71,4%')
 * - calculateComplianceRate(28, 30) -> 93.3% ('93,3%')
 * - calculateComplianceRate(0, 0) -> isValid: false, displayLabel: 'Non disponibile'
 */
export function calculateComplianceRate(
  numerator: number,
  denominator: number
): ComplianceRateResult {
  if (
    typeof denominator !== 'number' ||
    typeof numerator !== 'number' ||
    isNaN(denominator) ||
    isNaN(numerator) ||
    denominator <= 0
  ) {
    return {
      numerator: isNaN(numerator) ? 0 : numerator,
      denominator: isNaN(denominator) || denominator < 0 ? 0 : denominator,
      ratio: 0,
      percentage: 0,
      formattedPct: '0,0%',
      displayLabel: 'Non disponibile',
      isValid: false,
    };
  }

  const clampedNumerator = Math.max(0, numerator);
  const ratio = clampedNumerator / denominator;
  const percentage = Number((ratio * 100).toFixed(1));

  // Italian locale formatting: 71.4 -> '71,4%'
  const formattedPct = `${percentage.toFixed(1).replace('.', ',')}%`;
  const displayLabel = `${clampedNumerator}/${denominator} (${formattedPct})`;

  return {
    numerator: clampedNumerator,
    denominator,
    ratio,
    percentage,
    formattedPct,
    displayLabel,
    isValid: true,
  };
}

export interface VolumeAdherenceResult {
  actual: number;
  goal: number;
  percentage: number;
  formattedPct: string;
  isValid: boolean;
}

/**
 * Calculates volume-based adherence (e.g. average liters drunk vs 3.0L target).
 */
export function calculateVolumeAdherence(
  actual: number,
  goal: number
): VolumeAdherenceResult {
  if (typeof goal !== 'number' || isNaN(goal) || goal <= 0 || isNaN(actual)) {
    return {
      actual: isNaN(actual) ? 0 : actual,
      goal: isNaN(goal) || goal < 0 ? 0 : goal,
      percentage: 0,
      formattedPct: 'Non disponibile',
      isValid: false,
    };
  }

  const ratio = Math.max(0, actual) / goal;
  const percentage = Number((ratio * 100).toFixed(1));
  const formattedPct = `${percentage.toFixed(1).replace('.', ',')}%`;

  return {
    actual,
    goal,
    percentage,
    formattedPct,
    isValid: true,
  };
}

export interface CalorieCyclingBreakdown {
  targetCalories: number;
  weeklyDays: number;
  restDays: number;
  onCalories: number;
  offCalories: number;
  weightedAverage: number;
  formulaDescription: string;
}

/**
 * Calculates Caloric Cycling between training (ON) days and rest (OFF) days
 * ensuring that the 7-day weighted average matches the active daily target.
 *
 * For example:
 * Active Target = 2.850 kcal/die, 4 ON days, 3 OFF days.
 * ON Days = 2.900 kcal (+50 kcal per session)
 * Total weekly kcal = 2.850 * 7 = 19.950 kcal
 * ON Total = 2.900 * 4 = 11.600 kcal
 * OFF Total = 19.950 - 11.600 = 8.350 kcal
 * OFF Days (3 days) = 8.350 / 3 = 2.783 kcal/die (approx ~2.780 kcal)
 * Weighted average = (4 * 2900 + 3 * 2783.33) / 7 = 2.850 kcal!
 */
export function calculateCalorieCycling(
  targetCalories: number,
  weeklyDays: number = 4
): CalorieCyclingBreakdown {
  const safeTarget = Math.max(1200, isNaN(targetCalories) ? 2850 : targetCalories);
  const safeDays = Math.min(7, Math.max(1, isNaN(weeklyDays) ? 4 : weeklyDays));
  const restDays = 7 - safeDays;

  // On days receive a moderate surplus boost of ~50 kcal rounded to 25 kcal
  const onCalories = Math.round((safeTarget + 50) / 25) * 25;
  const totalWeekly = safeTarget * 7;
  const onTotal = onCalories * safeDays;

  const offCalories = restDays > 0
    ? Math.round((totalWeekly - onTotal) / restDays)
    : safeTarget;

  const weightedAverage = Number(
    ((onCalories * safeDays + offCalories * restDays) / 7).toFixed(1)
  );

  const formulaDescription = `Media ponderata settimanale: (${safeDays}×${onCalories} kcal ON + ${restDays}×${offCalories} kcal OFF) / 7 = ${Math.round(weightedAverage)} kcal/die`;

  return {
    targetCalories: safeTarget,
    weeklyDays: safeDays,
    restDays,
    onCalories,
    offCalories,
    weightedAverage,
    formulaDescription,
  };
}

export type IntakeStatus = 'recorded' | 'zero' | 'unrecorded' | 'future';

export interface DayIntakeClassification {
  status: IntakeStatus;
  label: string;
  displayValue: string;
  liters: number | null;
  isAvailable: boolean;
}

/**
 * Distinguishes an unrecorded day from an explicitly recorded zero or a future date.
 */
export function classifyDayIntake(
  val: number | undefined | null,
  isFuture: boolean
): DayIntakeClassification {
  if (isFuture) {
    return {
      status: 'future',
      label: 'Data Futura',
      displayValue: 'Non disponibile',
      liters: null,
      isAvailable: false,
    };
  }

  if (val === undefined || val === null || isNaN(val)) {
    return {
      status: 'unrecorded',
      label: 'Non registrato',
      displayValue: 'Non disponibile',
      liters: null,
      isAvailable: false,
    };
  }

  if (val === 0) {
    return {
      status: 'zero',
      label: 'Nessun apporto registrato',
      displayValue: '0.0 L',
      liters: 0,
      isAvailable: true,
    };
  }

  return {
    status: 'recorded',
    label: 'Registrato',
    displayValue: `${Number(val).toFixed(1)} L`,
    liters: Number(val),
    isAvailable: true,
  };
}

export interface MetricTransparencyInfo {
  metricId: string;
  title: string;
  period: string;
  formula: string;
  source: 'demo' | 'user' | 'hybrid';
  sourceLabel: string;
  lastUpdated: string;
  notes: string;
}

/**
 * Returns complete transparency metadata for any metric in the app.
 */
export function getMetricTransparencyInfo(
  metricId: 'hydration_week' | 'hydration_month' | 'hydration_year' | 'calories_cycling' | 'weight_trend'
): MetricTransparencyInfo {
  const now = new Date();
  const timestamp = `${now.toLocaleDateString('it-IT')} alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

  switch (metricId) {
    case 'hydration_week':
      return {
        metricId,
        title: 'Idratazione Settimanale (Lun - Dom)',
        period: 'Settimana di calendario corrente (Lunedì - Domenica)',
        formula: 'Aderenza Giorni = (Giorni con litri ≥ 90% del target) / (Giorni trascorsi). Le date future sono escluse.',
        source: 'hybrid',
        sourceLabel: 'Dati reali registrati oggi in locale + archivio settimanale',
        lastUpdated: timestamp,
        notes: 'I giorni senza registrazione mostrano "Non disponibile" e non vengono confusi con apporto zero.',
      };
    case 'hydration_month':
      return {
        metricId,
        title: 'Trend Idratazione 30 Giorni',
        period: 'Ultimi 30 giorni fino a oggi compreso',
        formula: 'Aderenza Giorni = (Giorni a target) / 30 giorni. Media = Volume Totale / 30.',
        source: 'hybrid',
        sourceLabel: 'Storico simulato calibrato + registrazioni attuali in locale',
        lastUpdated: timestamp,
        notes: 'La percentuale indicata sotto al conteggio (es. 28/30) corrisponde rigorosamente al 93,3% dei giorni.',
      };
    case 'hydration_year':
      return {
        metricId,
        title: 'Sintesi Idrica Annuale 365 Giorni',
        period: 'Anno solare in corso (Gennaio - Dicembre)',
        formula: 'Consuntivo calcolato SOLO sui mesi trascorsi o in corso. I mesi futuri sono esclusi da medie e totali.',
        source: 'hybrid',
        sourceLabel: 'Simulazione annuale su base stagionale + dati correnti',
        lastUpdated: timestamp,
        notes: 'I mesi futuri mostrano esplicitamente "Non disponibile (Mese Futuro)" senza inventare consuntivi.',
      };
    case 'calories_cycling':
      return {
        metricId,
        title: 'Ciclizzazione Calorica ON / OFF',
        period: 'Settimana tipo d\'allenamento',
        formula: 'Media ponderata: (Giorni_ON × Kcal_ON + Giorni_OFF × Kcal_OFF) / 7 = Target Attivo Diario (2.850 kcal)',
        source: 'user',
        sourceLabel: 'Formula Harris-Benedict + TDEE profilo + Surplus 300 kcal',
        lastUpdated: timestamp,
        notes: '2.850 kcal è il target attivo medio; 2.900 kcal è il target dei giorni di allenamento, 2.783 kcal nei giorni di riposo.',
      };
    case 'weight_trend':
      return {
        metricId,
        title: 'Evoluzione Peso Corporeo',
        period: 'Ultimi 30 giorni / 12 Mesi',
        formula: 'Delta = Peso Corrente - Peso Iniziale. Proiezione basata su tasso programmato di crescita (+0.315 kg/sett).',
        source: 'hybrid',
        sourceLabel: 'Profilo utente + checkpoints progressi',
        lastUpdated: timestamp,
        notes: 'Dati storici reali separati dalle proiezioni future verso il target di 80.0 kg.',
      };
  }
}

export interface NotificationItem {
  id: string;
  category: 'hydration' | 'nutrition' | 'recovery' | 'workout';
  title: string;
  message: string;
  timestamp: string;
  isUnread: boolean;
  valueContext?: string;
}

/**
 * Generates dynamic, coherent biometric notifications directly from the active Home daily state.
 */
export function generateLiveNotifications(params: {
  todayWaterLiters: number;
  hydrationGoalLiters: number;
  todayCalories: number;
  targetCalories: number;
  workoutTitle: string;
  recoveryPct?: number;
}): NotificationItem[] {
  const {
    todayWaterLiters,
    hydrationGoalLiters,
    todayCalories,
    targetCalories,
    workoutTitle,
    recoveryPct = 94,
  } = params;

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const timestamp = `Oggi, ${timeStr}`;

  const notifications: NotificationItem[] = [];

  // 1. Recovery notification
  notifications.push({
    id: 'notif-recovery',
    category: 'recovery',
    title: 'Recupero Ottimale',
    message: `Recupero calcolato al ${recoveryPct}%. Sistema pronto per ${workoutTitle}.`,
    timestamp: 'Oggi, 07:30',
    isUnread: false,
    valueContext: `${recoveryPct}% HRV`,
  });

  // 2. Hydration notification (synchronized with exact Home waterLiters!)
  const waterPct = hydrationGoalLiters > 0
    ? Math.min(100, Math.round((todayWaterLiters / hydrationGoalLiters) * 100))
    : 0;

  let waterMsg = '';
  if (todayWaterLiters <= 0) {
    waterMsg = `Hai registrato 0.0 L su ${hydrationGoalLiters.toFixed(1)} L (0%). Ricorda di bere il tuo primo bicchiere d'acqua per attivare il metabolismo.`;
  } else if (waterPct >= 100) {
    waterMsg = `Obiettivo idrico completato! Hai raggiunto ${todayWaterLiters.toFixed(1)} L su ${hydrationGoalLiters.toFixed(1)} L (${waterPct}%).`;
  } else {
    waterMsg = `Sei a ${todayWaterLiters.toFixed(1)} L su ${hydrationGoalLiters.toFixed(1)} L (${waterPct}% del fabbisogno giornaliero).`;
  }

  notifications.push({
    id: 'notif-hydration',
    category: 'hydration',
    title: 'Obiettivo Idratazione',
    message: waterMsg,
    timestamp,
    isUnread: true,
    valueContext: `${todayWaterLiters.toFixed(1)} / ${hydrationGoalLiters.toFixed(1)} L`,
  });

  // 3. Nutrition notification
  const calPct = targetCalories > 0
    ? Math.min(100, Math.round((todayCalories / targetCalories) * 100))
    : 0;

  notifications.push({
    id: 'notif-nutrition',
    category: 'nutrition',
    title: 'Bilancio Calorico Odierno',
    message: `Hai assunto ${todayCalories} kcal su ${targetCalories} kcal target (${calPct}%). Restano ${Math.max(0, targetCalories - todayCalories)} kcal.`,
    timestamp,
    isUnread: true,
    valueContext: `${todayCalories} / ${targetCalories} kcal`,
  });

  return notifications;
}
