import React, { useState, useRef } from 'react';
import type { UserProfile, BiologicalSex, FitnessGoal, ExperienceLevel } from '../types';
import { ASSETS } from '../data/mockData';
import { Icon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { calculateTargetNutrition } from '../utils/fitnessLogic';
import { calculateCalorieCycling } from '../utils/metrics';

interface SettingsModalProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onClose: () => void;
  onRestartOnboarding: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type SettingsTab = 'biometria' | 'allenamento' | 'nutrizione' | 'app';

const GOAL_OPTIONS: { id: FitnessGoal; label: string; desc: string; icon: string }[] = [
  { id: 'crescita', label: 'Crescita Muscolare', desc: 'Ipertrofia progressiva e massa magra', icon: 'fitness_center' },
  { id: 'definizione', label: 'Definizione & Cut', desc: 'Riduzione grasso mantenendo il muscolo', icon: 'local_fire_department' },
  { id: 'ricomposizione', label: 'Ricomposizione', desc: 'Perdita grasso e tonificazione simultanea', icon: 'trending_up' },
  { id: 'forza', label: 'Forza Massima', desc: 'Incremento carichi ed efficienza neurale', icon: 'bolt' },
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string; sub: string }[] = [
  { id: 'beginner', label: 'Principiante', sub: '< 1 anno di allenamento costante' },
  { id: 'intermediate', label: 'Intermedio', sub: '1 - 3 anni con tecnica solida' },
  { id: 'advanced', label: 'Avanzato', sub: '> 3 anni, focus carichi e periodizzazione' },
];

const ALL_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const DIET_PRESETS = [
  'Onnivoro / Alto contenuto proteico',
  'Senza lattosio',
  'Senza glutine',
  'Vegetariano',
  'Vegano',
  'Chetogenico / Low Carb',
  'Dieta Mediterranea Flessibile',
];

const EQUIPMENT_PRESETS = [
  'Palestra completa',
  'Manubri & Panca a casa',
  'Corpo libero / Calisthenics',
  'Kettlebell & Fasce elastiche',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  onUpdateProfile,
  onClose,
  onRestartOnboarding,
  isDarkMode,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('biometria');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form local state
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [age, setAge] = useState(profile.age);
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [targetWeightKg, setTargetWeightKg] = useState(profile.targetWeightKg);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [experience, setExperience] = useState<ExperienceLevel>(profile.experience);
  const [weeklyDays, setWeeklyDays] = useState(profile.weeklyDays);
  const [selectedDays, setSelectedDays] = useState<string[]>(profile.selectedDays || ['Lun', 'Mar', 'Gio', 'Ven']);
  const [equipment, setEquipment] = useState<string[]>(profile.equipment || ['Palestra completa']);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(profile.dietaryPreferences || []);
  const [timeZone, setTimeZone] = useState(profile.timeZone || 'Europe/Rome');
  const [simulatedDate, setSimulatedDate] = useState(profile.simulatedDate || '');

  // System toggle states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Live BMI calculation
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : '23.5';

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const toggleDiet = (pref: string) => {
    if (dietaryPreferences.includes(pref)) {
      setDietaryPreferences(dietaryPreferences.filter((p) => p !== pref));
    } else {
      setDietaryPreferences([...dietaryPreferences, pref]);
    }
  };

  const toggleEquipment = (eq: string) => {
    if (equipment.includes(eq)) {
      if (equipment.length > 1) {
        setEquipment(equipment.filter((e) => e !== eq));
      }
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const handleSave = () => {
    onUpdateProfile({
      name: name.trim() || 'Atleta',
      avatarUrl,
      sex,
      age: Number(age),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      targetWeightKg: Number(targetWeightKg),
      goal,
      experience,
      weeklyDays: Number(weeklyDays),
      selectedDays,
      equipment,
      dietaryPreferences,
      timeZone: timeZone.trim() || 'Europe/Rome',
      simulatedDate: simulatedDate.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleExportData = () => {
    const backupData = {
      app: 'EVOLVE Fitness',
      exportDate: new Date().toISOString(),
      profile: {
        name,
        sex,
        age,
        heightCm,
        weightKg,
        targetWeightKg,
        goal,
        experience,
        weeklyDays,
        selectedDays,
        equipment,
        dietaryPreferences,
      },
      theme: isDarkMode ? 'dark' : 'light',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evolve_backup_${name.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#17211D]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#e2e8e4]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#eceeed] flex items-center justify-between bg-[#f8faf9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-[#416900]">
              <Icon name="settings" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#191c1c] tracking-tight">Impostazioni</h2>
              <p className="text-[12px] text-[#56615c]">Profilo, routine e parametri dell'app</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Chiudi impostazioni"
            className="w-9 h-9 rounded-full bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center hover:bg-[#d7e2dc] transition-colors cursor-pointer"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Banner */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-[#84cc16]/10 via-transparent to-[#416900]/5 border-b border-[#eceeed] flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar with click-to-edit */}
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Clicca per caricare una foto dal dispositivo"
              >
                <UserAvatar
                  avatarUrl={avatarUrl}
                  name={name}
                  className="w-14 h-14 ring-2 ring-[#84cc16] shadow-sm group-hover:brightness-95 transition-all"
                />
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Icon name="photo_camera" className="w-5 h-5" />
                </div>
                {/* Camera Badge button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  aria-label="Cambia foto profilo"
                  title="Cambia foto profilo"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer transition-transform active:scale-90"
                >
                  <Icon name="photo_camera" className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Il tuo nome"
                    className="text-[16px] font-bold text-[#191c1c] bg-transparent border-b border-dashed border-[#56615c]/40 focus:border-[#84cc16] outline-none max-w-[150px]"
                  />
                  <Icon name="edit" className="w-3.5 h-3.5 text-[#56615c]" />
                </div>
                <p className="text-[11px] text-[#56615c] mt-0.5">
                  Atleta EVOLVE · {weeklyDays} giorni/settimana
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-[#386a00] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="photo_camera" className="w-3 h-3" />
                    <span>Carica foto</span>
                  </button>
                  <span className="text-[10px] text-[#56615c]">•</span>
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker((prev) => !prev)}
                    className="text-[11px] font-bold text-[#56615c] hover:text-[#191c1c] hover:underline cursor-pointer"
                  >
                    {showAvatarPicker ? 'Chiudi' : 'Scegli avatar'}
                  </button>
                  {avatarUrl && (
                    <>
                      <span className="text-[10px] text-[#56615c]">•</span>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Rimuovi foto
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#84cc16]/20 text-[#386a00] text-[11px] font-bold uppercase tracking-wider">
                {goal}
              </span>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Preset Avatars Selection Drawer */}
          {showAvatarPicker && (
            <div className="p-3 bg-white rounded-2xl border border-[#e2e8e4] shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#191c1c] uppercase tracking-wider">
                  Scegli tra gli avatar predefiniti:
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="add_photo_alternate" className="w-3.5 h-3.5" />
                  <span>La tua foto</span>
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
                {[
                  { label: 'Omino', src: '' },
                  { label: 'Luca', src: ASSETS.userLucaAvatar },
                  { label: 'Runner', src: ASSETS.avatarMaleRunner },
                  { label: 'Fitness', src: ASSETS.avatarFemale },
                  { label: 'Strength', src: ASSETS.gymGuyStrength },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(item.src);
                      setShowAvatarPicker(false);
                    }}
                    className={`relative rounded-full shrink-0 p-0.5 cursor-pointer transition-all flex flex-col items-center gap-1 group ${
                      avatarUrl === item.src ? 'ring-2 ring-[#84cc16] scale-105' : 'opacity-70 hover:opacity-100'
                    }`}
                    title={item.label}
                  >
                    <UserAvatar avatarUrl={item.src} name={item.label} className="w-10 h-10" />
                    <span className="text-[10px] text-[#56615c] font-medium group-hover:text-[#191c1c]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 bg-[#f8faf9] border-b border-[#eceeed] flex gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('biometria')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'biometria'
                ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                : 'text-[#56615c] hover:bg-[#e6e9e8]'
            }`}
          >
            <Icon name="scale" className="w-4 h-4" />
            <span>Biometria</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('allenamento')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'allenamento'
                ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                : 'text-[#56615c] hover:bg-[#e6e9e8]'
            }`}
          >
            <Icon name="fitness_center" className="w-4 h-4" />
            <span>Allenamento</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nutrizione')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'nutrizione'
                ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                : 'text-[#56615c] hover:bg-[#e6e9e8]'
            }`}
          >
            <Icon name="restaurant" className="w-4 h-4" />
            <span>Nutrizione</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('app')}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'app'
                ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                : 'text-[#56615c] hover:bg-[#e6e9e8]'
            }`}
          >
            <Icon name="tune" className="w-4 h-4" />
            <span>App &amp; Dati</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ═════════ TAB 1: BIOMETRIA ═════════ */}
          {activeTab === 'biometria' && (
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2">
                  Sesso Biologico
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['uomo', 'donna', 'altro'] as BiologicalSex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className={`py-2 rounded-xl text-[13px] font-semibold capitalize transition-all cursor-pointer ${
                        sex === s
                          ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                          : 'bg-[#f2f4f3] text-[#56615c] hover:bg-[#eceeed]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-1">
                    Età
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="14"
                      max="100"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f3] border border-[#e2e8e4] text-[#191c1c] text-[15px] font-bold outline-none focus:border-[#84cc16]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#56615c]">
                      anni
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-1">
                    Altezza
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="120"
                      max="230"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f3] border border-[#e2e8e4] text-[#191c1c] text-[15px] font-bold outline-none focus:border-[#84cc16]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#56615c]">
                      cm
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-1">
                    Peso Attuale
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="35"
                      max="250"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f3] border border-[#e2e8e4] text-[#191c1c] text-[15px] font-bold outline-none focus:border-[#84cc16]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#56615c]">
                      kg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-1">
                    Peso Target
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="35"
                      max="250"
                      value={targetWeightKg}
                      onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f3] border border-[#e2e8e4] text-[#191c1c] text-[15px] font-bold outline-none focus:border-[#84cc16]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#56615c]">
                      kg
                    </span>
                  </div>
                </div>
              </div>

              {/* BMI Card Indicator */}
              <div className="p-3.5 rounded-2xl bg-[#f2f4f3] border border-[#e2e8e4] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-[#416900]">
                    <Icon name="activity" className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c]">
                      Indice Massa Corporea (BMI)
                    </span>
                    <p className="text-[15px] font-bold text-[#191c1c]">
                      {bmi} <span className="text-[12px] text-[#416900] font-normal">· Peso Normale</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#56615c]">Delta target</span>
                  <p className="text-[14px] font-bold text-[#191c1c]">
                    {(targetWeightKg - weightKg) > 0 ? `+${(targetWeightKg - weightKg).toFixed(1)}` : (targetWeightKg - weightKg).toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: ALLENAMENTO ═════════ */}
          {activeTab === 'allenamento' && (
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2">
                  Obiettivo Primario
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGoal(opt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        goal === opt.id
                          ? 'border-[#84cc16] bg-[#84cc16]/10 shadow-sm'
                          : 'border-[#e2e8e4] bg-[#f2f4f3] hover:bg-[#eceeed]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name={opt.icon} className={`w-4 h-4 ${goal === opt.id ? 'text-[#386a00]' : 'text-[#56615c]'}`} />
                        <span className="text-[13px] font-bold text-[#191c1c]">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-[#56615c] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2">
                  Livello di Esperienza
                </label>
                <div className="space-y-1.5">
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setExperience(exp.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        experience === exp.id
                          ? 'border-[#84cc16] bg-[#84cc16]/10'
                          : 'border-[#e2e8e4] bg-[#f2f4f3] hover:bg-[#eceeed]'
                      }`}
                    >
                      <div>
                        <p className="text-[13px] font-bold text-[#191c1c]">{exp.label}</p>
                        <p className="text-[11px] text-[#56615c]">{exp.sub}</p>
                      </div>
                      {experience === exp.id && <Icon name="check" className="w-4 h-4 text-[#386a00]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c]">
                    Frequenza Settimanale
                  </label>
                  <span className="text-[12px] font-bold text-[#416900]">{weeklyDays} giorni</span>
                </div>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setWeeklyDays(days)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                        weeklyDays === days
                          ? 'bg-[#84cc16] text-[#102000] shadow-sm'
                          : 'bg-[#f2f4f3] text-[#56615c] hover:bg-[#eceeed]'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2">
                  Giorni di Allenamento
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        selectedDays.includes(d)
                          ? 'bg-[#84cc16] text-[#102000]'
                          : 'bg-[#f2f4f3] text-[#56615c]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2">
                  Attrezzatura Disponibile
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EQUIPMENT_PRESETS.map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleEquipment(eq)}
                      className={`p-2.5 rounded-xl border text-left text-[12px] font-medium transition-all cursor-pointer flex items-center justify-between ${
                        equipment.includes(eq)
                          ? 'border-[#84cc16] bg-[#84cc16]/10 text-[#191c1c]'
                          : 'border-[#e2e8e4] bg-[#f2f4f3] text-[#56615c]'
                      }`}
                    >
                      <span>{eq}</span>
                      {equipment.includes(eq) && <Icon name="check" className="w-3.5 h-3.5 text-[#386a00]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 3: NUTRIZIONE ═════════ */}
          {activeTab === 'nutrizione' && (
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block mb-2">
                  Preferenze &amp; Vincoli Dietetici
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIET_PRESETS.map((pref) => {
                    const isSelected = dietaryPreferences.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleDiet(pref)}
                        className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#84cc16]/20 border-[#84cc16] text-[#386a00]'
                            : 'bg-[#f2f4f3] border-transparent text-[#56615c] hover:bg-[#eceeed]'
                        }`}
                      >
                        {isSelected && <Icon name="check" className="w-3.5 h-3.5" />}
                        <span>{pref}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nutrition Summary Card con distinzione tra target suggerito, attivo e ciclizzazione */}
              {(() => {
                const currentCalc = calculateTargetNutrition({
                  ...profile,
                  weightKg,
                  heightCm,
                  age,
                  sex,
                  goal,
                  weeklyDays,
                });
                const cycling = calculateCalorieCycling(currentCalc.calories, weeklyDays);

                return (
                  <div className="p-4 rounded-2xl bg-[#f2f4f3] border border-[#e2e8e4] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block">
                        Target Nutrizionali Suggeriti (Formula TDEE)
                      </span>
                      <span className="text-[10px] text-[#386a00] font-bold bg-[#84cc16]/20 px-2 py-0.5 rounded-full">
                        {currentCalc.surplusDeficitLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 bg-white rounded-xl shadow-xs border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#56615c] block">Calorie Medie</span>
                        <p className="text-[17px] font-extrabold text-[#191c1c] my-0.5">{currentCalc.calories.toLocaleString('it-IT')}</p>
                        <span className="text-[10px] text-[#416900] font-semibold">kcal / dì</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl shadow-xs border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#56615c] block">Proteine</span>
                        <p className="text-[17px] font-extrabold text-[#191c1c] my-0.5">{currentCalc.proteinGrams}g</p>
                        <span className="text-[10px] text-[#416900] font-semibold">~2.2 g/kg</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl shadow-xs border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#0284c7] block">Acqua Target</span>
                        <p className="text-[17px] font-extrabold text-[#0284c7] my-0.5">3.0 L</p>
                        <span className="text-[10px] text-[#0284c7] font-semibold">litri / dì</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="p-2 bg-white rounded-xl border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#56615c] block">Carbo</span>
                        <p className="font-extrabold text-[#191c1c]">{currentCalc.carbsGrams}g</p>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#56615c] block">Grassi</span>
                        <p className="font-extrabold text-[#191c1c]">{currentCalc.fatsGrams}g</p>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#7e22ce] block">Zuccheri</span>
                        <p className="font-extrabold text-[#7e22ce]">&lt;{currentCalc.sugarsMaxGrams}g</p>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-[#e2e8e4]/60">
                        <span className="text-[10px] uppercase font-bold text-[#059669] block">Fibre</span>
                        <p className="font-extrabold text-[#059669]">{currentCalc.fiberTargetGrams}g</p>
                      </div>
                    </div>

                    {/* Chiarezza Ciclizzazione e Contesto Target */}
                    <div className="p-3 bg-white rounded-xl border border-[#e2e8e4]/80 text-[11px] text-[#56615c] space-y-1">
                      <div className="flex items-center justify-between text-[#191c1c] font-bold">
                        <span>Target Attivo nel Diario:</span>
                        <span className="text-[#386a00]">{currentCalc.calories.toLocaleString('it-IT')} kcal/die</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>• Giorni Allenamento (ON):</span>
                        <span className="font-semibold text-[#191c1c]">{cycling.onCalories} kcal ({weeklyDays} gg/sett)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>• Giorni Riposo (OFF):</span>
                        <span className="font-semibold text-[#191c1c]">{cycling.offCalories} kcal ({cycling.restDays} gg/sett)</span>
                      </div>
                      <p className="text-[10px] text-[#86928d] pt-1 border-t border-[#f2f4f3]">
                        {cycling.formulaDescription}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═════════ TAB 4: APP, NOTIFICHE & DATI ═════════ */}
          {activeTab === 'app' && (
            <div className="space-y-4">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block">
                Interfaccia &amp; Audio
              </span>

              {/* Dark mode switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f2f4f3]">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-[#84cc16]/20 text-[#84cc16]' : 'bg-[#e6e9e8] text-[#424936]'}`}>
                    <Icon name={isDarkMode ? 'sun' : 'moon'} className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#191c1c]">Modalità Scura</p>
                    <p className="text-[11px] text-[#56615c]">Interfaccia a basso affaticamento visivo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label="Toggle tema scuro"
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isDarkMode ? 'bg-[#84cc16]' : 'bg-[#dde2df]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Notifications switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f2f4f3]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e6e9e8] flex items-center justify-center text-[#424936]">
                    <Icon name="notifications" className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#191c1c]">Promemoria Biometrici</p>
                    <p className="text-[11px] text-[#56615c]">Avvisi recupero ed idratazione</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  aria-label="Toggle notifiche"
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${notificationsEnabled ? 'bg-[#84cc16]' : 'bg-[#dde2df]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Rest timer audio switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f2f4f3]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e6e9e8] flex items-center justify-center text-[#424936]">
                    <Icon name="timer" className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#191c1c]">Suoni Timer Recupero</p>
                    <p className="text-[11px] text-[#56615c]">Feedback sonoro a fine countdown serie</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  aria-label="Toggle suoni"
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${soundEnabled ? 'bg-[#84cc16]' : 'bg-[#dde2df]'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <span className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block pt-2">
                Fuso Orario &amp; Simulazione Demo
              </span>

              {/* Fuso Orario */}
              <div className="p-3 rounded-xl bg-[#f2f4f3] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#191c1c]">Fuso Orario Configurato</span>
                  <span className="text-[11px] font-semibold text-[#386a00] bg-[#84cc16]/15 px-2 py-0.5 rounded-full">
                    {timeZone}
                  </span>
                </div>
                <p className="text-[11px] text-[#56615c]">
                  Calcola esattamente il giorno odierno, i passaggi di mezzanotte e l'ora legale (Europe/Rome).
                </p>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="mt-1 w-full p-2 bg-white rounded-lg border border-[#e2e8e4] text-[13px] font-semibold text-[#191c1c] focus:outline-none focus:border-[#84cc16]"
                >
                  <option value="Europe/Rome">Europe/Rome (Italia: UTC+1 solare, UTC+2 legale)</option>
                  <option value="Europe/London">Europe/London (UK: GMT / BST)</option>
                  <option value="America/New_York">America/New_York (US Eastern: EST / EDT)</option>
                  <option value="UTC">UTC (Tempo Universale Coordinato)</option>
                </select>
              </div>

              {/* Data Simulata (Modalità Demo) */}
              <div className="p-3 rounded-xl bg-[#f2f4f3] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#191c1c]">Data Simulata (Modalità Demo)</span>
                  {simulatedDate && (
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Attiva
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#56615c]">
                  Dichiara esplicitamente una data di test (es. 2026-10-17 Sabato riposo, 2026-10-19 Lunedì scheda). Lascia vuoto per usare la data odierna reale.
                </p>
                <div className="flex gap-2 mt-1">
                  <input
                    type="date"
                    value={simulatedDate}
                    onChange={(e) => setSimulatedDate(e.target.value)}
                    className="flex-1 p-2 bg-white rounded-lg border border-[#e2e8e4] text-[13px] font-semibold text-[#191c1c] focus:outline-none focus:border-[#84cc16]"
                  />
                  {simulatedDate && (
                    <button
                      type="button"
                      onClick={() => setSimulatedDate('')}
                      className="px-3 py-1.5 rounded-lg bg-[#e2e8e4] hover:bg-[#d5dcd7] text-[12px] font-bold text-[#191c1c] cursor-pointer"
                    >
                      Reset Reale
                    </button>
                  )}
                </div>
              </div>

              <span className="text-[12px] font-bold uppercase tracking-wider text-[#56615c] block pt-2">
                Gestione Dati &amp; Sistema
              </span>

              {/* Export backup JSON */}
              <button
                type="button"
                onClick={handleExportData}
                className="w-full p-3 rounded-xl border border-[#e2e8e4] bg-[#f2f4f3] hover:bg-[#eceeed] transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Icon name="download" className="w-4 h-4 text-[#386a00]" />
                  <div className="text-left">
                    <p className="text-[13px] font-bold text-[#191c1c]">Esporta Backup Dati (JSON)</p>
                    <p className="text-[11px] text-[#56615c]">Salva profilo, misure e preferenze sul dispositivo</p>
                  </div>
                </div>
                <Icon name="chevron_right" className="w-4 h-4 text-[#56615c]" />
              </button>

              {/* Restart Onboarding */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRestartOnboarding();
                }}
                className="w-full p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-between cursor-pointer text-red-700"
              >
                <div className="flex items-center gap-2.5">
                  <Icon name="autorenew" className="w-4 h-4" />
                  <div className="text-left">
                    <p className="text-[13px] font-bold">Ricomincia Questionario Iniziale</p>
                    <p className="text-[11px] text-red-600/80">Ricalcola il piano dall'inizio passo-passo</p>
                  </div>
                </div>
                <Icon name="chevron_right" className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#eceeed] bg-[#f8faf9] flex items-center justify-between gap-3 shrink-0 pb-safe">
          {savedSuccess ? (
            <div className="flex-1 py-3 px-4 rounded-xl bg-[#84cc16] text-[#102000] font-bold text-[14px] flex items-center justify-center gap-2">
              <Icon name="check_circle" className="w-5 h-5" />
              <span>Impostazioni Salvate!</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl text-[14px] font-semibold text-[#56615c] hover:bg-[#e6e9e8] transition-colors cursor-pointer"
              >
                Chiudi
              </button>
              <button
                id="save-settings-btn"
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[15px] font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="save" className="w-4 h-4" />
                <span>Salva Modifiche</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
