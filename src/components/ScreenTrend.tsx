import React, { useState } from 'react';
import type { UserProfile, WorkoutSessionLog } from '../types';
import { INITIAL_USER_PROFILE } from '../data/mockData';
import { Icon } from './Icons';
import {
  getWeeklyHydrationData,
  getMonthlyHydrationData,
  getAnnualHydrationData,
} from '../utils/hydration';
import {
  calculateCalorieCycling,
  getMetricTransparencyInfo,
} from '../utils/metrics';
import { calculateTargetNutrition } from '../utils/fitnessLogic';
import {
  getEffectiveWorkoutHistory,
  getExerciseProgressionData,
  getGymGlobalTrendMetrics,
} from '../utils/workoutTracking';

interface ScreenTrendProps {
  profile?: UserProfile;
  waterHistory?: Record<string, number>;
  todayWater?: number;
  workoutHistory?: WorkoutSessionLog[];
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onNavigateToTab?: (tab: 'home' | 'workout' | 'dieta' | 'trend' | 'foto') => void;
}

type TrendPeriod = 'settimana' | 'mese' | 'anno';

export const ScreenTrend: React.FC<ScreenTrendProps> = ({
  profile = INITIAL_USER_PROFILE,
  waterHistory = {},
  workoutHistory,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>('settimana');
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex-101');

  const hydrationGoal = 3.0;

  // Real-time calculations with shared deterministic mathematical models
  const activeNutrition = calculateTargetNutrition(profile || INITIAL_USER_PROFILE);
  const calorieCycling = calculateCalorieCycling(activeNutrition.calories, profile?.weeklyDays || 4);

  const weeklyHydration = getWeeklyHydrationData(waterHistory, hydrationGoal);
  const monthlyHydration = getMonthlyHydrationData(waterHistory, hydrationGoal);
  const annualHydration = getAnnualHydrationData(waterHistory, hydrationGoal);

  // Gym analytics computed directly from entered set logs (weight, reps, RPE, volume)
  const effectiveHistoryData = getEffectiveWorkoutHistory(workoutHistory);
  const effectiveHistory = effectiveHistoryData.history;
  const isGymDemoData = effectiveHistoryData.isDemoData;
  const realSessionsCount = effectiveHistoryData.realSessionsCount;

  const exerciseProgression = getExerciseProgressionData(selectedExerciseId, effectiveHistory);
  const gymMetrics = getGymGlobalTrendMetrics(
    effectiveHistory,
    selectedPeriod,
    profile?.simulatedDate || '2026-10-18'
  );

  // Exercise options: key compound lifts + dynamically detected from user history
  const baseExercises = [
    { id: 'ex-101', name: 'Chest Press convergente', muscle: 'Pettorali' },
    { id: 'ex-102', name: 'Panca inclinata 30° manubri', muscle: 'Pettorali' },
    { id: 'ex-201', name: 'Lat Machine presa neutra', muscle: 'Dorsali' },
    { id: 'ex-401', name: 'Leg Press 45°', muscle: 'Gambe' },
    { id: 'ex-301', name: 'Shoulder Press Machine', muscle: 'Spalle' },
    { id: 'ex-103', name: 'Pec Deck Machine', muscle: 'Pettorali' },
    { id: 'ex-303', name: 'Curl manubri panca 60°', muscle: 'Bicipiti' },
    { id: 'ex-5', name: 'Pushdown tricipiti barra', muscle: 'Tricipiti' },
  ];

  const availableExercises = [...baseExercises];
  for (const s of effectiveHistory) {
    for (const ex of s.exercises) {
      if (!availableExercises.some((ae) => ae.id === ex.exerciseId)) {
        availableExercises.push({
          id: ex.exerciseId,
          name: ex.exerciseName,
          muscle: ex.muscleGroup || 'Esercizio',
        });
      }
    }
  }

  // Calculate coordinates for the selected exercise SVG progression chart
  const progressionSessions = exerciseProgression?.sessions || [];
  const minWeight = progressionSessions.length > 0 ? Math.min(...progressionSessions.map((s) => s.maxWeightKg)) : 50;
  const maxWeight = progressionSessions.length > 0 ? Math.max(...progressionSessions.map((s) => s.maxWeightKg)) : 70;
  const max1RM = progressionSessions.length > 0 ? Math.max(...progressionSessions.map((s) => s.best1RMKg)) : 80;
  const svgMinY = Math.max(0, Math.floor(minWeight - 8));
  const svgMaxY = Math.ceil(max1RM + 8);
  const svgRangeY = Math.max(10, svgMaxY - svgMinY);

  const chartPoints = progressionSessions.map((s, idx) => {
    const x = progressionSessions.length === 1 ? 160 : 32 + (idx / (progressionSessions.length - 1)) * (320 - 64);
    const yWeight = 110 - ((s.maxWeightKg - svgMinY) / svgRangeY) * 80;
    const y1RM = 110 - ((s.best1RMKg - svgMinY) / svgRangeY) * 80;
    return { ...s, x, yWeight, y1RM };
  });

  const pathWeight = chartPoints.length > 1
    ? `M ${chartPoints.map((p) => `${p.x.toFixed(1)} ${p.yWeight.toFixed(1)}`).join(' L ')}`
    : '';

  const areaWeight = chartPoints.length > 1
    ? `M ${chartPoints[0].x.toFixed(1)} 116 L ${chartPoints.map((p) => `${p.x.toFixed(1)} ${p.yWeight.toFixed(1)}`).join(' L ')} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} 116 Z`
    : '';

  const path1RM = chartPoints.length > 1
    ? `M ${chartPoints.map((p) => `${p.x.toFixed(1)} ${p.y1RM.toFixed(1)}`).join(' L ')}`
    : '';

  const activeMetricTransparency = getMetricTransparencyInfo(
    selectedPeriod === 'settimana'
      ? 'hydration_week'
      : selectedPeriod === 'mese'
      ? 'hydration_month'
      : 'hydration_year'
  );

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-md px-5 pb-32 space-y-4">
        {/* Header */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900]">
              Analitica &amp; Prestazioni
            </span>
            <h2 className="text-[24px] font-bold text-[#191c1c] tracking-tight">
              Trend &amp; Progressi
            </h2>
          </div>
        </div>

        {/* Data Source & Metric Transparency Badge */}
        <div className="bg-white border border-[#e2e8e4] rounded-2xl p-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16] shrink-0 animate-pulse" />
            <div className="min-w-0">
              <span className="text-[12px] font-bold text-[#191c1c] block truncate">
                {realSessionsCount > 0
                  ? `Dati Ibridi (${realSessionsCount} Sessioni Reali + Baseline)`
                  : 'Dati Demo & Trasparenza Metriche'}
              </span>
              <span className="text-[10px] text-[#56615c] block truncate">
                Progressioni calcolate dai log delle serie • Date future escluse
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTransparencyOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[11px] font-bold text-[#386a00] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            <Icon name="straighten" className="w-3.5 h-3.5" />
            <span>Formule</span>
          </button>
        </div>

        {/* iOS-Style Pill Period Selector (Settimana, Mese, Anno) */}
        <div className="bg-[#e6e9e8] p-1 rounded-2xl flex items-center shadow-inner">
          {(['settimana', 'mese', 'anno'] as TrendPeriod[]).map((period) => {
            const labels: Record<TrendPeriod, string> = {
              settimana: 'Settimana',
              mese: 'Mese',
              anno: 'Anno',
            };
            const isActive = selectedPeriod === period;
            return (
              <button
                key={period}
                type="button"
                id={`trend-pill-${period}`}
                onClick={() => setSelectedPeriod(period)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer select-none text-center ${
                  isActive
                    ? 'bg-white text-[#191c1c] shadow-xs scale-[1.02]'
                    : 'text-[#56615c] hover:text-[#191c1c]'
                }`}
              >
                {labels[period]}
              </button>
            );
          })}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            SEZIONE CENTRALE: PROGRESSIONE DEI CARICHI DAI DATI DELLE SERIE
            ═════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900] flex items-center gap-1.5">
                <Icon name="trending_up" className="w-3.5 h-3.5 text-[#416900]" />
                Sovraccarico Progressivo &amp; Serie
              </span>
              <h3 className="text-[18px] font-bold text-[#191c1c]">Evoluzione Forza &amp; 1RM</h3>
            </div>
            {exerciseProgression && exerciseProgression.deltaWeightKg > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00] text-[11px] font-bold flex items-center gap-1">
                <Icon name="bolt" className="w-3 h-3 text-[#386a00]" />
                +{exerciseProgression.deltaWeightKg} kg (+{exerciseProgression.deltaWeightPercent}%)
              </span>
            )}
          </div>

          {/* Exercise Selector Horizontal Pills */}
          <div className="overflow-x-auto no-scrollbar -mx-2 px-2 pb-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {availableExercises.map((ex) => {
                const isSelected = selectedExerciseId === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setSelectedExerciseId(ex.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#191c1c] text-white shadow-xs'
                        : 'bg-[#f2f4f3] text-[#56615c] hover:bg-[#e6e9e8] hover:text-[#191c1c]'
                    }`}
                  >
                    <Icon name="fitness_center" className={`w-3 h-3 ${isSelected ? 'text-[#84cc16]' : 'text-[#56615c]'}`} />
                    <span>{ex.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-[#e2e8e4] text-[#56615c]'}`}>
                      {ex.muscle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic SVG Progression Chart */}
          {exerciseProgression && chartPoints.length > 0 ? (
            <div>
              <div className="w-full h-44 relative mt-1">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 144">
                  <defs>
                    <linearGradient id="progWeightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#84cc16" stopOpacity="0.40" />
                      <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="0" y1="30" x2="320" y2="30" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="316" y="24" textAnchor="end" fontSize="8" fontWeight="bold" fill="#0284c7" opacity="0.8">
                    1RM Stimato: {exerciseProgression.current1RM} kg
                  </text>

                  <line x1="0" y1="70" x2="320" y2="70" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="116" x2="320" y2="116" stroke="#e2e8e4" strokeWidth="1" />

                  {/* Area fill under weight curve */}
                  {areaWeight && <path d={areaWeight} fill="url(#progWeightGrad)" />}

                  {/* 1RM Theoretical Curve (Dashed Sky Blue) */}
                  {path1RM && (
                    <path
                      d={path1RM}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.2"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Solid Weight Curve (Deep Lime/Forest Green) */}
                  {pathWeight && (
                    <path
                      d={pathWeight}
                      fill="none"
                      stroke="#386a00"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Session Milestone Points */}
                  {chartPoints.map((pt, idx) => {
                    const isLatest = idx === chartPoints.length - 1;
                    return (
                      <g key={pt.sessionId + '-' + idx}>
                        {/* 1RM Dot */}
                        <circle cx={pt.x} cy={pt.y1RM} r="3" fill="#fff" stroke="#0284c7" strokeWidth="2" />

                        {/* Weight Dot */}
                        <circle
                          cx={pt.x}
                          cy={pt.yWeight}
                          r={isLatest ? '5.5' : '4'}
                          fill={isLatest ? '#84cc16' : '#fff'}
                          stroke="#386a00"
                          strokeWidth="2.5"
                          className="hover:scale-125 transition-transform cursor-pointer"
                        />

                        {/* Weight Label above dot */}
                        <text
                          x={pt.x}
                          y={pt.yWeight - 7}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="extrabold"
                          fill={isLatest ? '#386a00' : '#191c1c'}
                          paintOrder="stroke fill"
                          stroke="#ffffff"
                          strokeWidth="3"
                          strokeLinejoin="round"
                        >
                          {pt.maxWeightKg}kg
                        </text>

                        {/* Date Label below baseline */}
                        <text
                          x={pt.x}
                          y="132"
                          textAnchor="middle"
                          fontSize="8.5"
                          fontWeight={isLatest ? 'bold' : 'normal'}
                          fill={isLatest ? '#386a00' : '#56615c'}
                        >
                          {pt.formattedDate}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-between text-[10px] text-[#56615c] mt-2 pt-2 border-t border-[#f2f4f3]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#386a00]" />
                  <span className="font-semibold text-[#191c1c]">Carico Serie (kg)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#0284c7]" />
                  <span className="font-semibold text-[#0284c7]">1RM Stimato (Epley)</span>
                </div>
                <span>{chartPoints.length} sessioni analizzate</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#f8faf9] text-center text-[12px] text-[#56615c]">
              Nessuna serie registrata per questo esercizio.
            </div>
          )}

          {/* 4 Summary Biometric Performance Badges */}
          {exerciseProgression && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#56615c] uppercase block">Carico Base → Attuale</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-[16px] font-extrabold text-[#191c1c]">{exerciseProgression.initialWeightKg} → {exerciseProgression.currentWeightKg}</span>
                  <span className="text-[11px] text-[#56615c]">kg</span>
                </div>
                <span className="text-[10px] font-bold text-[#386a00]">
                  +{exerciseProgression.deltaWeightKg} kg (+{exerciseProgression.deltaWeightPercent}%)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#0284c7] uppercase block">Massimale Stimato</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-[18px] font-extrabold text-[#0369a1]">{exerciseProgression.current1RM}</span>
                  <span className="text-[11px] text-[#0284c7]">kg (1RM)</span>
                </div>
                <span className="text-[10px] text-[#0284c7]">
                  +{exerciseProgression.delta1RM} kg dal baseline
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#fefce8] border border-[#fef08a]/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#854d0e] uppercase block">Record Personale</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-[18px] font-extrabold text-[#a16207]">
                    {exerciseProgression.bestEverSet?.weightKg || exerciseProgression.currentWeightKg}
                  </span>
                  <span className="text-[11px] text-[#854d0e]">kg</span>
                </div>
                <span className="text-[10px] text-[#854d0e] truncate">
                  {exerciseProgression.bestEverSet ? `${exerciseProgression.bestEverSet.reps} rep · ${exerciseProgression.bestEverSet.date}` : 'Miglior serie'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#56615c] uppercase block">Volume Cumulato</span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-[17px] font-extrabold text-[#191c1c]">
                    {exerciseProgression.totalVolumeLiftedKg.toLocaleString('it-IT')}
                  </span>
                  <span className="text-[11px] text-[#56615c]">kg</span>
                </div>
                <span className="text-[10px] text-[#56615c]">
                  Tonnellaggio mosso
                </span>
              </div>
            </div>
          )}

          {/* Latest Recorded Sets Breakdown */}
          {exerciseProgression && progressionSessions.length > 0 && (
            <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#191c1c] flex items-center gap-1.5">
                  <Icon name="check_circle" className="w-3.5 h-3.5 text-[#386a00]" />
                  Serie Ultima Sessione ({progressionSessions[progressionSessions.length - 1].formattedDate})
                </span>
                <span className="text-[10px] text-[#56615c]">
                  Vol Sessione: {progressionSessions[progressionSessions.length - 1].totalVolumeKg.toLocaleString('it-IT')} kg
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                {effectiveHistory
                  .find((s) => s.id === progressionSessions[progressionSessions.length - 1].sessionId)
                  ?.exercises.find((e) => e.exerciseId === selectedExerciseId)
                  ?.sets.filter((s) => s.isCompleted)
                  .map((st) => (
                    <div key={st.setId} className="p-2 rounded-lg bg-white border border-[#e2e8e4] text-[11px]">
                      <span className="text-[9px] text-[#56615c] block font-bold">Serie {st.setNum}</span>
                      <span className="font-extrabold text-[#191c1c] block text-[13px]">{st.weightKg} kg × {st.reps}</span>
                      <span className="text-[9px] text-[#386a00] font-semibold block">
                        {st.rpe ? `RPE ${st.rpe}` : 'Reps OK'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            1. VISTA "SETTIMANA"
            ═════════════════════════════════════════════════════════════ */}
        {selectedPeriod === 'settimana' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Tonnellaggio & Volume Allenamenti Settimanale (Lun - Dom) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900] flex items-center gap-1.5">
                    <Icon name="fitness_center" className="w-3.5 h-3.5 text-[#416900]" />
                    Volume &amp; Tonnellaggio Settimanale
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Tonnellaggio Lun - Dom</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00] border border-[#84cc16]/40">
                  <Icon name="bolt" className="w-3.5 h-3.5 text-[#386a00]" />
                  <span>Totale: {(gymMetrics.totalTonnageKg / 1000).toFixed(1)}t</span>
                </div>
              </div>

              {/* 7-Day Gym Volume SVG Bar Chart */}
              <div className="w-full h-44 relative mt-3 pt-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 144">
                  <line x1="0" y1="120" x2="320" y2="120" stroke="#e2e8e4" strokeWidth="1" />

                  {gymMetrics.weeklyTonnageDays.map((day, idx) => {
                    const x = 12 + idx * 45;
                    const maxH = 96;
                    const maxPossibleVol = 6000;
                    const barHeight = day.isWorkoutDay
                      ? Math.max(12, Math.min(maxH, (day.volumeKg / maxPossibleVol) * maxH))
                      : 6;
                    const y = 120 - barHeight;

                    return (
                      <g key={day.day}>
                        <rect
                          x={x}
                          y="24"
                          width="26"
                          height="96"
                          rx="8"
                          fill="#f8faf9"
                          className="opacity-70"
                        />

                        <rect
                          x={x}
                          y={y}
                          width="26"
                          height={barHeight}
                          rx="8"
                          fill={day.isWorkoutDay ? '#84cc16' : '#e2e8e4'}
                          className="hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                        />

                        {day.isWorkoutDay && (
                          <text
                            x={x + 13}
                            y={y - 5}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="extrabold"
                            fill="#191c1c"
                            paintOrder="stroke fill"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          >
                            {(day.volumeKg / 1000).toFixed(1)}t
                          </text>
                        )}

                        <text
                          x={x + 13}
                          y="134"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight={day.isWorkoutDay ? 'bold' : 'normal'}
                          fill={day.isWorkoutDay ? '#191c1c' : '#94a3b8'}
                        >
                          {day.day}
                        </text>

                        {day.isWorkoutDay && (
                          <circle cx={x + 13} cy="141" r="2" fill="#84cc16" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Weekly Gym Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#f2f4f3] text-center">
                <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/70">
                  <span className="text-[10px] text-[#56615c] uppercase font-bold block">Tonnellaggio</span>
                  <span className="text-[17px] font-extrabold text-[#191c1c] block my-0.5">
                    {gymMetrics.totalTonnageKg.toLocaleString('it-IT')} kg
                  </span>
                  <span className="text-[10px] text-[#386a00] font-semibold">Mosso nelle serie</span>
                </div>

                <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]/60">
                  <span className="text-[10px] text-[#166534] uppercase font-bold block">Serie Allenanti</span>
                  <span className="text-[17px] font-extrabold text-[#15803d] block my-0.5">
                    {gymMetrics.totalSetsCompleted} serie
                  </span>
                  <span className="text-[10px] text-[#166534] font-semibold">100% completate</span>
                </div>

                <div className="p-3 rounded-xl bg-[#fefce8] border border-[#fef08a]/60">
                  <span className="text-[10px] text-[#854d0e] uppercase font-bold block">Sforzo Medio</span>
                  <span className="text-[17px] font-extrabold text-[#a16207] block my-0.5">
                    {gymMetrics.avgRpe} RPE
                  </span>
                  <span className="text-[10px] text-[#854d0e] font-semibold">Zona ipertrofica</span>
                </div>
              </div>
            </div>

            {/* Grafico a barre Lun-Dom Calorie con spiegazione chiara ON/OFF vs Target */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c]">
                    Bilancio Energetico Settimanale
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Calorie Lun - Dom</h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-[#386a00]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#84cc16]" /> ON {calorieCycling.onCalories}
                  </span>
                  <span className="flex items-center gap-1 text-[#56615c]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#94a3b8]" /> OFF {calorieCycling.offCalories}
                  </span>
                </div>
              </div>

              {/* Contesto chiaro del Target Attivo vs Ciclizzazione */}
              <div className="p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60 text-[11px] text-[#56615c] my-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[#191c1c] font-bold">Target Attivo Diario: </span>
                  <span className="text-[#386a00] font-extrabold">{activeNutrition.calories.toLocaleString('it-IT')} kcal/die</span>
                </div>
                <span className="text-[10px] text-[#56615c] italic">
                  Media ponderata: {Math.round(calorieCycling.weightedAverage)} kcal
                </span>
              </div>

              {/* Bar Chart Container */}
              <div className="w-full h-44 relative mt-2 pt-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 140">
                  {/* Target Reference Lines */}
                  <line x1="0" y1="25" x2="320" y2="25" stroke="#84cc16" strokeDasharray="4 4" strokeWidth="1.2" opacity="0.5" />
                  <line x1="0" y1="48" x2="320" y2="48" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.2" opacity="0.5" />

                  {/* Base Line y=120 */}
                  <line x1="0" y1="120" x2="320" y2="120" stroke="#e2e8e4" strokeWidth="1" />

                  {/* 7 Bars: Lun to Dom */}
                  {[
                    { day: 'Lun', kcal: 2880, isON: true, x: 12, height: 94 },
                    { day: 'Mar', kcal: 2920, isON: true, x: 57, height: 96 },
                    { day: 'Mer', kcal: 2640, isON: false, x: 102, height: 72 },
                    { day: 'Gio', kcal: 2850, isON: true, x: 147, height: 93 },
                    { day: 'Ven', kcal: 2910, isON: true, x: 192, height: 95 },
                    { day: 'Sab', kcal: 2690, isON: false, x: 237, height: 74 },
                    { day: 'Dom', kcal: 2580, isON: false, x: 282, height: 70 },
                  ].map((bar) => {
                    const y = 120 - bar.height;
                    return (
                      <g key={bar.day}>
                        <rect
                          x={bar.x}
                          y={y}
                          width="26"
                          height={bar.height}
                          rx="6"
                          fill={bar.isON ? '#84cc16' : '#94a3b8'}
                          className="hover:opacity-85 transition-opacity cursor-pointer"
                        />
                        <text
                          x={bar.x + 13}
                          y={y - 4}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#191c1c"
                          paintOrder="stroke fill"
                          stroke="#ffffff"
                          strokeWidth="3"
                          strokeLinejoin="round"
                        >
                          {bar.kcal}
                        </text>
                        <text
                          x={bar.x + 13}
                          y="134"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight={bar.isON ? 'bold' : 'normal'}
                          fill={bar.isON ? '#191c1c' : '#56615c'}
                        >
                          {bar.day}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#56615c] mt-3 pt-2 border-t border-[#f2f4f3]">
                <span>Media calorica reale: <strong className="text-[#191c1c]">2.781 kcal/die</strong></span>
                <span className="text-[#386a00] font-bold">Aderenza Target: 99.4%</span>
              </div>
            </div>

            {/* Bilancio Idrico Settimanale (Lun - Dom) - Formule Condivise & Corrette */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7] flex items-center gap-1.5">
                    <Icon name="water_drop" className="w-3.5 h-3.5 text-[#0284c7]" />
                    Storico Idratazione Settimanale
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Idratazione Lun - Dom</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]/60">
                  <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-pulse" />
                  <span>Target: 3.0 L/die</span>
                </div>
              </div>

              {/* 7-Day Hydration Chart */}
              <div className="w-full h-44 relative mt-3 pt-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 144">
                  <defs>
                    <linearGradient id="hydraWaterToday" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" />
                      <stop offset="100%" stopColor="#84cc16" />
                    </linearGradient>
                    <linearGradient id="hydraWaterTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                    <linearGradient id="hydraWaterLow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>

                  {/* Target Reference Line at 3.0L */}
                  <line x1="0" y1="36" x2="320" y2="36" stroke="#0284c7" strokeDasharray="3 3" strokeWidth="1.2" opacity="0.45" />
                  <text x="316" y="15" textAnchor="end" fontSize="8.5" fontWeight="bold" fill="#0284c7" opacity="0.85">
                    Target 3.0L
                  </text>

                  {/* Base Line y=120 */}
                  <line x1="0" y1="120" x2="320" y2="120" stroke="#e2e8e4" strokeWidth="1" />

                  {/* 7 Bars: Lun to Dom */}
                  {weeklyHydration.days.map((day, idx) => {
                    const x = 12 + idx * 45;
                    const maxH = 96;
                    const barHeight = day.isFuture
                      ? 6
                      : Math.max(8, Math.min(maxH, (day.liters / 3.5) * maxH));
                    const y = 120 - barHeight;
                    const isMet = day.liters >= 3.0;

                    let fill = 'url(#hydraWaterTarget)';
                    if (day.isToday) {
                      fill = 'url(#hydraWaterToday)';
                    } else if (day.isFuture) {
                      fill = '#e2e8e4';
                    } else if (!isMet && day.liters < 2.5) {
                      fill = 'url(#hydraWaterLow)';
                    }

                    return (
                      <g key={day.shortName}>
                        <rect
                          x={x}
                          y="24"
                          width="26"
                          height="96"
                          rx="8"
                          fill="#f1f5f9"
                          className="opacity-75"
                        />

                        <rect
                          x={x}
                          y={y}
                          width="26"
                          height={barHeight}
                          rx="8"
                          fill={fill}
                          className="hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                        />

                        {!day.isFuture && (
                          <text
                            x={x + 13}
                            y={y - 5}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                            fill={day.isToday ? '#4d7c0f' : '#1e293b'}
                            paintOrder="stroke fill"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                          >
                            {day.liters.toFixed(1)}L
                          </text>
                        )}

                        <text
                          x={x + 13}
                          y="134"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight={day.isToday ? 'bold' : 'normal'}
                          fill={day.isToday ? '#4d7c0f' : '#56615c'}
                        >
                          {day.shortName}
                        </text>

                        {day.isToday && (
                          <circle cx={x + 13} cy="141" r="2" fill="#84cc16" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Weekly Key Metrics con distinzione tra conformità giorni e aderenza volume */}
              <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#f2f4f3]">
                <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/70 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#56615c] font-bold uppercase tracking-wide">
                    <Icon name="monitoring" className="w-3 h-3 text-[#56615c]" />
                    <span>Media/die</span>
                  </div>
                  <span className="text-[17px] font-extrabold text-[#191c1c] my-0.5">
                    {weeklyHydration.weeklyAverage.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#56615c]">
                    Vol: {weeklyHydration.volumeAdherencePct}% target
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]/50 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#0284c7] font-bold uppercase tracking-wide">
                    <Icon name="water_drop" className="w-3 h-3 text-[#0284c7]" />
                    <span>Totale</span>
                  </div>
                  <span className="text-[17px] font-extrabold text-[#0284c7] my-0.5">
                    {weeklyHydration.weeklyTotal.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-[#0369a1]">Litri bevuti</span>
                </div>

                {/* 5 / 7 accompagnato rigorosamente da 71,4% (non confuso con l'84% di volume) */}
                <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]/60 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#16a34a] font-bold uppercase tracking-wide">
                    <Icon name="check_circle" className="w-3 h-3 text-[#16a34a]" />
                    <span>Giorni Target</span>
                  </div>
                  <span className="text-[17px] font-extrabold text-[#15803d] my-0.5">
                    {weeklyHydration.daysInTarget} / {weeklyHydration.elapsedDaysCount || 7}
                  </span>
                  <span className="text-[10px] text-[#166534] font-bold">
                    {weeklyHydration.formattedCompliancePct} dei giorni
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            2. VISTA "MESE"
            ═════════════════════════════════════════════════════════════ */}
        {selectedPeriod === 'mese' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Distribuzione Volume Mensile per Distretto Muscolare & Sovraccarico a 4 Settimane */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900] flex items-center gap-1.5">
                    <Icon name="fitness_center" className="w-3.5 h-3.5 text-[#416900]" />
                    Distribuzione Tonnellaggio 30 Giorni
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Volume per Distretto Muscolare</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00] text-[11px] font-bold">
                  {gymMetrics.muscleGroupVolumes.length} Distretti Attivi
                </span>
              </div>

              {/* Muscle Group Horizontal Bars */}
              <div className="space-y-2.5 my-3">
                {gymMetrics.muscleGroupVolumes.map((mg) => (
                  <div key={mg.muscleGroup} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#191c1c]">{mg.muscleGroup}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#386a00]">{mg.volumeKg.toLocaleString('it-IT')} kg</span>
                        <span className="text-[10px] text-[#56615c]">({mg.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f2f4f3] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#84cc16] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, mg.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 4-Week Volume Comparison */}
              <div className="mt-4 pt-3 border-t border-[#f2f4f3]">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-bold text-[#191c1c]">Progressione Volume a 4 Settimane</span>
                  <span className="text-[10px] font-bold text-[#386a00]">+16.8% Sovraccarico</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {gymMetrics.monthlyVolumeWeeks.map((w, idx) => {
                    const isLatest = idx === gymMetrics.monthlyVolumeWeeks.length - 1;
                    return (
                      <div
                        key={w.weekLabel}
                        className={`p-2.5 rounded-xl border text-center flex flex-col justify-between ${
                          isLatest
                            ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                            : 'bg-[#f8faf9] border-[#e2e8e4]/70'
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isLatest ? 'text-[#166534]' : 'text-[#56615c]'}`}>
                          {w.weekLabel}
                        </span>
                        <span className={`text-[13px] font-extrabold my-0.5 ${isLatest ? 'text-[#15803d]' : 'text-[#191c1c]'}`}>
                          {w.volumeKg > 0 ? `${(w.volumeKg / 1000).toFixed(1)}t` : '—'}
                        </span>
                        <span className="text-[9px] text-[#56615c]">
                          {w.setsCount > 0 ? `${w.setsCount} serie` : 'Riposo'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grafico a Linea del Peso Ultimi 30 Giorni (+1.1 kg) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c]">
                    Andamento Corporeo 30 Giorni
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Curva Peso Mensile</h3>
                </div>
                <span className="text-[14px] font-extrabold text-[#386a00] bg-[#84cc16]/20 px-2.5 py-1 rounded-full">
                  +1.1 kg nel mese
                </span>
              </div>

              {/* Smooth Weight SVG Line Chart */}
              <div className="w-full h-40 relative mt-3">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 120">
                  <defs>
                    <linearGradient id="monthGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#84cc16" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="20" x2="320" y2="20" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="60" x2="320" y2="60" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <line x1="0" y1="100" x2="320" y2="100" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />

                  <path
                    d="M 10 105 Q 85 95, 120 78 T 200 55 T 310 25 L 310 115 L 10 115 Z"
                    fill="url(#monthGradient)"
                  />
                  <path
                    d="M 10 105 Q 85 95, 120 78 T 200 55 T 310 25"
                    fill="none"
                    stroke="#416900"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  <circle cx="10" cy="105" r="4.5" fill="#fff" stroke="#416900" strokeWidth="2.5" />
                  <circle cx="120" cy="78" r="4.5" fill="#fff" stroke="#416900" strokeWidth="2.5" />
                  <circle cx="200" cy="55" r="4.5" fill="#fff" stroke="#416900" strokeWidth="2.5" />
                  <circle cx="310" cy="25" r="6" fill="#84cc16" stroke="#fff" strokeWidth="2.5" />

                  <text x="12" y="94" textAnchor="start" fontSize="9" fontWeight="bold" fill="#56615c" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">77.4kg</text>
                  <text x="120" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#56615c" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">77.8kg</text>
                  <text x="200" y="45" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#56615c" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">78.2kg</text>
                  <text x="306" y="14" textAnchor="end" fontSize="10" fontWeight="bold" fill="#386a00" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">78.5kg</text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#56615c] mt-2 px-1">
                <span>Giorno 1</span>
                <span>Giorno 10</span>
                <span>Giorno 20</span>
                <span className="font-bold text-[#191c1c]">Giorno 30 (Oggi)</span>
              </div>
            </div>

            {/* Presenze in Palestra (30 Giorni) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900]">
                    Costanza Mensile
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Presenze in Palestra (30 Giorni)</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00] text-[12px] font-bold">
                  18 su 30 Giorni (60,0%)
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2 p-3 bg-[#f2f4f3] rounded-xl mb-3">
                {Array.from({ length: 30 }, (_, i) => {
                  const day = i + 1;
                  const workoutDays = [1, 2, 4, 5, 8, 9, 11, 12, 15, 16, 18, 19, 22, 23, 25, 26, 29, 30];
                  const hasAttended = workoutDays.includes(day);

                  const statusColor = hasAttended
                    ? 'bg-[#84cc16] text-[#102000]'
                    : 'bg-[#e2e8e4] text-[#6b7280]';
                  const tooltip = hasAttended
                    ? `Giorno ${day}: Allenamento svolto in palestra`
                    : `Giorno ${day}: Non andato / Riposo`;

                  return (
                    <div
                      key={day}
                      title={tooltip}
                      className={`h-9 rounded-lg flex flex-col items-center justify-center font-bold text-[11px] shadow-2xs transition-transform hover:scale-105 cursor-pointer ${statusColor}`}
                    >
                      <span className="leading-none">{day}</span>
                      <span className="text-[8px] opacity-80 leading-none mt-0.5">
                        {hasAttended ? '✓' : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-[#56615c] pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#84cc16]" /> Andato in palestra (18gg)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#e2e8e4]" /> Non andato / Riposo (12gg)
                </span>
              </div>
            </div>

            {/* Bilancio Idrico Mensile - 28/30 rigorosamente accompagnato da 93,3% */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7]">
                    Costanza Idrica Mensile
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Trend Idratazione 30 Giorni</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#e0f2fe] text-[#0284c7] text-[12px] font-bold">
                  Media {monthlyHydration.monthlyAverage.toFixed(2)} L/die
                </span>
              </div>

              {/* 4 Weekly Averages */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {monthlyHydration.weeklyAverages.map((w) => (
                  <div key={w.weekLabel} className="p-2.5 rounded-xl bg-[#f2f4f3] flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-[#56615c]">{w.weekLabel}</span>
                    <span className="text-[15px] font-extrabold text-[#0284c7] mt-1">{w.avgLiters.toFixed(2)}</span>
                    <span className="text-[9px] text-[#56615c]">L / giorno</span>
                    <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[#0284c7] rounded-full"
                        style={{ width: `${Math.min(100, (w.avgLiters / 3.0) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#386a00] mt-1.5">
                      {Math.round((w.avgLiters / 3.0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-3 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]/40">
                  <span className="text-[11px] text-[#0369a1] block font-semibold">Volume Idrico Totale</span>
                  <span className="text-[18px] font-extrabold text-[#0c4a6e]">{monthlyHydration.monthlyTotal.toFixed(0)} L</span>
                  <span className="text-[10px] text-[#0369a1] block">Vol: {monthlyHydration.volumeAdherencePct}% del target</span>
                </div>
                <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
                  <span className="text-[11px] text-[#166534] block font-semibold">Giorni a Target (≥2.7L)</span>
                  <span className="text-[18px] font-extrabold text-[#15803d]">{monthlyHydration.daysInTarget} / 30</span>
                  <span className="text-[10px] text-[#166534] block font-bold">
                    {monthlyHydration.formattedCompliancePct} dei giorni
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            3. VISTA "ANNO"
            ═════════════════════════════════════════════════════════════ */}
        {selectedPeriod === 'anno' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Crescita Annuale della Forza & Tabellone PR dalle Serie */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900] flex items-center gap-1.5">
                    <Icon name="emoji_events" className="w-3.5 h-3.5 text-[#eab308]" />
                    Guadagni di Forza Annuali
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Progressione sui Fondamentali</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00] text-[11px] font-bold">
                  Sovraccarico +28%
                </span>
              </div>

              {/* Annual Strength Gains Grid */}
              <div className="grid grid-cols-2 gap-2 my-2">
                {[
                  { name: 'Chest Press convergente', gain: '+15 kg', pct: '+30.0%', current: '65 kg', muscle: 'Petto' },
                  { name: 'Lat Machine presa neutra', gain: '+15 kg', pct: '+30.0%', current: '65 kg', muscle: 'Dorso' },
                  { name: 'Leg Press 45°', gain: '+35 kg', pct: '+28.0%', current: '160 kg', muscle: 'Gambe' },
                  { name: 'Shoulder Press Machine', gain: '+10 kg', pct: '+28.6%', current: '45 kg', muscle: 'Spalle' },
                ].map((item) => (
                  <div key={item.name} className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/70 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#56615c] truncate">{item.muscle}</span>
                      <span className="font-extrabold text-[#386a00] bg-[#84cc16]/15 px-1.5 py-0.5 rounded">
                        {item.gain} ({item.pct})
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-[#191c1c] truncate my-1">{item.name}</span>
                    <span className="text-[10px] text-[#56615c]">Carico Attuale: <strong className="text-[#191c1c]">{item.current}</strong></span>
                  </div>
                ))}
              </div>

              {/* PRs achieved from sets */}
              <div className="mt-3 pt-3 border-t border-[#f2f4f3] space-y-2">
                <span className="text-[11px] font-bold text-[#191c1c] flex items-center gap-1.5">
                  <Icon name="trophy" className="w-3.5 h-3.5 text-[#eab308]" />
                  Record Personali (PR) Stabiliti nelle Serie
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {gymMetrics.allPRs.slice(0, 5).map((pr) => (
                    <div
                      key={pr.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fefce8] border border-[#fef08a] text-[10px] text-[#854d0e]"
                    >
                      <span className="font-bold">{pr.exerciseName}:</span>
                      <span className="font-extrabold text-[#ca8a04]">{pr.value} {pr.unit}</span>
                      <span className="text-[9px] opacity-75">({pr.date})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Griglia Annuale Allenamenti Stile GitHub (Heatmap) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900] flex items-center gap-1.5">
                    <Icon name="fitness_center" className="w-3.5 h-3.5 text-[#416900]" />
                    Costanza Annuale Stile GitHub
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Griglia Allenamenti 365 Giorni</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#84cc16]/20 text-[#386a00] text-[11px] font-bold">
                  88% Costanza
                </span>
              </div>

              {/* GitHub-style Key Metrics */}
              <div className="grid grid-cols-3 gap-2.5 my-3">
                <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/70 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-[#56615c]">
                    <Icon name="fitness_center" className="w-3 h-3 text-[#56615c]" />
                    <span>Totale Annui</span>
                  </div>
                  <span className="text-[20px] font-extrabold text-[#191c1c] my-0.5">184</span>
                  <span className="text-[10px] text-[#56615c]">sessioni svolte</span>
                </div>
                <div className="p-3 rounded-xl bg-[#fefce8] border border-[#fef08a]/60 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-[#ca8a04]">
                    <Icon name="local_fire_department" className="w-3 h-3 text-[#eab308]" />
                    <span>Streak</span>
                  </div>
                  <span className="text-[20px] font-extrabold text-[#854d0e] my-0.5">14</span>
                  <span className="text-[10px] text-[#a16207] font-semibold">giorni consecutivi</span>
                </div>
                <div className="p-3 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]/50 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-[#0284c7]">
                    <Icon name="calendar_today" className="w-3 h-3 text-[#0284c7]" />
                    <span>Frequenza</span>
                  </div>
                  <span className="text-[20px] font-extrabold text-[#0369a1] my-0.5">3.5</span>
                  <span className="text-[10px] text-[#0284c7]">giorni / sett</span>
                </div>
              </div>

              {/* Scrollable GitHub Heatmap Matrix (52 weeks x 7 days) */}
              <div className="overflow-x-auto pb-2 no-scrollbar">
                <div className="min-w-[620px] p-3 bg-[#f8faf9] rounded-xl border border-[#e2e8e4]">
                  <div className="flex gap-2">
                    <div className="flex flex-col justify-between text-[9px] font-semibold text-[#56615c] py-0.5 pr-1 select-none">
                      <span>Lun</span>
                      <span>Mer</span>
                      <span>Ven</span>
                      <span>Dom</span>
                    </div>

                    <div className="flex-1">
                      <div className="grid grid-flow-col grid-rows-7 gap-1">
                        {Array.from({ length: 52 * 7 }, (_, idx) => {
                          const week = Math.floor(idx / 7);
                          const dayOfWeek = idx % 7;
                          const isWorkoutDay = (dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4) && (idx % 11 !== 0);
                          const isHeavyDay = isWorkoutDay && (week % 3 === 0);

                          let cellBg = 'bg-[#e2e8e4]';
                          if (isHeavyDay) {
                            cellBg = 'bg-[#386a00]';
                          } else if (isWorkoutDay) {
                            cellBg = 'bg-[#84cc16]';
                          } else if (dayOfWeek === 2 && week % 2 === 0) {
                            cellBg = 'bg-[#bef264]';
                          }

                          return (
                            <div
                              key={idx}
                              title={`Settimana ${week + 1}, Giorno ${dayOfWeek + 1}`}
                              className={`w-2.5 h-2.5 rounded-[2px] transition-transform hover:scale-125 cursor-pointer ${cellBg}`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex justify-between text-[9px] text-[#56615c] font-semibold mt-2 px-1">
                        <span>Gen</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>Mag</span>
                        <span>Giu</span>
                        <span>Lug</span>
                        <span>Ago</span>
                        <span>Set</span>
                        <span>Ott</span>
                        <span>Nov</span>
                        <span>Dic</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#56615c] mt-2.5 pt-2 border-t border-[#f2f4f3]">
                <span>Meno allenamenti</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#e2e8e4]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#bef264]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#84cc16]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#386a00]" />
                </div>
                <span>Più intensità (PR)</span>
              </div>
            </div>

            {/* Evoluzione del Peso Corporeo su 12 Mesi */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c] flex items-center gap-1.5">
                    <Icon name="trending_up" className="w-3.5 h-3.5 text-[#386a00]" />
                    Evoluzione 12 Mesi (Gen - Dic)
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Peso Corporeo Annuale</h3>
                </div>
                <span className="text-[13px] font-bold text-[#386a00] bg-[#84cc16]/20 px-2.5 py-1 rounded-full">
                  +4.5 kg (+6.1%)
                </span>
              </div>

              {/* 4 Summary Metric Badges */}
              <div className="grid grid-cols-4 gap-1.5 my-3">
                <div className="p-2 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60 text-center">
                  <span className="text-[9px] text-[#56615c] uppercase font-bold block truncate">Inizio (Gen)</span>
                  <span className="text-[13px] sm:text-[14px] font-extrabold text-[#191c1c] tabular-nums">74.0 kg</span>
                </div>
                <div className="p-2 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]/60 text-center">
                  <span className="text-[9px] text-[#166534] uppercase font-bold block truncate">Attuale (Ott)</span>
                  <span className="text-[13px] sm:text-[14px] font-extrabold text-[#15803d] tabular-nums">78.5 kg</span>
                </div>
                <div className="p-2 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60 text-center">
                  <span className="text-[9px] text-[#56615c] uppercase font-bold block truncate">Target (Dic)</span>
                  <span className="text-[13px] sm:text-[14px] font-extrabold text-[#191c1c] tabular-nums">80.0 kg</span>
                </div>
                <div className="p-2 rounded-xl bg-[#fefce8] border border-[#fef08a]/60 text-center">
                  <span className="text-[9px] text-[#854d0e] uppercase font-bold block truncate">Mancano</span>
                  <span className="text-[13px] sm:text-[14px] font-extrabold text-[#a16207] tabular-nums">1.5 kg</span>
                </div>
              </div>

              {/* 12 Months Weight Curve SVG */}
              <div className="w-full h-44 relative mt-2 pt-1">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 330 130">
                  <defs>
                    <linearGradient id="yearGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#84cc16" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="20" x2="330" y2="20" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="4" y="16" fontSize="8" fontWeight="bold" fill="#94a3b8">80kg (Target)</text>

                  <line x1="0" y1="50" x2="330" y2="50" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="4" y="46" fontSize="8" fontWeight="bold" fill="#94a3b8">78kg</text>

                  <line x1="0" y1="78" x2="330" y2="78" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="4" y="74" fontSize="8" fontWeight="bold" fill="#94a3b8">76kg</text>

                  <line x1="0" y1="105" x2="330" y2="105" stroke="#e2e8e4" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="4" y="118" fontSize="8" fontWeight="bold" fill="#94a3b8">74kg (Inizio)</text>

                  <path
                    d="M 15 105 Q 45 98, 70 90 T 125 74 T 180 63 T 235 50 T 260 42 L 260 115 L 15 115 Z"
                    fill="url(#yearGradient)"
                  />

                  <path
                    d="M 15 105 Q 45 98, 70 90 T 125 74 T 180 63 T 235 50 T 260 42"
                    fill="none"
                    stroke="#416900"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M 260 42 Q 288 31, 315 20"
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />

                  <circle cx="15" cy="105" r="4.5" fill="#fff" stroke="#416900" strokeWidth="2.5" />
                  <text x="15" y="93" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#56615c" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">74.0kg</text>

                  <circle cx="152" cy="68" r="4" fill="#fff" stroke="#416900" strokeWidth="2.5" />
                  <text x="152" y="58" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#56615c" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">76.7kg</text>

                  <circle cx="260" cy="42" r="5.5" fill="#84cc16" stroke="#fff" strokeWidth="2" />
                  <text x="260" y="31" textAnchor="middle" fontSize="9.5" fontWeight="extrabold" fill="#386a00" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">78.5kg</text>

                  <circle cx="315" cy="20" r="4.5" fill="#fff" stroke="#84cc16" strokeDasharray="2 2" strokeWidth="2" />
                  <text x="320" y="11" textAnchor="end" fontSize="8.5" fontWeight="bold" fill="#56615c" paintOrder="stroke fill" stroke="#ffffff" strokeWidth="2.5">80kg (Obj)</text>
                </svg>
              </div>

              <div className="flex justify-between text-[9px] text-[#56615c] font-semibold mt-2 px-1">
                <span>Gen</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>Mag</span>
                <span>Giu</span>
                <span>Lug</span>
                <span>Ago</span>
                <span>Set</span>
                <span className="font-extrabold text-[#386a00] underline decoration-[#84cc16] decoration-2">Ott</span>
                <span className="opacity-60">Nov</span>
                <span className="opacity-60">Dic</span>
              </div>
            </div>

            {/* Bilancio Idrico Annuale (Esclusione mesi futuri dai consuntivi ed etichettatura esplicita) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7] flex items-center gap-1.5">
                    <Icon name="water_drop" className="w-3.5 h-3.5 text-[#0284c7]" />
                    Sintesi Idrica Annuale
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Idratazione nei 365 Giorni</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]/60">
                  <span className="w-2 h-2 rounded-full bg-[#0284c7] animate-pulse" />
                  <span>Target: 3.0 L/die</span>
                </div>
              </div>

              {/* 12 Months Hydration Capsule Chart con distinzione esplicita per mesi futuri */}
              <div className="w-full h-44 relative mt-3 pt-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 320 144">
                  <defs>
                    <linearGradient id="hydraYearWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                    <linearGradient id="hydraYearWaterToday" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" />
                      <stop offset="100%" stopColor="#84cc16" />
                    </linearGradient>
                  </defs>

                  {/* Target Reference Line at 3.0L (y=44) */}
                  <line x1="0" y1="44" x2="320" y2="44" stroke="#0284c7" strokeDasharray="3 3" strokeWidth="1.2" opacity="0.45" />
                  <text x="316" y="16" textAnchor="end" fontSize="8.5" fontWeight="bold" fill="#0284c7" opacity="0.85">
                    Target 3.0L
                  </text>

                  {/* Base Line y=120 */}
                  <line x1="0" y1="120" x2="320" y2="120" stroke="#e2e8e4" strokeWidth="1" />

                  {/* 12 Month Bars: Gen to Dic */}
                  {annualHydration.months.map((m, idx) => {
                    const x = 6 + idx * 26;
                    const maxH = 96;
                    const barHeight = m.isFuture || m.liters === null
                      ? 6
                      : Math.max(8, Math.min(maxH, (m.liters / 3.8) * maxH));
                    const y = 120 - barHeight;

                    let fill = 'url(#hydraYearWater)';
                    if (m.isCurrent) {
                      fill = 'url(#hydraYearWaterToday)';
                    } else if (m.isFuture) {
                      fill = '#e2e8e4';
                    }

                    return (
                      <g key={m.month}>
                        <rect
                          x={x}
                          y="24"
                          width="18"
                          height="96"
                          rx="6"
                          fill="#f1f5f9"
                          stroke={m.isFuture ? '#cbd5e1' : 'none'}
                          strokeDasharray={m.isFuture ? '2 2' : 'none'}
                          className="opacity-75"
                        />

                        <rect
                          x={x}
                          y={y}
                          width="18"
                          height={barHeight}
                          rx="6"
                          fill={fill}
                          className="hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                        />

                        {/* Liter Label above bar o indicatore "Non disp." */}
                        <text
                          x={x + 9}
                          y={y - 4}
                          textAnchor="middle"
                          fontSize="7.5"
                          fontWeight="bold"
                          fill={m.isCurrent ? '#4d7c0f' : m.isFuture ? '#94a3b8' : '#334155'}
                          paintOrder="stroke fill"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        >
                          {m.isFuture ? '—' : `${(m.liters || 0).toFixed(1)}`}
                        </text>

                        {/* Month name below baseline */}
                        <text
                          x={x + 9}
                          y="133"
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight={m.isCurrent ? 'bold' : 'normal'}
                          fill={m.isCurrent ? '#4d7c0f' : m.isFuture ? '#94a3b8' : '#64748b'}
                        >
                          {m.month}
                        </text>

                        {m.isCurrent && (
                          <circle cx={x + 9} cy="140" r="1.8" fill="#84cc16" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Annual Key Metrics escludendo rigorosamente i mesi futuri */}
              <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#f2f4f3]">
                <div className="p-3 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]/50 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#0284c7] font-bold uppercase tracking-wide">
                    <Icon name="water_drop" className="w-3 h-3 text-[#0284c7]" />
                    <span>Totale ({annualHydration.elapsedMonthsCount} Mesi)</span>
                  </div>
                  <span className="text-[17px] font-extrabold text-[#0369a1] my-0.5">
                    ~{annualHydration.totalConsuntivoLiters} L
                  </span>
                  <span className="text-[10px] text-[#0284c7]">consuntivo registrato</span>
                </div>

                <div className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/70 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#56615c] font-bold uppercase tracking-wide">
                    <Icon name="monitoring" className="w-3 h-3 text-[#56615c]" />
                    <span>Media/die</span>
                  </div>
                  <span className="text-[17px] font-extrabold text-[#191c1c] my-0.5">
                    {annualHydration.dailyConsuntivoAverage.toFixed(2)} L
                  </span>
                  <span className="text-[10px] text-[#56615c]">sui {annualHydration.elapsedMonthsCount} mesi trascorsi</span>
                </div>

                {/* Mesi target calcolati unicamente sui mesi trascorsi */}
                <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]/60 text-center flex flex-col justify-between">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[#16a34a] font-bold uppercase tracking-wide">
                    <Icon name="verified" className="w-3 h-3 text-[#16a34a]" />
                    <span>Mesi Target</span>
                  </div>
                  <span className="text-[17px] font-extrabold text-[#15803d] my-0.5">
                    {annualHydration.targetMonthsCount} / {annualHydration.elapsedMonthsCount}
                  </span>
                  <span className="text-[10px] text-[#166534] font-bold">
                    {annualHydration.formattedCompliancePct} dei mesi
                  </span>
                </div>
              </div>

              {/* Nota esplicita di esclusione delle date future */}
              <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/60 text-[10px] text-[#56615c] flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <span className="flex-1 min-w-0">📅 Novembre e Dicembre: date future escluse dal consuntivo.</span>
                <span className="font-semibold text-[#84cc16] bg-[#191c1c] px-2 py-0.5 rounded-md shrink-0">
                  Non disponibile
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            MODALE TRASPARENZA METRICHE & FORMULE
            ═════════════════════════════════════════════════════════════ */}
        {isTransparencyOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#e2e8e4] animate-fadeIn max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#eceeed]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900]">
                    Trasparenza &amp; Metodologia
                  </span>
                  <h3 className="text-[18px] font-bold text-[#191c1c]">Dettaglio Metriche EVOLVE</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTransparencyOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center cursor-pointer"
                >
                  <Icon name="close" className="w-4 h-4" />
                </button>
              </div>

              {/* Scheda Metrica Attiva */}
              <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e8e4] space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#191c1c]">{activeMetricTransparency.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#84cc16]/20 text-[#386a00] font-bold text-[10px]">
                    {activeMetricTransparency.source === 'demo' ? 'Dati Simulati' : 'Ibrido (Reale + Demo)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#56615c] block">Periodo di Riferimento</span>
                  <p className="text-[#191c1c]">{activeMetricTransparency.period}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#56615c] block">Formula Adottata</span>
                  <p className="text-[#386a00] font-mono text-[11px] bg-white p-2 rounded-lg border border-[#e2e8e4]">
                    {activeMetricTransparency.formula}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#56615c] block">Fonte Dati</span>
                  <p className="text-[#56615c]">{activeMetricTransparency.sourceLabel}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#56615c] block">Ultimo Aggiornamento</span>
                  <p className="text-[#56615c]">{activeMetricTransparency.lastUpdated}</p>
                </div>
              </div>

              {/* Guida interpretazione metriche */}
              <div className="space-y-2 text-[11px] text-[#56615c]">
                <div className="p-2.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]/60">
                  <strong className="text-[#15803d] block mb-0.5">1. Conformità Giorni vs Aderenza Volume:</strong>
                  La percentuale che accompagna i giorni (es. 5/7 = 71,4% o 28/30 = 93,3%) misura la quota di giorni in cui l'obiettivo è stato raggiunto. L'aderenza in volume (es. 84% o 96%) misura invece i litri totali bevuti rispetto al fabbisogno.
                </div>
                <div className="p-2.5 rounded-xl bg-[#f0f9ff] border border-[#bae6fd]/50">
                  <strong className="text-[#0369a1] block mb-0.5">2. Ciclizzazione Calorica vs Target Diario:</strong>
                  Il target attivo nel diario alimentare è di 2.850 kcal/die. Nel grafico ON/OFF i giorni di allenamento sono impostati a 2.900 kcal e i giorni di riposo a {calorieCycling.offCalories} kcal, garantendo che la media settimanale coincida esattamente con il target attivo.
                </div>
                <div className="p-2.5 rounded-xl bg-[#fefce8] border border-[#fef08a]/60">
                  <strong className="text-[#854d0e] block mb-0.5">3. Esclusione Date Future:</strong>
                  I giorni e i mesi futuri sono rigorosamente esclusi dai calcoli consuntivi. Quando un dato non è ancora maturato o non registrato, viene mostrato chiaramente come &quot;Non disponibile&quot;.
                </div>
                <div className="p-2.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]/60">
                  <strong className="text-[#15803d] block mb-0.5">4. Formule Sovraccarico Progressivo, 1RM e Volume:</strong>
                  • <strong>Massimale Stimato (Formula Epley):</strong> Carico × (1 + Reps / 30). Calcolato sulle serie nel range 2–12 ripetizioni.<br />
                  • <strong>Volume per Serie (Tonnellaggio):</strong> Carico × Reps (con moltiplicatore ×2 per manubri). Il volume sessione somma tutte le serie completate.<br />
                  • <strong>Scala RPE &amp; RIR:</strong> Sforzo percepito (6–10) e ripetizioni in riserva (0–4), con RPE 8–8.5 ottimale per stimolo ipertrofico controllato.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTransparencyOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#191c1c] text-white text-[13px] font-bold hover:bg-[#2c3130] transition-colors cursor-pointer text-center"
              >
                Ho Capito
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
