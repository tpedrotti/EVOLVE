import React, { useState, useEffect } from 'react';
import { ASSETS } from '../data/mockData';
import type { UserProfile, WorkoutRoutine, MealEntry } from '../types';
import type { DayScheduleResult } from '../utils/workoutSchedule';
import { calculateTargetNutrition } from '../utils/fitnessLogic';
import { getEffectiveTodayKey } from '../utils/mealValidation';
import { Icon } from './Icons';
import { AddWaterModal } from './AddWaterModal';

interface ScreenHomeDashboardProps {
  profile: UserProfile;
  todayWorkout?: WorkoutRoutine | null;
  todaySchedule?: DayScheduleResult;
  meals: MealEntry[];
  waterLiters: number;
  onAddWater: (amountL: number) => void;
  onResetWater?: () => void;
  onStartWorkout?: () => void;
  onOpenAddMeal: () => void;
  completedWorkoutsCount: number;
  onNavigateToTab?: (tab: 'workout' | 'dieta' | 'trend' | 'foto') => void;
}

export const ScreenHomeDashboard: React.FC<ScreenHomeDashboardProps> = ({
  profile,
  todayWorkout,
  todaySchedule,
  meals,
  waterLiters,
  onAddWater,
  onResetWater,
  onStartWorkout,
  onOpenAddMeal,
  completedWorkoutsCount,
  onNavigateToTab,
}) => {
  const [waterButtonAnimated, setWaterButtonAnimated] = useState(false);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);

  // Collapsed states persisted in localStorage for clean simple dashboard
  const [isWorkoutCollapsed, setIsWorkoutCollapsed] = useState(() => {
    return localStorage.getItem('evolve_home_collapsed_workout') === 'true';
  });
  const [isNutritionCollapsed, setIsNutritionCollapsed] = useState(() => {
    return localStorage.getItem('evolve_home_collapsed_nutrition') === 'true';
  });
  const [isGoalCollapsed, setIsGoalCollapsed] = useState(() => {
    return localStorage.getItem('evolve_home_collapsed_goal') === 'true';
  });
  const [isHydrationCollapsed, setIsHydrationCollapsed] = useState(() => {
    return localStorage.getItem('evolve_home_collapsed_hydration') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('evolve_home_collapsed_workout', String(isWorkoutCollapsed));
  }, [isWorkoutCollapsed]);

  useEffect(() => {
    localStorage.setItem('evolve_home_collapsed_nutrition', String(isNutritionCollapsed));
  }, [isNutritionCollapsed]);

  useEffect(() => {
    localStorage.setItem('evolve_home_collapsed_goal', String(isGoalCollapsed));
  }, [isGoalCollapsed]);

  useEffect(() => {
    localStorage.setItem('evolve_home_collapsed_hydration', String(isHydrationCollapsed));
  }, [isHydrationCollapsed]);


  const nutrition = calculateTargetNutrition(profile);
  const todayKey = getEffectiveTodayKey(profile);

  // Compute nutrition strictly for today's meals (legacy meals without date default to todayKey)
  const todayMeals = meals.filter((m) => (m.date || todayKey) === todayKey);

  const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = todayMeals.reduce((sum, m) => sum + m.proteinG, 0);
  const totalCarbs = todayMeals.reduce((sum, m) => sum + m.carbsG, 0);
  const totalFats = todayMeals.reduce((sum, m) => sum + m.fatsG, 0);
  const totalSugars = todayMeals.reduce((sum, m) => sum + (m.sugarsG || 0), 0);
  const totalFiber = todayMeals.reduce((sum, m) => sum + (m.fiberG || 0), 0);

  const remainingCalories = Math.max(0, nutrition.calories - totalCalories);
  const proteinPct = Math.min(100, Math.round((totalProtein / nutrition.proteinGrams) * 100));
  const carbsPct = Math.min(100, Math.round((totalCarbs / nutrition.carbsGrams) * 100));
  const fatsPct = Math.min(100, Math.round((totalFats / nutrition.fatsGrams) * 100));

  const sugarsMaxGrams = nutrition.sugarsMaxGrams || Math.round((nutrition.calories * 0.1) / 4);
  const fiberTargetGrams = nutrition.fiberTargetGrams || Math.round((nutrition.calories / 1000) * 12.5);
  const sugarsPct = Math.min(100, Math.round((totalSugars / sugarsMaxGrams) * 100));
  const fiberPct = Math.min(100, Math.round((totalFiber / fiberTargetGrams) * 100));

  const hydrationGoal = 3.0;
  const hydrationPct = Math.min(100, Math.round((waterLiters / hydrationGoal) * 100));

  const handleWaterClick = (amountL: number = 0.25) => {
    onAddWater(amountL);
    setWaterButtonAnimated(true);
    setTimeout(() => setWaterButtonAnimated(false), 250);
  };

  const sessionsCompleted = completedWorkoutsCount;
  const totalWeeklySessions = profile.weeklyDays;
  const sessionPct = Math.min(100, Math.round((sessionsCompleted / totalWeeklySessions) * 100));

  const strokeDashoffset = 251.3 - (251.3 * sessionPct) / 100;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-md px-5 pb-32">
        {/* Greeting & Biometric Vitals Header */}
        <section className="pt-3 pb-8 mb-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[28px] font-extrabold text-[#191c1c] tracking-tight">
                Buongiorno, {profile.name || 'Atleta'}
              </span>
            </div>
            <p className="text-[15px] text-[#424936] mt-0.5">
              {todaySchedule?.isRestDay || !todayWorkout ? (
                <>
                  Oggi: <span className="font-semibold text-[#191c1c]">Giorno di Riposo ({todaySchedule?.dayName || 'Riposo'})</span>. Recupero attivo e mobilità.
                </>
              ) : (
                <>
                  Oggi: <span className="font-semibold text-[#191c1c]">{todayWorkout.title}</span> ({todayWorkout.durationMin} min).
                </>
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse" />
              <span className="text-[11px] font-bold text-[#386a00] bg-[#84cc16]/15 px-2.5 py-0.5 rounded-full">
                {profile.simulatedDate
                  ? `Modalità Demo Dichiarata: ${todaySchedule?.dayName || ''} ${todaySchedule?.dateKey || profile.simulatedDate} (${profile.timeZone || 'Europe/Rome'})`
                  : 'Modalità: Dati Demo Sincronizzati (Home • Notifiche • Trend)'}
              </span>
            </div>
          </div>
        </section>

        {/* Dashboard Cards Container */}
        <div className="space-y-4">
        {isGoalCollapsed ? (
          <div
            id="home-collapsed-goal"
            onClick={() => setIsGoalCollapsed(false)}
            className="rounded-2xl bg-white p-4 shadow-sm border border-[#e2e8e4] hover:border-[#84cc16] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
            title="Espandi"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#84cc16]/15 flex items-center justify-center text-[#386a00] shrink-0 group-hover:scale-105 transition-transform">
                <Icon name="local_fire_department" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors whitespace-nowrap">
                    Obiettivo
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d7e2dc] text-[#141e1a] shrink-0">
                    {sessionsCompleted}/{totalWeeklySessions}
                  </span>
                </div>
                <p className="text-[12px] text-[#56615c] mt-0.5 truncate">
                  6 sett. streak • {sessionPct}% completato
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGoalCollapsed(false);
                }}
                title="Espandi obiettivo"
                className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon name="expand_more" className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-[#e2e8e4] flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div
                onClick={() => setIsGoalCollapsed(true)}
                className="cursor-pointer group select-none flex-1 min-w-0"
                title="Comprimi"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c]">
                    Obiettivo Trimestre
                  </span>
                </div>
                <h2 className="text-[20px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors mt-0.5">
                  {profile.goal === 'crescita' ? 'Crescita Muscolare' : 'Definizione & Cut'}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d7e2dc] text-[#141e1a] text-[12px] font-semibold">
                  <Icon name="local_fire_department" className="w-4 h-4 text-[#386a00]" />
                  6 sett. streak
                </span>
                <button
                  type="button"
                  onClick={() => setIsGoalCollapsed(true)}
                  title="Comprimi sezione"
                  className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Icon name="expand_less" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ring + Core Metrics Layout */}
            <div className="flex items-center gap-5 py-1">
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e6e9e8"
                    strokeWidth="11"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth="11"
                    strokeDasharray="251.3"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[28px] font-bold text-[#191c1c] leading-none">
                    {sessionsCompleted}
                    <span className="text-[#56615c] text-[18px]">/{totalWeeklySessions}</span>
                  </span>
                  <span className="text-[11px] text-[#56615c] uppercase font-bold tracking-wider mt-0.5">
                    Sessioni
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                <div className="rounded-xl bg-[#f2f4f3] p-2.5">
                  <span className="text-[11px] text-[#56615c] block">Peso Attuale</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-[20px] text-[#191c1c] font-bold">
                      {profile.weightKg.toFixed(1)}
                    </span>
                    <span className="text-[12px] text-[#424936] font-medium">kg</span>
                    <span className="text-[12px] font-semibold text-[#386a00] flex items-center ml-auto">
                      ▲ +0.3 kg
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#f2f4f3] p-2.5">
                  <span className="text-[11px] text-[#56615c] block">Costanza Settimanale</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[13px] font-semibold text-[#191c1c]">
                      {sessionPct}% completato
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]"></span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. Workout of the Day or Rest Day */}
        {todaySchedule?.isRestDay || !todayWorkout ? (
          isWorkoutCollapsed ? (
            <div
              id="home-collapsed-workout"
              onClick={() => setIsWorkoutCollapsed(false)}
              className="rounded-2xl bg-white p-4 shadow-sm border border-[#e2e8e4] hover:border-[#84cc16] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
              title="Espandi"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#84cc16]/15 flex items-center justify-center text-[#386a00] shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="bedtime" className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors whitespace-nowrap">
                      Giorno di Riposo
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#84cc16]/20 text-[#386a00] shrink-0">
                      Recupero Attivo
                    </span>
                  </div>
                  <p className="text-[12px] text-[#56615c] mt-0.5 truncate">
                    {todaySchedule?.dayName || 'Oggi'}: Recupero neuromuscolare
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkoutCollapsed(false);
                  }}
                  title="Espandi scheda riposo"
                  className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Icon name="expand_more" className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <section className="relative rounded-2xl bg-white p-5 shadow-sm overflow-hidden flex flex-col gap-3 border border-[#e2e8e4]">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#84cc16]/15 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between relative z-10">
                <div
                  onClick={() => setIsWorkoutCollapsed(true)}
                  className="cursor-pointer group flex items-center gap-2 select-none"
                  title="Comprimi"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00]">
                    Oggi: {todaySchedule?.dayName || 'Riposo'}
                  </span>
                  <span className="text-[11px] font-semibold text-[#56615c]">
                    Riposo Programmato
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsWorkoutCollapsed(true)}
                    title="Comprimi riposo"
                    className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Icon name="expand_less" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                onClick={() => setIsWorkoutCollapsed(true)}
                className="relative z-10 cursor-pointer group select-none"
                title="Clicca per comprimere"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-[20px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors">
                    Recupero & Rigenerazione
                  </h3>
                  <Icon name="unfold_less" className="w-4 h-4 text-[#56615c] group-hover:text-[#386a00] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[#56615c] text-[13px] mt-1">
                  Nessuna sessione pesante programmata per oggi. Ottimizza la sintesi proteica, mantieni alta l'idratazione e dedicati a mobilità articolare o stretching leggero.
                </p>
              </div>

              {todaySchedule?.nextScheduledRoutine && (
                <div className="p-3.5 rounded-xl bg-[#f2f4f3] border border-[#e2e8e4] relative z-10">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c] block">
                    Prossima Sessione in Programma
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[14px] font-bold text-[#191c1c]">
                      {todaySchedule.nextScheduledRoutine.title}
                    </span>
                    <span className="text-[12px] font-bold text-[#386a00] bg-[#84cc16]/15 px-2 py-0.5 rounded-full">
                      {todaySchedule.nextScheduledDate ? todaySchedule.nextScheduledDate.split('-').reverse().slice(0, 2).join('/') : 'Lunedì'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#56615c] mt-0.5">
                    {todaySchedule.nextScheduledRoutine.exercises.length} esercizi • ~{todaySchedule.nextScheduledRoutine.durationMin} min • Focus: {todaySchedule.nextScheduledRoutine.focusMuscles.join(', ')}
                  </p>
                </div>
              )}

              {/* Action Button: Go to Workouts */}
              <button
                type="button"
                onClick={() => onNavigateToTab?.('workout')}
                className="relative z-10 w-full py-3.5 px-6 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#191c1c] text-[15px] font-bold flex items-center justify-center gap-2 border border-[#e2e8e4] transition-all cursor-pointer"
              >
                <Icon name="format_list_bulleted" className="w-5 h-5 text-[#386a00]" />
                <span>Sfoglia Schede di Allenamento</span>
              </button>
            </section>
          )
        ) : (
          isWorkoutCollapsed ? (
            <div
              id="home-collapsed-workout"
              onClick={() => setIsWorkoutCollapsed(false)}
              className="rounded-2xl bg-white p-4 shadow-sm border border-[#e2e8e4] hover:border-[#84cc16] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
              title="Espandi"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#84cc16]/15 flex items-center justify-center text-[#386a00] shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="fitness_center" className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors whitespace-nowrap">
                      Allenamento
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#acf847]/40 text-[#102000] shrink-0">
                      {todayWorkout.durationMin} min
                    </span>
                  </div>
                  <p className="text-[12px] text-[#56615c] mt-0.5 truncate">
                    {todayWorkout.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsWorkoutCollapsed(false);
                  }}
                  title="Espandi scheda allenamento"
                  className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Icon name="expand_more" className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <section className="relative rounded-2xl bg-white p-5 shadow-sm overflow-hidden flex flex-col gap-3 border border-[#e2e8e4]">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#84cc16]/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between relative z-10">
                <div
                  onClick={() => setIsWorkoutCollapsed(true)}
                  className="cursor-pointer group flex items-center gap-2 select-none"
                  title="Comprimi"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#acf847] text-[#102000]">
                    Programmato per Oggi
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsWorkoutCollapsed(true)}
                    title="Comprimi allenamento"
                    className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Icon name="expand_less" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                onClick={() => setIsWorkoutCollapsed(true)}
                className="relative z-10 cursor-pointer group select-none"
                title="Clicca sul titolo per comprimere in se stesso"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-[20px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors">
                    {todayWorkout.title}
                  </h3>
                  <Icon name="unfold_less" className="w-4 h-4 text-[#56615c] group-hover:text-[#386a00] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[#56615c] text-[13px]">
                  <span className="flex items-center gap-1.5">
                    <Icon name="schedule" className="w-4 h-4 text-[#386a00]" />
                    <span>{todayWorkout.durationMin} min</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="format_list_bulleted" className="w-4 h-4 text-[#386a00]" />
                    <span>{todayWorkout.exercises.length} esercizi</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#e6e9e8] text-[#191c1c] font-bold text-[11px] leading-tight">
                    RPE {todayWorkout.rpe}
                  </span>
                </div>
              </div>

              {/* Exercise Snippets */}
              <div className="flex flex-col gap-2 relative z-10">
                {todayWorkout.exercises.slice(0, 3).map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#f2f4f3]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <span className="w-6 h-6 rounded-full bg-[#e1e3e2] text-[#56615c] text-[12px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[13px] text-[#191c1c] font-medium truncate">
                        {ex.name}
                      </span>
                    </div>
                    <span className="text-[13px] text-[#56615c] font-semibold shrink-0 tabular-nums text-right">
                      {ex.setsReps}
                    </span>
                  </div>
                ))}
              </div>

              {/* Primary Action Button */}
              {onStartWorkout && (
                <button
                  id="start-workout-action-btn"
                  type="button"
                  onClick={onStartWorkout}
                  className="relative z-10 w-full py-4 px-6 rounded-full bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[18px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <Icon name="play_arrow" className="w-6 h-6" />
                  <span>Inizia allenamento</span>
                </button>
              )}
            </section>
          )
        )}

        {/* 3. Nutrition & Daily Macros (Collapsible - closes on title click & opens dieta tab when compact) */}
        {isNutritionCollapsed ? (
          <div
            id="home-collapsed-nutrition"
            onClick={() => setIsNutritionCollapsed(false)}
            className="rounded-2xl bg-white p-4 shadow-sm border border-[#e2e8e4] hover:border-[#84cc16] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
            title="Espandi"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#84cc16]/15 flex items-center justify-center text-[#386a00] shrink-0 group-hover:scale-105 transition-transform">
                <Icon name="restaurant" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors whitespace-nowrap">
                    Calorie &amp; Macro
                  </h3>
                </div>
                <p className="text-[12px] text-[#56615c] mt-0.5 truncate">
                  <span className="font-semibold text-[#386a00]">{remainingCalories.toLocaleString()} kcal rimaste</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddMeal();
                }}
                aria-haspopup="dialog"
                aria-label="Aggiungi alimento"
                title="Aggiungi alimento"
                className="w-8 h-8 rounded-full bg-[#e6e9e8] hover:bg-[#d7e2dc] text-[#191c1c] flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
              >
                <Icon name="add" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNutritionCollapsed(false);
                }}
                aria-label="Espandi calorie e macro"
                title="Espandi calorie e macro"
                className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon name="expand_more" className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-[#e2e8e4] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div
                onClick={() => setIsNutritionCollapsed(true)}
                className="cursor-pointer group select-none flex-1 min-w-0"
                title="Comprimi"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c]">
                    Alimentazione Giornaliera
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-[20px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors">
                    Calorie &amp; Macro
                  </h3>
                  <Icon name="unfold_less" className="w-4 h-4 text-[#56615c] group-hover:text-[#386a00] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="open-add-meal-btn"
                  type="button"
                  onClick={onOpenAddMeal}
                  aria-haspopup="dialog"
                  aria-label="Aggiungi Alimento nel diario"
                  className="w-9 h-9 rounded-full bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center hover:bg-[#d7e2dc] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
                >
                  <Icon name="add" className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsNutritionCollapsed(true)}
                  title="Comprimi alimentazione"
                  className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Icon name="expand_less" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Calories Master Summary */}
            <div className="flex items-end justify-between bg-[#f2f4f3] p-4 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[12px] text-[#56615c]">Assunte / Obiettivo</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[32px] text-[#191c1c] font-extrabold tracking-tight">
                    {totalCalories.toLocaleString()}
                  </span>
                  <span className="text-[15px] text-[#56615c] font-semibold">
                    / {nutrition.calories.toLocaleString()} kcal
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[12px] text-[#56615c] block">Rimanenti</span>
                <span className="text-[20px] text-[#386a00] font-bold">
                  {remainingCalories.toLocaleString()} kcal
                </span>
              </div>
            </div>

            {/* Macro Indicators */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#191c1c]">Proteine</span>
                  <span className="w-2 h-2 rounded-full bg-[#84cc16]"></span>
                </div>
                <span className="text-[15px] font-bold text-[#191c1c]">{totalProtein}g</span>
                <span className="text-[11px] text-[#56615c]">su {nutrition.proteinGrams}g</span>
                <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#84cc16] rounded-full transition-all duration-500"
                    style={{ width: `${proteinPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-col p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#191c1c]">Carbo</span>
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                </div>
                <span className="text-[15px] font-bold text-[#191c1c]">{totalCarbs}g</span>
                <span className="text-[11px] text-[#56615c]">su {nutrition.carbsGrams}g</span>
                <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
                    style={{ width: `${carbsPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-col p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#191c1c]">Grassi</span>
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                </div>
                <span className="text-[15px] font-bold text-[#191c1c]">{totalFats}g</span>
                <span className="text-[11px] text-[#56615c]">su {nutrition.fatsGrams}g</span>
                <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#f43f5e] rounded-full transition-all duration-500"
                    style={{ width: `${fatsPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Secondary Macro Indicators: Zuccheri & Fibre */}
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <div className="flex flex-col p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#191c1c]">Zuccheri</span>
                  <span className="w-2 h-2 rounded-full bg-[#a855f7]"></span>
                </div>
                <span className="text-[15px] font-bold text-[#191c1c]">{totalSugars}g</span>
                <span className="text-[11px] text-[#56615c]">max {sugarsMaxGrams}g</span>
                <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalSugars > sugarsMaxGrams ? 'bg-[#ef4444]' : 'bg-[#a855f7]'
                    }`}
                    style={{ width: `${sugarsPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-col p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#191c1c]">Fibre</span>
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                </div>
                <span className="text-[15px] font-bold text-[#191c1c]">{totalFiber}g</span>
                <span className="text-[11px] text-[#56615c]">target {fiberTargetGrams}g</span>
                <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#10b981] rounded-full transition-all duration-500"
                    style={{ width: `${fiberPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Hydration & Water Tracker Card (Collapsible) */}
        {isHydrationCollapsed ? (
          <div
            id="home-collapsed-hydration"
            onClick={() => setIsHydrationCollapsed(false)}
            className="rounded-2xl bg-white p-4 shadow-sm border border-[#e2e8e4] hover:border-[#84cc16] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
            title="Espandi"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-[#84cc16]/15 flex items-center justify-center text-[#386a00] shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                <div
                  className="absolute bottom-0 inset-x-0 bg-[#84cc16] opacity-35 transition-all duration-300"
                  style={{ height: `${hydrationPct}%` }}
                ></div>
                <Icon name="water_drop" className="w-5 h-5 text-[#386a00] relative z-10" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors whitespace-nowrap">
                    Idratazione
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d7e2dc] text-[#141e1a] shrink-0">
                    {waterLiters.toFixed(2)} / {hydrationGoal.toFixed(1)} L
                  </span>
                </div>
                <p className="text-[12px] text-[#56615c] mt-0.5 truncate">
                  <span className="font-semibold text-[#386a00]">{hydrationPct}% dell'obiettivo</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWaterClick(0.25);
                }}
                title="Aggiungi +250ml d'acqua rapido"
                className="w-8 h-8 rounded-full bg-[#e6e9e8] hover:bg-[#d7e2dc] text-[#191c1c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon name="add" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHydrationCollapsed(false);
                }}
                title="Espandi idratazione"
                className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon name="expand_more" className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-[#e2e8e4] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div
                onClick={() => setIsHydrationCollapsed(true)}
                className="flex items-center gap-3 cursor-pointer group select-none flex-1 min-w-0"
                title="Comprimi"
              >
                <div className="relative w-12 h-12 rounded-full bg-[#d7e2dc] flex items-center justify-center shrink-0 overflow-hidden">
                  <div
                    className="absolute bottom-0 inset-x-0 bg-[#84cc16] opacity-40 transition-all duration-300"
                    style={{ height: `${hydrationPct}%` }}
                  ></div>
                  <Icon name="water_drop" className="w-6 h-6 text-[#141e1a] relative z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c]">
                      Idratazione
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#84cc16]/15 text-[#386a00]">
                      Oggi
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[20px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors" id="water-current-val">
                      {waterLiters.toFixed(2)}
                    </span>
                    <span className="text-[15px] text-[#56615c] font-semibold">/ {hydrationGoal.toFixed(1)} L</span>
                  </div>
                  <span className="text-[12px] text-[#386a00] font-semibold">
                    {hydrationPct}% dell'obiettivo
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {onResetWater && (
                  <button
                    type="button"
                    onClick={onResetWater}
                    className="p-2 rounded-full bg-[#f2f4f3] hover:bg-red-50 text-[#56615c] hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
                    title="Azzera idratazione di oggi"
                    aria-label="Azzera idratazione di oggi"
                  >
                    <Icon name="restart_alt" className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="btn-custom-water"
                  type="button"
                  onClick={() => setIsWaterModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#e6e9e8] hover:bg-[#d7e2dc] text-[#191c1c] transition-colors cursor-pointer shadow-2xs"
                  title="Personalizza quantità acqua"
                >
                  <Icon name="add" className="w-3.5 h-3.5 text-[#386a00]" />
                  <span>Scegli</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHydrationCollapsed(true)}
                  title="Comprimi idratazione"
                  className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Icon name="expand_less" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Choice Buttons */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-[#eceeed]/70">
              <button
                type="button"
                onClick={() => handleWaterClick(0.1)}
                className="flex-1 py-1.5 px-2 rounded-xl text-[12px] font-bold bg-[#f2f4f3] hover:bg-[#84cc16]/20 hover:text-[#386a00] text-[#191c1c] transition-all cursor-pointer text-center active:scale-95"
              >
                +100ml
              </button>
              <button
                type="button"
                onClick={() => handleWaterClick(0.25)}
                className="flex-1 py-1.5 px-2 rounded-xl text-[12px] font-bold bg-[#f2f4f3] hover:bg-[#84cc16]/20 hover:text-[#386a00] text-[#191c1c] transition-all cursor-pointer text-center active:scale-95"
              >
                +250ml
              </button>
              <button
                type="button"
                onClick={() => handleWaterClick(0.5)}
                className="flex-1 py-1.5 px-2 rounded-xl text-[12px] font-bold bg-[#f2f4f3] hover:bg-[#84cc16]/20 hover:text-[#386a00] text-[#191c1c] transition-all cursor-pointer text-center active:scale-95"
              >
                +500ml
              </button>
              <button
                type="button"
                onClick={() => setIsWaterModalOpen(true)}
                className="py-1.5 px-3 rounded-xl text-[12px] font-bold bg-[#84cc16]/20 text-[#386a00] hover:bg-[#84cc16]/30 transition-all cursor-pointer text-center active:scale-95"
              >
                Altro...
              </button>
            </div>

            {/* Daily Reset Info & Link to Trend History */}
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#eceeed]/70 text-[#56615c]">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16]" />
                Reset automatico alle 00:00
              </span>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('trend')}
                  className="font-bold text-[#386a00] hover:text-[#416900] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Vedi nei Trend</span>
                  <Icon name="arrow_forward" className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </section>
        )}
        </div>
      </div>

      {/* Water Selection & Customization Modal */}
      <AddWaterModal
        isOpen={isWaterModalOpen}
        onClose={() => setIsWaterModalOpen(false)}
        onAddWater={onAddWater}
        currentLiters={waterLiters}
        goalLiters={hydrationGoal}
      />
    </div>
  );
};
