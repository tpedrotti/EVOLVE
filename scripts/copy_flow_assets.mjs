import fs from 'node:fs';
import path from 'node:path';

const datasetIds = [
  '0577', // Chest press convergente
  '0314', // Panca inclinata 30° con manubri
  '0596', // Pec Deck / Chest fly machine
  '0201', // Pushdown tricipiti con barra
  '0607', // Lever triceps extension (ex-105 candidate A)
  '0194', // Cable overhead triceps extension (ex-105 candidate B)
  '0369', // Wrist curl con manubri
  '2616', // Lat machine presa neutra (V-bar)
  '1350', // Rematore chest-supported machine
  '0861', // Pulley basso (cable seated row)
  '0602', // Reverse Pec Deck (lever seated reverse fly)
  '0489', // Hyperextension
  '0318', // Curl manubri su panca inclinata
  '0868', // Curl al cavo
  '0080', // Reverse curl con bilanciere/EZ
  '0603', // Shoulder press machine
  '0334', // Alzate laterali manubri
  '0178', // Alzate laterali ai cavi
  '0215', // Alzate posteriori ai cavi
  '1677', // Curl manubri su panca
  '0165', // Rope hammer curl
  '0200', // Pushdown tricipiti con corda
  '1451', // Macchinario per tricipiti (lever seated dip)
  '0385', // Reverse wrist curl
  '1463', // Leg press 45°
  '0085', // Romanian deadlift
  '0599', // Leg curl seduto
  '0585', // Leg extension
  '0605', // Calf raise in piedi alla macchina
  '0594', // Calf raise seduto
];

const srcBase = path.resolve('flow-exercise-dataset-main/assets');
const destBase = path.resolve('public/exercises');

if (!fs.existsSync(destBase)) {
  fs.mkdirSync(destBase, { recursive: true });
}

let totalCopied = 0;
let totalBytes = 0;

for (const id of datasetIds) {
  const srcDir = path.join(srcBase, id);
  const destDir = path.join(destBase, id);

  if (!fs.existsSync(srcDir)) {
    console.error(`Missing source folder for id: ${id}`);
    continue;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  for (const f of files) {
    if (f.endsWith('.svg')) {
      const srcFile = path.join(srcDir, f);
      const destFile = path.join(destDir, f);
      fs.copyFileSync(srcFile, destFile);
      totalCopied++;
      totalBytes += fs.statSync(destFile).size;
    }
  }
}

console.log(`Copied ${totalCopied} SVG frames across ${datasetIds.length} exercises.`);
console.log(`Total payload size: ${(totalBytes / 1024).toFixed(1)} KB.`);
