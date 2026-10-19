import fs from 'node:fs';

const exercises = JSON.parse(fs.readFileSync('flow-exercise-dataset-main/data/exercises.json', 'utf8'));

// The 28 exercises mapped strictly
const mappingsConfig = [
  // Giorno 1: Petto, Tricipiti e Avambracci
  {
    routineExerciseId: 'ex-101',
    routineExerciseName: 'Chest Press convergente',
    datasetId: '0577',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Chest press convergente / lever chest press.',
  },
  {
    routineExerciseId: 'ex-102',
    routineExerciseName: 'Panca inclinata 30° con manubri',
    datasetId: '0314',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Distensioni su panca inclinata con manubri.',
  },
  {
    routineExerciseId: 'ex-103',
    routineExerciseName: 'Pec Deck / Chest Fly Machine',
    datasetId: '0596',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Croci alla macchina / Pec Deck (lever seated fly).',
  },
  {
    routineExerciseId: 'ex-5',
    routineExerciseName: 'Pushdown tricipiti con barra',
    datasetId: '0201',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Pushdown per tricipiti al cavo alto con barra.',
  },
  {
    routineExerciseId: 'ex-105',
    routineExerciseName: 'Estensioni tricipiti sopra la testa alla macchina',
    datasetId: '0607',
    altDatasetId: '0194',
    matchStatus: 'needs_manual_review',
    reviewNote: 'Da verificare manualmente: Nel dataset l\'estensione per tricipiti alla macchina è 0607 (lever triceps extension seduto). Se intendi estensione sopra la testa ai cavi è disponibile anche 0194 (cable overhead triceps extension con corda). Entrambi gli asset sono stati salvati in locale.',
  },
  {
    routineExerciseId: 'ex-106',
    routineExerciseName: 'Wrist Curl con manubri',
    datasetId: '0369',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Wrist curl con manubri su panca per avambracci.',
  },

  // Giorno 2: Schiena, Bicipiti e Avambracci
  {
    routineExerciseId: 'ex-201',
    routineExerciseName: 'Lat Machine presa neutra',
    datasetId: '2616',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Lat machine con V-bar (presa neutra stretta).',
  },
  {
    routineExerciseId: 'ex-202',
    routineExerciseName: 'Rematore Chest-Supported Machine',
    datasetId: '1350',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Rematore orizzontale a leva con supporto toracico (lever seated row).',
  },
  {
    routineExerciseId: 'ex-203',
    routineExerciseName: 'Pulley basso',
    datasetId: '0861',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Pulley basso al cavo con presa a triangolo (cable seated row).',
  },
  {
    routineExerciseId: 'ex-204',
    routineExerciseName: 'Reverse Pec Deck',
    datasetId: '0602',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Reverse Pec Deck per deltoidi posteriori (lever seated reverse fly).',
  },
  {
    routineExerciseId: 'ex-205',
    routineExerciseName: 'Hyperextension',
    datasetId: '0489',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Iperestensioni su panca per erettori spinali.',
  },
  {
    routineExerciseId: 'ex-303',
    routineExerciseName: 'Curl manubri su panca inclinata',
    datasetId: '0318',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Curl bicipiti seduto su panca inclinata con manubri.',
  },
  {
    routineExerciseId: 'ex-207',
    routineExerciseName: 'Curl al cavo con barra EZ',
    datasetId: '0868',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Bicep curl in piedi al cavo basso.',
  },
  {
    routineExerciseId: 'ex-208',
    routineExerciseName: 'Reverse Curl con barra EZ',
    datasetId: '0080',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Curl con presa prona inversa (reverse curl) con bilanciere/sagomato.',
  },

  // Giorno 3: Spalle, Braccia e Avambracci
  {
    routineExerciseId: 'ex-301',
    routineExerciseName: 'Shoulder Press Machine',
    datasetId: '0603',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Spinte per spalle alla macchina a leva (lever shoulder press).',
  },
  {
    routineExerciseId: 'ex-4',
    routineExerciseName: 'Alzate laterali ai cavi o manubri',
    datasetId: '0334',
    altDatasetId: '0178',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Alzate laterali in piedi con manubri (disponibile anche variante ai cavi 0178).',
  },
  {
    routineExerciseId: 'ex-305',
    routineExerciseName: 'Alzate posteriori ai cavi',
    datasetId: '0215',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Alzate posteriori ai cavi per deltoidi posteriori (cable rear lateral raise).',
  },
  {
    routineExerciseId: 'ex-306',
    routineExerciseName: 'Curl ai cavi o manubri su panca',
    datasetId: '1677',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Curl bicipiti con manubri seduto su panca (dumbbell seated bicep curl).',
  },
  {
    routineExerciseId: 'ex-307',
    routineExerciseName: 'Rope Hammer Curl',
    datasetId: '0165',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Hammer curl al cavo con fune (cable hammer curl with rope).',
  },
  {
    routineExerciseId: 'ex-308',
    routineExerciseName: 'Pushdown tricipiti con corda o barra',
    datasetId: '0200',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Pushdown tricipiti al cavo alto con corda.',
  },
  {
    routineExerciseId: 'ex-309',
    routineExerciseName: 'Macchinario per tricipiti',
    datasetId: '1451',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Dip seduto alla macchina per tricipiti (lever seated dip).',
  },
  {
    routineExerciseId: 'ex-310',
    routineExerciseName: 'Reverse Wrist Curl',
    datasetId: '0385',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Reverse wrist curl con manubri per estensori dell\'avambraccio.',
  },

  // Giorno 4: Gambe
  {
    routineExerciseId: 'ex-401',
    routineExerciseName: 'Leg Press 45°',
    datasetId: '1463',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Pressa a 45 gradi su slitta (sled 45° leg press).',
  },
  {
    routineExerciseId: 'ex-402',
    routineExerciseName: 'Romanian Deadlift al multipower o bilanciere',
    datasetId: '0085',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Stacco rumeno con bilanciere (barbell romanian deadlift).',
  },
  {
    routineExerciseId: 'ex-403',
    routineExerciseName: 'Leg Curl seduto',
    datasetId: '0599',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Flessioni delle gambe seduto alla macchina (lever seated leg curl).',
  },
  {
    routineExerciseId: 'ex-404',
    routineExerciseName: 'Leg Extension',
    datasetId: '0585',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Estensioni delle gambe da seduto (lever leg extension).',
  },
  {
    routineExerciseId: 'ex-405',
    routineExerciseName: 'Calf Raise in piedi alla macchina',
    datasetId: '0605',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Calf raise in piedi al macchinario per polpacci (lever standing calf raise).',
  },
  {
    routineExerciseId: 'ex-406',
    routineExerciseName: 'Calf Raise seduto',
    datasetId: '0594',
    matchStatus: 'exact',
    reviewNote: 'Corrispondenza esatta: Calf raise da seduto alla macchina (lever seated calf raise).',
  },
];

const mappedEntries = mappingsConfig.map(cfg => {
  const dEx = exercises.find(e => e.id === cfg.datasetId);
  if (!dEx) {
    throw new Error(`Dataset exercise not found: ${cfg.datasetId}`);
  }

  const frames = [
    `/exercises/${cfg.datasetId}/frame-00.svg`,
    `/exercises/${cfg.datasetId}/frame-01.svg`,
    `/exercises/${cfg.datasetId}/frame-02.svg`,
  ];

  return {
    routineExerciseId: cfg.routineExerciseId,
    routineExerciseName: cfg.routineExerciseName,
    datasetId: cfg.datasetId,
    datasetName: dEx.name,
    bodyPart: dEx.bodyPart,
    equipment: dEx.equipment,
    targetMuscle: dEx.target,
    secondaryMuscles: dEx.secondaryMuscles || [],
    movementPattern: dEx.movementPattern || '',
    frames,
    sequence: dEx.animation?.sequence || [0, 1, 2, 1],
    frameDurationMs: dEx.animation?.frameDurationMs || 320,
    matchStatus: cfg.matchStatus,
    reviewNote: cfg.reviewNote,
    instructions: dEx.instructions || [],
    license: 'CC0-1.0 (Public Domain)',
  };
});

const tsCode = `// Autogenerated mapping between LevelUP 28 Routine Exercises and Flow Exercise Dataset assets
// License: Artwork CC0-1.0 (Public Domain), Dataset metadata MIT

export interface FlowExerciseInfo {
  routineExerciseId: string;
  routineExerciseName: string;
  datasetId: string;
  datasetName: string;
  bodyPart: string;
  equipment: string;
  targetMuscle: string;
  secondaryMuscles: string[];
  movementPattern: string;
  frames: string[];
  sequence: number[];
  frameDurationMs: number;
  matchStatus: 'exact' | 'needs_manual_review';
  reviewNote: string;
  instructions: string[];
  license: string;
}

export const FLOW_EXERCISE_MAPPINGS: Record<string, FlowExerciseInfo> = ${JSON.stringify(
  mappedEntries.reduce((acc, cur) => {
    acc[cur.routineExerciseId] = cur;
    return acc;
  }, {}),
  null,
  2
)};

export const MANUAL_VERIFICATION_LIST = ${JSON.stringify(
  mappedEntries.filter(e => e.matchStatus === 'needs_manual_review'),
  null,
  2
)};

export function getFlowExercise(routineExerciseId: string): FlowExerciseInfo | undefined {
  return FLOW_EXERCISE_MAPPINGS[routineExerciseId];
}
`;

fs.writeFileSync('src/data/flowExerciseMapping.ts', tsCode, 'utf8');
console.log('Successfully generated src/data/flowExerciseMapping.ts with', mappedEntries.length, 'exercises.');
