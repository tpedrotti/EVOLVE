export type BiologicalSex = 'uomo' | 'donna' | 'altro';
export type FitnessGoal = 'crescita' | 'definizione' | 'ricomposizione' | 'forza';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  name: string;
  avatarUrl?: string;
  sex: BiologicalSex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  goal: FitnessGoal;
  experience: ExperienceLevel;
  weeklyDays: number;
  selectedDays: string[];
  equipment: string[];
  dietaryPreferences: string[];
  timeZone?: string;
  simulatedDate?: string; // Data simulata dichiarata in modalità demo (es. '2026-10-17')
}

export interface MacroBreakdown {
  calories: number;
  surplusDeficitLabel: string;
  surplusDeficitValue: number;
  proteinGrams: number;
  proteinKcal: number;
  proteinPct: number;
  carbsGrams: number;
  carbsKcal: number;
  carbsPct: number;
  fatsGrams: number;
  fatsKcal: number;
  fatsPct: number;
  sugarsMaxGrams?: number;
  fiberTargetGrams?: number;
}

export interface ProjectionPoint {
  week: number;
  label: string;
  weightKg: number;
  deltaKg: number;
}

export interface TwelveWeekProjection {
  rateLabel: string;
  totalDeltaKg: number;
  points: ProjectionPoint[];
}

export type AppScreen = 'onboarding_hero' | 'onboarding_questionnaire' | 'onboarding_summary' | 'main_app';
export type MainTab = 'home' | 'workout' | 'dieta' | 'trend' | 'foto';

export type LoadType = 'dumbbell' | 'total' | 'bodyweight';

export interface ExerciseItem {
  id: string;
  name: string;
  setsReps: string;
  targetWeightKg?: number;
  muscleGroup: string;
  notes?: string;
  completed?: boolean;
  loadType?: LoadType;
  variantName?: string;
}

export interface ExerciseSetLog {
  setId: string;
  setNum: number;
  weightKg: number;
  reps: number;
  rpe?: number; // Scala RPE 6 - 10
  rir?: number; // Reps in reserve 0 - 4
  isCompleted: boolean;
  loadType?: LoadType;
  addedWeightKg?: number; // Per corpo libero con zavorra
  notes?: string;
}

export interface ExerciseSessionLog {
  exerciseId: string;
  exerciseName: string;
  variantName?: string;
  muscleGroup: string;
  loadType: LoadType;
  sets: ExerciseSetLog[];
  targetSetsReps?: string;
  completedAt: string; // ISO date string or YYYY-MM-DD
}

export interface WorkoutSessionLog {
  id: string;
  routineId: string;
  routineTitle: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  exercises: ExerciseSessionLog[];
  isCompleted: boolean;
  notes?: string;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  metric: 'max_weight' | 'max_volume_set' | 'max_volume_session';
  metricLabel: string;
  value: number;
  unit: string;
  date: string;
  sessionId: string;
  setNum?: number;
  weightKg: number;
  reps: number;
  estimated1RM?: number;
  loadType: LoadType;
}

export interface ProgressionProposal {
  exerciseId: string;
  exerciseName: string;
  hasSufficientData: boolean;
  canProgress: boolean;
  currentWeightKg: number;
  proposedWeightKg: number;
  deltaKg: number;
  ruleName: string;
  ruleDescription: string;
  reasoning: string;
  loadType: LoadType;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface WorkoutRoutine {
  id: string; // Identificativo stabile (es. 'push-day')
  order?: number; // Ordine nel ciclo (1, 2, 3, 4...)
  title: string;
  subtitle: string;
  durationMin: number;
  rpe: number;
  focusMuscles: string[];
  dayOfWeek?: string; // Giorno tipico pianificato ('Lun', 'Mar', 'Gio', 'Ven')
  dayName?: string;
  isToday?: boolean;
  exercises: ExerciseItem[];
}

export interface MealEntry {
  id: string;
  name: string;
  mealType: 'colazione' | 'pranzo' | 'spuntino' | 'cena';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  sugarsG?: number; // Zuccheri semplici in grammi
  fiberG?: number; // Fibre alimentari in grammi
  time: string;
  date?: string; // Data di registrazione in formato ISO locale 'YYYY-MM-DD' (es. '2026-10-18')
  imageUrl?: string; // URL o DataURL dell'immagine del piatto
  notes?: string; // Note opzionali sul pasto (ingredienti, ricetta, condimenti)
}

export type MediaType = 'photo' | 'video';

export interface PhotoEntry {
  id: string;
  dataUrl: string;
  mediaType?: MediaType;
  thumbnailUrl?: string;
  durationSec?: number;
  date: string; // ISO date string
  weightKg?: number;
  note?: string;
  tag: 'fronte' | 'schiena' | 'fianco' | 'libero';
}

export interface CoachMealEstimate {
  name: string;
  mealType: 'colazione' | 'pranzo' | 'spuntino' | 'cena';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  sugarsG?: number;
  fiberG?: number;
}

export interface CoachMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  dateContext?: string; // e.g. "12 Ottobre 2026"
  exerciseId?: string; // e.g. "ex-101"
  routineId?: string; // e.g. "push-day"
  category?: 'recovery' | 'workout' | 'nutrition' | 'general';
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaDurationSec?: number;
  mealEstimate?: CoachMealEstimate;
}


