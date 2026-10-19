# AGENTS.md — Linee Guida e Architettura EVOLVE

Benvenuto nel repository di **EVOLVE**, l'applicazione avanzata di allenamento, nutrizione, tracciamento biometrico e Coach AI multimodale. Questo documento descrive in dettaglio lo stato, la persistenza, i componenti core, le regole matematiche condivise e le convenzioni per gli agenti AI.

---

## 1. Mappa dei Componenti & Responsabilità

| Componente | File Sorgente | Ruolo Principale |
| :--- | :--- | :--- |
| **Home Dashboard** | [`src/components/ScreenHomeDashboard.tsx`](src/components/ScreenHomeDashboard.tsx) | Cruscotto biometrico giornaliero (Recupero, Obiettivo settimanale, Workout del giorno, Calorie & Macro, Idratazione rapida). Mostra il badge di stato dati. |
| **Trend & Analitica** | [`src/components/ScreenTrend.tsx`](src/components/ScreenTrend.tsx) | Analisi su 3 orizzonti temporali (**Settimana**, **Mese**, **Anno**). Ciclizzazione calorica ON/OFF, conformità giorni idratazione, evoluzione peso, griglia stile GitHub. Include il modal di trasparenza formule. |
| **Notifiche Biometriche** | [`src/components/TopHeader.tsx`](src/components/TopHeader.tsx) | Testata superiore con indicatore notifiche in tempo reale. Genera messaggi dinamici coerenti con i dati giornalieri della Home, accompagnati da timestamp. |
| **Impostazioni Profilo** | [`src/components/SettingsModal.tsx`](src/components/SettingsModal.tsx) | Gestione biometria (peso, altezza, età, sesso), giorni settimanali, preferenze alimentari. Calcola dinamicamente il target nutrizionale suggerito (Harris-Benedict TDEE) e chiarisce il target attivo nel diario. |
| **Coach AI Multimodale** | [`src/components/ScreenCoachAI.tsx`](src/components/ScreenCoachAI.tsx) | Chat assistente AI con analisi di testo, immagini e video brevi (&le;30s). Stima nutrizionale 1-click salvabile direttamente nel diario alimentare. |
| **Diario Alimentare & Modale Pasto** | [`src/components/ScreenDieta.tsx`](src/components/ScreenDieta.tsx), [`src/components/AddMealModal.tsx`](src/components/AddMealModal.tsx) | Registro pasti con Target Attivo Diario (2.850 kcal/die). Modale di registrazione con stima multimodale IA integrata: acquisizione foto piatto, indicazione cibo e grammature, calcolo automatico e precompilazione istantanea dei campi nutrizionali. |
| **Workout** | [`src/components/ScreenWorkout.tsx`](src/components/ScreenWorkout.tsx) | Schede di allenamento suddivise per microcicli, con esercizi guidati e tracciamento carichi. |
| **Foto Progressi** | [`src/components/ScreenFoto.tsx`](src/components/ScreenFoto.tsx) | Galleria visuale progressi fisici con persistenza IndexedDB e filtri per tag (fronte, retro, fianco). |

---

## 2. Stato & Persistenza

L'applicazione segue un flusso di stato trasparente e reattivo, con persistenza locale e **nessuna migrazione distruttiva**:

### Chiavi LocalStorage
- `evolve_user_profile`: Oggetto `UserProfile` con dati anagrafici, antropometrici e preferenze.
- `evolve_workout_routines`: Array `WorkoutRoutine[]` con schede personalizzate ed esercizi.
- `evolve_hydration_history`: Mappa `Record<string, number>` indicizzata per data locale `YYYY-MM-DD`.
- `evolve_last_hydration_date`: Timestamp per verificare il rollover giornaliero (reset automatico a 0.0 L a mezzanotte).
- `evolve_coach_chat_history`: Cronologia messaggi del Coach AI (`CoachMessage[]`).
- `evolve_theme`: Preferenza tema (`'dark' | 'light'`).
- `evolve_home_collapsed_*`: Booleani di memoria per le sezioni richiudibili della Home.

### Persistenza Multimediale (IndexedDB)
- `src/utils/mediaStorage.ts`: Gestisce il database locale IndexedDB (`evolve_media_store`) per conservare foto e video senza saturare i 5MB del LocalStorage.

---

## 3. Invarianti Matematiche & Formule Condivise

Tutti i calcoli aggregati risiedono in [`src/utils/metrics.ts`](src/utils/metrics.ts) e [`src/utils/hydration.ts`](src/utils/hydration.ts):

### A. Conformità Giorni vs Aderenza Volume
- **Conformità Giorni (Days Compliance)**: `(Giorni a target) / (Giorni trascorsi)`
  - Formula: `calculateComplianceRate(numerator, denominator)`
  - Formattazione: 1 decimale con virgola e percentuale (es. `5/7 = 71,4%`, `28/30 = 93,3%`).
  - Denominatore zero o non valido: restituisce `isValid: false`, `formattedPct: '0,0%'` e label `'Non disponibile'`. Nessun crash o valore `NaN` / `Infinity`.
- **Aderenza Volume (Volume Adherence)**: `(Litri medi assunti) / (Target giornaliero)`
  - Formula: `calculateVolumeAdherence(actualAvg, goalLiters)`
  - Formattazione: es. `84,0%` o `96,0%`.
  - **Regola di Design**: Non confondere mai la percentuale dei giorni con la percentuale di volume. Se si mostra `X/Y giorni`, la percentuale adiacente deve essere rigorosamente il tasso dei giorni.

### B. Ciclizzazione Calorica ON / OFF
- **Target Attivo Diario**: `2.850 kcal/die` (per il profilo standard Luca, calcolato da `calculateTargetNutrition`).
- **Formula Ciclizzazione**:
  - Giorni di allenamento (ON): `2.900 kcal/die` (+50 kcal per favorire il recupero e le prestazioni).
  - Giorni di riposo (OFF): `2.783 kcal/die` (~2.780 kcal).
  - Media ponderata settimanale: `(4 × 2.900 + 3 × 2.783) / 7 = 2.850 kcal/die`.
  - Risultato: il target settimanale coincide esattamente con il diario alimentare.

### C. Esclusione Date Future dai Consuntivi
- Nei riepiloghi settimanali, mensili e annuali, **le date e i mesi futuri sono rigorosamente esclusi da medie e totali**.
- Nei grafici a barre, i mesi futuri sono evidenziati con binario tratteggiato e la dicitura esplicita `"Non disponibile"` / `"Data Futura"`.
- Nel consuntivo annuale a Ottobre: il denominatore è 10 mesi (Gen - Ott), non 12!

### D. Distinzione Dati Assenti vs Zero Registrato
- `undefined` / `null`: Giorno non registrato &rarr; mostra `"Non disponibile"`.
- `0.0`: Giorno registrato con apporto nullo &rarr; mostra `"0.0 L (Registrato)"`.
- `> 0`: Giorno registrato con apporto &rarr; mostra `"X.X L"`.

### E. Coerenza tra Home e Notifiche
- Le notifiche biometriche in `TopHeader.tsx` sono calcolate tramite `generateLiveNotifications` a partire dai valori esatti della Home.
- Se la Home riporta `0.0 L`, la notifica indica esattamente `0.0 L su 3.0 L (0%)`.
- Ogni notifica presenta un timestamp chiaro (es. `Oggi, HH:mm`).

---

## 4. Design & Linee Guida Visuali

- **Palette**: Dark (`#191c1c` testo/dark elements), Verde Lime (`#84cc16`, `#386a00` accenti e PR), Azzurro Acqua (`#0284c7`, `#38bdf8`), Sfondi neutri morbidi (`#f8faf9`, `#f2f4f3`).
- **Tipografia**: Sans-serif ad alta leggibilità, tracking stretto sui numeri grandi (`tracking-tight`), pesi `font-extrabold` sui valori principali.
- **Badge Dati Demo**: Segnalazione visibile che informa l'utente sull'uso di dati dimostrativi calibrati affiancati alle registrazioni reali.

---

## 5. Vincoli di Sicurezza & Costi API

- **Free Tier Gemini**: L'integrazione AI in `src/services/geminiCoach.ts` opera rigorosamente nel tier gratuito.
- Nessuna chiamata deve introdurre piani a pagamento o dipendenze cloud terze a pagamento.
- I file multimediali video sono limitati a un massimo di 30 secondi e compressi lato client prima dell'invio.

---

## 6. Testing & Verifica

Per eseguire la suite di test automatizzati:
```bash
# Esegue tutti i test unitari (metrics, hydration, fitness logic)
npm test

# Controllo tipi TypeScript
npm run lint

# Build di produzione Vite
npm run build
```
