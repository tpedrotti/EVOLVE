import React, { useState, useEffect } from 'react';
import type {
  WorkoutRoutine,
  WorkoutSessionLog,
  ExerciseSetLog,
  LoadType,
  ExerciseItem,
} from '../types';
import { Icon } from './Icons';
import { ExerciseMotionGraphic } from './ExerciseMotionGraphic';
import { FlowExerciseAnimation } from './FlowExerciseAnimation';
import { ExerciseHistoryModal } from './ExerciseHistoryModal';
import {
  getExerciseLoadType,
  getLoadTypeLabel,
  getLoadTypeShortBadge,
  getLastExerciseSession,
  loadWorkoutHistory,
  saveWorkoutSession,
  calculateSetVolume,
  calculateEstimated1RM,
  isSetModified,
  RPE_SCALE,
  type RpeLevel,
} from '../utils/workoutTracking';

interface ActiveWorkoutModalProps {
  routine: WorkoutRoutine;
  onClose: () => void;
  onFinishWorkout: (sessionLog?: WorkoutSessionLog) => void;
  onApplyProgression?: (exerciseId: string, newWeightKg: number) => void;
}

interface SetData {
  id: string;
  setNum: number;
  weightKg: number;
  reps: number;
  targetWeightKg: number;
  targetReps: number;
  targetRepsLabel?: string;
  isCompleted: boolean;
  rpe?: number;
  rir?: number;
}

interface ExerciseState {
  id: string;
  name: string;
  muscleGroup: string;
  setsReps: string;
  loadType: LoadType;
  sets: SetData[];
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  routine,
  onClose,
  onFinishWorkout,
  onApplyProgression,
}) => {
  // Current active exercise index (one at a time)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Cached workout history from LocalStorage
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSessionLog[]>(() => loadWorkoutHistory());

  // Exercise history modal state
  const [selectedExForHistory, setSelectedExForHistory] = useState<ExerciseItem | null>(null);

  // RPE / RIR picker target
  const [rpePickerTarget, setRpePickerTarget] = useState<{
    exId: string;
    setId: string;
    setNum: number;
    currentRpe?: number;
  } | null>(null);

  // Copy overwrite confirmation target
  const [copyConfirmTarget, setCopyConfirmTarget] = useState<{
    exId: string;
    setId?: string;
    setNum?: number;
    currentWeight: number;
    currentReps: number;
    lastWeight: number;
    lastReps: number;
    lastRpe?: number;
    isAllSets?: boolean;
  } | null>(null);

  // Initialize exercises with editable sets parsed from routine
  const [exercisesData, setExercisesData] = useState<ExerciseState[]>(() => {
    return routine.exercises.map((ex) => {
      const match = ex.setsReps.match(/(\d+)\s*[×x*]\s*(\d+)(?:\s*-\s*(\d+))?/i);
      const setCount = match ? parseInt(match[1], 10) : 3;
      const minReps = match ? parseInt(match[2], 10) : 10;
      const maxReps = match && match[3] ? parseInt(match[3], 10) : minReps;
      const repCount = maxReps;
      const targetRepsLabel = match ? (match[3] ? `${minReps}-${maxReps}` : `${minReps}`) : '10';
      const targetWeight = ex.targetWeightKg || 0;
      const loadType = getExerciseLoadType(ex);

      const sets: SetData[] = Array.from({ length: setCount }, (_, i) => ({
        id: `${ex.id}-set-${i + 1}`,
        setNum: i + 1,
        weightKg: targetWeight,
        reps: repCount,
        targetWeightKg: targetWeight,
        targetReps: repCount,
        targetRepsLabel,
        isCompleted: false,
      }));

      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        setsReps: ex.setsReps,
        loadType,
        sets,
      };
    });
  });

  // General Workout Stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWorkoutPaused, setIsWorkoutPaused] = useState(false);

  // Rest Timer: Default 2 minutes (120 seconds), fully customizable by user
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('evolve_rest_duration_seconds');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 120; // 2 minuti di recupero automatico
  });

  const handleSetDefaultRestSeconds = (secs: number) => {
    const clamped = Math.max(15, Math.min(600, secs));
    setDefaultRestSeconds(clamped);
    try {
      localStorage.setItem('evolve_rest_duration_seconds', String(clamped));
    } catch {}
  };

  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [totalRestDuration, setTotalRestDuration] = useState(defaultRestSeconds);
  const [isRestPaused, setIsRestPaused] = useState(false);

  // Modal / screen states
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // General Workout Stopwatch Interval
  useEffect(() => {
    if (isWorkoutPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isWorkoutPaused]);

  // Rest Countdown Interval
  useEffect(() => {
    if (activeRestSeconds === null || activeRestSeconds <= 0 || isRestPaused) return;
    const restInterval = setInterval(() => {
      setActiveRestSeconds((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(restInterval);
  }, [activeRestSeconds, isRestPaused]);

  // Formatter for MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Toggle set completion -> triggers circular rest countdown
  const handleToggleSet = (exId: string, setId: string) => {
    setExercisesData((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            const nextDone = !s.isCompleted;
            if (nextDone) {
              setTotalRestDuration(defaultRestSeconds);
              setActiveRestSeconds(defaultRestSeconds);
              setIsRestPaused(false);
            }
            return { ...s, isCompleted: nextDone };
          }),
        };
      })
    );
  };

  // Update set weight
  const handleUpdateWeight = (exId: string, setId: string, newWeight: number) => {
    const clamped = Math.max(0, Math.min(500, Number(newWeight.toFixed(1))));
    setExercisesData((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, weightKg: clamped } : s)),
            }
          : ex
      )
    );
  };

  // Update set reps
  const handleUpdateReps = (exId: string, setId: string, newReps: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(newReps)));
    setExercisesData((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, reps: clamped } : s)),
            }
          : ex
      )
    );
  };

  // Update set RPE and RIR
  const handleUpdateSetRpe = (exId: string, setId: string, rpe?: number) => {
    const rir = rpe !== undefined ? Math.max(0, 10 - rpe) : undefined;
    setExercisesData((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, rpe, rir } : s)),
            }
          : ex
      )
    );
  };

  // Copy values from previous set with overwrite check
  const handleRequestCopySet = (set: SetData, lastSet: ExerciseSetLog) => {
    const isDirty = isSetModified(set.weightKg, set.reps, set.targetWeightKg, set.targetReps);
    if (isDirty) {
      setCopyConfirmTarget({
        exId: currentExercise.id,
        setId: set.id,
        setNum: set.setNum,
        currentWeight: set.weightKg,
        currentReps: set.reps,
        lastWeight: lastSet.weightKg,
        lastReps: lastSet.reps,
        lastRpe: lastSet.rpe,
        isAllSets: false,
      });
    } else {
      executeApplyCopySet(currentExercise.id, set.id, lastSet.weightKg, lastSet.reps, lastSet.rpe);
    }
  };

  const executeApplyCopySet = (
    exId: string,
    setId: string,
    weightKg: number,
    reps: number,
    rpe?: number
  ) => {
    const rir = rpe !== undefined ? Math.max(0, 10 - rpe) : undefined;
    setExercisesData((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, weightKg, reps, rpe, rir } : s
              ),
            }
          : ex
      )
    );
  };

  // Copy all sets from previous session
  const handleRequestCopyAllSets = () => {
    const lastSessionLog = getLastExerciseSession(currentExercise.id, workoutHistory);
    if (!lastSessionLog) return;

    const anyModified = currentExercise.sets.some((s) =>
      isSetModified(s.weightKg, s.reps, s.targetWeightKg, s.targetReps)
    );

    if (anyModified) {
      setCopyConfirmTarget({
        exId: currentExercise.id,
        isAllSets: true,
        currentWeight: 0,
        currentReps: 0,
        lastWeight: 0,
        lastReps: 0,
      });
    } else {
      executeApplyCopyAllSets(currentExercise.id, lastSessionLog.sets);
    }
  };

  const executeApplyCopyAllSets = (exId: string, lastSets: ExerciseSetLog[]) => {
    setExercisesData((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, idx) => {
            const matchLast = lastSets[idx];
            if (matchLast && matchLast.isCompleted) {
              const rir = matchLast.rpe !== undefined ? Math.max(0, 10 - matchLast.rpe) : undefined;
              return {
                ...s,
                weightKg: matchLast.weightKg,
                reps: matchLast.reps,
                rpe: matchLast.rpe,
                rir,
              };
            }
            return s;
          }),
        };
      })
    );
  };

  // Add extra set to current exercise
  const handleAddSet = (exId: string) => {
    setExercisesData((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNum = ex.sets.length + 1;
        const newSet: SetData = {
          id: `${ex.id}-set-${Date.now()}`,
          setNum: newSetNum,
          weightKg: lastSet ? lastSet.weightKg : 0,
          reps: lastSet ? lastSet.reps : 10,
          targetWeightKg: lastSet ? lastSet.targetWeightKg : 0,
          targetReps: lastSet ? lastSet.targetReps : 10,
          isCompleted: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  // Rest timer controls
  const handleAddRestTime = (seconds: number) => {
    setActiveRestSeconds((prev) => {
      const current = prev || 0;
      const next = current + seconds;
      setTotalRestDuration((t) => Math.max(t, next));
      return next;
    });
  };

  const handleSkipRest = () => {
    setActiveRestSeconds(null);
  };

  // Calculate live workout stats
  const totalSetsCount = exercisesData.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSetsCount = exercisesData.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length,
    0
  );
  const progressPct = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  const totalVolumeKg = exercisesData.reduce((acc, ex) => {
    return (
      acc +
      ex.sets.reduce((setAcc, s) => {
        return s.isCompleted ? setAcc + calculateSetVolume(s.weightKg, s.reps, ex.loadType) : setAcc;
      }, 0)
    );
  }, 0);

  const currentExercise = exercisesData[currentExerciseIndex] || exercisesData[0];
  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === exercisesData.length - 1;
  const isCurrentExerciseCompleted = currentExercise?.sets.every((s) => s.isCompleted);

  // Look up previous session for current exercise
  const lastExerciseSession = getLastExerciseSession(currentExercise?.id || '', workoutHistory);

  // Calculate estimated 1RM for current exercise from completed sets
  let bestCompletedSetInCurrentEx: SetData | null = null;
  let highest1RMInCurrentEx = 0;
  for (const s of currentExercise.sets) {
    if (s.isCompleted && s.weightKg > 0 && s.reps > 0) {
      const est = calculateEstimated1RM(s.weightKg, s.reps, currentExercise.loadType);
      if (est.isApplicable && est.estimated1RM && est.estimated1RM > highest1RMInCurrentEx) {
        highest1RMInCurrentEx = est.estimated1RM;
        bestCompletedSetInCurrentEx = s;
      }
    }
  }

  // Final Save Session Handler
  const handleFinalSaveWorkout = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const sessionLog: WorkoutSessionLog = {
      id: `session-${Date.now()}`,
      routineId: routine.id,
      routineTitle: routine.title,
      date: dateStr,
      startTime: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      durationSeconds: elapsedSeconds,
      isCompleted: exercisesData.every((ex) => ex.sets.every((s) => s.isCompleted)),
      exercises: exercisesData.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        loadType: ex.loadType,
        targetSetsReps: ex.setsReps,
        completedAt: dateStr,
        sets: ex.sets.map((s) => ({
          setId: s.id,
          setNum: s.setNum,
          weightKg: s.weightKg,
          reps: s.reps,
          rpe: s.rpe,
          rir: s.rir,
          isCompleted: s.isCompleted,
          loadType: ex.loadType,
        })),
      })),
    };

    saveWorkoutSession(sessionLog);
    setWorkoutHistory(loadWorkoutHistory());
    onFinishWorkout(sessionLog);
  };

  // Circular Rest Timer Calculation
  const circleRadius = 88;
  const circumference = 2 * Math.PI * circleRadius;
  const restProgress =
    activeRestSeconds !== null && totalRestDuration > 0
      ? activeRestSeconds / totalRestDuration
      : 0;
  const strokeDashoffset = circumference * (1 - restProgress);

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0e1512] flex flex-col justify-between overflow-hidden select-none">
      {/* 1. TOP HEADER & PROMINENT WORKOUT TIMER */}
      <header className="bg-white/95 dark:bg-[#141e1a]/95 backdrop-blur-md border-b border-[#e2e8e4] dark:border-[#232f2b] px-4 pt-3 pb-3 shrink-0 shadow-2xs z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full">
          {/* Live badge & Routine name */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#84cc16]/20 text-[#386a00] dark:text-[#a3e635] text-[11px] font-extrabold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-ping"></span>
                Live
              </span>
              <span className="text-[12px] font-bold text-[#56615c]">
                RPE {routine.rpe}
              </span>
            </div>
            <h2 className="text-[15px] font-bold text-[#191c1c] dark:text-[#e2e8e4] tracking-tight truncate mt-0.5">
              {routine.title}
            </h2>
          </div>

          {/* Large, Modern Prominent Timer */}
          <div className="flex items-center gap-2 bg-[#f2f4f3] dark:bg-[#1e2b27] px-3.5 py-1.5 rounded-2xl border border-[#e2e8e4] dark:border-[#2a3832] shadow-xs">
            <button
              type="button"
              onClick={() => setIsWorkoutPaused(!isWorkoutPaused)}
              className="w-7 h-7 rounded-full bg-white dark:bg-[#283933] text-[#191c1c] dark:text-[#e2e8e4] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              title={isWorkoutPaused ? 'Riprendi timer' : 'Metti in pausa'}
            >
              <Icon name={isWorkoutPaused ? 'play_arrow' : 'pause'} className="w-4 h-4 text-[#386a00] dark:text-[#a3e635]" />
            </button>
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase font-bold text-[#56615c] tracking-wider">
                {isWorkoutPaused ? 'Pausa' : 'Tempo'}
              </span>
              <span className="text-[20px] font-mono font-black text-[#191c1c] dark:text-[#e2e8e4] tracking-tight leading-tight">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Exit / Close button */}
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            title="Esci dalla sessione"
            className="w-9 h-9 rounded-full bg-[#f2f4f3] dark:bg-[#1e2b27] hover:bg-[#e6e9e8] text-[#56615c] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Workout Progress Bar & Exercise Steps Counter */}
        <div className="max-w-lg mx-auto w-full mt-3 pt-2.5 border-t border-[#eceeed]/80 dark:border-[#232f2b]">
          <div className="flex items-center justify-between text-[12px] mb-1.5 font-bold">
            <span className="text-[#386a00] dark:text-[#a3e635] flex items-center gap-1.5">
              <span>Esercizio {currentExerciseIndex + 1} di {exercisesData.length}</span>
              {isCurrentExerciseCompleted && (
                <span className="px-1.5 py-0.5 rounded bg-[#84cc16] text-[#102000] text-[10px] font-extrabold leading-none">✓ Fatto</span>
              )}
            </span>
            <span className="text-[#56615c]">
              Progresso Totale: {progressPct}% ({completedSetsCount}/{totalSetsCount} Set)
            </span>
          </div>

          <div className="w-full bg-[#eceeed] dark:bg-[#232f2b] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#84cc16] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>

          {/* Interactive Exercise Navigation Dots */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {exercisesData.map((ex, idx) => {
              const isSelected = idx === currentExerciseIndex;
              const isDone = ex.sets.every((s) => s.isCompleted);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setCurrentExerciseIndex(idx)}
                  title={`${idx + 1}. ${ex.name}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? 'w-7 bg-[#191c1c] dark:bg-[#e2e8e4]'
                      : isDone
                      ? 'w-3 bg-[#84cc16]'
                      : 'w-2 bg-[#d7e2dc] dark:bg-[#2a3832]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </header>

      {/* 2. MAIN SINGLE EXERCISE STAGE (One at a time) */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col items-center justify-start bg-[#f8faf9] dark:bg-[#0e1512]">
        <div className="w-full max-w-lg flex flex-col items-center space-y-4">
          {/* Exercise Info Card */}
          <div className="w-full bg-white dark:bg-[#182220] rounded-3xl p-5 shadow-sm border border-[#e2e8e4] dark:border-[#232f2b] flex flex-col items-center">
            {/* Exercise Title, Load Type Badge & History Button */}
            <div className="w-full flex items-start justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedExForHistory({
                    id: currentExercise.id,
                    name: currentExercise.name,
                    muscleGroup: currentExercise.muscleGroup,
                    setsReps: currentExercise.setsReps,
                    targetWeightKg: currentExercise.sets[0]?.targetWeightKg,
                    loadType: currentExercise.loadType,
                  })
                }
                className="text-left group cursor-pointer focus:outline-none"
                title="Apri storico dettagliato e record personali"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#386a00] dark:text-[#a3e635]">
                    {currentExercise.muscleGroup}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#84cc16]/15 text-[#386a00] dark:text-[#84cc16] text-[10px] font-bold">
                    {getLoadTypeLabel(currentExercise.loadType)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <h3 className="text-[19px] font-extrabold text-[#191c1c] dark:text-[#e2e8e4] tracking-tight group-hover:text-[#84cc16] transition-colors">
                    {currentExercise.name}
                  </h3>
                  <Icon name="history" className="w-4 h-4 text-[#84cc16] shrink-0 opacity-75 group-hover:opacity-100" />
                </div>
              </button>

              <span className="px-3 py-1 rounded-full bg-[#84cc16]/15 text-[#386a00] dark:text-[#a3e635] text-[12px] font-bold shrink-0">
                {currentExercise.setsReps}
              </span>
            </div>

            {/* Looped Flow Exercise Animation */}
            <div className="w-full flex justify-center my-1">
              <FlowExerciseAnimation
                exerciseId={currentExercise.id}
                exerciseName={currentExercise.name}
                muscleGroup={currentExercise.muscleGroup}
              />
            </div>

            {/* Quick action bar: Copy All Previous Sets */}
            {lastExerciseSession && (
              <div className="w-full flex items-center justify-between bg-[#f2f4f3] dark:bg-[#1a2622] px-3.5 py-2 rounded-xl mt-3 border border-[#eceeed] dark:border-[#2a3832]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#56615c] dark:text-[#94a39b]">
                  <Icon name="history" className="w-3.5 h-3.5 text-[#386a00] dark:text-[#84cc16]" />
                  <span>
                    Ultima sessione: <strong>{lastExerciseSession.completedAt}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestCopyAllSets}
                  className="text-[11px] font-bold text-[#386a00] dark:text-[#84cc16] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="content_copy" className="w-3 h-3" />
                  <span>Copia tutta l'ultima volta</span>
                </button>
              </div>
            )}

            {/* Sets Table for this exercise */}
            <div className="w-full mt-3 overflow-hidden rounded-2xl border border-[#eceeed] dark:border-[#2a3832]">
              {/* Header */}
              <div className="grid grid-cols-12 bg-[#f2f4f3] dark:bg-[#1e2b27] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#56615c] text-center">
                <div className="col-span-2 text-left">Set</div>
                <div className="col-span-4 text-left">Ultima Volta / Target</div>
                <div className="col-span-2">{getLoadTypeShortBadge(currentExercise.loadType)}</div>
                <div className="col-span-2">Rep</div>
                <div className="col-span-2 text-right">Fatto</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#eceeed] dark:divide-[#2a3832]">
                {currentExercise.sets.map((set, idx) => {
                  const lastSet = lastExerciseSession?.sets[idx];
                  const hasLastSet = lastSet && lastSet.isCompleted;

                  return (
                    <div
                      key={set.id}
                      className={`px-3 py-2.5 transition-colors ${
                        set.isCompleted
                          ? 'bg-[#84cc16]/10 dark:bg-[#84cc16]/15'
                          : 'bg-white dark:bg-[#182220] hover:bg-[#fafbfa]'
                      }`}
                    >
                      <div className="grid grid-cols-12 items-center">
                        {/* Set Number */}
                        <div className="col-span-2 flex items-center">
                          <span
                            className={`w-7 h-7 rounded-xl text-[12px] font-bold flex items-center justify-center ${
                              set.isCompleted
                                ? 'bg-[#84cc16] text-[#102000]'
                                : 'bg-[#f2f4f3] dark:bg-[#232f2b] text-[#191c1c] dark:text-[#e2e8e4]'
                            }`}
                          >
                            {set.setNum}
                          </span>
                        </div>

                        {/* Ultima Volta & Target */}
                        <div className="col-span-4 flex flex-col justify-center text-left">
                          {hasLastSet ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-[#191c1c] dark:text-[#f8faf9]">
                                {lastSet.weightKg}k × {lastSet.reps}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRequestCopySet(set, lastSet)}
                                title="Copia valori dell'ultima volta"
                                className="p-0.5 rounded text-[#386a00] dark:text-[#84cc16] hover:bg-[#84cc16]/20 transition-colors cursor-pointer"
                              >
                                <Icon name="content_copy" className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#85948c] italic">Prima volta</span>
                          )}
                          <span className="text-[10px] text-[#56615c] dark:text-[#94a39b]">
                            Tgt: {set.targetWeightKg > 0 ? `${set.targetWeightKg}k × ` : ''}
                            {set.targetRepsLabel || set.targetReps}
                          </span>
                        </div>

                        {/* Kg Input */}
                        <div className="col-span-2 flex items-center justify-center">
                          <input
                            type="number"
                            min={0}
                            max={500}
                            step={0.5}
                            value={set.weightKg}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateWeight(currentExercise.id, set.id, isNaN(val) ? 0 : val);
                            }}
                            className={`w-13 text-center text-[13px] font-bold py-1 px-1 rounded-lg border focus:outline-none transition-colors ${
                              set.isCompleted
                                ? 'bg-white dark:bg-[#1e2b27] border-[#84cc16] text-[#191c1c] dark:text-[#e2e8e4]'
                                : 'bg-[#f8faf9] dark:bg-[#1e2b27] border-[#e2e8e4] dark:border-[#2a3832] focus:border-[#84cc16] text-[#191c1c] dark:text-[#e2e8e4]'
                            }`}
                          />
                        </div>

                        {/* Reps Input */}
                        <div className="col-span-2 flex items-center justify-center">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={set.reps}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleUpdateReps(currentExercise.id, set.id, isNaN(val) ? 1 : val);
                            }}
                            className={`w-11 text-center text-[13px] font-bold py-1 px-1 rounded-lg border focus:outline-none transition-colors ${
                              set.isCompleted
                                ? 'bg-white dark:bg-[#1e2b27] border-[#84cc16] text-[#191c1c] dark:text-[#e2e8e4]'
                                : 'bg-[#f8faf9] dark:bg-[#1e2b27] border-[#e2e8e4] dark:border-[#2a3832] focus:border-[#84cc16] text-[#191c1c] dark:text-[#e2e8e4]'
                            }`}
                          />
                        </div>

                        {/* Complete Checkbox */}
                        <div className="col-span-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleSet(currentExercise.id, set.id)}
                            aria-label={`Completa serie ${set.setNum}`}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                              set.isCompleted
                                ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                                : 'bg-[#f2f4f3] dark:bg-[#232f2b] hover:bg-[#e6e9e8] text-[#56615c] border border-[#e2e8e4] dark:border-[#2a3832]'
                            }`}
                          >
                            <Icon name="check" className="w-4 h-4 font-black" />
                          </button>
                        </div>
                      </div>

                      {/* Secondary row: RPE / RIR Selector */}
                      <div className="mt-1.5 pt-1 border-t border-[#eceeed]/60 dark:border-[#2a3832]/60 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setRpePickerTarget({
                              exId: currentExercise.id,
                              setId: set.id,
                              setNum: set.setNum,
                              currentRpe: set.rpe,
                            })
                          }
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#f2f4f3] dark:bg-[#23312b] hover:bg-[#e6e9e8] text-[#56615c] dark:text-[#94a39b] cursor-pointer transition-colors"
                        >
                          <span className="font-semibold">
                            {set.rpe ? `RPE ${set.rpe} (${set.rir ?? 10 - set.rpe} RIR)` : '+ RPE / RIR'}
                          </span>
                          <Icon name="tune" className="w-3 h-3 text-[#386a00] dark:text-[#84cc16]" />
                        </button>

                        <span className="text-[10px] text-[#56615c] dark:text-[#94a39b]">
                          Vol: {calculateSetVolume(set.weightKg, set.reps, currentExercise.loadType)} kg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exercise Footer: Add Set & Live Volume / Estimated 1RM */}
            <div className="w-full flex items-center justify-between mt-3 pt-1">
              <button
                type="button"
                onClick={() => handleAddSet(currentExercise.id)}
                className="text-[12px] font-bold text-[#386a00] dark:text-[#a3e635] hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-[#84cc16]/10 transition-colors"
              >
                <Icon name="add" className="w-4 h-4" />
                <span>Aggiungi Serie</span>
              </button>

              <div className="flex flex-col items-end text-right">
                <span className="text-[12px] text-[#56615c] font-medium">
                  Volume: {currentExercise.sets.filter((s) => s.isCompleted).reduce((a, s) => a + calculateSetVolume(s.weightKg, s.reps, currentExercise.loadType), 0)} kg
                </span>
                {bestCompletedSetInCurrentEx && highest1RMInCurrentEx > 0 && (
                  <span className="text-[10px] text-[#386a00] dark:text-[#84cc16] font-semibold">
                    1RM Stimato: {highest1RMInCurrentEx} kg
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. STEPPER FOOTER (Precedente / Successivo) */}
      <footer className="bg-white dark:bg-[#141e1a] border-t border-[#e2e8e4] dark:border-[#232f2b] p-4 shrink-0 shadow-lg z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          {/* Previous Exercise Button */}
          <button
            type="button"
            disabled={isFirstExercise}
            onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}
            className={`flex-1 py-3.5 px-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              isFirstExercise
                ? 'opacity-35 cursor-not-allowed bg-[#f2f4f3] dark:bg-[#1e2b27] text-[#56615c]'
                : 'bg-[#f2f4f3] dark:bg-[#1e2b27] hover:bg-[#e6e9e8] text-[#191c1c] dark:text-[#e2e8e4] cursor-pointer active:scale-95'
            }`}
          >
            <Icon name="chevron_left" className="w-5 h-5" />
            <span>Precedente</span>
          </button>

          {/* Next Exercise OR Finish Workout Button */}
          {isLastExercise ? (
            <button
              type="button"
              onClick={() => setShowSummary(true)}
              className="flex-2 py-3.5 px-5 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[15px] font-black shadow-md shadow-[#84cc16]/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <Icon name="trophy" className="w-5 h-5" />
              <span>Riepilogo &amp; Fine</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentExerciseIndex((prev) => Math.min(exercisesData.length - 1, prev + 1))}
              className="flex-2 py-3.5 px-5 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[15px] font-black shadow-md shadow-[#84cc16]/25 flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
            >
              <span>Successivo</span>
              <Icon name="chevron_right" className="w-5 h-5" />
            </button>
          )}
        </div>
      </footer>

      {/* 4. CIRCULAR REST COUNTDOWN OVERLAY */}
      {activeRestSeconds !== null && (
        <div className="fixed inset-0 z-[150] bg-[#17211D]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#84cc16]/20 border border-[#84cc16]/40 text-[#a3e635] text-[12px] font-extrabold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-ping"></span>
              <span>Recupero Attivo</span>
            </div>

            <div className="relative w-56 h-56 flex items-center justify-center my-2">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r={circleRadius}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={circleRadius}
                  stroke="#84cc16"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[44px] font-mono font-black text-white tracking-tight leading-none">
                  {formatTime(activeRestSeconds)}
                </span>
                <span className="text-[12px] uppercase font-bold text-[#a3e635] tracking-wider mt-2">
                  {isRestPaused ? 'In Pausa' : 'Riposo in corso'}
                </span>
                <span className="text-[11px] text-white/60 mt-1">
                  Totale: {Math.floor(totalRestDuration / 60)}m {totalRestDuration % 60 > 0 ? `${totalRestDuration % 60}s` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 mb-3">
              <span className="text-[11px] text-white/70 font-semibold mr-0.5">Base:</span>
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    handleSetDefaultRestSeconds(s);
                    setTotalRestDuration(s);
                    setActiveRestSeconds(s);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    defaultRestSeconds === s
                      ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {s >= 60 ? `${s / 60}m` : `${s}s`}
                </button>
              ))}
            </div>

            <p className="text-[12px] text-white/80 font-medium mb-4">
              Rilassa i muscoli e preparati per la prossima serie.
            </p>

            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => setActiveRestSeconds((prev) => (prev ? Math.max(5, prev - 15) : null))}
                className="py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold border border-white/20 transition-all active:scale-95 cursor-pointer"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => handleAddRestTime(30)}
                className="py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold border border-white/20 transition-all active:scale-95 cursor-pointer"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={() => setIsRestPaused(!isRestPaused)}
                className="flex-1 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[13px] font-bold border border-white/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Icon name={isRestPaused ? 'play_arrow' : 'pause'} className="w-4 h-4 text-[#84cc16]" />
                <span>{isRestPaused ? 'Riprendi' : 'Pausa'}</span>
              </button>
              <button
                type="button"
                onClick={handleSkipRest}
                className="py-3 px-4 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[13px] font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#84cc16]/25"
              >
                Salta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RPE & RIR SELECTOR MODAL / BOTTOM SHEET */}
      {rpePickerTarget && (
        <div
          className="fixed inset-0 z-[160] bg-[#17211D]/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRpePickerTarget(null);
          }}
        >
          <div className="bg-white dark:bg-[#182220] rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#e2e8e4] dark:border-[#232f2b] space-y-3">
            <div className="flex items-center justify-between border-b border-[#eceeed] dark:border-[#2a3832] pb-2">
              <div>
                <h4 className="text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9]">
                  Serie {rpePickerTarget.setNum} · RPE &amp; RIR
                </h4>
                <p className="text-[11px] text-[#56615c] dark:text-[#94a39b]">
                  RIR = Ripetizioni in riserva prima del cedimento
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRpePickerTarget(null)}
                className="w-8 h-8 rounded-full bg-[#f2f4f3] dark:bg-[#232f2b] text-[#56615c] flex items-center justify-center cursor-pointer"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {RPE_SCALE.map((lvl) => {
                const isSelected = rpePickerTarget.currentRpe === lvl.rpe;
                return (
                  <button
                    key={lvl.rpe}
                    type="button"
                    onClick={() => {
                      handleUpdateSetRpe(rpePickerTarget.exId, rpePickerTarget.setId, lvl.rpe);
                      setRpePickerTarget(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#84cc16]/15 border-[#84cc16] text-[#191c1c] dark:text-[#f8faf9]'
                        : 'bg-[#f8faf9] dark:bg-[#1e2b27] border-[#eceeed] dark:border-[#2a3832] hover:bg-[#eceeed]'
                    }`}
                  >
                    <div>
                      <span className="text-[12px] font-extrabold text-[#386a00] dark:text-[#84cc16] block">
                        {lvl.label}
                      </span>
                      <span className="text-[11px] text-[#56615c] dark:text-[#94a39b] block mt-0.5">
                        {lvl.description}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[#386a00] dark:text-[#84cc16] font-bold text-[14px]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {rpePickerTarget.currentRpe !== undefined && (
              <button
                type="button"
                onClick={() => {
                  handleUpdateSetRpe(rpePickerTarget.exId, rpePickerTarget.setId, undefined);
                  setRpePickerTarget(null);
                }}
                className="w-full py-2 text-[12px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                Rimuovi RPE da questa serie
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. COPY OVERWRITE PROTECTION CONFIRMATION DIALOG */}
      {copyConfirmTarget && (
        <div className="fixed inset-0 z-[165] bg-[#17211D]/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#182220] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#e2e8e4] dark:border-[#232f2b] space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Icon name="warning" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-[#191c1c] dark:text-[#f8faf9]">
                  Sovrascrivere modifiche inserite?
                </h4>
                <p className="text-[12px] text-[#56615c] dark:text-[#94a39b] mt-1 leading-normal">
                  {copyConfirmTarget.isAllSets
                    ? "Hai già inserito o modificato i valori di alcune serie. Vuoi sostituire tutte le serie con i dati dell'ultima volta?"
                    : `Hai già modificato questa serie (${copyConfirmTarget.currentWeight} kg × ${copyConfirmTarget.currentReps} reps). Vuoi sostituirla con i dati dell'ultima volta (${copyConfirmTarget.lastWeight} kg × ${copyConfirmTarget.lastReps} reps)?`}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCopyConfirmTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#f2f4f3] dark:bg-[#25352e] hover:bg-[#e6e9e8] text-[#191c1c] dark:text-[#e2e8e4] text-[13px] font-bold transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  if (copyConfirmTarget.isAllSets) {
                    const lastLog = getLastExerciseSession(copyConfirmTarget.exId, workoutHistory);
                    if (lastLog) executeApplyCopyAllSets(copyConfirmTarget.exId, lastLog.sets);
                  } else if (copyConfirmTarget.setId) {
                    executeApplyCopySet(
                      copyConfirmTarget.exId,
                      copyConfirmTarget.setId,
                      copyConfirmTarget.lastWeight,
                      copyConfirmTarget.lastReps,
                      copyConfirmTarget.lastRpe
                    );
                  }
                  setCopyConfirmTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[13px] font-bold transition-colors cursor-pointer"
              >
                Sì, Sovrascrivi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. EXIT / CANCEL CONFIRMATION DIALOG */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[160] bg-[#17211D]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#182220] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#e2e8e4] dark:border-[#232f2b] text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Icon name="pause" className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-bold text-[#191c1c] dark:text-[#e2e8e4]">
              Interrompere l'allenamento?
            </h3>
            <p className="text-[13px] text-[#56615c] mt-1.5">
              Vuoi uscire dalla sessione live o continuare? I progressi finora non salvati andranno persi.
            </p>

            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3.5 rounded-2xl bg-[#84cc16] text-[#102000] font-bold text-[14px] hover:bg-[#91db2a] transition-colors cursor-pointer"
              >
                Continua ad allenarti
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="w-full py-3 rounded-2xl bg-[#f2f4f3] dark:bg-[#232f2b] text-red-600 dark:text-red-400 font-bold text-[13px] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              >
                Abbandona sessione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. FINAL SESSION SUMMARY MODAL */}
      {showSummary && (
        <div className="fixed inset-0 z-[170] bg-[#17211D]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-[#182220] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8e4] dark:border-[#232f2b] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#84cc16]/20 text-[#386a00] dark:text-[#a3e635] flex items-center justify-center mb-3 shadow-inner">
              <Icon name="trophy" className="w-8 h-8 text-[#386a00] dark:text-[#a3e635]" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-[#386a00] dark:text-[#a3e635]">
              Sessione Completata
            </span>
            <h3 className="text-[24px] font-extrabold text-[#191c1c] dark:text-[#e2e8e4] tracking-tight mt-0.5">
              Grande Allenamento!
            </h3>
            <p className="text-[13px] text-[#56615c] mt-1 max-w-xs">
              Tutti gli esercizi sono stati completati con successo. Il volume è pronto per essere archiviato nel tuo storico.
            </p>

            {/* Metrics Recap Cards */}
            <div className="grid grid-cols-3 gap-2.5 w-full mt-5">
              <div className="bg-[#f8faf9] dark:bg-[#1e2b27] p-3 rounded-2xl border border-[#eceeed] dark:border-[#2a3832] flex flex-col items-center">
                <span className="text-[10px] text-[#56615c] uppercase font-bold tracking-wider">
                  Durata
                </span>
                <span className="text-[18px] font-mono font-bold text-[#191c1c] dark:text-[#e2e8e4] mt-1">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>

              <div className="bg-[#f8faf9] dark:bg-[#1e2b27] p-3 rounded-2xl border border-[#eceeed] dark:border-[#2a3832] flex flex-col items-center">
                <span className="text-[10px] text-[#56615c] uppercase font-bold tracking-wider">
                  Volume
                </span>
                <span className="text-[18px] font-bold text-[#191c1c] dark:text-[#e2e8e4] mt-1 truncate w-full">
                  {totalVolumeKg.toLocaleString()}
                  <span className="text-[11px] font-normal text-[#56615c] block">kg</span>
                </span>
              </div>

              <div className="bg-[#f8faf9] dark:bg-[#1e2b27] p-3 rounded-2xl border border-[#eceeed] dark:border-[#2a3832] flex flex-col items-center">
                <span className="text-[10px] text-[#56615c] uppercase font-bold tracking-wider">
                  Serie
                </span>
                <span className="text-[18px] font-bold text-[#386a00] dark:text-[#a3e635] mt-1">
                  {completedSetsCount}/{totalSetsCount}
                </span>
              </div>
            </div>

            {/* Post-Workout Recovery Tip */}
            <div className="bg-[#f2f4f3] dark:bg-[#1e2b27] p-3.5 rounded-2xl w-full text-left mt-4 border border-[#eceeed] dark:border-[#2a3832] text-[12px] text-[#424936] dark:text-[#a8b9aa] flex items-center gap-2.5">
              <span className="text-[20px]">💧</span>
              <span>
                Ottimo stimolo neurale e muscolare! Bevi almeno <span className="font-bold text-[#191c1c] dark:text-[#e2e8e4]">500 ml</span> d'acqua ora per accelerare il recupero.
              </span>
            </div>

            {/* Save & Finish Button */}
            <button
              type="button"
              onClick={handleFinalSaveWorkout}
              className="w-full mt-5 py-4 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[16px] font-extrabold shadow-lg shadow-[#84cc16]/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Icon name="check_circle" className="w-5 h-5" />
              <span>Salva Allenamento nel Diario</span>
            </button>
          </div>
        </div>
      )}

      {/* 9. EXERCISE HISTORY & PROGRESSION MODAL */}
      {selectedExForHistory && (
        <ExerciseHistoryModal
          exercise={selectedExForHistory}
          routineTitle={routine.title}
          history={workoutHistory}
          onClose={() => setSelectedExForHistory(null)}
          onApplyProgression={onApplyProgression}
        />
      )}
    </div>
  );
};
