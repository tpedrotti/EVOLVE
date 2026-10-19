import React, { useState } from 'react';
import type { ExerciseItem, WorkoutSessionLog, PersonalRecord, ProgressionProposal } from '../types';
import { Icon } from './Icons';
import { useA11yDialog } from '../utils/useA11yDialog';
import {
  getExerciseLoadType,
  getLoadTypeLabel,
  getExerciseHistory,
  calculateExercisePRs,
  calculateProgressionProposal,
  calculateEstimated1RM,
  calculateSetVolume,
} from '../utils/workoutTracking';

interface ExerciseHistoryModalProps {
  exercise: ExerciseItem;
  routineTitle?: string;
  onClose: () => void;
  onApplyProgression?: (exerciseId: string, newWeightKg: number) => void;
  history?: WorkoutSessionLog[];
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  exercise,
  routineTitle,
  onClose,
  onApplyProgression,
  history,
}) => {
  const { containerRef } = useA11yDialog<HTMLDivElement>({
    isOpen: true,
    onClose,
    onEscape: onClose,
  });

  const loadType = getExerciseLoadType(exercise);
  const loadTypeLabel = getLoadTypeLabel(loadType);

  const pastSessions = getExerciseHistory(exercise.id, history);
  const prs = calculateExercisePRs(exercise.id, history);
  const proposal: ProgressionProposal = calculateProgressionProposal(exercise, history);

  const [appliedProgression, setAppliedProgression] = useState(false);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);

  // Identify best completed set across all history to showcase estimated 1RM
  let bestSet: { weightKg: number; reps: number; date: string; sessionId: string; setNum: number } | null = null;
  let best1RMValue = 0;

  for (const item of pastSessions) {
    for (const set of item.exerciseLog.sets) {
      if (!set.isCompleted || set.weightKg <= 0 || set.reps <= 0) continue;
      const est = calculateEstimated1RM(set.weightKg, set.reps, loadType);
      if (est.isApplicable && est.estimated1RM && est.estimated1RM > best1RMValue) {
        best1RMValue = est.estimated1RM;
        bestSet = {
          weightKg: set.weightKg,
          reps: set.reps,
          date: item.session.date,
          sessionId: item.session.id,
          setNum: set.setNum,
        };
      }
    }
  }

  const best1RMResult = bestSet ? calculateEstimated1RM(bestSet.weightKg, bestSet.reps, loadType) : null;

  const handleAcceptProgression = () => {
    if (onApplyProgression && proposal.canProgress) {
      onApplyProgression(exercise.id, proposal.proposedWeightKg);
      setAppliedProgression(true);
    }
  };

  const handleJumpToSet = (sessionId: string) => {
    setHighlightedSessionId(sessionId);
    const targetElement = document.getElementById(`session-card-${sessionId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#17211D]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-history-modal-title"
        aria-describedby="exercise-history-modal-desc"
        tabIndex={-1}
        className="w-full max-w-xl bg-white dark:bg-[#18231f] rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8e4] dark:border-[#2b3a33] outline-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#eceeed] dark:border-[#2b3a33] flex items-center justify-between bg-[#f8faf9] dark:bg-[#151e1b] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl bg-[#84cc16]/20 flex items-center justify-center text-[#416900] dark:text-[#84cc16] shrink-0"
              aria-hidden="true"
            >
              <Icon name="fitness_center" className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#84cc16]/20 text-[#386a00] dark:text-[#84cc16] text-[10px] font-extrabold uppercase tracking-wide">
                  {loadTypeLabel}
                </span>
                <span className="text-[11px] text-[#56615c] dark:text-[#94a39b] font-medium">
                  {exercise.muscleGroup}
                </span>
              </div>
              <h2
                id="exercise-history-modal-title"
                className="text-[18px] font-bold text-[#191c1c] dark:text-[#f8faf9] tracking-tight leading-tight mt-0.5"
              >
                {exercise.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra storico esercizio"
            className="w-9 h-9 rounded-full bg-[#e6e9e8] dark:bg-[#23312b] text-[#191c1c] dark:text-[#e2e8e4] flex items-center justify-center hover:bg-[#d7e2dc] dark:hover:bg-[#2d3e37] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#84cc16]"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <p id="exercise-history-modal-desc" className="sr-only">
          Storico completamenti, record personali e progressione per {exercise.name}
        </p>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* 1. Proposta di Progressione Intelligente */}
          <div className="bg-[#f2f4f3] dark:bg-[#1f2c27] rounded-2xl p-4 border border-[#e2e8e4] dark:border-[#2f4039]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Icon name="trending_up" className="w-4 h-4 text-[#386a00] dark:text-[#84cc16]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#386a00] dark:text-[#84cc16]">
                  Proposta di Progressione
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#56615c] dark:text-[#94a39b]">
                Target: {exercise.setsReps}
              </span>
            </div>

            {proposal.canProgress && !appliedProgression ? (
              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[20px] font-extrabold text-[#191c1c] dark:text-[#f8faf9]">
                    {proposal.proposedWeightKg} kg
                  </span>
                  <span className="text-[13px] font-bold text-[#386a00] dark:text-[#84cc16]">
                    (+{proposal.deltaKg} kg {loadType === 'dumbbell' ? 'a manubrio' : ''})
                  </span>
                </div>
                <div className="text-[12px] text-[#56615c] dark:text-[#c4d1c9] space-y-1">
                  <p className="font-semibold text-[#191c1c] dark:text-[#f8faf9]">
                    {proposal.ruleName}
                  </p>
                  <p>{proposal.ruleDescription}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAcceptProgression}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[13px] font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Icon name="check" className="w-4 h-4" />
                    <span>Applica Incremento (+{proposal.deltaKg} kg)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppliedProgression(true)}
                    className="py-2.5 px-3 rounded-xl bg-white dark:bg-[#283832] text-[#56615c] dark:text-[#94a39b] hover:bg-[#e6e9e8] text-[13px] font-bold border border-[#e2e8e4] dark:border-[#384c43] transition-all cursor-pointer"
                  >
                    Mantieni attuale
                  </button>
                </div>
              </div>
            ) : appliedProgression ? (
              <div className="p-3 bg-[#84cc16]/15 rounded-xl border border-[#84cc16]/30 text-[#386a00] dark:text-[#a3e635] text-[12px] font-semibold flex items-center gap-2">
                <Icon name="check_circle" className="w-4 h-4 shrink-0" />
                <span>Progressione registrata per questa scheda di allenamento!</span>
              </div>
            ) : (
              <div className="text-[12px] text-[#56615c] dark:text-[#94a39b] space-y-1">
                <p className="font-semibold text-[#191c1c] dark:text-[#f8faf9]">
                  {proposal.ruleName}
                </p>
                <p>{proposal.ruleDescription}</p>
                <p className="text-[11px] text-[#718079] dark:text-[#85948c] mt-1">
                  Carico attuale scheda: <strong className="text-[#191c1c] dark:text-[#f8faf9]">{exercise.targetWeightKg || 0} kg</strong>
                </p>
              </div>
            )}
          </div>

          {/* 2. Record Personali (PR) con rimando alla serie generatrice */}
          <div>
            <h3 className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] tracking-wider mb-2 flex items-center gap-1.5">
              <Icon name="trophy" className="w-4 h-4 text-amber-500" />
              <span>Record Personali (PR)</span>
            </h3>

            {prs.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#f8faf9] dark:bg-[#1a2622] border border-dashed border-[#d7e2dc] dark:border-[#2f4039] text-center text-[12px] text-[#56615c] dark:text-[#94a39b]">
                Nessun record registrato finora. Completa la tua prima sessione per sbloccare i tuoi PR!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {prs.map((pr) => (
                  <div
                    key={pr.id}
                    onClick={() => handleJumpToSet(pr.sessionId)}
                    className="p-3 bg-white dark:bg-[#202d28] rounded-2xl border border-[#e2e8e4] dark:border-[#2b3a33] hover:border-[#84cc16] transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
                    title="Clicca per visualizzare la serie in storico"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#56615c] dark:text-[#94a39b] block">
                        {pr.metricLabel}
                      </span>
                      <span className="text-[18px] font-extrabold text-[#191c1c] dark:text-[#f8faf9] mt-0.5 block">
                        {pr.value}{' '}
                        <span className="text-[11px] font-normal text-[#56615c] dark:text-[#94a39b]">
                          {pr.unit}
                        </span>
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#eceeed] dark:border-[#2b3a33] flex items-center justify-between text-[10px] text-[#386a00] dark:text-[#84cc16] font-semibold">
                      <span>
                        {pr.setNum ? `Serie ${pr.setNum} · ` : ''}
                        {pr.date}
                      </span>
                      <Icon name="arrow_forward" className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Stima Massimale Teorico (1RM) */}
          <div className="bg-[#f8faf9] dark:bg-[#1a2622] p-4 rounded-2xl border border-[#e2e8e4] dark:border-[#2b3a33] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] tracking-wider flex items-center gap-1.5">
                <Icon name="calculate" className="w-4 h-4 text-[#84cc16]" />
                <span>Stima Massimale (1RM)</span>
              </span>
              <span className="text-[10px] font-bold text-[#84cc16] uppercase bg-[#84cc16]/10 px-2 py-0.5 rounded-full">
                Formula Epley
              </span>
            </div>

            {best1RMResult && best1RMResult.isApplicable && bestSet ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-extrabold text-[#191c1c] dark:text-[#f8faf9]">
                    {best1RMResult.estimated1RM} kg
                  </span>
                  <span className="text-[11px] text-[#56615c] dark:text-[#94a39b]">
                    {best1RMResult.isExactMeasurement ? '(Misura reale)' : '(Stima teorica)'}
                  </span>
                </div>
                <p className="text-[11px] text-[#56615c] dark:text-[#94a39b] mt-1">
                  Calcolato dalla tua migliore serie: <strong>{bestSet.weightKg} kg × {bestSet.reps} reps</strong> (del {bestSet.date}).
                </p>
                <p className="text-[10px] text-[#718079] dark:text-[#85948c] mt-0.5">
                  Formula: {best1RMResult.formulaName}
                </p>
              </div>
            ) : (
              <div className="text-[11px] text-[#56615c] dark:text-[#94a39b] space-y-1">
                <p>Nessuna serie compatibile per la stima del massimale.</p>
                <p className="text-[10px] text-[#718079] dark:text-[#85948c]">
                  Nota: la formula Epley si applica esclusivamente a carichi maggiori di 0 kg eseguiti nel range 1–12 ripetizioni. Per serie ad alte ripetizioni (&gt; 12) o a corpo libero puro senza carico la stima è esclusa per mancanza di validità scientifica.
                </p>
              </div>
            )}
          </div>

          {/* 4. Cronologia Datata Sessioni Completate */}
          <div>
            <h3 className="text-[12px] uppercase font-bold text-[#56615c] dark:text-[#94a39b] tracking-wider mb-2 flex items-center gap-1.5">
              <Icon name="history" className="w-4 h-4 text-[#56615c]" />
              <span>Storico Allenamenti Completati</span>
            </h3>

            {pastSessions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#f8faf9] dark:bg-[#1a2622] border border-[#e2e8e4] dark:border-[#2b3a33] text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-[#f2f4f3] dark:bg-[#25352e] flex items-center justify-center mx-auto text-[#56615c] dark:text-[#94a39b]">
                  <Icon name="event_busy" className="w-5 h-5" />
                </div>
                <p className="text-[13px] font-bold text-[#191c1c] dark:text-[#f8faf9]">
                  Nessuna sessione precedente registrata
                </p>
                <p className="text-[11px] text-[#56615c] dark:text-[#94a39b] max-w-xs mx-auto">
                  Le serie registrate durante l'allenamento live compariranno qui con pesi, ripetizioni, RPE e volume.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastSessions.map(({ session, exerciseLog }) => {
                  const isHighlighted = highlightedSessionId === session.id;
                  const sessionTotalVol = exerciseLog.sets
                    .filter((s) => s.isCompleted)
                    .reduce((sum, s) => sum + calculateSetVolume(s.weightKg, s.reps, exerciseLog.loadType), 0);

                  return (
                    <div
                      key={session.id}
                      id={`session-card-${session.id}`}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isHighlighted
                          ? 'bg-[#84cc16]/10 border-[#84cc16] ring-2 ring-[#84cc16]/30'
                          : 'bg-white dark:bg-[#202d28] border-[#e2e8e4] dark:border-[#2b3a33]'
                      }`}
                    >
                      {/* Session Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eceeed] dark:border-[#2b3a33]">
                        <div>
                          <span className="text-[13px] font-bold text-[#191c1c] dark:text-[#f8faf9]">
                            {session.date}
                          </span>
                          <span className="text-[11px] text-[#56615c] dark:text-[#94a39b] block">
                            {session.routineTitle}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#386a00] dark:text-[#84cc16] bg-[#84cc16]/15 px-2.5 py-0.5 rounded-full">
                          Vol: {sessionTotalVol} kg
                        </span>
                      </div>

                      {/* Sets Table */}
                      <div className="space-y-1.5">
                        {exerciseLog.sets.map((set) => {
                          const setVol = calculateSetVolume(set.weightKg, set.reps, exerciseLog.loadType);
                          return (
                            <div
                              key={set.setId}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[12px] ${
                                set.isCompleted
                                  ? 'bg-[#f8faf9] dark:bg-[#18231f] text-[#191c1c] dark:text-[#f8faf9]'
                                  : 'bg-red-50/50 dark:bg-red-950/20 text-[#85948c] line-through'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-lg bg-[#e6e9e8] dark:bg-[#2b3a33] text-[10px] font-bold flex items-center justify-center">
                                  {set.setNum}
                                </span>
                                <span className="font-bold">
                                  {set.weightKg} kg {loadType === 'dumbbell' ? '(a manubrio)' : ''} × {set.reps} reps
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {set.rpe && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                                    RPE {set.rpe}
                                  </span>
                                )}
                                <span className="text-[11px] text-[#56615c] dark:text-[#94a39b] font-medium">
                                  {setVol} kg
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#eceeed] dark:border-[#2b3a33] bg-[#f8faf9] dark:bg-[#151e1b] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#f2f4f3] dark:bg-[#23312b] hover:bg-[#e6e9e8] text-[#191c1c] dark:text-[#e2e8e4] text-[13px] font-bold transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
