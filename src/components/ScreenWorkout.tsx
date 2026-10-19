import React, { useState, useEffect } from 'react';
import type { WorkoutRoutine, ExerciseItem, UserProfile, WorkoutSessionLog } from '../types';
import { Icon } from './Icons';
import { ExerciseMotionGraphic } from './ExerciseMotionGraphic';
import { FlowExerciseAnimation } from './FlowExerciseAnimation';
import { getScheduledWorkoutForDate, getEffectiveToday } from '../utils/workoutSchedule';
import { ExerciseHistoryModal } from './ExerciseHistoryModal';
import {
  getExerciseLoadType,
  getLoadTypeShortBadge,
  loadWorkoutHistory,
} from '../utils/workoutTracking';

interface ScreenWorkoutProps {
  routines: WorkoutRoutine[];
  profile?: UserProfile;
  onStartRoutine: (routine: WorkoutRoutine) => void;
  onUpdateRoutines?: (routines: WorkoutRoutine[]) => void;
  onResetToDefault?: () => void;
}

export const ScreenWorkout: React.FC<ScreenWorkoutProps> = ({
  routines,
  profile,
  onStartRoutine,
  onUpdateRoutines,
  onResetToDefault,
}) => {
  const safeProfile = profile || {
    name: 'Luca',
    sex: 'uomo' as const,
    age: 28,
    heightCm: 180,
    weightKg: 82,
    targetWeightKg: 85,
    goal: 'crescita' as const,
    experience: 'intermediate' as const,
    weeklyDays: 4,
    selectedDays: ['Lun', 'Mar', 'Gio', 'Ven'],
    equipment: ['Palestra completa'],
    dietaryPreferences: [],
    timeZone: 'Europe/Rome',
  };

  const effectiveToday = getEffectiveToday(safeProfile);
  const todaySchedule = getScheduledWorkoutForDate(
    routines,
    safeProfile,
    effectiveToday,
    safeProfile.timeZone
  );

  // Preserve user selected routine across tab changes
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('evolve_selected_workout_routine_id');
      if (saved && routines.some((r) => r.id === saved)) {
        return saved;
      }
    } catch {}
    // Default to today's scheduled routine if training day, otherwise first routine
    if (!todaySchedule.isRestDay && todaySchedule.routineId) {
      return todaySchedule.routineId;
    }
    return routines[0]?.id || '';
  });

  const [editingRoutineId, setEditingRoutineId] = useState<string>(() => {
    return selectedRoutineId || routines[0]?.id || '';
  });
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<ExerciseItem | null>(null);
  const [selectedHistoryExercise, setSelectedHistoryExercise] = useState<ExerciseItem | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSessionLog[]>(() => loadWorkoutHistory());

  // Open / collapsed status for each routine (tendina - default: aperta)
  const [openRoutineIds, setOpenRoutineIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('evolve_open_workout_routines');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const toggleRoutine = (id: string) => {
    setOpenRoutineIds((prev) => {
      const isCurrentlyOpen = prev[id] !== false;
      const next = { ...prev, [id]: !isCurrentlyOpen };
      try {
        localStorage.setItem('evolve_open_workout_routines', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectChip = (routineId: string) => {
    setSelectedRoutineId(routineId);
    setEditingRoutineId(routineId);
    try {
      localStorage.setItem('evolve_selected_workout_routine_id', routineId);
    } catch {}
  };

  // Default rest timer preference in seconds (2 min = 120s default)
  const [restSeconds, setRestSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('evolve_rest_duration_seconds');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {}
    return 120; // 2 minuti di recupero
  });

  const handleUpdateRestSeconds = (secs: number) => {
    setRestSeconds(secs);
    try {
      localStorage.setItem('evolve_rest_duration_seconds', String(secs));
    } catch {}
  };

  // State for adding a new exercise
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSetsReps, setNewExSetsReps] = useState('3 × 10');
  const [newExWeight, setNewExWeight] = useState<number>(30);
  const [newExMuscle, setNewExMuscle] = useState('Pettorali');

  // Currently active & editing routines
  const activeRoutine = routines.find((r) => r.id === selectedRoutineId) || routines[0];
  const editingRoutine = routines.find((r) => r.id === editingRoutineId) || activeRoutine || routines[0];

  // Helper to update exercises of a target routine
  const handleUpdateExerciseList = (updatedExercises: ExerciseItem[], targetRoutineId?: string) => {
    if (!onUpdateRoutines) return;
    const rId = targetRoutineId || editingRoutine?.id || selectedRoutineId;
    const updatedRoutines = routines.map((r) => {
      if (r.id === rId) {
        return { ...r, exercises: updatedExercises };
      }
      return r;
    });
    onUpdateRoutines(updatedRoutines);
  };

  const handleApplyProgressionFromModal = (exerciseId: string, newWeightKg: number) => {
    if (!activeRoutine || !onUpdateRoutines) return;
    const updatedExercises = activeRoutine.exercises.map((e) =>
      e.id === exerciseId ? { ...e, targetWeightKg: newWeightKg } : e
    );
    handleUpdateExerciseList(updatedExercises, activeRoutine.id);
  };

  const handleDeleteExercise = (exId: string) => {
    if (!editingRoutine) return;
    const nextList = editingRoutine.exercises.filter((e) => e.id !== exId);
    handleUpdateExerciseList(nextList, editingRoutine.id);
  };

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim() || !editingRoutine) return;

    const newExercise: ExerciseItem = {
      id: `ex-custom-${Date.now()}`,
      name: newExName.trim(),
      setsReps: newExSetsReps.trim() || '3 × 10',
      targetWeightKg: Number(newExWeight) || 0,
      muscleGroup: newExMuscle.trim() || 'Generale',
    };

    handleUpdateExerciseList([...editingRoutine.exercises, newExercise], editingRoutine.id);
    setNewExName('');
    setIsAddingExercise(false);
  };

  // Helper per visualizzare i gruppi muscolari sotto il giorno
  const getDaySubtitle = (r: WorkoutRoutine, idx: number) => {
    const id = r.id;
    const titleLower = r.title.toLowerCase();
    if (id === 'push-day' || titleLower.includes('petto') || idx === 0) return 'Petto';
    if (id === 'pull-day' || titleLower.includes('schiena') || idx === 1) return 'Schiena';
    if (id === 'shoulders-arms' || titleLower.includes('spalle') || idx === 2) return 'Spalle & Braccia';
    if (id === 'legs-day' || titleLower.includes('gambe') || idx === 3) return 'Gambe';
    if (r.title.includes(':')) {
      return r.title.split(':')[1].trim().replace(' e Avambracci', '').replace('& Avambracci', '');
    }
    return r.focusMuscles?.slice(0, 2).join(' & ') || r.subtitle || '';
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-md px-5 pb-32 space-y-4">
        {/* Header */}
        <div className="pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900]">
            Programmazione Settimanale
          </span>
          <h2 className="text-[24px] font-bold text-[#191c1c] dark:text-[#e2e8e4] tracking-tight">
            I Tuoi Allenamenti
          </h2>
          <p className="text-[13px] text-[#56615c]">
            Scheda 4 Giorni: Volume mirato, intensità progressiva e recupero ottimale.
          </p>
        </div>

        {/* Demo Mode Notice Banner (se attiva data simulata) */}
        {safeProfile.simulatedDate && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#84cc16]/10 border border-[#84cc16]/30 text-[#191c1c] dark:text-[#e2e8e4] text-[12px]">
            <Icon name="info" className="w-4 h-4 text-[#386a00] dark:text-[#84cc16] shrink-0" />
            <div>
              <span className="font-bold">Modalità Demo Dichiarata:</span> Data simulata{' '}
              <span className="font-semibold text-[#386a00] dark:text-[#84cc16]">{todaySchedule.dayName} {todaySchedule.dateKey}</span> ({safeProfile.timeZone || 'Europe/Rome'})
            </div>
          </div>
        )}

        {/* Rest Day Informative Banner */}
        {todaySchedule.isRestDay && (
          <div className="p-3.5 rounded-2xl bg-[#f2f4f3] dark:bg-[#1a2622] border border-[#e2e8e4] dark:border-[#2b3a33] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#84cc16]/20 text-[#386a00] dark:text-[#84cc16] flex items-center justify-center shrink-0">
              <Icon name="bedtime" className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#386a00] dark:text-[#84cc16]">
                  Giorno di Riposo Programmato ({todaySchedule.dayName})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#84cc16]/20 text-[#386a00] dark:text-[#84cc16] text-[10px] font-black uppercase">
                  Recupero Attivo
                </span>
              </div>
              <p className="text-[12px] text-[#56615c] dark:text-[#94a39b] mt-0.5">
                {todaySchedule.nextScheduledRoutine
                  ? `Prossima sessione in scheda: ${todaySchedule.nextScheduledRoutine.title} (${todaySchedule.nextScheduledDate || 'Lunedì'})`
                  : 'Nessun allenamento pesante programmato per oggi.'}
              </p>
            </div>
          </div>
        )}

        {/* Routine Selector Chips con Giorno sopra e Muscoli sotto */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {routines.map((r, idx) => {
            const isSelected = r.id === activeRoutine.id;
            const isRoutineClosed = openRoutineIds[r.id] === false;
            const dayLabel = r.dayName ? r.dayName.split('·')[0].trim() : `Giorno ${idx + 1}`;
            const subLabel = getDaySubtitle(r, idx);
            const isRoutineToday = !todaySchedule.isRestDay && todaySchedule.routineId === r.id;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectChip(r.id)}
                className={`px-3 py-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer min-w-[92px] flex-1 ${
                  isSelected
                    ? 'bg-[#416900] text-white shadow-md shadow-[#416900]/25 ring-2 ring-[#84cc16]/50'
                    : 'bg-[#f2f4f3] dark:bg-[#1e2b27] text-[#191c1c] dark:text-[#e2e8e4] hover:bg-[#eceeed] dark:hover:bg-[#253530] border border-[#e2e8e4]/70 dark:border-[#2a3832]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-extrabold tracking-tight leading-tight whitespace-nowrap">
                    {dayLabel}
                  </span>
                  {isRoutineToday && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                        isSelected ? 'bg-[#d9f99d] text-[#1a3300]' : 'bg-[#84cc16] text-[#102000]'
                      }`}
                    >
                      Oggi
                    </span>
                  )}
                  {isRoutineClosed && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#d9f99d]' : 'bg-[#8c9992]'
                      }`}
                      title="Chiuso a tendina"
                    />
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-0.5 whitespace-nowrap ${
                    isSelected ? 'text-[#d9f99d]' : 'text-[#56615c] dark:text-[#a8b9aa]'
                  }`}
                >
                  {subLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scheda dell'Allenamento del Giorno Selezionato (Chiudibile a Tendina) */}
        {activeRoutine && (() => {
          const isOpen = openRoutineIds[activeRoutine.id] !== false;
          const dayIdx = routines.findIndex((r) => r.id === activeRoutine.id);
          const dayLabel = activeRoutine.dayName ? activeRoutine.dayName.split('·')[0].trim() : `Giorno ${dayIdx + 1}`;
          const dayOfWeek = activeRoutine.dayOfWeek || (activeRoutine.dayName && activeRoutine.dayName.includes('·') ? activeRoutine.dayName.split('·')[1].trim() : '');
          const isThisRoutineToday = !todaySchedule.isRestDay && todaySchedule.routineId === activeRoutine.id;
          const cleanTitle = activeRoutine.title.replace(/^Giorno\s*\d+\s*:\s*/i, '');

          return (
            <div
              key={activeRoutine.id}
              className={`bg-white dark:bg-[#182220] rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'border-[#84cc16]/60 dark:border-[#84cc16]/40 ring-1 ring-[#84cc16]/30'
                  : 'border-[#e2e8e4] dark:border-[#232f2b] hover:border-[#84cc16]/40'
              }`}
            >
              {/* Header Cliccabile a Tendina */}
              <div
                onClick={() => toggleRoutine(activeRoutine.id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none group"
                title={isOpen ? 'Comprimi scheda' : 'Espandi scheda'}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900] dark:text-[#a3e635]">
                      {dayLabel} {dayOfWeek ? `· ${dayOfWeek}` : ''}
                    </span>
                    {isThisRoutineToday && (
                      <span className="px-2 py-0.5 rounded-full bg-[#84cc16] text-[#102000] text-[10px] font-extrabold uppercase tracking-wide leading-tight">
                        Oggi
                      </span>
                    )}
                  </div>
                  <h3 className="text-[18px] sm:text-[19px] font-bold text-[#191c1c] dark:text-[#e2e8e4] group-hover:text-[#386a00] dark:group-hover:text-[#a3e635] transition-colors mt-0.5 truncate">
                    {cleanTitle}
                  </h3>
                  <div className="flex items-center gap-2 text-[12px] text-[#56615c] dark:text-[#94a39b] mt-0.5">
                    <span className="font-medium">{activeRoutine.exercises.length} esercizi</span>
                    {activeRoutine.subtitle && (
                      <>
                        <span>•</span>
                        <span className="truncate">{activeRoutine.subtitle}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end text-right">
                    <span className="px-2 py-0.5 rounded-full bg-[#f2f4f3] dark:bg-[#232f2b] text-[11px] font-bold text-[#191c1c] dark:text-[#e2e8e4]">
                      RPE {activeRoutine.rpe}
                    </span>
                    <span className="text-[11px] font-semibold text-[#56615c] mt-0.5">
                      ~{activeRoutine.durationMin} min
                    </span>
                  </div>

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isOpen
                        ? 'bg-[#84cc16]/20 text-[#386a00] dark:text-[#a3e635]'
                        : 'bg-[#f2f4f3] dark:bg-[#232f2b] text-[#56615c] group-hover:bg-[#84cc16]/20 group-hover:text-[#386a00]'
                    }`}
                  >
                    <Icon
                      name={isOpen ? 'expand_less' : 'expand_more'}
                      className="w-5 h-5 transition-transform"
                    />
                  </div>
                </div>
              </div>

              {/* Contenuto Espanso a Tendina */}
              {isOpen ? (
                <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-[#f2f4f3] dark:border-[#232f2b] flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Muscle Focus Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {activeRoutine.focusMuscles.map((m) => (
                      <span
                        key={m}
                        className="px-2.5 py-0.5 rounded-full bg-[#84cc16]/15 text-[#386a00] dark:text-[#a3e635] text-[11px] font-bold"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  {/* Rest Setting Info Banner */}
                  <div className="p-3 rounded-xl bg-[#f8faf9] dark:bg-[#141e1a] border border-[#eceeed] dark:border-[#232f2b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="timer" className="w-4 h-4 text-[#416900]" />
                      <span className="text-[12px] text-[#56615c] font-medium">
                        Recupero tra serie:{' '}
                        <strong className="text-[#191c1c] dark:text-[#e2e8e4]">
                          {Math.floor(restSeconds / 60)} min{' '}
                          {restSeconds % 60 > 0 ? `${restSeconds % 60}s` : ''}
                        </strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoutineId(activeRoutine.id);
                        setIsEditingModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-[#386a00] dark:text-[#a3e635] hover:underline cursor-pointer"
                    >
                      Modifica
                    </button>
                  </div>

                  {/* Exercise List */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] uppercase font-bold text-[#56615c]">
                        Lista Esercizi ({activeRoutine.exercises.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoutineId(activeRoutine.id);
                          setIsEditingModalOpen(true);
                        }}
                        className="text-[12px] font-bold text-[#386a00] dark:text-[#a3e635] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Icon name="edit" className="w-3.5 h-3.5" />
                        <span>Personalizza</span>
                      </button>
                    </div>

                    {activeRoutine.exercises.map((ex, index) => {
                      const loadType = getExerciseLoadType(ex);
                      const loadBadge = getLoadTypeShortBadge(loadType);

                      return (
                        <div
                          key={ex.id}
                          className="p-3 rounded-xl bg-[#f8faf9] dark:bg-[#141e1a] border border-[#eceeed] dark:border-[#232f2b] hover:border-[#84cc16]/50 transition-all flex items-center justify-between group select-none"
                        >
                          <div
                            onClick={() => setSelectedHistoryExercise(ex)}
                            className="flex items-center gap-3 min-w-0 pr-2 cursor-pointer flex-1"
                            title="Storico carichi e record personali"
                          >
                            <span className="w-6 h-6 rounded-full bg-[#e6e9e8] dark:bg-[#232f2b] text-[#191c1c] dark:text-[#e2e8e4] text-[12px] font-bold flex items-center justify-center shrink-0 group-hover:bg-[#84cc16] group-hover:text-[#102000] transition-colors">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[14px] font-bold text-[#191c1c] dark:text-[#e2e8e4] group-hover:text-[#386a00] dark:group-hover:text-[#a3e635] transition-colors truncate">
                                  {ex.name}
                                </p>
                                <Icon name="history" className="w-3.5 h-3.5 text-[#386a00] dark:text-[#84cc16] opacity-75 shrink-0" />
                              </div>
                              <p className="text-[12px] text-[#56615c] flex items-center gap-1.5 mt-0.5">
                                <span>{ex.muscleGroup}</span>
                                <span>•</span>
                                <span className="text-[10px] font-semibold text-[#386a00] dark:text-[#84cc16] bg-[#84cc16]/10 px-1.5 py-0.5 rounded leading-none">
                                  {loadBadge}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div
                              onClick={() => setSelectedHistoryExercise(ex)}
                              className="text-right cursor-pointer flex flex-col items-end justify-center min-w-[55px]"
                              title="Storico e progressione"
                            >
                              <p className="text-[13px] font-bold text-[#191c1c] dark:text-[#e2e8e4] leading-tight tabular-nums">{ex.setsReps}</p>
                              {ex.targetWeightKg ? (
                                <p className="text-[11px] text-[#416900] dark:text-[#a3e635] font-semibold leading-tight mt-0.5 tabular-nums">
                                  {ex.targetWeightKg} kg
                                </p>
                              ) : (
                                <p className="text-[11px] text-[#56615c] font-medium leading-tight mt-0.5">Corpo libero</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewExercise(ex);
                              }}
                              title="Guarda esecuzione 3D/animazione"
                              className="w-8 h-8 rounded-lg bg-[#f2f4f3] dark:bg-[#232f2b] group-hover:bg-[#84cc16]/20 flex items-center justify-center text-[#56615c] group-hover:text-[#386a00] transition-colors cursor-pointer shrink-0"
                            >
                              <Icon name="play_arrow" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onStartRoutine(activeRoutine)}
                      className="w-full py-4 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[17px] font-bold shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Icon name="play_arrow" className="w-[22px] h-[22px]" />
                      <span>Inizia questa sessione</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoutineId(activeRoutine.id);
                        setIsEditingModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-[#56615c] hover:text-[#191c1c] hover:bg-[#f2f4f3] dark:hover:bg-[#1e2b27] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="tune" className="w-4 h-4" />
                      <span>Modifica esercizi e tempi di recupero</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Vista compressa a tendina */
                <div
                  onClick={() => toggleRoutine(activeRoutine.id)}
                  className="px-5 py-3.5 bg-[#f8faf9] dark:bg-[#141e1a] border-t border-[#f2f4f3] dark:border-[#232f2b] flex items-center justify-between text-[13px] text-[#56615c] cursor-pointer hover:text-[#386a00] transition-colors select-none group"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Icon name="fitness_center" className="w-4 h-4 text-[#416900] shrink-0" />
                    <span className="font-semibold text-[#191c1c] dark:text-[#e2e8e4] truncate">
                      {activeRoutine.title}
                    </span>
                    <span className="text-[11px] text-[#56615c] dark:text-[#94a39b] shrink-0">
                      ({activeRoutine.exercises.length} esercizi)
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#f2f4f3] dark:bg-[#232f2b] group-hover:bg-[#84cc16]/20 flex items-center justify-center text-[#386a00] dark:text-[#a3e635] transition-colors shrink-0">
                    <Icon name="expand_more" className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* MODAL: Personalizzazione Scheda & Recupero */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-[120] bg-[#17211D]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#182220] rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e2e8e4] dark:border-[#232f2b] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#eceeed] dark:border-[#232f2b] flex items-center justify-between bg-[#f8faf9] dark:bg-[#141e1a] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-[#416900]">
                  <Icon name="edit" className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#191c1c] dark:text-[#e2e8e4]">
                    Personalizza: {editingRoutine.title.split(':')[0]}
                  </h3>
                  <p className="text-[11px] text-[#56615c]">Aggiungi o rimuovi esercizi e regola il recupero</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingModalOpen(false);
                  setIsAddingExercise(false);
                }}
                className="w-8 h-8 rounded-full bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center hover:bg-[#d7e2dc] cursor-pointer"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Rest Timer Setting */}
              <div className="p-3.5 rounded-2xl bg-[#f2f4f3] dark:bg-[#1e2b27] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="timer" className="w-4 h-4 text-[#386a00]" />
                    <span className="text-[13px] font-bold text-[#191c1c] dark:text-[#e2e8e4]">
                      Tempo di Recupero tra Serie
                    </span>
                  </div>
                  <span className="text-[13px] font-extrabold text-[#386a00]">
                    {Math.floor(restSeconds / 60)} min {restSeconds % 60 > 0 ? `${restSeconds % 60}s` : ''}
                  </span>
                </div>
                <p className="text-[11px] text-[#56615c]">
                  Impostato automaticamente a 2 minuti. Seleziona un intervallo differente per personalizzarlo:
                </p>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[60, 90, 120, 180].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleUpdateRestSeconds(s)}
                      className={`py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                        restSeconds === s
                          ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                          : 'bg-white dark:bg-[#283933] text-[#56615c] hover:bg-[#eceeed]'
                      }`}
                    >
                      {s >= 60 ? `${s / 60}m` : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercises List in Routine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#56615c]">
                    Esercizi nella Routine ({editingRoutine.exercises.length})
                  </span>
                  {!isAddingExercise && (
                    <button
                      type="button"
                      onClick={() => setIsAddingExercise(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#84cc16] text-[#102000] text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Icon name="add" className="w-3.5 h-3.5" />
                      <span>Nuovo Esercizio</span>
                    </button>
                  )}
                </div>

                {/* Add Exercise Form */}
                {isAddingExercise && (
                  <form onSubmit={handleAddExerciseSubmit} className="p-3.5 rounded-2xl bg-[#84cc16]/10 border border-[#84cc16]/40 space-y-3">
                    <span className="text-[12px] font-bold text-[#386a00] block">
                      Aggiungi Nuovo Esercizio
                    </span>
                    <div>
                      <label className="text-[11px] text-[#56615c] font-semibold block mb-1">Nome Esercizio</label>
                      <input
                        type="text"
                        placeholder="Es. Croci ai cavi alti"
                        value={newExName}
                        onChange={(e) => setNewExName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1e2b27] border border-[#e2e8e4] text-[13px] font-bold outline-none focus:border-[#84cc16]"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#56615c] font-semibold block mb-1">Serie × Reps</label>
                        <input
                          type="text"
                          placeholder="3 × 10"
                          value={newExSetsReps}
                          onChange={(e) => setNewExSetsReps(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1e2b27] border border-[#e2e8e4] text-[13px] font-bold outline-none focus:border-[#84cc16]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#56615c] font-semibold block mb-1">Target Kg</label>
                        <input
                          type="number"
                          placeholder="30"
                          value={newExWeight}
                          onChange={(e) => setNewExWeight(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1e2b27] border border-[#e2e8e4] text-[13px] font-bold outline-none focus:border-[#84cc16]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingExercise(false)}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-[#56615c] hover:bg-[#e6e9e8] cursor-pointer"
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-[#84cc16] text-[#102000] text-[12px] font-bold shadow-sm cursor-pointer"
                      >
                        Salva Esercizio
                      </button>
                    </div>
                  </form>
                )}

                {/* List of items with remove button */}
                <div className="space-y-1.5">
                  {editingRoutine.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="p-3 rounded-xl bg-[#f8faf9] dark:bg-[#141e1a] border border-[#eceeed] dark:border-[#232f2b] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#e6e9e8] dark:bg-[#232f2b] text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#191c1c] dark:text-[#e2e8e4] truncate">{ex.name}</p>
                          <p className="text-[11px] text-[#56615c]">{ex.setsReps} {ex.targetWeightKg ? `· ${ex.targetWeightKg}kg` : ''}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.id)}
                        title="Rimuovi esercizio"
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        <Icon name="close" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset to Default Routine button */}
              {onResetToDefault && (
                <div className="pt-2 border-t border-[#eceeed] dark:border-[#232f2b]">
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="w-full p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[13px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Icon name="autorenew" className="w-4 h-4" />
                    <span>Ripristina Scheda Predefinita Originale</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-[#eceeed] dark:border-[#232f2b] bg-[#f8faf9] dark:bg-[#141e1a] flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="w-full py-3 rounded-xl bg-[#84cc16] text-[#102000] text-[14px] font-bold shadow-sm cursor-pointer"
              >
                Fatto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: Ripristino Scheda Predefinita */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[150] bg-[#17211D]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#182220] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#e2e8e4] text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="autorenew" className="w-6 h-6" />
            </div>
            <h4 className="text-[18px] font-bold text-[#191c1c] dark:text-[#e2e8e4]">
              Ripristinare la scheda predefinita?
            </h4>
            <p className="text-[13px] text-[#56615c] mt-1.5">
              Verrà ripristinata la scheda predefinita a 4 giorni (Petto/Tricipiti, Schiena/Bicipiti, Spalle/Braccia, Gambe) con 2 minuti di recupero.
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  onResetToDefault?.();
                  handleUpdateRestSeconds(120);
                  setIsResetConfirmOpen(false);
                  setIsEditingModalOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-red-600 text-white font-bold text-[14px] hover:bg-red-700 transition-colors cursor-pointer"
              >
                Sì, Ripristina Scheda
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full py-2.5 rounded-2xl bg-[#f2f4f3] text-[#56615c] font-bold text-[13px] hover:bg-[#e6e9e8] cursor-pointer"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Anteprima Animazione Esercizio & Guida Tecnica */}
      {previewExercise && (
        <div className="fixed inset-0 z-[140] bg-[#17211D]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#182220] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e2e8e4] dark:border-[#232f2b] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#eceeed] dark:border-[#232f2b] flex items-center justify-between bg-[#f8faf9] dark:bg-[#141e1a] shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#386a00] dark:text-[#a3e635]">
                  {previewExercise.muscleGroup}
                </span>
                <h3 className="text-[18px] font-bold text-[#191c1c] dark:text-[#e2e8e4] mt-0.5">
                  {previewExercise.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewExercise(null)}
                className="w-8 h-8 rounded-full bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center hover:bg-[#d7e2dc] cursor-pointer"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            {/* Content with Flow Looped Exercise Animation */}
            <div className="p-4 overflow-y-auto space-y-3.5">
              <FlowExerciseAnimation
                exerciseId={previewExercise.id}
                exerciseName={previewExercise.name}
                muscleGroup={previewExercise.muscleGroup}
              />

              <div className="p-3.5 rounded-2xl bg-[#f2f4f3] dark:bg-[#1e2b27] flex items-center justify-between text-[13px]">
                <div>
                  <span className="text-[11px] text-[#56615c] font-semibold block">Volume Programmato</span>
                  <span className="font-extrabold text-[#191c1c] dark:text-[#e2e8e4] text-[15px]">
                    {previewExercise.setsReps}
                  </span>
                </div>
                {previewExercise.targetWeightKg ? (
                  <div className="text-right">
                    <span className="text-[11px] text-[#56615c] font-semibold block">Carico Obiettivo</span>
                    <span className="font-extrabold text-[#386a00] dark:text-[#a3e635] text-[15px]">
                      {previewExercise.targetWeightKg} kg
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-[#eceeed] dark:border-[#232f2b] bg-[#f8faf9] dark:bg-[#141e1a]">
              <button
                type="button"
                onClick={() => setPreviewExercise(null)}
                className="w-full py-3 rounded-xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[14px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                Chiudi Anteprima
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedHistoryExercise && (
        <ExerciseHistoryModal
          exercise={selectedHistoryExercise}
          routineTitle={activeRoutine?.title}
          history={workoutHistory}
          onClose={() => {
            setSelectedHistoryExercise(null);
            setWorkoutHistory(loadWorkoutHistory());
          }}
          onApplyProgression={handleApplyProgressionFromModal}
        />
      )}
    </div>
  );
};
