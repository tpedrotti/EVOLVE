export interface ExerciseGuide {
  category: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  tempo: string; // e.g. "3-0-1-0"
  tempoDescription: string;
  formCues: string[];
  breathing: string;
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  // ── GIORNO 1: PETTO, TRICIPITI & AVAMBRACCI ─────────────────────────
  'chest-press': {
    category: 'chest_press',
    name: 'Chest Press convergente',
    primaryMuscle: 'Grande Pettorale',
    secondaryMuscles: ['Deltoidi anteriori', 'Tricipiti'],
    tempo: '3-0-1-0',
    tempoDescription: '3s discesa lenta · 0s pausa · 1s spinta esplosiva',
    formCues: [
      'Scapole sempre addotte e depresse contro lo schienale durante tutta la spinta.',
      'Gomiti a circa 45-60° rispetto al tronco, mai aperti a 90° per proteggere le spalle.',
      'Spingi con le mani fino a sfiorare la contrazione massima senza staccare le spalle.',
    ],
    breathing: 'Inspira durante la discesa dei manici, espira energicamente durante la spinta.',
  },
  'incline-bench': {
    category: 'incline_bench',
    name: 'Panca inclinata 30° con manubri',
    primaryMuscle: 'Pettorale Clavicolare (Fascio Alto)',
    secondaryMuscles: ['Deltoidi anteriori', 'Tricipiti'],
    tempo: '3-1-1-0',
    tempoDescription: '3s discesa controllata · 1s massimo allungamento · 1s spinta',
    formCues: [
      'Inclinazione ideale a 30° per massimizzare il fascio clavicolare senza sovraccaricare i deltoidi.',
      'Scendi finché i manubri non sono all’altezza del petto alto sentendo un ottimo allungamento.',
      'Fai convergere i manubri in alto a triangolo senza farli sbattere tra loro.',
    ],
    breathing: 'Inspira scendendo lentamente, espira completando la spinta in alto.',
  },
  'pec-deck': {
    category: 'pec_deck',
    name: 'Pec Deck / Chest Fly Machine',
    primaryMuscle: 'Pettorale Centrale & Serno-Costale',
    secondaryMuscles: ['Deltoidi anteriori'],
    tempo: '2-1-1-1',
    tempoDescription: '2s apertura · 1s stretch · 1s chiusura · 1s contrazione di picco',
    formCues: [
      'Gomiti leggermente flessi e bloccati alla stessa angolazione per tutta la traiettoria.',
      'Concentrati sull’avvicinare i bicipiti al petto anziché spingere con le mani.',
      'Mantieni il petto in fuori e le spalle incollate al sedile.',
    ],
    breathing: 'Inspira aprendo le braccia, espira stringendo i cuscini al centro.',
  },
  'tricep-pushdown': {
    category: 'tricep_pushdown',
    name: 'Pushdown tricipiti con barra / corda',
    primaryMuscle: 'Tricipiti (Capo Laterale & Mediale)',
    secondaryMuscles: ['Anconeo'],
    tempo: '2-0-1-1',
    tempoDescription: '2s risalita controllata · 1s spinta · 1s blocco in basso',
    formCues: [
      'Gomiti inchiodati ai fianchi: non farli oscillare avanti e indietro durante il movimento.',
      'Busto leggermente inclinato in avanti a schiena dritta e core attivo.',
      'Estendi completamente l’avambraccio verso il basso spremendo i tricipiti.',
    ],
    breathing: 'Espira spingendo verso il basso, inspira tornando controllato a 90°.',
  },
  'tricep-overhead': {
    category: 'tricep_overhead',
    name: 'Estensioni tricipiti sopra la testa alla macchina',
    primaryMuscle: 'Tricipite (Capo Lungo in Allungamento)',
    secondaryMuscles: ['Core'],
    tempo: '3-1-1-0',
    tempoDescription: '3s discesa dietro la nuca · 1s stretch profondo · 1s distensione',
    formCues: [
      'Posizione sopra la testa per porre il capo lungo del tricipite in massimo pre-allungamento.',
      'Mantieni i gomiti stretti e stabili, evitando che si allarghino eccessivamente all’esterno.',
      'Estendi fino al lockout completo sopra la testa.',
    ],
    breathing: 'Inspira mentre i gomiti si piegano dietro la testa, espira distendendo.',
  },
  'wrist-curl': {
    category: 'wrist_curl',
    name: 'Wrist Curl con manubri',
    primaryMuscle: 'Flessori dell’Avambraccio',
    secondaryMuscles: ['Presa della mano'],
    tempo: '2-0-1-1',
    tempoDescription: '2s discesa controllata · 1s flessione del polso · 1s squeeze',
    formCues: [
      'Avambracci ben appoggiati sulla panca o sulle cosce con i polsi liberi oltre il bordo.',
      'Muovi esclusivamente l’articolazione del polso senza sollevare l’avambraccio.',
      'Controlla il peso per tutto il range senza movimenti a scatto.',
    ],
    breathing: 'Respira con ritmo costante e naturale a ogni ripetizione.',
  },

  // ── GIORNO 2: SCHIENA, BICIPITI & AVAMBRACCI ────────────────────────
  'lat-machine': {
    category: 'lat_machine',
    name: 'Lat Machine presa neutra / prona',
    primaryMuscle: 'Gran Dorsale (Ampiezza)',
    secondaryMuscles: ['Grande Rotondo', 'Bicipiti', 'Romboidei'],
    tempo: '3-0-1-1',
    tempoDescription: '3s risalita controllata · 1s trazione · 1s squeeze clavicola',
    formCues: [
      'Inizia il movimento deprimendo le scapole verso il basso prima di piegare le braccia.',
      'Porta la barra verso la parte alta del petto (clavicola), aprendo il torace.',
      'Visualizza di tirare con i gomiti verso le tasche posteriori dei pantaloni.',
    ],
    breathing: 'Espira tirando la barra al petto, inspira accompagnando la risalita.',
  },
  'machine-row': {
    category: 'machine_row',
    name: 'Rematore Chest-Supported Machine',
    primaryMuscle: 'Dorsali & Trapezio Medio (Spessore)',
    secondaryMuscles: ['Romboidei', 'Bicipiti', 'Deltoidi posteriori'],
    tempo: '2-1-1-1',
    tempoDescription: '2s allungamento · 1s stretch · 1s trazione · 1s squeeze',
    formCues: [
      'Petto saldamente appoggiato al cuscino per annullare ogni compenso lombare.',
      'Tira i gomiti indietro radendo i fianchi, serrando le scapole a fine corsa.',
      'Sfrutta l’appoggio per ottenere un allungamento completo e sicuro in fase eccentrica.',
    ],
    breathing: 'Espira tirando verso di te, inspira tornando in allungamento.',
  },
  'pulley': {
    category: 'pulley',
    name: 'Pulley basso con triangolo / staffe',
    primaryMuscle: 'Gran Dorsale Basso & Spessore Schiena',
    secondaryMuscles: ['Erettori spinali', 'Bicipiti', 'Avambracci'],
    tempo: '2-0-1-1',
    tempoDescription: '2s ritorno · 1s trazione verso l’ombelico · 1s contrazione',
    formCues: [
      'Ginocchia leggermente flesse e schiena solida con curva lombare fisiologica.',
      'Tira la maniglia verso l’ombelico mantenendo le spalle basse lontano dalle orecchie.',
      'Evita di oscillare esageratamente con il busto: muovi braccia e scapole.',
    ],
    breathing: 'Espira mentre porti la maniglia all’addome, inspira allungando in avanti.',
  },
  'reverse-pec-deck': {
    category: 'reverse_pec_deck',
    name: 'Reverse Pec Deck / Alzate Posteriori',
    primaryMuscle: 'Deltoide Posteriore',
    secondaryMuscles: ['Romboidei', 'Trapezio medio'],
    tempo: '2-0-1-1',
    tempoDescription: '2s ritorno · 1s apertura posteriore · 1s picco contrazione',
    formCues: [
      'Regola il sedile in modo che le maniglie siano esattamente all’altezza delle spalle.',
      'Gomiti leggermente flessi e bloccati: spingi all’indietro con i gomiti.',
      'Non retrarre eccessivamente le scapole se vuoi isolare al massimo il deltoide posteriore.',
    ],
    breathing: 'Espira aprendo le braccia all’indietro, inspira tornando controllato.',
  },
  'hyperextension': {
    category: 'hyperextension',
    name: 'Hyperextension panca 45°',
    primaryMuscle: 'Glutei, Femorali & Erettori Spinali',
    secondaryMuscles: ['Core posteriore'],
    tempo: '3-1-1-1',
    tempoDescription: '3s discesa · 1s allungamento · 1s risalita · 1s squeeze glutei',
    formCues: [
      'Cuscino posizionato appena sotto le creste iliache per permettere la flessione dell’anca.',
      'Piega i fianchi (hip hinge) mantenendo la colonna vertebrale in linea neutra.',
      'Attiva e stringi forte i glutei per risalire fino all’allineamento tronco-gambe.',
    ],
    breathing: 'Inspira scendendo a 90°, espira risalendo fino a formare una linea retta.',
  },
  'bicep-curl': {
    category: 'bicep_curl',
    name: 'Curl con manubri su panca inclinata / al cavo',
    primaryMuscle: 'Bicipite Brachiale (Capo Lungo & Corto)',
    secondaryMuscles: ['Brachiale', 'Brachioradiale'],
    tempo: '3-0-1-1',
    tempoDescription: '3s discesa lenta · 1s salita · 1s contrazione picco',
    formCues: [
      'Panca inclinata a 60°: lascia cadere le braccia perpendicolari al pavimento per massimo stretch.',
      'Fletti l’avambraccio supinando il polso (palmo verso l’alto) a metà traiettoria.',
      'Mantieni i gomiti fermi nello spazio, senza portarli in avanti a inizio alzata.',
    ],
    breathing: 'Espira flettendo il braccio, inspira scendendo in 3 secondi controllati.',
  },
  'reverse-curl': {
    category: 'reverse_curl',
    name: 'Reverse Curl / Hammer Curl con barra EZ o corda',
    primaryMuscle: 'Brachioradiale & Brachiale',
    secondaryMuscles: ['Bicipite', 'Avambracci'],
    tempo: '2-0-1-1',
    tempoDescription: '2s discesa · 1s salita · 1s squeeze',
    formCues: [
      'Presa prona (palmi verso il basso) o neutra (a martello) per spostare il focus sull’avambraccio.',
      'Gomiti serrati ai fianchi e polsi rigidi e neutri, senza fletterli.',
      'Movimento rigoroso senza rimbalzi o slanci del busto.',
    ],
    breathing: 'Espira durante la salita, inspira durante la discesa.',
  },

  // ── GIORNO 3: SPALLE, BRACCIA & AVAMBRACCI ──────────────────────────
  'shoulder-press': {
    category: 'shoulder_press',
    name: 'Shoulder Press Machine / Manubri',
    primaryMuscle: 'Deltoide Anteriore & Laterale',
    secondaryMuscles: ['Tricipiti', 'Trapezio superiore'],
    tempo: '3-0-1-0',
    tempoDescription: '3s discesa alle orecchie · 1s spinta verticale',
    formCues: [
      'Schienale quasi a 90° con leggero arco lombare e piedi ben piantati.',
      'Scendi finché le maniglie non raggiungono l’altezza degli occhi o delle orecchie.',
      'Spingi verso l’alto senza bloccare violentemente i gomiti a fine corsa.',
    ],
    breathing: 'Espira spingendo verso l’alto, inspira scendendo controllato.',
  },
  'lateral-raise': {
    category: 'lateral_raise',
    name: 'Alzate laterali ai cavi o manubri',
    primaryMuscle: 'Deltoide Laterale (Larghezza Spalle)',
    secondaryMuscles: ['Trapezio', 'Sovraspinato'],
    tempo: '2-1-1-1',
    tempoDescription: '2s discesa lenta · 1s alzata · 1s fermo a 90°',
    formCues: [
      'Leggera inclinazione del busto in avanti (10-15°) per allineare il fascio laterale.',
      'Solleva con i gomiti, non con le mani: pensa a versare l’acqua da una brocca.',
      'Fermati all’altezza delle spalle (90°) per non scaricare il lavoro sul trapezio.',
    ],
    breathing: 'Espira sollevando le braccia, inspira scendendo lentamente.',
  },

  // ── GIORNO 4: GAMBE (QUADS, HAMSTRINGS & CALVES) ───────────────────
  'leg-press': {
    category: 'leg_press',
    name: 'Leg Press 45°',
    primaryMuscle: 'Quadricipiti & Glutei',
    secondaryMuscles: ['Femorali', 'Adduttori'],
    tempo: '3-1-1-0',
    tempoDescription: '3s discesa profonda · 1s fermo a 90° · 1s spinta',
    formCues: [
      'Bacino e zona lombare incollati al sedile: non staccare MAI il sacro in massima flessione.',
      'Piedi a larghezza spalle al centro della pedana, ginocchia in linea con le punte dei piedi.',
      'Spingi con tutta la pianta del piede senza iperestendere le ginocchia a fine corsa.',
    ],
    breathing: 'Inspira scendendo a 90°, espira spingendo la pedana.',
  },
  'romanian-deadlift': {
    category: 'romanian_deadlift',
    name: 'Romanian Deadlift al multipower o bilanciere',
    primaryMuscle: 'Ischiocrurali (Femorali) & Glutei',
    secondaryMuscles: ['Erettori spinali', 'Core'],
    tempo: '3-1-1-0',
    tempoDescription: '3s discesa lenta · 1s stretch femorali · 1s risalita',
    formCues: [
      'Ginocchia sbloccate ma fisse (angolo di circa 15°): il movimento è unicamente dell’anca.',
      'Sposta il bacino all’indietro come se volessi toccare una parete dietro di te.',
      'Bilanciere costantemente aderente alle cosce e agli stinchi; schiena perfettamente dritta.',
    ],
    breathing: 'Inspira scendendo sotto il ginocchio, espira stringendo i glutei per risalire.',
  },
  'leg-curl': {
    category: 'leg_curl',
    name: 'Leg Curl seduto',
    primaryMuscle: 'Ischiocrurali (Bicipite Femorale)',
    secondaryMuscles: ['Gastrocnemio'],
    tempo: '2-0-1-1',
    tempoDescription: '2s risalita controllata · 1s flessione · 1s contrazione picco',
    formCues: [
      'Regola il cuscinetto di blocco sopra le cosce ben stretto per non far alzare le gambe.',
      'Rullo posteriore appena sopra i talloni (tendine d’Achille).',
      'Fletti le ginocchia verso il basso più possibile, trattenendo 1 secondo la contrazione.',
    ],
    breathing: 'Espira flettendo la gamba verso il basso, inspira risalendo in 2 secondi.',
  },
  'leg-extension': {
    category: 'leg_extension',
    name: 'Leg Extension',
    primaryMuscle: 'Quadricipiti (Retto Femorale & Vasti)',
    secondaryMuscles: ['Tendine rotuleo'],
    tempo: '2-0-1-1',
    tempoDescription: '2s discesa controllata · 1s estensione · 1s squeeze quadricipite',
    formCues: [
      'Allinea il fulcro di rotazione della macchina esattamente all’articolazione del ginocchio.',
      'Schiena aderente allo schienale e mani che tirano le maniglie laterali per bloccare il bacino.',
      'Distendi fino alla completa estensione tenendo un secondo la massima contrazione.',
    ],
    breathing: 'Espira distendendo le gambe in alto, inspira scendendo senza far toccare i pesi.',
  },
  'calf-raise': {
    category: 'calf_raise',
    name: 'Calf Raise in piedi / seduto',
    primaryMuscle: 'Polpacci (Gastrocnemio & Soleo)',
    secondaryMuscles: ['Flessori plantari'],
    tempo: '3-1-1-1',
    tempoDescription: '3s discesa · 1s massimo allungamento · 1s salita · 1s contrazione in punta',
    formCues: [
      'Avampiede solido sul bordo della pedana con tallone completamente libero di scendere.',
      'Scendi fino al massimo allungamento possibile e mantieni il fermo di 1 secondo per azzerare il rimbalzo elastico.',
      'Sali spingendo forte sull’alluce contraendo al massimo il polpaccio in alto.',
    ],
    breathing: 'Espira salendo sulle punte, inspira scendendo in allungamento profondo.',
  },
};

/**
 * Returns biomechanical guide and animation category for any exercise name
 */
export const getExerciseGuide = (exerciseName: string, muscleGroup: string = ''): ExerciseGuide => {
  const n = exerciseName.toLowerCase();

  // Match specific exercises
  if (n.includes('inclinat') && (n.includes('panca') || n.includes('manubr'))) {
    return EXERCISE_GUIDES['incline-bench'];
  }
  if (n.includes('pec deck') || n.includes('chest fly') || n.includes('croci')) {
    return EXERCISE_GUIDES['pec-deck'];
  }
  if (n.includes('chest press') || n.includes('panca piana') || n.includes('bench press')) {
    return EXERCISE_GUIDES['chest-press'];
  }
  if (n.includes('overhead') || (n.includes('estensioni') && n.includes('testa'))) {
    return EXERCISE_GUIDES['tricep-overhead'];
  }
  if (n.includes('pushdown') || n.includes('macchinario per tricipiti')) {
    return EXERCISE_GUIDES['tricep-pushdown'];
  }
  if (n.includes('wrist') || n.includes('avambracci')) {
    return EXERCISE_GUIDES['wrist-curl'];
  }
  if (n.includes('lat machine') || n.includes('trazioni') || n.includes('pull-up')) {
    return EXERCISE_GUIDES['lat-machine'];
  }
  if (n.includes('rematore') || n.includes('chest-supported') || n.includes('row')) {
    return EXERCISE_GUIDES['machine-row'];
  }
  if (n.includes('pulley')) {
    return EXERCISE_GUIDES['pulley'];
  }
  if (n.includes('reverse pec') || (n.includes('alzate') && n.includes('posteri'))) {
    return EXERCISE_GUIDES['reverse-pec-deck'];
  }
  if (n.includes('hyperextension') || n.includes('iperestensioni')) {
    return EXERCISE_GUIDES['hyperextension'];
  }
  if (n.includes('hammer') || n.includes('reverse curl') || n.includes('corda')) {
    return EXERCISE_GUIDES['reverse-curl'];
  }
  if (n.includes('curl') || n.includes('bicipiti')) {
    return EXERCISE_GUIDES['bicep-curl'];
  }
  if (n.includes('shoulder press') || n.includes('military') || n.includes('lento avanti')) {
    return EXERCISE_GUIDES['shoulder-press'];
  }
  if (n.includes('alzate laterali') || n.includes('lateral')) {
    return EXERCISE_GUIDES['lateral-raise'];
  }
  if (n.includes('leg press')) {
    return EXERCISE_GUIDES['leg-press'];
  }
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('stacco')) {
    return EXERCISE_GUIDES['romanian-deadlift'];
  }
  if (n.includes('leg curl') || n.includes('femoral')) {
    return EXERCISE_GUIDES['leg-curl'];
  }
  if (n.includes('leg extension') || n.includes('estens')) {
    return EXERCISE_GUIDES['leg-extension'];
  }
  if (n.includes('calf') || n.includes('polpacc')) {
    return EXERCISE_GUIDES['calf-raise'];
  }

  // Fallback based on muscle group
  const mg = muscleGroup.toLowerCase();
  if (mg.includes('petto')) return EXERCISE_GUIDES['chest-press'];
  if (mg.includes('dorsal') || mg.includes('schiena')) return EXERCISE_GUIDES['lat-machine'];
  if (mg.includes('spalle') || mg.includes('deltoid')) return EXERCISE_GUIDES['shoulder-press'];
  if (mg.includes('tricipit')) return EXERCISE_GUIDES['tricep-pushdown'];
  if (mg.includes('bicipit')) return EXERCISE_GUIDES['bicep-curl'];
  if (mg.includes('quadricipit')) return EXERCISE_GUIDES['leg-extension'];
  if (mg.includes('ischiocrurali') || mg.includes('femoral')) return EXERCISE_GUIDES['leg-curl'];
  if (mg.includes('polpacc')) return EXERCISE_GUIDES['calf-raise'];

  // Default fallback
  return EXERCISE_GUIDES['chest-press'];
};
