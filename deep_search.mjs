import fs from 'node:fs';
import path from 'node:path';

const datasetPath = path.resolve('flow-exercise-dataset-main/data/exercises.json');
const exercises = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

// Helper function to search
function find(query, targetFilter) {
  return exercises.filter(e => {
    const matchName = e.name.toLowerCase().includes(query.toLowerCase());
    const matchTarget = targetFilter ? e.target.toLowerCase().includes(targetFilter.toLowerCase()) : true;
    return matchName && matchTarget;
  }).map(e => ({ id: e.id, name: e.name, equipment: e.equipment, target: e.target, anim: Boolean(e.animation) }));
}

console.log('--- PEC DECK / CHEST FLY ---');
console.log(find('pec deck'));
console.log(find('fly', 'pectorals'));

console.log('--- WRIST CURL ---');
console.log(find('wrist curl'));

console.log('--- REVERSE PEC DECK / REAR DELT ---');
console.log(find('reverse fly'));
console.log(find('rear delt'));

console.log('--- PUSHDOWN CON CORDA / TRICIPITI ---');
console.log(find('pushdown'));
console.log(find('triceps extension'));

console.log('--- CURL SU PANCA / MANUBRI ---');
console.log(find('incline curl'));
console.log(find('seated bicep curl'));
console.log(find('dumbbell seated curl'));
console.log(find('bicep curl', 'biceps'));

console.log('--- LAT MACHINE / PULLDOWN ---');
console.log(find('lat pulldown'));
console.log(find('pulldown'));

console.log('--- REMATORE / ROW ---');
console.log(find('chest supported'));
console.log(find('lever row'));
console.log(find('t-bar'));
