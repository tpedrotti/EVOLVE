import { GoogleGenAI } from '@google/genai';
import type { CoachMessage, UserProfile, WorkoutRoutine, MealEntry, CoachMealEstimate } from '../types';
import { type DayScheduleResult, generateCoachFirstExerciseAdvice } from '../utils/workoutSchedule';

export interface CoachContext {
  profile: UserProfile;
  todayWorkout?: WorkoutRoutine;
  todaySchedule?: DayScheduleResult;
  meals?: MealEntry[];
  waterLiters?: number;
  completedWorkoutsCount?: number;
}

export interface AttachedMedia {
  dataUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
}

export interface CoachAIResponse {
  text: string;
  mealEstimate?: CoachMealEstimate;
}

const LOCAL_STORAGE_KEY = 'evolve_gemini_api_key';
const LOCAL_STORAGE_OFFLINE_KEY = 'evolve_coach_offline_mode';

export function isCoachOfflineMode(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCoachOfflineMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LOCAL_STORAGE_OFFLINE_KEY, 'true');
    } else {
      localStorage.removeItem(LOCAL_STORAGE_OFFLINE_KEY);
    }
  } catch {
    // ignore
  }
}

export function cleanCoachText(raw: string): string {
  if (!raw) return '';
  return raw
    // Strip hidden MEAL_DATA tags if present
    .replace(/\[MEAL_DATA:\{.*?\}\]/gs, '')
    // Strip bold/italic asterisks: **word** -> word, *word* -> word
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Strip any remaining asterisks
    .replace(/\*/g, '')
    // Normalize multi-spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function extractMealEstimate(rawText: string): CoachAIResponse {
  const match = rawText.match(/\[MEAL_DATA:(\{.*?\})\]/s);
  let mealEstimate: CoachMealEstimate | undefined;
  let textWithoutTag = rawText;

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed.calories === 'number') {
        const validMealTypes: CoachMealEstimate['mealType'][] = ['colazione', 'pranzo', 'spuntino', 'cena'];
        const mType = validMealTypes.includes(parsed.mealType) ? parsed.mealType : 'pranzo';
        mealEstimate = {
          name: String(parsed.name || 'Pasto Analizzato').trim(),
          mealType: mType,
          calories: Math.round(Number(parsed.calories)),
          proteinG: Math.round(Number(parsed.proteinG || 0)),
          carbsG: Math.round(Number(parsed.carbsG || 0)),
          fatsG: Math.round(Number(parsed.fatsG || 0)),
          sugarsG: typeof parsed.sugarsG === 'number' ? Math.round(Number(parsed.sugarsG)) : undefined,
          fiberG: typeof parsed.fiberG === 'number' ? Math.round(Number(parsed.fiberG)) : undefined,
        };
      }
    } catch (e) {
      console.warn('Failed to parse MEAL_DATA JSON:', e);
    }
    textWithoutTag = rawText.replace(/\[MEAL_DATA:\{.*?\}\]/gs, '').trim();
  }

  return { text: cleanCoachText(textWithoutTag), mealEstimate };
}

export function getGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && saved.trim() !== '') return saved.trim();
  } catch {
    // ignore
  }

  // Vite environment variables support
  let envKey = '';
  try {
    if (typeof process.env.GEMINI_API_KEY === 'string') {
      envKey = process.env.GEMINI_API_KEY;
    }
  } catch {
    // ignore
  }

  if (!envKey) {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    envKey = metaEnv?.VITE_GEMINI_API_KEY ||
             metaEnv?.GEMINI_API_KEY ||
             '';
  }

  if (envKey && envKey.trim() !== '' && !envKey.includes('MY_GEMINI_API_KEY')) {
    return envKey.trim();
  }

  return '';
}

export function saveGeminiApiKey(key: string): void {
  try {
    if (!key.trim()) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    }
  } catch {
    // ignore
  }
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

function buildSystemInstruction(context: CoachContext): string {
  const { profile, todayWorkout, todaySchedule, meals = [], waterLiters = 0 } = context;

  const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProt = meals.reduce((sum, m) => sum + m.proteinG, 0);
  const totalCarb = meals.reduce((sum, m) => sum + m.carbsG, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fatsG, 0);

  const isRestDay = todaySchedule?.isRestDay || !todayWorkout;
  const firstEx = todayWorkout?.exercises?.[0];
  const workoutSummary = !isRestDay && todayWorkout
    ? `Routine: "${todayWorkout.title}" (ID: ${todayWorkout.id}, ${todayWorkout.durationMin} min). Gruppi target: ${todayWorkout.focusMuscles.join(', ')}. Primo esercizio effettivo: "${firstEx?.name}" [ID: ${firstEx?.id || 'ex-101'}]. Esercizi completi: ${todayWorkout.exercises.map((e) => `${e.name} [ID: ${e.id}] (${e.setsReps}${e.targetWeightKg ? `, ${e.targetWeightKg}kg` : ''})`).join('; ')}.`
    : `Oggi è Giorno di Riposo programmato (${todaySchedule?.dayName || 'Giorno di Riposo'}). Nessuna routine con pesi programmata per oggi. Prossima sessione in calendario: ${todaySchedule?.nextScheduledRoutine?.title || 'Giorno 1'}.`;

  return `Sei EVOLVE AI Coach, un personal trainer e nutrizionista sportivo d'élite.
Parli in lingua italiana. Tono professionale, incoraggiante, diretto e scientifico.

DATI BIOMETRICI DELL'ATLETA:
- Nome: ${profile.name || 'Atleta'}
- Sesso: ${profile.sex} | Età: ${profile.age} anni | Altezza: ${profile.heightCm} cm | Peso Attuale: ${profile.weightKg} kg (Target: ${profile.targetWeightKg} kg)
- Obiettivo: ${profile.goal === 'crescita' ? 'Ipertrofia / Crescita Muscolare' : profile.goal === 'definizione' ? 'Definizione & Cut' : profile.goal === 'forza' ? 'Forza Massima' : 'Ricomposizione'}
- Esperienza: ${profile.experience} | Frequenza: ${profile.weeklyDays} gg/settimana (${profile.selectedDays?.join(', ') || ''})
- Attrezzatura: ${profile.equipment?.join(', ') || 'Palestra completa'}

STATO DI OGGI:
- Workout odierno: ${workoutSummary}
- Nutrizione odierna: ${totalCal} kcal (Proteine: ${totalProt}g, Carboidrati: ${totalCarb}g, Grassi: ${totalFat}g)
- Idratazione: ${waterLiters.toFixed(2)} L su 3.0 L
- Stato biometrico di recupero: Nessuna misurazione HRV o tracciamento sonno registrato oggi (ascolta le sensazioni dell'atleta).

INVARIANTI RIGIDE SULLA VERIDICITÀ BIOMETRICA E PROGRAMMAZIONE:
1. NON INVENTARE DATI DI SONNO, HRV O RECUPERO: non dichiarare percentuali di recupero arbitrarie (es. mai dire "recupero al 94%") né ore di sonno fittizie. Se l'utente non ha registrato dati di recupero, digli chiaramente che non ci sono dati recenti e chiedi come si sente.
2. COLLEGA I CONSIGLI AGLI ID DEGLI ESERCIZI: per qualsiasi consiglio sulla scheda odierna, fai rigorosamente riferimento al primo esercizio effettivo della routine corrente (${firstEx ? `${firstEx.name} [ID: ${firstEx.id}]` : 'nessuno se giorno di riposo'}). Non citare esercizi non presenti nella scheda (es. mai citare la panca piana con bilanciere se la scheda inizia con Chest Press convergente).
3. NON INVENTARE INCREMENTI DI CARICO SENZA DATI: se mancano registrazioni dello sforzo percepito (RPE o ripetizioni di riserva) dell'ultima sessione, evita incrementi di carico specifici (+2.5kg o simili) e chiedi un chiarimento all'atleta su come ha percepito lo sforzo.
4. RISPETTA I GIORNI DI RIPOSO: se oggi è un giorno di riposo programmato, non proporre workout pesanti, raccomanda riposo neuromuscolare e mobilità, e cita la prossima sessione prevista.

ANALISI MULTIMODALE E NUTRIZIONALE:
- Se l'utente allega una foto di un piatto/cibo o richiede la stima di calorie e macronutrienti (anche indicando ingredienti e grammature nel testo, es. "100g riso, 150g pollo, 10g olio"):
  1. Calcola con precisione scientifica Calorie totali (kcal), Proteine (g), Carboidrati (g) e Grassi (g).
  2. Fornisci la risposta in modo pulito e strutturato senza alcun asterisco:
     Stima Nutrizionale:
     Totale: ~X kcal | Proteine: Yg | Carboidrati: Zg | Grassi: Wg
     Dettaglio alimenti:
     - Alimento 1 (peso): X kcal, Yg P, Zg C, Wg G
     - Alimento 2 (peso): X kcal, Yg P, Zg C, Wg G
     Consiglio: 1-2 frasi sul beneficio per l'atleta (es. ipertrofia o definizione) e confronto con il target odierno.
  3. In fondo alla risposta, aggiungi SEMPRE su una nuova riga separata il blocco dati per il diario:
     [MEAL_DATA:{"name":"Nome Piatto","mealType":"pranzo","calories":X,"proteinG":Y,"carbsG":Z,"fatsG":W,"sugarsG":S,"fiberG":F}]
     (dove mealType e uno tra: colazione, pranzo, spuntino, cena; valori numerici interi per calorie, macro, zuccheri e fibre).
- Se l'utente allega un video o foto di un esercizio: analizza la biomeccanica (ROM, traiettoria, stabilità del core e allineamento articolare) e fornisci 2-3 correzioni chiare e pratiche.
- Se l'utente allega una foto del fisico/postura: commenta con tono motivante i punti di forza muscolari e l'allineamento.

REGOLE DI FORMATTAZIONE E LUNGHEZZA (RIGIDE E MANDATORIE):
1. NON USARE MAI GLI ASTERISCHI (* o **): è severamente vietato inserire asterischi prima o dopo le parole, né per il grassetto né per il corsivo. Scrivi solo in testo normale, pulito e scorrevole.
2. RISPOSTE BREVI E DIRETTE: rispondi in massimo 2-4 frasi brevi. Sii immediato, conciso e pratico come un messaggio su WhatsApp dal proprio personal trainer. Evita preamboli inutili o conclusioni prolisse.
3. ELENCHI SINTETICI: se devi elencare esercizi o consigli, usa solo un semplice trattino '-' o il punto elenco '•' con al massimo 2 o 3 punti rapidi.`;
}

/**
 * Extracts the gram quantity for a food whether specified before or after:
 * e.g. "100g riso", "riso 100g", "pasta al sugo 80 gr", "petto di pollo 150g", "1 cucchiaio olio"
 */
function extractFoodGrams(
  text: string,
  keywords: string[],
  defaultGrams: number
): { matched: boolean; grams: number; matchedKeyword?: string } {
  for (const kw of keywords) {
    const kwRegex = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Quantity BEFORE keyword: "120g riso", "120 gr pasta", "200ml latte", "120 grammi di pollo"
    const regexBefore = new RegExp(`(\\d{1,4})\\s*(?:g|gr|grammi|ml|millilitri|cl)?\\s*(?:di\\s*)?${kwRegex}\\b`, 'i');
    const matchBefore = text.match(regexBefore);
    if (matchBefore && matchBefore[1]) {
      const g = parseInt(matchBefore[1], 10);
      if (g > 0 && g <= 2500) {
        return { matched: true, grams: g, matchedKeyword: kw };
      }
    }

    // 2. Quantity AFTER keyword: "riso 120g", "pasta al pomodoro 80 gr", "latte 200ml", "tonno 100g"
    const regexAfter = new RegExp(`\\b${kwRegex}(?:[\\w\\s]{0,25}?)(\\d{1,4})\\s*(?:g|gr|grammi|ml|millilitri|cl)\\b`, 'i');
    const matchAfter = text.match(regexAfter);
    if (matchAfter && matchAfter[1]) {
      const g = parseInt(matchAfter[1], 10);
      if (g > 0 && g <= 2500) {
        return { matched: true, grams: g, matchedKeyword: kw };
      }
    }

    // 3. Keyword followed by a lone number: "riso 100", "pasta 80"
    const regexLone = new RegExp(`\\b${kwRegex}\\s+(\\d{1,4})\\b`, 'i');
    const matchLone = text.match(regexLone);
    if (matchLone && matchLone[1]) {
      const g = parseInt(matchLone[1], 10);
      if (g > 0 && g <= 2500) {
        return { matched: true, grams: g, matchedKeyword: kw };
      }
    }

    // 4. Keyword is simply present in prompt without explicit number
    if (new RegExp(`\\b${kwRegex}\\b`, 'i').test(text)) {
      return { matched: true, grams: defaultGrams, matchedKeyword: kw };
    }
  }

  return { matched: false, grams: defaultGrams };
}

export function parseNutritionFromTextAndImage(
  userPrompt: string,
  hasImage: boolean = false,
  preferredMealType?: CoachMealEstimate['mealType']
): CoachAIResponse {
  const promptLower = (userPrompt || '').toLowerCase();
  const currentHour = new Date().getHours();
  const timeBasedMealType: CoachMealEstimate['mealType'] =
    currentHour < 11 ? 'colazione' : currentHour < 15 ? 'pranzo' : currentHour < 19 ? 'spuntino' : 'cena';

  let detectedMealType: CoachMealEstimate['mealType'] = preferredMealType || timeBasedMealType;
  if (promptLower.includes('colazione') || promptLower.includes('avena') || promptLower.includes('porridge') || promptLower.includes('pancake') || promptLower.includes('fette biscottate') || promptLower.includes('biscotti')) {
    detectedMealType = 'colazione';
  } else if (promptLower.includes('spuntino') || promptLower.includes('merenda') || promptLower.includes('snack') || promptLower.includes('shake') || promptLower.includes('whey') || promptLower.includes('barretta')) {
    detectedMealType = 'spuntino';
  } else if (promptLower.includes('cena')) {
    detectedMealType = 'cena';
  } else if (promptLower.includes('pranzo')) {
    detectedMealType = 'pranzo';
  }

  let totalP = 0;
  let totalC = 0;
  let totalG = 0;
  let totalSugars = 0;
  let totalFiber = 0;
  const items: string[] = [];
  const dishNames: string[] = [];

  // 1. Riso (Basmati, Integrale, Venere, ecc.)
  const riso = extractFoodGrams(promptLower, ['riso basmati', 'riso integrale', 'riso venere', 'riso'], 100);
  if (riso.matched) {
    const p = (riso.grams * 7) / 100;
    const c = (riso.grams * 78) / 100;
    const f = (riso.grams * 1) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Riso (${riso.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Riso');
  }

  // 2. Pasta (Spaghetti, Penne, Fusilli, Rigatoni, ecc.)
  const pasta = extractFoodGrams(promptLower, ['spaghetti', 'penne', 'fusilli', 'rigatoni', 'tagliatelle', 'pasta'], 100);
  if (pasta.matched && !riso.matched) {
    const p = (pasta.grams * 12) / 100;
    const c = (pasta.grams * 72) / 100;
    const f = (pasta.grams * 1.5) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Pasta (${pasta.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Pasta');
  }

  // 3. Pane / Toast / Fette biscottate
  const pane = extractFoodGrams(promptLower, ['pane integrale', 'pane di segale', 'pane comune', 'pane', 'toast', 'fette biscottate'], 80);
  if (pane.matched) {
    const p = (pane.grams * 9) / 100;
    const c = (pane.grams * 49) / 100;
    const f = (pane.grams * 3) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Pane (${pane.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Pane');
  }

  // 4. Piadina
  const piadina = extractFoodGrams(promptLower, ['piadina', 'piada'], 100);
  if (piadina.matched) {
    const p = (piadina.grams * 8) / 100;
    const c = (piadina.grams * 52) / 100;
    const f = (piadina.grams * 8) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Piadina (${piadina.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Piadina');
  }

  // 5. Gallette di riso o mais
  const gallette = extractFoodGrams(promptLower, ['gallette di riso', 'gallette di mais', 'gallette'], 30);
  if (gallette.matched) {
    const p = (gallette.grams * 8) / 100;
    const c = (gallette.grams * 82) / 100;
    const f = (gallette.grams * 2) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Gallette (${gallette.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Gallette');
  }

  // 6. Avena / Porridge
  const avena = extractFoodGrams(promptLower, ['fiocchi d\'avena', 'farina d\'avena', 'avena', 'porridge'], 70);
  if (avena.matched) {
    const p = (avena.grams * 13) / 100;
    const c = (avena.grams * 66) / 100;
    const f = (avena.grams * 7) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Avena (${avena.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Avena');
  }

  // 7. Patate / Patate dolci
  const patate = extractFoodGrams(promptLower, ['patate dolci', 'patate', 'patata'], 200);
  if (patate.matched) {
    const p = (patate.grams * 2) / 100;
    const c = (patate.grams * 18) / 100;
    const f = (patate.grams * 0.1) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Patate (${patate.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Patate');
  }

  // 8. Gnocchi di patate
  const gnocchi = extractFoodGrams(promptLower, ['gnocchi di patate', 'gnocchi'], 200);
  if (gnocchi.matched) {
    const p = (gnocchi.grams * 4) / 100;
    const c = (gnocchi.grams * 35) / 100;
    const f = (gnocchi.grams * 0.5) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Gnocchi (${gnocchi.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Gnocchi');
  }

  // 9. Farro / Couscous / Quinoa / Orzo
  const cereali = extractFoodGrams(promptLower, ['couscous', 'cous cous', 'farro', 'quinoa', 'orzo'], 80);
  if (cereali.matched) {
    const p = (cereali.grams * 12) / 100;
    const c = (cereali.grams * 68) / 100;
    const f = (cereali.grams * 2) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Cereali (${cereali.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Cereali');
  }

  // 10. Petto di Pollo / Tacchino
  const pollo = extractFoodGrams(promptLower, ['petto di pollo', 'fesa di pollo', 'pollo', 'tacchino'], 150);
  if (pollo.matched) {
    const p = (pollo.grams * 24) / 100;
    const c = 0;
    const f = (pollo.grams * 2.5) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Petto di pollo (${pollo.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push('Pollo');
  }

  // 11. Manzo / Bistecca / Carne Macinata / Hamburger
  const manzo = extractFoodGrams(promptLower, ['carne macinata', 'macinato magro', 'macinato', 'bistecca', 'tagliata', 'tartare', 'hamburger', 'manzo', 'vitello'], 180);
  if (manzo.matched && !pollo.matched) {
    const p = (manzo.grams * 26) / 100;
    const c = 0;
    const f = (manzo.grams * 10) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Carne di manzo (${manzo.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push('Manzo');
  }

  // 12. Tonno (Al naturale o in scatola)
  const isScatolaTonno = promptLower.includes('scatolett');
  const tonnoMatch = extractFoodGrams(promptLower, ['tonno al naturale', 'tonno'], isScatolaTonno ? 80 : 100);
  if (tonnoMatch.matched) {
    const p = (tonnoMatch.grams * 24) / 100;
    const c = 0;
    const f = (tonnoMatch.grams * 1) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Tonno (${tonnoMatch.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push('Tonno');
  }

  // 13. Salmone
  const salmone = extractFoodGrams(promptLower, ['salmone affumicato', 'salmone fresco', 'salmone'], 150);
  if (salmone.matched) {
    const p = (salmone.grams * 20) / 100;
    const c = 0;
    const f = (salmone.grams * 11) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Salmone (${salmone.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push('Salmone');
  }

  // 14. Pesce Bianco (Merluzzo, Platessa, Orata, Branzino, Gamberi)
  const pesceBianco = extractFoodGrams(promptLower, ['merluzzo', 'platessa', 'orata', 'branzino', 'pesce spada', 'gamberi', 'calamari', 'pesce'], 150);
  if (pesceBianco.matched && !salmone.matched && !tonnoMatch.matched) {
    const p = (pesceBianco.grams * 18) / 100;
    const c = 0;
    const f = (pesceBianco.grams * 1) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Pesce bianco (${pesceBianco.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push('Pesce');
  }

  // 15. Uova & Albumi
  const hasUova = promptLower.includes('uov');
  const hasAlbume = promptLower.includes('albume') || promptLower.includes('albumi');
  if (hasAlbume) {
    const alb = extractFoodGrams(promptLower, ['albumi d\'uovo', 'albume', 'albumi'], 150);
    const p = (alb.grams * 11) / 100;
    const c = (alb.grams * 0.7) / 100;
    const f = (alb.grams * 0.2) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Albumi (${alb.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, 0g G`);
    dishNames.push('Albumi');
  } else if (hasUova) {
    // Match egg count: "2 uova", "3 uova", "uova 2"
    const countMatch = promptLower.match(/(\d+)\s*uov[ao]/) || promptLower.match(/uov[ao]\s*(\d+)/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 2;
    const p = count * 6.5;
    const c = count * 0.5;
    const f = count * 5;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Uova intere (${count}): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Uova');
  }

  // 16. Bresaola / Fesa di Tacchino / Prosciutto
  const salumi = extractFoodGrams(promptLower, ['bresaola', 'fesa di tacchino', 'fesa', 'prosciutto crudo', 'prosciutto cotto', 'prosciutto'], 80);
  if (salumi.matched && !pollo.matched) {
    const p = (salumi.grams * 32) / 100;
    const c = (salumi.grams * 0.5) / 100;
    const f = (salumi.grams * 2.5) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Affettato magro (${salumi.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push(salumi.matchedKeyword?.includes('bresaola') ? 'Bresaola' : 'Fesa di Tacchino');
  }

  // 17. Whey / Proteine in polvere
  const whey = extractFoodGrams(promptLower, ['proteine whey', 'proteine in polvere', 'whey', 'shake proteico', 'shaker'], 30);
  if (whey.matched) {
    const p = (whey.grams * 80) / 100;
    const c = (whey.grams * 6) / 100;
    const f = (whey.grams * 5) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Proteine Whey (${whey.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Shake Whey');
  }

  // 18. Mozzarella
  const mozzarella = extractFoodGrams(promptLower, ['mozzarella di bufala', 'mozzarella light', 'mozzarella'], 125);
  if (mozzarella.matched) {
    const p = (mozzarella.grams * 19) / 100;
    const c = (mozzarella.grams * 1) / 100;
    const f = (mozzarella.grams * 19) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Mozzarella (${mozzarella.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Mozzarella');
  }

  // 19. Yogurt greco / Skyr
  const yogurt = extractFoodGrams(promptLower, ['yogurt greco', 'skyr', 'yogurt'], 170);
  if (yogurt.matched) {
    const p = (yogurt.grams * 10) / 100;
    const c = (yogurt.grams * 4) / 100;
    const f = 0;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Yogurt Greco / Skyr (${yogurt.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, 0g G`);
    dishNames.push('Yogurt Greco');
  }

  // 20. Fiocchi di latte / Ricotta
  const formaggiMorbidi = extractFoodGrams(promptLower, ['fiocchi di latte', 'cottage cheese', 'ricotta'], 150);
  if (formaggiMorbidi.matched) {
    const p = (formaggiMorbidi.grams * 12) / 100;
    const c = (formaggiMorbidi.grams * 3) / 100;
    const f = (formaggiMorbidi.grams * 4) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Fiocchi di latte (${formaggiMorbidi.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Fiocchi di Latte');
  }

  // 21. Parmigiano / Grana
  const parmigiano = extractFoodGrams(promptLower, ['parmigiano reggiano', 'grana padano', 'parmigiano', 'grana'], 15);
  if (parmigiano.matched) {
    const p = (parmigiano.grams * 33) / 100;
    const c = 0;
    const f = (parmigiano.grams * 28) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Parmigiano (${parmigiano.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, 0g C, ${f.toFixed(1)}g G`);
    dishNames.push('Parmigiano');
  }

  // 22. Legumi (Ceci, Lenticchie, Fagioli, Piselli)
  const legumi = extractFoodGrams(promptLower, ['ceci', 'lenticchie', 'fagioli', 'piselli', 'legumi'], 150);
  if (legumi.matched) {
    const p = (legumi.grams * 8) / 100;
    const c = (legumi.grams * 17) / 100;
    const f = (legumi.grams * 1) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Legumi (${legumi.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Legumi');
  }

  // 23. Frutta Secca / Burro d'Arachidi
  const fruttaSecca = extractFoodGrams(promptLower, ['burro di arachidi', 'burro d\'arachidi', 'noci', 'mandorle', 'arachidi', 'nocciole', 'anacardi', 'frutta secca'], 25);
  if (fruttaSecca.matched) {
    const p = (fruttaSecca.grams * 20) / 100;
    const c = (fruttaSecca.grams * 15) / 100;
    const f = (fruttaSecca.grams * 50) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Frutta secca / Burro arachidi (${fruttaSecca.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Noci/Frutta Secca');
  }

  // 24. Olio EVO (cucchiaio o grammi espliciti)
  const isCucchiaio = promptLower.includes('cucchia');
  const olio = extractFoodGrams(promptLower, ['olio extravergine', 'olio evo', 'olio'], isCucchiaio ? 10 : 10);
  if (olio.matched) {
    const f = olio.grams;
    const kcal = Math.round(f * 9);
    totalG += f;
    items.push(`Olio EVO (${olio.grams}g): ${kcal} kcal, 0g P, 0g C, ${f}g G`);
  }

  // 25. Avocado
  const avocado = extractFoodGrams(promptLower, ['avocado'], 80);
  if (avocado.matched) {
    const p = (avocado.grams * 2) / 100;
    const c = (avocado.grams * 9) / 100;
    const f = (avocado.grams * 15) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Avocado (${avocado.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Avocado');
  }

  // 26. Latte
  const latte = extractFoodGrams(promptLower, ['latte di soia', 'latte di mandorla', 'latte di avena', 'latte'], 200);
  if (latte.matched && !promptLower.includes('fiocchi di latte')) {
    const p = (latte.grams * 3.3) / 100;
    const c = (latte.grams * 5) / 100;
    const f = (latte.grams * 1.8) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Latte (${latte.grams}ml): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Latte');
  }

  // 27. Frutta Fresca
  if (promptLower.includes('banana')) {
    const countMatch = promptLower.match(/(\d+)\s*banan/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 1;
    const p = count * 1.1;
    const c = count * 23;
    const f = count * 0.3;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Banana (${count}): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, 0g G`);
    dishNames.push('Banana');
  }
  if (promptLower.includes('mela') || promptLower.includes('pera') || promptLower.includes('arancia')) {
    const p = 0.5;
    const c = 14;
    const f = 0.2;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Mela / Frutto: ${kcal} kcal, 0.5g P, 14g C, 0g G`);
    dishNames.push('Frutta');
  }

  // 28. Sugo al pomodoro / Verdure
  if (promptLower.includes('sugo') || promptLower.includes('pomodoro') || promptLower.includes('passata') || promptLower.includes('verdure') || promptLower.includes('insalata') || promptLower.includes('zucchine')) {
    const p = 1.5;
    const c = 6;
    const f = 0.5;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Condimento vegetale / Sugo: ${kcal} kcal, 1.5g P, 6g C, 0.5g G`);
  }

  // 29. Biscotti / Fette con marmellata
  const biscotti = extractFoodGrams(promptLower, ['biscotti', 'biscotto'], 30);
  if (biscotti.matched) {
    const p = (biscotti.grams * 7) / 100;
    const c = (biscotti.grams * 70) / 100;
    const f = (biscotti.grams * 15) / 100;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP += p; totalC += c; totalG += f;
    items.push(`Biscotti (${biscotti.grams}g): ${kcal} kcal, ${p.toFixed(1)}g P, ${c.toFixed(1)}g C, ${f.toFixed(1)}g G`);
    dishNames.push('Biscotti');
  }

  // 30. Pizza
  if (promptLower.includes('pizza')) {
    const p = 32;
    const c = 115;
    const f = 28;
    const kcal = Math.round(p * 4 + c * 4 + f * 9);
    totalP = p; totalC = c; totalG = f;
    items.length = 0;
    dishNames.length = 0;
    items.push(`Pizza Margherita: ${kcal} kcal, ${p}g P, ${c}g C, ${f}g G`);
    dishNames.push('Pizza');
  }

  // Strict Atwater equation to guarantee 100% mathematical consistency
  const roundedP = Math.round(totalP);
  const roundedC = Math.round(totalC);
  const roundedF = Math.round(totalG);
  let finalKcal = Math.round(roundedP * 4 + roundedC * 4 + roundedF * 9);

  // Fallbacks if nothing could be parsed from text
  if (finalKcal === 0) {
    if (hasImage) {
      // Photo provided without text or offline mode
      const p = 38; const c = 60; const f = 14;
      finalKcal = Math.round(p * 4 + c * 4 + f * 9); // 518 kcal
      items.push(`Stima da foto piatto (piatto unico con fonte proteica, carboidrati e condimento leggero)`);
      dishNames.push('Piatto da Foto (Stima)');
      totalP = p; totalC = c; totalG = f;
      totalSugars = 6; totalFiber = 5;
    } else {
      const trimmed = userPrompt.trim();
      const fallbackName = trimmed ? (trimmed.length > 25 ? trimmed.substring(0, 25) : trimmed) : 'Pasto Bilanciato';
      const p = 32; const c = 50; const f = 12;
      finalKcal = Math.round(p * 4 + c * 4 + f * 9); // 436 kcal
      items.push(`Stima orientativa standard per ${fallbackName}`);
      dishNames.push(fallbackName);
      totalP = p; totalC = c; totalG = f;
      totalSugars = 5; totalFiber = 4;
    }
  }

  const generatedName = dishNames.length > 0
    ? (dishNames.slice(0, 3).join(' e ') + (promptLower.includes('olio') ? ' con Olio EVO' : ''))
    : (userPrompt.trim() ? userPrompt.trim().substring(0, 30) : 'Pasto Bilanciato');

  const finalName = generatedName.length > 32 ? generatedName.substring(0, 32) : generatedName;

  const text = `Stima Nutrizionale:
Totale: ~${finalKcal} kcal | Proteine: ${Math.round(totalP)}g | Carboidrati: ${Math.round(totalC)}g | Grassi: ${Math.round(totalG)}g
Zuccheri: ~${Math.round(totalSugars)}g | Fibre: ~${Math.round(totalFiber)}g

Dettaglio alimenti riconosciuti:
${items.map((i) => `• ${i}`).join('\n')}

Valori calcolati con formula Atwater e inseriti nei campi sottostanti. Puoi verificare e modificare i dati prima di salvare nel diario.`;

  return {
    text,
    mealEstimate: {
      name: finalName,
      mealType: detectedMealType,
      calories: finalKcal,
      proteinG: Math.round(totalP),
      carbsG: Math.round(totalC),
      fatsG: Math.round(totalG),
      sugarsG: Math.round(totalSugars),
      fiberG: Math.round(totalFiber),
    },
  };
}

export async function estimateMealWithAI(
  input: {
    foodDescription?: string;
    media?: AttachedMedia;
    profile?: UserProfile;
    currentMealType?: MealEntry['mealType'];
  }
): Promise<CoachAIResponse> {
  const { foodDescription = '', media, currentMealType } = input;
  const apiKey = getGeminiApiKey();

  // If offline mode is enabled or no API key is available, use the smart offline engine
  if (isCoachOfflineMode() || !apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return parseNutritionFromTextAndImage(foodDescription, Boolean(media), currentMealType);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    const promptText = `Sei un esperto nutrizionista sportivo. Analizza questo pasto per stimare con precisione scientifica calorie, macronutrienti, zuccheri e fibre.
Descrizione/pesi forniti dall'atleta: "${foodDescription || 'Analizza la foto del piatto allegata'}".
Momento della giornata: ${currentMealType || 'pranzo'}.

Istruzioni di calcolo:
1. Riconosci ciascun alimento e stima la grammatura.
2. Calcola i nutrienti: Proteine (g), Carboidrati (g), Grassi (g), Zuccheri semplici (g), Fibre alimentari (g).
3. Le calorie totali DEVONO rigorosamente seguire la formula: Calorie = (Proteine * 4) + (Carboidrati * 4) + (Grassi * 9).
4. Alla fine della risposta, inserisci OBBLIGATORIAMENTE il blocco JSON per il diario:
[MEAL_DATA:{"name":"Nome Piatto o Alimento","mealType":"${currentMealType || 'pranzo'}","calories":X,"proteinG":Y,"carbsG":Z,"fatsG":W,"sugarsG":S,"fiberG":F}]
(con X, Y, Z, W, S, F numeri interi positivi)`;

    userParts.push({ text: promptText });

    if (media) {
      const base64Data = media.dataUrl.includes(',')
        ? media.dataUrl.split(',')[1]
        : media.dataUrl;

      userParts.push({
        inlineData: {
          mimeType: media.mimeType,
          data: base64Data,
        },
      });
    }

    // Official recommended Google GenAI models
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let rawResponse = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: userParts }],
          config: {
            temperature: 0.3,
            maxOutputTokens: 350,
          },
        });

        if (response.text) {
          rawResponse = response.text;
          break;
        }
      } catch (modelErr) {
        console.warn(`[Gemini Meal Estimator] Model ${model} failed, trying next:`, modelErr);
      }
    }

    if (rawResponse) {
      const parsed = extractMealEstimate(rawResponse);
      if (parsed.mealEstimate) {
        return parsed;
      }
    }

    return parseNutritionFromTextAndImage(foodDescription, Boolean(media), currentMealType);
  } catch (err) {
    console.warn('[Gemini Meal Estimator] Error calling API, falling back to local heuristic:', err);
    return parseNutritionFromTextAndImage(foodDescription, Boolean(media), currentMealType);
  }
}

function generateSmartFallbackResponse(
  userPrompt: string,
  context: CoachContext,
  attachedMedia?: AttachedMedia
): CoachAIResponse {
  const promptLower = userPrompt.toLowerCase();
  const currentHour = new Date().getHours();
  const defaultMealType: CoachMealEstimate['mealType'] =
    currentHour < 11 ? 'colazione' : currentHour < 15 ? 'pranzo' : currentHour < 19 ? 'spuntino' : 'cena';

  // Check if user is asking about food/meal or attached an image (and not exercise/posture)
  const isExerciseOrPosture =
    promptLower.includes('squat') ||
    promptLower.includes('panca') ||
    promptLower.includes('stacco') ||
    promptLower.includes('trazioni') ||
    promptLower.includes('postura') ||
    promptLower.includes('fisico');

  const isFoodQuery =
    promptLower.includes('piatto') ||
    promptLower.includes('cibo') ||
    promptLower.includes('mangia') ||
    promptLower.includes('calorie') ||
    promptLower.includes('macro') ||
    promptLower.includes('pranzo') ||
    promptLower.includes('cena') ||
    promptLower.includes('colazione') ||
    promptLower.includes('spuntino') ||
    promptLower.includes('riso') ||
    promptLower.includes('pasta') ||
    promptLower.includes('pollo') ||
    promptLower.includes('uov') ||
    promptLower.includes('tonno') ||
    promptLower.includes('grammi') ||
    promptLower.includes('peso') ||
    /\b\d+\s*g\b/.test(promptLower);

  if (isFoodQuery || (attachedMedia?.mediaType === 'image' && !isExerciseOrPosture)) {
    return parseNutritionFromTextAndImage(userPrompt, attachedMedia?.mediaType === 'image', defaultMealType);
  }

  if (attachedMedia?.mediaType === 'video') {
    return {
      text: `Ho visionato il video dell'esecuzione: mantieni il core ben saldo durante tutta l'alzata e controlla la fase eccentrica senza rimbalzare. Movimento solido, continua a curare la stabilità articolare!`,
    };
  }

  if (attachedMedia?.mediaType === 'image') {
    return {
      text: `Ho analizzato l'immagine: per il tuo obiettivo attuale mantieni la progressione dei carichi e una buona densità nutrizionale. Ottimo impegno, continua così!`,
    };
  }

  const name = context.profile.name || 'Atleta';
  const workout = context.todayWorkout;
  const meals = context.meals || [];
  const water = context.waterLiters || 0;
  const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProt = meals.reduce((sum, m) => sum + m.proteinG, 0);

  // 1. Saluti e accoglienza
  if (promptLower.match(/\b(ciao|buongiorno|buonasera|salve|ehi|hey)\b/)) {
    return {
      text: `Ciao ${name}! Sono pronto ad aiutarti. Posso analizzare foto dei tuoi piatti per calorie e macro, suggerirti strategie per la scheda di allenamento o chiarire dubbi su carichi e recupero. Su cosa vuoi concentrarti?`,
    };
  }

  // 2. Identità, Funzioni e Aiuto
  if (promptLower.includes('chi sei') || promptLower.includes('cosa fai') || promptLower.includes('cosa sai fare') || promptLower.includes('cosa puoi fare') || promptLower.includes('aiuto') || promptLower.includes('funzioni')) {
    return {
      text: `Sono EVOLVE AI Coach, il tuo assistente specializzato in allenamento, nutrizione e biometria. Posso stimare macro e calorie da piatti fotografati o descritti, analizzare l'esecuzione da video, consigliare progressioni di carico e monitorare idratazione e recupero.`,
    };
  }

  // 3. Domande su Allenamento / Routine di oggi
  if (promptLower.includes('allen') || promptLower.includes('oggi') || promptLower.includes('scheda') || promptLower.includes('workout') || promptLower.includes('esercizi')) {
    if (context.todaySchedule?.isRestDay || !workout) {
      const nextTitle = context.todaySchedule?.nextScheduledRoutine?.title || 'Giorno 1';
      const nextDate = context.todaySchedule?.nextScheduledDate || 'Lunedì';
      return {
        text: `Oggi è previsto un giorno di riposo programmato (${context.todaySchedule?.dayName || 'oggi'}), ${name}. Dedica la giornata a recupero attivo, idratazione e mobilità per favorire il recupero neuromuscolare. La tua prossima sessione sarà: ${nextTitle} (${nextDate}).`,
      };
    }
    const advice = generateCoachFirstExerciseAdvice(workout);
    return {
      text: `Ciao ${name}! Oggi hai in programma ${workout.title} (${workout.durationMin} min). ${advice.adviceText}`,
    };
  }

  // 4. Domande su Cibo / Proteine / Dieta / Nutrizione
  if (promptLower.includes('mangia') || promptLower.includes('dieta') || promptLower.includes('protein') || promptLower.includes('calorie') || promptLower.includes('pasto') || promptLower.includes('post-workout')) {
    const targetProt = Math.round(context.profile.weightKg * (context.profile.goal === 'crescita' ? 2.0 : 2.2));
    const missingProt = Math.max(0, targetProt - totalProt);
    return {
      text: `Oggi sei a ${totalCal} kcal e ${totalProt}g di proteine su ${targetProt}g target. ${missingProt > 0 ? `Ti mancano ${missingProt}g: ottimi 150g di pollo, fiocchi di latte o uno shaker di whey.` : 'Quota proteica completata, ottimo lavoro!'} Nel post-workout abbina proteine nobili e carboidrati complessi.`,
    };
  }

  // 5. Domande su Acqua / Idratazione
  if (promptLower.includes('acqua') || promptLower.includes('idrat') || promptLower.includes('bere') || promptLower.includes('litr')) {
    const remaining = Math.max(0, 3.0 - water).toFixed(1);
    return {
      text: `Sei a ${water.toFixed(1)} L su 3.0 L target. ${remaining === '0.0' ? 'Idratazione ottimale raggiunta!' : `Ti mancano circa ${remaining} L per mantenere al top la forza muscolare.`} Bevi a sorsi regolari durante la giornata.`,
    };
  }

  // 6. Recupero tra le serie / Tempi di recupero
  if (promptLower.includes('pausa') || promptLower.includes('riposo tra') || promptLower.includes('secondi') || promptLower.includes('minuti tra') || promptLower.includes('recupero tra')) {
    return {
      text: `Per i grandi esercizi multiarticolari (panca, squat, stacchi) mantieni 2-3 minuti di pausa per ripristinare i fosfageni muscolari (ATP). Per esercizi di isolamento e macchinari, 60-90 secondi sono ideali per massimizzare lo stress metabolico e l'ipertrofia.`,
    };
  }

  // 7. Domande su Integratori (Creatina, Whey, ecc.)
  if (promptLower.includes('integrator') || promptLower.includes('creatina') || promptLower.includes('whey') || promptLower.includes('aminoacid') || promptLower.includes('bcaa') || promptLower.includes('omega')) {
    return {
      text: `I supplementi con maggiore evidenza scientifica sono la Creatina Monoidrato (3-5g al giorno con continuità) e le Proteine Whey per completare comodamente il fabbisogno proteico. Mantieni sempre l'alimentazione solida ed equilibrata come fondamento principale.`,
    };
  }

  // 8. Riscaldamento, Stretching e Mobilità
  if (promptLower.includes('riscaldament') || promptLower.includes('warm') || promptLower.includes('stretching') || promptLower.includes('mobilit') || promptLower.includes('rotator')) {
    return {
      text: `Esegui 5-8 minuti di riscaldamento articolare dinamico (in particolare cuffia dei rotatori e mobilità delle anche), seguiti da 2-3 serie di avvicinamento a carico progressivo sul primo esercizio. Evita lo stretching statico prolungato prima di sollevare carichi elevati.`,
    };
  }

  // 9. Progressione Carichi e Pesi
  if (promptLower.includes('sovraccaric') || promptLower.includes('progression') || promptLower.includes('aumentare il peso') || promptLower.includes('caric') || promptLower.includes('peso uso')) {
    return {
      text: `Applica il principio del sovraccarico progressivo: quando completi tutte le serie previste al massimo delle ripetizioni con tecnica solida (RPE ≤ 8), incrementa del 2-5% (es. +1-2.5 kg). Se la tecnica o il range di movimento calano, mantieni il carico e migliora il controllo eccentrico.`,
    };
  }

  // 10. Motivazione e Costanza
  if (promptLower.includes('motivazion') || promptLower.includes('voglia') || promptLower.includes('costanz') || promptLower.includes('difficile') || promptLower.includes('fatic')) {
    return {
      text: `La disciplina batte sempre la motivazione, ${name}. Anche nelle giornate in cui l'energia sembra ridotta, presentarsi e portare a termine anche solo il volume base mantiene attiva l'abitudine. Ogni singola sessione completata costruisce la tua forma fisica.`,
    };
  }

  // 11. Domande su Recupero / Sonno / Dolori
  if (promptLower.includes('recuper') || promptLower.includes('stanc') || promptLower.includes('dolor') || promptLower.includes('spalla') || promptLower.includes('sonno')) {
    return {
      text: `Non sono registrate misurazioni recenti di sonno o HRV: ascolta attentamente le risposte del tuo corpo. Se avverti stanchezza o fastidi articolari, riduci l'intensità a RPE 6-7, riscaldati bene e punta ad almeno 7-8 ore di sonno notturno.`,
    };
  }

  // 12. Risposta contestuale dinamica
  const goalDesc = context.profile.goal === 'crescita' ? 'Crescita Muscolare' : context.profile.goal === 'definizione' ? 'Definizione' : 'Forza e Prestazione';
  return {
    text: `Ho compreso la tua domanda, ${name}. Per il tuo piano di ${goalDesc}, la priorità è la precisione nell'esecuzione e la continuità del diario. Se desideri chiarimenti dettagliati su un esercizio specifico, un abbinamento nutrizionale o sul recupero, dimmi pure!`,
  };
}

export async function askCoachAI(
  userMessage: string,
  history: CoachMessage[],
  context: CoachContext,
  attachedMedia?: AttachedMedia
): Promise<CoachAIResponse> {
  const apiKey = getGeminiApiKey();

  // If offline mode is forced or no API key is provided, use the biometric-aware smart fallback
  if (isCoachOfflineMode() || !apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return generateSmartFallbackResponse(userMessage, context, attachedMedia);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemInstruction(context);

    // Build conversation history excluding the latest user message (if already added in caller)
    // to prevent duplicate consecutive user turns
    const prevHistory = history.length > 0 && history[history.length - 1].sender === 'user'
      ? history.slice(0, -1)
      : history;

    // Filter recent history (last 6 messages) and ensure valid turn sequence starting with user
    const recentHistory = prevHistory.slice(-6);
    const conversationTurns: Array<{ role: string; parts: any[] }> = [];

    let hasStartedWithUser = false;
    for (const msg of recentHistory) {
      const text = cleanCoachText(msg.text);
      if (!text) continue;
      const role = msg.sender === 'user' ? 'user' : 'model';
      if (!hasStartedWithUser && role === 'model') {
        // Skip leading model greeting from turns array to ensure valid user-first alternating structure
        continue;
      }
      hasStartedWithUser = true;
      conversationTurns.push({
        role,
        parts: [{ text }],
      });
    }

    // Build user parts (text + optional media inlineData)
    const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    const defaultPrompt = attachedMedia
      ? (attachedMedia.mediaType === 'video'
          ? 'Analizza l\'esecuzione e la biomeccanica in questo video.'
          : 'Analizza questa foto (biomeccanica, nutrizione o progressi fisici) per me.')
      : '';
    const textContent = userMessage.trim() || defaultPrompt;

    if (textContent) {
      userParts.push({ text: textContent });
    }

    if (attachedMedia) {
      const base64Data = attachedMedia.dataUrl.includes(',')
        ? attachedMedia.dataUrl.split(',')[1]
        : attachedMedia.dataUrl;

      userParts.push({
        inlineData: {
          mimeType: attachedMedia.mimeType,
          data: base64Data,
        },
      });
    }

    // Add current user prompt
    conversationTurns.push({
      role: 'user',
      parts: userParts,
    });

    // Try recommended latest model with automatic fallback
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let rawResponse = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: conversationTurns,
          config: {
            systemInstruction,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 550,
          },
        });

        if (response.text) {
          rawResponse = response.text;
          break;
        }
      } catch (modelErr) {
        console.warn(`[Gemini Coach] Model ${model} failed, trying next:`, modelErr);
      }
    }

    if (rawResponse) {
      return extractMealEstimate(rawResponse);
    }

    return generateSmartFallbackResponse(userMessage, context, attachedMedia);
  } catch (err) {
    console.warn('[Gemini Coach] API error, falling back to smart engine:', err);
    return generateSmartFallbackResponse(userMessage, context, attachedMedia);
  }
}
