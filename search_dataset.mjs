import fs from 'node:fs';
import path from 'node:path';

const datasetPath = path.resolve('flow-exercise-dataset-main/data/exercises.json');
const exercises = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

console.log(`Total exercises in dataset: ${exercises.length}`);

// Sample 5 records to inspect schema
console.log('Sample record:', JSON.stringify(exercises[0], null, 2));

const ourExercises = [
  // Giorno 1
  { id: 'ex-101', name: 'Chest Press convergente', en: ['lever chest press', 'chest press', 'machine bench press', 'converging chest press'] },
  { id: 'ex-102', name: 'Panca inclinata 30° con manubri', en: ['incline dumbbell bench press', 'dumbbell incline bench press', 'incline dumbbell press'] },
  { id: 'ex-103', name: 'Pec Deck / Chest Fly Machine', en: ['lever pec deck fly', 'butterfly', 'pec deck', 'lever fly', 'machine fly'] },
  { id: 'ex-5', name: 'Pushdown tricipiti con barra', en: ['cable pushdown', 'pushdown', 'cable triceps pushdown', 'straight bar pushdown'] },
  { id: 'ex-105', name: 'Estensioni tricipiti sopra la testa alla macchina', en: ['cable overhead triceps extension', 'overhead triceps extension', 'lever overhead tricep extension'] },
  { id: 'ex-106', name: 'Wrist Curl con manubri', en: ['dumbbell wrist curl', 'wrist curl', 'seated dumbbell wrist curl'] },

  // Giorno 2
  { id: 'ex-201', name: 'Lat Machine presa neutra', en: ['cable neutral grip lat pulldown', 'lat pulldown', 'cable lat pulldown', 'neutral grip pulldown'] },
  { id: 'ex-202', name: 'Rematore Chest-Supported Machine', en: ['lever chest supported row', 'chest supported row', 't-bar row', 'lever row'] },
  { id: 'ex-203', name: 'Pulley basso', en: ['cable seated row', 'seated cable row', 'cable row', 'low row'] },
  { id: 'ex-204', name: 'Reverse Pec Deck', en: ['lever reverse fly', 'reverse pec deck', 'reverse fly', 'rear delt machine'] },
  { id: 'ex-205', name: 'Hyperextension', en: ['hyperextension', 'back extension', '45 degree hyperextension'] },
  { id: 'ex-303', name: 'Curl manubri su panca inclinata', en: ['incline dumbbell curl', 'dumbbell incline curl', 'seated incline curl'] },
  { id: 'ex-207', name: 'Curl al cavo con barra EZ', en: ['cable curl', 'ez bar cable curl', 'standing cable curl'] },
  { id: 'ex-208', name: 'Reverse Curl con barra EZ', en: ['ez bar reverse curl', 'reverse curl', 'standing reverse curl', 'barbell reverse curl'] },

  // Giorno 3
  { id: 'ex-301', name: 'Shoulder Press Machine', en: ['lever shoulder press', 'machine shoulder press', 'seated shoulder press'] },
  { id: 'ex-4', name: 'Alzate laterali ai cavi o manubri', en: ['dumbbell lateral raise', 'cable lateral raise', 'lateral raise'] },
  { id: 'ex-305', name: 'Alzate posteriori ai cavi', en: ['cable rear delt fly', 'cable rear lateral raise', 'cable rear delt row', 'face pull'] },
  { id: 'ex-306', name: 'Curl ai cavi o manubri su panca', en: ['dumbbell bicep curl', 'cable curl', 'preacher curl', 'seated dumbbell curl'] },
  { id: 'ex-307', name: 'Rope Hammer Curl', en: ['cable rope hammer curl', 'rope hammer curl', 'cable hammer curl', 'dumbbell hammer curl'] },
  { id: 'ex-308', name: 'Pushdown tricipiti con corda o barra', en: ['cable pushdown with rope', 'cable triceps pushdown with rope', 'rope pushdown'] },
  { id: 'ex-309', name: 'Macchinario per tricipiti', en: ['lever triceps dip', 'lever seated dip', 'triceps dip machine', 'machine triceps extension'] },
  { id: 'ex-310', name: 'Reverse Wrist Curl', en: ['dumbbell reverse wrist curl', 'barbell reverse wrist curl', 'reverse wrist curl'] },

  // Giorno 4
  { id: 'ex-401', name: 'Leg Press 45°', en: ['sled 45° leg press', '45 degree leg press', 'sled leg press', 'leg press'] },
  { id: 'ex-402', name: 'Romanian Deadlift al multipower o bilanciere', en: ['romanian deadlift', 'barbell romanian deadlift', 'smith machine romanian deadlift', 'stiff leg deadlift'] },
  { id: 'ex-403', name: 'Leg Curl seduto', en: ['lever seated leg curl', 'seated leg curl', 'machine leg curl'] },
  { id: 'ex-404', name: 'Leg Extension', en: ['lever leg extension', 'leg extension', 'machine leg extension'] },
  { id: 'ex-405', name: 'Calf Raise in piedi alla macchina', en: ['lever standing calf raise', 'standing calf raise', 'machine standing calf raise', 'smith standing calf raise'] },
  { id: 'ex-406', name: 'Calf Raise seduto', en: ['lever seated calf raise', 'seated calf raise', 'machine seated calf raise'] },
];

console.log('\n--- SEARCHING EXACT MATCHES ---');
for (const item of ourExercises) {
  let matched = [];
  for (const query of item.en) {
    const found = exercises.filter(e => {
      const n = e.name.toLowerCase();
      return n === query || n.includes(query);
    });
    if (found.length > 0) {
      matched = found;
      break;
    }
  }

  if (matched.length > 0) {
    const best = matched[0];
    const hasAnim = Boolean(best.animation && best.animation.frames);
    console.log(`[MATCH] ${item.name} -> ID: ${best.id} | Name: "${best.name}" | Equipment: ${best.equipment} | Target: ${best.target} | Anim: ${hasAnim}`);
  } else {
    console.log(`[NO DIRECT MATCH] ${item.name}`);
  }
}
