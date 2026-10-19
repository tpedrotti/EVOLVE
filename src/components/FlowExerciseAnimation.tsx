import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icons';
import {
  FLOW_EXERCISE_MAPPINGS,
  type FlowExerciseInfo,
} from '../data/flowExerciseMapping';
import { ExerciseMotionGraphic } from './ExerciseMotionGraphic';
import { getExerciseGuide, type ExerciseGuide } from '../data/exerciseGuides';

interface FlowExerciseAnimationProps {
  exerciseId?: string;
  exerciseName: string;
  muscleGroup?: string;
  className?: string;
  compact?: boolean;
}

// Fixed execution animation speed (0.3x slow motion, locked for optimal study of form)
const FIXED_ANIMATION_SPEED = 0.3;

// Italian translations for equipment and target muscles
const EQUIPMENT_LABELS_IT: Record<string, string> = {
  'leverage machine': 'Macchinario a leva',
  'dumbbell': 'Manubri',
  'cable': 'Cavi',
  'body weight': 'Corpo libero',
  'barbell': 'Bilanciere',
  'sled machine': 'Pressa',
  'smith machine': 'Multipower',
};

const TARGET_MUSCLE_LABELS_IT: Record<string, string> = {
  'pectorals': 'Pettorali',
  'triceps': 'Tricipiti',
  'forearms': 'Avambracci',
  'lats': 'Dorsali',
  'upper back': 'Dorso superiore',
  'delts': 'Deltoidi',
  'shoulders': 'Spalle',
  'spine': 'Lombari',
  'biceps': 'Bicipiti',
  'glutes': 'Glutei',
  'hamstrings': 'Femorali',
  'quads': 'Quadricipiti',
  'calves': 'Polpacci',
  'abs': 'Addominali',
};

function formatEquipmentIt(eq?: string): string {
  if (!eq) return 'Esercizio';
  const lower = eq.toLowerCase().trim();
  return EQUIPMENT_LABELS_IT[lower] || eq;
}

function formatTargetMuscleIt(tm?: string): string {
  if (!tm) return 'Muscoli coinvolti';
  const lower = tm.toLowerCase().trim();
  return TARGET_MUSCLE_LABELS_IT[lower] || tm;
}

// Alternative variations available locally for specific exercises
const ALTERNATIVE_FLOW_EXERCISES: Record<string, { id: string; label: string; frames: string[]; frameDurationMs: number }> = {
  // ex-105: Triceps overhead extension
  'ex-105': {
    id: '0194',
    label: 'Cavo con corda (0194)',
    frames: [
      '/exercises/0194/frame-00.svg',
      '/exercises/0194/frame-01.svg',
      '/exercises/0194/frame-02.svg',
    ],
    frameDurationMs: 320,
  },
  // ex-4: Lateral raise
  'ex-4': {
    id: '0178',
    label: 'Ai cavi (0178)',
    frames: [
      '/exercises/0178/frame-00.svg',
      '/exercises/0178/frame-01.svg',
      '/exercises/0178/frame-02.svg',
    ],
    frameDurationMs: 300,
  },
};

export const FlowExerciseAnimation: React.FC<FlowExerciseAnimationProps> = ({
  exerciseId,
  exerciseName,
  muscleGroup = '',
  className = '',
  compact = false,
}) => {
  // Find matched exercise in Flow mapping
  const baseExercise: FlowExerciseInfo | undefined = useMemo(() => {
    if (exerciseId && FLOW_EXERCISE_MAPPINGS[exerciseId]) {
      return FLOW_EXERCISE_MAPPINGS[exerciseId];
    }
    // Search by normalized name
    const norm = exerciseName.trim().toLowerCase();
    const entry = Object.values(FLOW_EXERCISE_MAPPINGS).find((m) => {
      const mNorm = m.routineExerciseName.toLowerCase();
      return mNorm === norm || norm.includes(mNorm) || mNorm.includes(norm);
    });
    return entry;
  }, [exerciseId, exerciseName]);

  // Exercise technical guide in Italian
  const exerciseGuide: ExerciseGuide = useMemo(() => {
    return getExerciseGuide(exerciseName, muscleGroup || baseExercise?.bodyPart);
  }, [exerciseName, muscleGroup, baseExercise]);

  // State for variation (for flagged exercises like ex-105 or ex-4)
  const hasAlternative = !!(exerciseId && ALTERNATIVE_FLOW_EXERCISES[exerciseId]);
  const [selectedVariation, setSelectedVariation] = useState<'primary' | 'alt'>('primary');

  // Playback state (locked at 0.3x fixed speed)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [seqIndex, setSeqIndex] = useState<number>(0);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Active frames and timing
  const activeFrames = useMemo(() => {
    if (!baseExercise) return [];
    if (selectedVariation === 'alt' && exerciseId && ALTERNATIVE_FLOW_EXERCISES[exerciseId]) {
      return ALTERNATIVE_FLOW_EXERCISES[exerciseId].frames;
    }
    return baseExercise.frames;
  }, [baseExercise, selectedVariation, exerciseId]);

  const activeDuration = useMemo(() => {
    if (selectedVariation === 'alt' && exerciseId && ALTERNATIVE_FLOW_EXERCISES[exerciseId]) {
      return ALTERNATIVE_FLOW_EXERCISES[exerciseId].frameDurationMs;
    }
    return baseExercise?.frameDurationMs || 320;
  }, [baseExercise, selectedVariation, exerciseId]);

  const sequence = useMemo(() => {
    return baseExercise?.sequence || [0, 1, 2, 1];
  }, [baseExercise]);

  // Preload all SVG images into memory to avoid any flickering or HTTP delay during loop
  useEffect(() => {
    if (activeFrames.length === 0) return;
    setImageError(false);
    activeFrames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [activeFrames]);

  // Loop timer using sequence and duration locked at 0.3x speed
  useEffect(() => {
    if (!isPlaying || activeFrames.length === 0) return;

    const intervalMs = Math.round(activeDuration / FIXED_ANIMATION_SPEED);
    const timer = setInterval(() => {
      setSeqIndex((prev) => (prev + 1) % sequence.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, activeDuration, sequence.length, activeFrames.length]);

  // If no Flow exercise mapping was found or image error, fallback gracefully
  if (!baseExercise || imageError) {
    return (
      <div className="w-full flex flex-col space-y-2">
        <ExerciseMotionGraphic
          exerciseName={exerciseName}
          muscleGroup={muscleGroup || baseExercise?.bodyPart}
          className={className}
          compact={compact}
        />
      </div>
    );
  }

  const currentFrameIdx = sequence[seqIndex] ?? 0;
  const currentFrameSrc = activeFrames[currentFrameIdx] || activeFrames[0];

  return (
    <div
      className={`relative w-full rounded-2xl bg-[#0b1210] text-white border border-[#232f2b] shadow-xl overflow-hidden flex flex-col transition-all ${className}`}
      style={{ minHeight: compact ? '220px' : '270px' }}
    >
      {/* ── TOP CONTROL BAR ─────────────────────────────────────── */}
      <div className="relative z-20 px-3.5 pt-2.5 pb-2 flex items-center justify-between text-[11px] gap-2 border-b border-[#182521]">
        {/* Left: Variation selector if available, otherwise empty for clean aesthetic */}
        <div className="flex items-center gap-1.5 min-w-0">
          {hasAlternative && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#94a39b] hidden xs:inline">Variante:</span>
              <button
                type="button"
                onClick={() => setSelectedVariation('primary')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  selectedVariation === 'primary'
                    ? 'bg-[#84cc16] text-[#102000]'
                    : 'bg-[#1c2c26] text-[#94a39b] hover:text-white'
                }`}
              >
                {exerciseId === 'ex-105' ? 'Macchina (0607)' : 'Manubri (0334)'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedVariation('alt')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  selectedVariation === 'alt'
                    ? 'bg-[#84cc16] text-[#102000]'
                    : 'bg-[#1c2c26] text-[#94a39b] hover:text-white'
                }`}
              >
                {ALTERNATIVE_FLOW_EXERCISES[exerciseId!].label}
              </button>
            </div>
          )}
        </div>

        {/* Right: Essential controls only (Play/Pause, Guida in Italiano) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="w-7 h-7 rounded-lg bg-[#16231f] hover:bg-[#20312b] border border-[#232f2b] flex items-center justify-center text-[#d9f99d] cursor-pointer transition-colors"
            title={isPlaying ? 'Pausa animazione' : 'Riproduci animazione'}
            aria-label={isPlaying ? 'Pausa animazione' : 'Riproduci animazione'}
          >
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="w-4 h-4" />
          </button>

          {/* Guida Tecnica Toggle */}
          <button
            type="button"
            onClick={() => setShowInstructions((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-bold border transition-colors cursor-pointer ${
              showInstructions
                ? 'bg-[#84cc16] text-[#102000] border-[#84cc16]'
                : 'bg-[#16231f] hover:bg-[#20312b] text-[#d9f99d] border-[#232f2b]'
            }`}
            title="Mostra la guida tecnica dell'esercizio"
            aria-label="Mostra la guida tecnica dell'esercizio"
          >
            <Icon name="info" className="w-3.5 h-3.5" />
            <span>Guida</span>
          </button>
        </div>
      </div>

      {/* ── VECTOR ANIMATION CANVAS ─────────────────────────────────── */}
      <div className="relative flex-1 w-full flex items-center justify-center p-3 overflow-hidden select-none min-h-[170px]">
        {/* Subtle radial lime gradient & background athletic grid */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.09)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#84cc16_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* The Looped SVG Frame */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <img
            key={currentFrameSrc}
            src={currentFrameSrc}
            alt={`${baseExercise.routineExerciseName} - frame ${currentFrameIdx}`}
            className="w-auto max-h-[190px] max-w-[92%] object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] transition-opacity duration-100"
            onError={() => setImageError(true)}
          />
        </div>

        {/* Keyframe step dots (3 frames) at bottom center */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0b1210]/80 border border-[#232f2b] backdrop-blur-sm">
          {[0, 1, 2].map((frameIdx) => {
            const isActive = currentFrameIdx === frameIdx;
            return (
              <span
                key={frameIdx}
                className={`transition-all duration-200 rounded-full ${
                  isActive
                    ? 'w-4 h-1.5 bg-[#84cc16] shadow-[0_0_6px_#84cc16]'
                    : 'w-1.5 h-1.5 bg-[#2a3c35]'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM INFO BAR IN ITALIAN ──────────────────────────────── */}
      <div className="relative z-20 px-3.5 py-2 bg-[#0e1714] border-t border-[#182521] flex items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-[10px] uppercase font-bold text-[#84cc16] tracking-wider shrink-0">
            {formatEquipmentIt(baseExercise.equipment)}
          </span>
          <span className="text-[#3a4d45]">•</span>
          <span className="text-[10px] text-[#94a39b] font-medium truncate">
            Target: <strong className="text-white font-semibold">{formatTargetMuscleIt(baseExercise.targetMuscle)}</strong>
          </span>
        </div>
      </div>

      {/* ── EXPANDABLE INSTRUCTIONS OVERLAY (100% IN ITALIANO) ─────────────────────────── */}
      {showInstructions && (
        <div className="absolute inset-0 z-30 bg-[#0b1210]/95 backdrop-blur-md p-4 overflow-y-auto flex flex-col justify-between animate-in fade-in duration-150">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#232f2b] pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon name="fitness_center" className="w-4 h-4 text-[#84cc16] shrink-0" />
                <h4 className="text-[13px] font-bold text-white truncate">
                  Guida all'Esecuzione: {baseExercise.routineExerciseName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="w-6 h-6 rounded-full bg-[#1b2622] text-[#94a39b] hover:text-white flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Chiudi guida"
              >
                <Icon name="close" className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scheda Muscolo & Attrezzatura in Italiano */}
            <div className="p-2.5 rounded-xl bg-[#141e1a] border border-[#232f2b] flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[#8c9992] text-[10px] uppercase font-bold block">Muscolo Target</span>
                <span className="font-bold text-[#84cc16]">
                  {formatTargetMuscleIt(baseExercise.targetMuscle)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#8c9992] text-[10px] uppercase font-bold block">Attrezzatura</span>
                <span className="font-bold text-white">
                  {formatEquipmentIt(baseExercise.equipment)}
                </span>
              </div>
            </div>

            {/* Istruzioni Passo per Passo in Italiano */}
            {baseExercise.instructions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#84cc16] block">
                  Istruzioni di Movimento
                </span>
                <ol className="space-y-1.5 text-[12px] text-[#d1dad5] list-inside leading-relaxed">
                  {baseExercise.instructions.map((step, idx) => (
                    <li key={idx} className="pl-0.5">
                      <span className="text-[#84cc16] font-semibold">Passo {idx + 1}:</span> {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Dettagli Tecnici Aggiuntivi da ExerciseGuide (Cadenza & Respirazione) */}
            {exerciseGuide && (
              <div className="pt-2 border-t border-[#232f2b] space-y-1.5">
                {exerciseGuide.tempoDescription && (
                  <div className="p-2 rounded-lg bg-[#182521] text-[11px] text-[#d9f99d] flex items-center gap-1.5">
                    <Icon name="timer" className="w-3.5 h-3.5 text-[#84cc16] shrink-0" />
                    <span><strong>Cadenza:</strong> {exerciseGuide.tempoDescription}</span>
                  </div>
                )}
                {exerciseGuide.breathing && (
                  <div className="p-2 rounded-lg bg-[#182521] text-[11px] text-[#a3e635] flex items-center gap-1.5">
                    <Icon name="vital_signs" className="w-3.5 h-3.5 text-[#84cc16] shrink-0" />
                    <span><strong>Respirazione:</strong> {exerciseGuide.breathing}</span>
                  </div>
                )}
              </div>
            )}

            {baseExercise.reviewNote && (
              <div className="p-2 rounded-xl bg-[#182521] border border-[#2a3c35] text-[11px] text-[#a3e635]">
                <strong className="block text-white mb-0.5">Nota tecnica:</strong>
                {baseExercise.reviewNote}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowInstructions(false)}
            className="mt-4 w-full py-2.5 rounded-xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[12px] font-bold transition-colors cursor-pointer shrink-0"
          >
            Chiudi Guida
          </button>
        </div>
      )}
    </div>
  );
};
