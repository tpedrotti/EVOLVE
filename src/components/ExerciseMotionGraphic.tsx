import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { getExerciseGuide, type ExerciseGuide } from '../data/exerciseGuides';

interface ExerciseMotionGraphicProps {
  exerciseName: string;
  muscleGroup?: string;
  className?: string;
  compact?: boolean;
}

export const ExerciseMotionGraphic: React.FC<ExerciseMotionGraphicProps> = ({
  exerciseName,
  muscleGroup = '',
  className = '',
  compact = false,
}) => {
  const guide: ExerciseGuide = getExerciseGuide(exerciseName, muscleGroup);

  // Playback & Interaction States
  const [isPlaying, setIsPlaying] = useState(true);
  const speed = 0.3; // Velocità animazioni fissa a 0.3x
  const [showGuideTips, setShowGuideTips] = useState(false);
  const [contractionPhase, setContractionPhase] = useState<'concentrica' | 'eccentrica'>('concentrica');

  // Cycle contraction phase indicator dynamically in sync with movement
  useEffect(() => {
    if (!isPlaying) return;
    const cycleMs = (2400 / speed) / 2; // half cycle for concentric, half for eccentric
    const interval = setInterval(() => {
      setContractionPhase((prev) => (prev === 'concentrica' ? 'eccentrica' : 'concentrica'));
    }, cycleMs);
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  // Duration in seconds adjusted for speed
  const durSec = (2.4 / speed).toFixed(2);
  const playState = isPlaying ? 'running' : 'paused';

  const category = guide.category;

  return (
    <div
      className={`relative w-full rounded-2xl bg-[#0f1715] text-white border border-[#232f2b] overflow-hidden flex flex-col shadow-lg transition-all ${className}`}
      style={{ minHeight: compact ? '210px' : '260px' }}
    >
      {/* ── TOP CONTROLS & STATUS BAR ─────────────────────────────────── */}
      <div className="relative z-20 px-3.5 pt-3 pb-1 flex items-center justify-end text-[11px] gap-2">
        {/* Playback Tools */}
        <div className="flex items-center gap-1.5">
          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="w-6 h-6 rounded-lg bg-[#1e2b27] hover:bg-[#283933] border border-[#2a3832] flex items-center justify-center text-[#d9f99d] cursor-pointer transition-colors"
            title={isPlaying ? 'Pausa animazione' : 'Riproduci animazione'}
          >
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} className="w-3.5 h-3.5" />
          </button>

          {/* Form Tips Info Toggle */}
          <button
            type="button"
            onClick={() => setShowGuideTips((prev) => !prev)}
            className={`px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-bold border transition-colors cursor-pointer ${
              showGuideTips
                ? 'bg-[#84cc16] text-[#102000] border-[#84cc16]'
                : 'bg-[#1e2b27] hover:bg-[#283933] text-[#d9f99d] border-[#2a3832]'
            }`}
            title="Mostra consigli di postura e tecnica"
          >
            <Icon name="fitness_center" className="w-3 h-3" />
            <span>Guida</span>
          </button>
        </div>
      </div>

      {/* ── KINETIC STAGE (ANIMATED SVG ATHLETIC VECTOR) ─────────────── */}
      <div className="relative flex-1 w-full flex items-center justify-center py-2 px-4 overflow-hidden select-none">
        {/* Subtle Background Gym Grid Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#84cc16_1px,transparent_1px)] [background-size:18px_18px]" />

        {/* 1. CHEST PRESS (Flat bench / machine press) */}
        {category === 'chest_press' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Padded Gym Bench & Base */}
            <rect x="40" y="106" width="160" height="10" rx="3" fill="#253530" stroke="#374d45" strokeWidth="1" />
            <rect x="65" y="116" width="12" height="28" rx="2" fill="#1b2622" />
            <rect x="165" y="116" width="12" height="28" rx="2" fill="#1b2622" />
            <line x1="50" y1="144" x2="190" y2="144" stroke="#253530" strokeWidth="3" />

            {/* Athlete Anatomical Torso & Head */}
            <circle cx="68" cy="98" r="9" fill="#94a39b" />
            <path d="M78,98 L160,98 L155,106 L78,106 Z" fill="#94a39b" />
            {/* Legs resting bent */}
            <path d="M155,102 L172,118 L170,144" stroke="#94a39b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Target Muscle: Pectoralis Major Glowing Pulse */}
            <ellipse cx="112" cy="98" rx="18" ry="6" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
              <animate attributeName="rx" values="16;22;16" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Barbell & Arms moving vertically (Concentric up / Eccentric down) */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,42; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              {/* Olympic Barbell */}
              <rect x="25" y="44" width="190" height="5" rx="2" fill="#d9f99d" stroke="#84cc16" strokeWidth="1" />
              {/* Olympic Bumper Plates Left */}
              <rect x="42" y="28" width="8" height="38" rx="3" fill="#84cc16" />
              <rect x="32" y="32" width="7" height="30" rx="2" fill="#4d7c0f" />
              {/* Olympic Bumper Plates Right */}
              <rect x="190" y="28" width="8" height="38" rx="3" fill="#84cc16" />
              <rect x="201" y="32" width="7" height="30" rx="2" fill="#4d7c0f" />
              {/* Hands & Forearms */}
              <circle cx="95" cy="46" r="6" fill="#416900" />
              <circle cx="145" cy="46" r="6" fill="#416900" />
              {/* Dynamic trajectory line */}
              <line x1="120" y1="46" x2="120" y2="88" stroke="#84cc16" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            </g>
          </svg>
        )}

        {/* 2. INCLINE BENCH (30° Incline Dumbbell Press) */}
        {category === 'incline_bench' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* 30° Incline Bench Structure */}
            <line x1="50" y1="125" x2="140" y2="70" stroke="#253530" strokeWidth="12" strokeLinecap="round" />
            <rect x="45" y="125" width="30" height="8" rx="2" fill="#374d45" />
            <line x1="70" y1="133" x2="70" y2="144" stroke="#1b2622" strokeWidth="6" />
            <line x1="120" y1="110" x2="120" y2="144" stroke="#1b2622" strokeWidth="6" />

            {/* Athlete sitting inclined */}
            <circle cx="132" cy="62" r="9" fill="#94a39b" />
            <line x1="65" y1="125" x2="125" y2="75" stroke="#94a39b" strokeWidth="9" strokeLinecap="round" />
            {/* Upper Chest / Clavicular Pec Glow */}
            <ellipse cx="115" cy="78" rx="14" ry="7" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Twin Dumbbells pressing up along 30° axis */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -10,32; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              {/* Left Dumbbell */}
              <rect x="85" y="35" width="22" height="6" rx="2" fill="#56615c" />
              <rect x="80" y="27" width="7" height="22" rx="2" fill="#84cc16" />
              <rect x="103" y="27" width="7" height="22" rx="2" fill="#84cc16" />
              {/* Right Dumbbell */}
              <rect x="125" y="35" width="22" height="6" rx="2" fill="#56615c" />
              <rect x="120" y="27" width="7" height="22" rx="2" fill="#84cc16" />
              <rect x="143" y="27" width="7" height="22" rx="2" fill="#84cc16" />
            </g>
          </svg>
        )}

        {/* 3. PEC DECK / CHEST FLY (Seated Machine Fly) */}
        {category === 'pec_deck' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Seat & Back Support */}
            <rect x="110" y="40" width="20" height="90" rx="4" fill="#253530" />
            <rect x="95" y="120" width="50" height="10" rx="3" fill="#374d45" />
            {/* Head & Torso */}
            <circle cx="120" cy="50" r="9" fill="#94a39b" />
            <rect x="112" y="62" width="16" height="50" rx="4" fill="#94a39b" />
            {/* Sternal Pec Squeeze Glow */}
            <ellipse cx="120" cy="78" rx="10" ry="12" fill="#84cc16">
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Left Arm & Lever swinging inward */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 65 80; 35 65 80; 0 65 80"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <path d="M65,80 Q85,75 110,80" stroke="#84cc16" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="60" y="65" width="8" height="30" rx="3" fill="#4d7c0f" />
            </g>

            {/* Right Arm & Lever swinging inward */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 175 80; -35 175 80; 0 175 80"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <path d="M175,80 Q155,75 130,80" stroke="#84cc16" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="172" y="65" width="8" height="30" rx="3" fill="#4d7c0f" />
            </g>
          </svg>
        )}

        {/* 4. LAT MACHINE / PULL-UP (Vertical Pull-down) */}
        {category === 'lat_machine' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Overhead High Pulley Frame */}
            <line x1="40" y1="18" x2="200" y2="18" stroke="#374d45" strokeWidth="6" strokeLinecap="round" />
            <circle cx="120" cy="18" r="7" fill="#84cc16" />
            {/* Seated Lifter with Thigh Pad */}
            <rect x="100" y="100" width="40" height="10" rx="2" fill="#253530" />
            <rect x="90" y="85" width="60" height="6" rx="2" fill="#4d7c0f" />
            <circle cx="120" cy="62" r="9" fill="#94a39b" />
            <path d="M108,74 L132,74 L128,120 L112,120 Z" fill="#94a39b" />

            {/* Latissimus Dorsi Wing Expansion Glow */}
            <path d="M102,76 Q120,70 138,76 L130,105 L110,105 Z" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </path>

            {/* Wide Lat Bar Pulled Down to Clavicle */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,46; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="50" y1="28" x2="190" y2="28" stroke="#d9f99d" strokeWidth="5" strokeLinecap="round" />
              <line x1="120" y1="18" x2="120" y2="28" stroke="#84cc16" strokeWidth="2.5" />
              {/* Hands on bar */}
              <circle cx="65" cy="28" r="5" fill="#416900" />
              <circle cx="175" cy="28" r="5" fill="#416900" />
            </g>
          </svg>
        )}

        {/* 5. MACHINE ROW / CHEST-SUPPORTED ROW */}
        {category === 'machine_row' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Chest Support Pad & Frame */}
            <rect x="110" y="45" width="14" height="65" rx="3" fill="#374d45" transform="rotate(-15 110 45)" />
            <rect x="80" y="115" width="40" height="10" rx="2" fill="#253530" />
            {/* Lifter leaning on pad */}
            <circle cx="95" cy="50" r="9" fill="#94a39b" />
            <path d="M90,62 L112,58 L105,115 L88,115 Z" fill="#94a39b" />
            {/* Rhomboids & Mid-Back Glow */}
            <ellipse cx="88" cy="72" rx="10" ry="14" fill="#84cc16">
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Row Handles moving back and forward */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -32,5; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <path d="M140,75 L115,75" stroke="#d9f99d" strokeWidth="5" strokeLinecap="round" />
              <circle cx="115" cy="75" r="6" fill="#84cc16" />
            </g>
          </svg>
        )}

        {/* 6. PULLEY BASSO (Seated Cable Row) */}
        {category === 'pulley' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Low Cable Pulley Station */}
            <rect x="25" y="80" width="16" height="50" rx="3" fill="#253530" />
            <circle cx="33" cy="95" r="7" fill="#84cc16" />
            {/* Bench & Footplate */}
            <rect x="70" y="115" width="110" height="10" rx="2" fill="#374d45" />
            <rect x="52" y="98" width="6" height="24" rx="2" fill="#84cc16" />
            {/* Lifter Seated */}
            <circle cx="145" cy="65" r="9" fill="#94a39b" />
            <path d="M138,76 L152,76 L148,115 L135,115 Z" fill="#94a39b" />
            {/* Low Lat & Spine Squeeze */}
            <ellipse cx="140" cy="88" rx="8" ry="12" fill="#84cc16">
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Cable Wire & V-Handle Pulling to Navel */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 34,0; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="33" y1="95" x2="105" y2="92" stroke="#84cc16" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="106" cy="92" r="5" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 7. REVERSE PEC DECK (Rear Delts Fly) */}
        {category === 'reverse_pec_deck' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Machine Chest Pad */}
            <rect x="115" y="45" width="10" height="85" rx="3" fill="#253530" />
            {/* Lifter Facing Pad */}
            <circle cx="120" cy="50" r="9" fill="#94a39b" />
            <rect x="114" y="62" width="12" height="55" rx="3" fill="#94a39b" />

            {/* Posterior Deltoid Highlight */}
            <circle cx="108" cy="70" r="6" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </circle>
            <circle cx="132" cy="70" r="6" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </circle>

            {/* Arms Opening Backward */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 108 72; -35 108 72; 0 108 72"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="108" y1="72" x2="65" y2="72" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
            </g>
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 132 72; 35 132 72; 0 132 72"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="132" y1="72" x2="175" y2="72" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
        )}

        {/* 8. HYPEREXTENSION (45° Roman Chair Back Extension) */}
        {category === 'hyperextension' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* 45° Roman Chair Stand */}
            <line x1="60" y1="135" x2="120" y2="85" stroke="#253530" strokeWidth="12" strokeLinecap="round" />
            <rect x="50" y="130" width="35" height="8" rx="2" fill="#374d45" />
            <circle cx="120" cy="85" r="9" fill="#4d7c0f" />
            {/* Legs anchored */}
            <line x1="75" y1="130" x2="120" y2="85" stroke="#94a39b" strokeWidth="8" strokeLinecap="round" />

            {/* Torso hinging down and extending up */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 120 85; 50 120 85; 0 120 85"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="120" y1="85" x2="165" y2="50" stroke="#94a39b" strokeWidth="9" strokeLinecap="round" />
              <circle cx="172" cy="45" r="8" fill="#94a39b" />
              {/* Glute & Lower Back Glow */}
              <ellipse cx="125" cy="82" rx="9" ry="7" fill="#84cc16">
                <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
              </ellipse>
            </g>
          </svg>
        )}

        {/* 9. SHOULDER PRESS / MILITARY (Overhead Press) */}
        {category === 'shoulder_press' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Seated Rig */}
            <rect x="110" y="55" width="20" height="80" rx="3" fill="#253530" />
            <circle cx="120" cy="62" r="9" fill="#94a39b" />
            <rect x="112" y="74" width="16" height="50" rx="3" fill="#94a39b" />

            {/* Anterior & Lateral Deltoid Glow */}
            <ellipse cx="102" cy="76" rx="8" ry="6" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="138" cy="76" rx="8" ry="6" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Handles pressing overhead */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,38; 0,-5; 0,38"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              {/* Left Handle & Dumbbell */}
              <rect x="75" y="32" width="16" height="5" rx="2" fill="#56615c" />
              <rect x="70" y="24" width="6" height="20" rx="2" fill="#84cc16" />
              <rect x="90" y="24" width="6" height="20" rx="2" fill="#84cc16" />
              {/* Right Handle & Dumbbell */}
              <rect x="149" y="32" width="16" height="5" rx="2" fill="#56615c" />
              <rect x="144" y="24" width="6" height="20" rx="2" fill="#84cc16" />
              <rect x="164" y="24" width="6" height="20" rx="2" fill="#84cc16" />
            </g>
          </svg>
        )}

        {/* 10. LATERAL RAISE (Alzate Laterali) */}
        {category === 'lateral_raise' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Standing Athlete */}
            <circle cx="120" cy="46" r="9" fill="#94a39b" />
            <path d="M110,60 L130,60 L126,120 L114,120 Z" fill="#94a39b" />
            {/* Lateral Head Shoulder Glow */}
            <ellipse cx="106" cy="62" rx="7" ry="5" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="134" cy="62" rx="7" ry="5" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Left Arm Abducting to 90° */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 108 62; -55 108 62; 0 108 62"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="108" y1="62" x2="62" y2="82" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="60" cy="84" r="6" fill="#d9f99d" />
            </g>

            {/* Right Arm Abducting to 90° */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 132 62; 55 132 62; 0 132 62"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="132" y1="62" x2="178" y2="82" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="180" cy="84" r="6" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 11. BICEP CURL (Incline / Cable Bicep Curl) */}
        {category === 'bicep_curl' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Incline Bench */}
            <line x1="75" y1="125" x2="125" y2="60" stroke="#253530" strokeWidth="12" strokeLinecap="round" />
            <circle cx="120" cy="50" r="9" fill="#94a39b" />
            <line x1="85" y1="125" x2="115" y2="65" stroke="#94a39b" strokeWidth="8" strokeLinecap="round" />

            {/* Upper Arm Hanging Vertical */}
            <line x1="112" y1="68" x2="114" y2="96" stroke="#94a39b" strokeWidth="6" strokeLinecap="round" />

            {/* Bicep Peak Contraction Squeeze Bulb */}
            <circle cx="111" cy="84" r="7" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="5;8;5" dur={`${durSec}s`} repeatCount="indefinite" />
            </circle>

            {/* Forearm Curling Upwards to Shoulder */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 114 96; -110 114 96; 0 114 96"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="114" y1="96" x2="116" y2="132" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="116" cy="133" r="6" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 12. REVERSE CURL / HAMMER CURL */}
        {category === 'reverse_curl' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            <circle cx="100" cy="46" r="9" fill="#94a39b" />
            <path d="M92,58 L108,58 L104,118 L94,118 Z" fill="#94a39b" />
            {/* Brachioradialis Forearm Outer Glow */}
            <ellipse cx="108" cy="85" rx="5" ry="9" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Arm Curling with Cable Rope / EZ Bar */}
            <line x1="104" y1="62" x2="106" y2="88" stroke="#94a39b" strokeWidth="5" strokeLinecap="round" />
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 106 88; -85 106 88; 0 106 88"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="106" y1="88" x2="108" y2="120" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="108" cy="120" r="6" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 13. TRICEP PUSHDOWN */}
        {category === 'tricep_pushdown' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Cable Pulley Top */}
            <line x1="120" y1="10" x2="120" y2="35" stroke="#374d45" strokeWidth="4" />
            <circle cx="120" cy="18" r="6" fill="#84cc16" />
            {/* Athlete slightly leaned */}
            <circle cx="85" cy="46" r="9" fill="#94a39b" />
            <path d="M78,58 L96,56 L90,120 L78,120 Z" fill="#94a39b" />
            {/* Upper Arm Locked at Side */}
            <line x1="88" y1="62" x2="104" y2="78" stroke="#94a39b" strokeWidth="6" strokeLinecap="round" />
            {/* Tricep Lateral Head Highlight */}
            <ellipse cx="94" cy="70" rx="5" ry="8" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Forearm Pivoting Downwards to Full Lockout */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 104 78; 55 104 78; 0 104 78"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="104" y1="78" x2="126" y2="82" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="128" cy="82" r="5" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 14. TRICEP OVERHEAD EXTENSION */}
        {category === 'tricep_overhead' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Seated Backrest */}
            <rect x="90" y="55" width="12" height="75" rx="2" fill="#253530" />
            <circle cx="106" cy="55" r="9" fill="#94a39b" />
            <rect x="100" y="66" width="14" height="50" rx="2" fill="#94a39b" />
            {/* Upper Arms Pointed Overhead */}
            <line x1="108" y1="70" x2="114" y2="40" stroke="#94a39b" strokeWidth="6" strokeLinecap="round" />
            {/* Triceps Long Head Stretch Glow */}
            <ellipse cx="110" cy="52" rx="5" ry="9" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Forearms extending up from behind neck */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 114 40; -75 114 40; 0 114 40"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="114" y1="40" x2="114" y2="70" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="114" cy="70" r="5" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 15. WRIST CURL */}
        {category === 'wrist_curl' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Bench Pad */}
            <rect x="50" y="90" width="110" height="12" rx="3" fill="#253530" />
            {/* Forearm Flat on Pad */}
            <rect x="65" y="80" width="80" height="10" rx="4" fill="#94a39b" />
            {/* Forearm Flexor Glow */}
            <rect x="75" y="80" width="40" height="6" rx="2" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </rect>

            {/* Wrist Flexing Up and Down holding Dumbbell */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 145 85; -35 145 85; 0 145 85"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="145" y1="85" x2="170" y2="85" stroke="#84cc16" strokeWidth="5" strokeLinecap="round" />
              <circle cx="170" cy="85" r="7" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 16. LEG PRESS 45° */}
        {category === 'leg_press' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Incline Sled Rails & Platform */}
            <line x1="50" y1="140" x2="190" y2="35" stroke="#253530" strokeWidth="8" strokeLinecap="round" />
            <rect x="180" y="25" width="25" height="10" rx="2" fill="#4d7c0f" transform="rotate(-45 180 25)" />
            {/* Seated Backrest */}
            <line x1="55" y1="135" x2="95" y2="95" stroke="#374d45" strokeWidth="12" strokeLinecap="round" />
            <circle cx="68" cy="98" r="9" fill="#94a39b" />

            {/* Quads & Glutes Activation Glow */}
            <ellipse cx="112" cy="98" rx="14" ry="7" fill="#84cc16">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Sled & Legs Moving Incline */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -35,28; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              {/* Heavy Sled Plate */}
              <rect x="150" y="45" width="16" height="35" rx="3" fill="#84cc16" transform="rotate(-45 150 45)" />
              {/* Feet against footplate */}
              <circle cx="145" cy="55" r="6" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 17. ROMANIAN DEADLIFT */}
        {category === 'romanian_deadlift' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Floor Plate */}
            <line x1="40" y1="144" x2="200" y2="144" stroke="#253530" strokeWidth="3" />
            {/* Legs stationary with slight knee bend */}
            <line x1="95" y1="92" x2="95" y2="142" stroke="#94a39b" strokeWidth="8" strokeLinecap="round" />
            {/* Hamstrings Stretch Glow */}
            <line x1="91" y1="92" x2="91" y2="125" stroke="#84cc16" strokeWidth="4" strokeLinecap="round">
              <animate attributeName="opacity" values="0.3;1;0.3" dur={`${durSec}s`} repeatCount="indefinite" />
            </line>

            {/* Torso & Barbell Hinging Backwards */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 95 92; 46 95 92; 0 95 92"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="95" y1="92" x2="82" y2="48" stroke="#94a39b" strokeWidth="9" strokeLinecap="round" />
              <circle cx="78" cy="42" r="8" fill="#94a39b" />
              {/* Arms holding Barbell sliding along thighs */}
              <line x1="86" y1="58" x2="104" y2="92" stroke="#d9f99d" strokeWidth="4" />
              <circle cx="104" cy="92" r="8" fill="#84cc16" />
            </g>
          </svg>
        )}

        {/* 18. LEG EXTENSION */}
        {category === 'leg_extension' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Machine Seat & Backrest */}
            <rect x="85" y="60" width="12" height="70" rx="3" fill="#253530" />
            <rect x="85" y="115" width="55" height="12" rx="3" fill="#374d45" />
            <circle cx="95" cy="55" r="9" fill="#94a39b" />
            {/* Thigh Resting on Seat */}
            <line x1="95" y1="118" x2="140" y2="118" stroke="#94a39b" strokeWidth="8" strokeLinecap="round" />

            {/* Quad Teardrop Highlight Glow */}
            <ellipse cx="118" cy="115" rx="14" ry="6" fill="#84cc16">
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Lower Leg Kicking Upwards against Roller */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 140 118; -65 140 118; 0 140 118"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="140" y1="118" x2="140" y2="146" stroke="#84cc16" strokeWidth="6" strokeLinecap="round" />
              {/* Padded Roller */}
              <circle cx="140" cy="146" r="7" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 19. LEG CURL */}
        {category === 'leg_curl' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Machine Seat */}
            <rect x="85" y="105" width="60" height="12" rx="3" fill="#374d45" />
            <rect x="80" y="55" width="12" height="60" rx="3" fill="#253530" />
            <circle cx="90" cy="50" r="9" fill="#94a39b" />
            <line x1="90" y1="108" x2="135" y2="108" stroke="#94a39b" strokeWidth="8" strokeLinecap="round" />

            {/* Hamstrings Contraction Glow */}
            <ellipse cx="110" cy="112" rx="12" ry="5" fill="#84cc16">
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Lower Leg Flexing Downward/Backwards against pad */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 135 108; 55 135 108; 0 135 108"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="135" y1="108" x2="155" y2="132" stroke="#84cc16" strokeWidth="6" strokeLinecap="round" />
              <circle cx="155" cy="132" r="7" fill="#d9f99d" />
            </g>
          </svg>
        )}

        {/* 20. CALF RAISE (Standing/Seated Ankle Plantarflexion) */}
        {category === 'calf_raise' && (
          <svg viewBox="0 0 240 160" className="w-60 h-40 drop-shadow-md">
            {/* Step Block */}
            <rect x="80" y="138" width="80" height="12" rx="2" fill="#374d45" />
            <circle cx="120" cy="40" r="9" fill="#94a39b" />
            <line x1="120" y1="52" x2="120" y2="98" stroke="#94a39b" strokeWidth="8" strokeLinecap="round" />

            {/* Gastrocnemius / Calf Peak Glow */}
            <ellipse cx="118" cy="112" rx="7" ry="12" fill="#84cc16">
              <animate attributeName="opacity" values="0.2;1;0.2" dur={`${durSec}s`} repeatCount="indefinite" />
              <animate attributeName="rx" values="6;9;6" dur={`${durSec}s`} repeatCount="indefinite" />
            </ellipse>

            {/* Feet & Legs Elevating Upwards on Toes */}
            <g style={{ animationPlayState: playState }}>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-18; 0,0"
                keyTimes="0; 0.5; 1"
                dur={`${durSec}s`}
                repeatCount="indefinite"
              />
              <line x1="120" y1="98" x2="120" y2="138" stroke="#84cc16" strokeWidth="6" strokeLinecap="round" />
              {/* Toes planted on edge */}
              <ellipse cx="124" cy="138" rx="6" ry="3" fill="#d9f99d" />
            </g>
          </svg>
        )}
      </div>

      {/* ── BOTTOM CADENCE & METRICS FOOTER ─────────────────────────── */}
      <div className="relative z-20 px-4 py-2 border-t border-[#1e2b27] bg-[#141e1a]/95 flex items-center justify-between text-[11px]">
        {/* Muscle Focus */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#8c9992] text-[10px] uppercase font-bold shrink-0">Target:</span>
          <span className="font-extrabold text-[#d9f99d] truncate text-[11px]">
            {guide.primaryMuscle}
          </span>
        </div>

        {/* Controlled Cadence Tempo */}
        <div className="flex items-center gap-1 text-[#84cc16] font-bold text-[11px] shrink-0">
          <Icon name="timer" className="w-3.5 h-3.5 text-[#84cc16]" />
          <span>{guide.tempo}</span>
        </div>
      </div>

      {/* ── EXPANDABLE FORM CUES & SETUP DRAWER ─────────────────────── */}
      {showGuideTips && (
        <div className="relative z-30 p-4 bg-[#141e1a] border-t border-[#84cc16]/40 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-[#d9f99d] uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="check_circle" className="w-4 h-4 text-[#84cc16]" />
              Guida Tecnica & Setup Perfetto
            </span>
            <button
              type="button"
              onClick={() => setShowGuideTips(false)}
              className="text-[#8c9992] hover:text-white p-1 cursor-pointer"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          {/* Form Cues List */}
          <ul className="space-y-1.5 text-[11px] text-[#e2e8e4]">
            {guide.formCues.map((cue, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#84cc16]/20 text-[#84cc16] text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-tight">{cue}</span>
              </li>
            ))}
          </ul>

          {/* Breathing Guide */}
          <div className="pt-2 border-t border-[#232f2b] flex items-center gap-2 text-[11px] text-[#a3e635]">
            <Icon name="vital_signs" className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-tight">{guide.breathing}</span>
          </div>
        </div>
      )}
    </div>
  );
};
