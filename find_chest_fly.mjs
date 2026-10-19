import fs from 'node:fs';
import path from 'node:path';

const datasetPath = path.resolve('flow-exercise-dataset-main/data/exercises.json');
const exercises = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

function list(fn) {
  return exercises.filter(fn).map(e => ({ id: e.id, name: e.name, equipment: e.equipment, target: e.target, anim: Boolean(e.animation) }));
}

console.log('--- CHEST FLY / PEC DECK ---');
console.log(list(e => e.target === 'pectorals' && (e.name.includes('fly') || e.name.includes('pec') || e.name.includes('lever') || e.name.includes('machine'))));

console.log('--- WRIST CURL ---');
console.log(list(e => e.name.includes('wrist') && e.target === 'forearms'));

console.log('--- REVERSE PEC DECK / REAR DELT ---');
console.log(list(e => (e.name.includes('rear') || e.name.includes('reverse fly')) && e.target === 'delts'));

console.log('--- ROW MACHINE / REMATORE ---');
console.log(list(e => e.name.includes('row') && (e.equipment.includes('machine') || e.equipment.includes('leverage') || e.equipment.includes('cable'))));
