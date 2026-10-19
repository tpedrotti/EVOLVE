import React, { useRef } from 'react';
import { ASSETS } from '../data/mockData';
import type { BiologicalSex, UserProfile } from '../types';
import { Icon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ScreenQuestionnaireProps {
  profile: UserProfile;
  onChangeProfile: (updated: Partial<UserProfile>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const ScreenQuestionnaire: React.FC<ScreenQuestionnaireProps> = ({
  profile,
  onChangeProfile,
  onBack,
  onContinue,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChangeProfile({ avatarUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const allDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const toggleDay = (day: string) => {
    let next: string[];
    if (profile.selectedDays.includes(day)) {
      if (profile.selectedDays.length <= 1) return;
      next = profile.selectedDays.filter((d) => d !== day);
    } else {
      next = [...profile.selectedDays, day];
    }
    onChangeProfile({
      selectedDays: next,
      weeklyDays: next.length,
    });
  };

  const toggleEquipment = (eq: string) => {
    if (profile.equipment.includes(eq)) {
      if (profile.equipment.length <= 1) return;
      onChangeProfile({ equipment: profile.equipment.filter((e) => e !== eq) });
    } else {
      onChangeProfile({ equipment: [...profile.equipment, eq] });
    }
  };

  const toggleDiet = (pref: string) => {
    if (profile.dietaryPreferences.includes(pref)) {
      onChangeProfile({ dietaryPreferences: profile.dietaryPreferences.filter((p) => p !== pref) });
    } else {
      onChangeProfile({ dietaryPreferences: [...profile.dietaryPreferences, pref] });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8faf9] text-[#191c1c] flex flex-col items-center">
      <div className="w-full max-w-md pb-32">
        {/* Progress Header */}
        <div className="px-5 pt-4 pb-2 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#416900] uppercase tracking-wider">
              Passo 3 di 5
            </span>
            <span className="text-[12px] text-[#56615c]">60% completato</span>
          </div>

          {/* Segmented Track Progress */}
          <div className="w-full bg-[#e6e9e8] h-1.5 rounded-full overflow-hidden flex mt-1">
            <div
              className="h-full bg-[#84cc16] rounded-full transition-all duration-500 ease-out"
              style={{ width: '60%' }}
            ></div>
          </div>

          <div className="mt-4">
            <h1 className="text-[24px] leading-[30px] font-bold text-[#191c1c] tracking-tight">
              Raccontaci di te
            </h1>
            <p className="text-[15px] leading-[22px] text-[#56615c] mt-1">
              Adatteremo i carichi e il deficit calorico alle tue caratteristiche fisiche uniche.
            </p>
          </div>
        </div>

        {/* 1. Nome & Immagine Profilo (Facoltativa) */}
        <div className="px-5 mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] uppercase tracking-wider text-[#56615c] font-bold">
                Il Tuo Profilo
              </span>
              <span className="text-[11px] font-semibold text-[#416900] bg-[#416900]/10 px-2.5 py-0.5 rounded-full">
                Foto facoltativa
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar Uploader / Preview */}
              <div className="relative shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Carica foto profilo"
                  className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-[#84cc16]/50 hover:ring-[#84cc16] transition-all cursor-pointer group shadow-sm flex items-center justify-center active:scale-95"
                >
                  <UserAvatar
                    avatarUrl={profile.avatarUrl}
                    name={profile.name}
                    className="w-16 h-16"
                  />
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Icon name="photo_camera" className="w-5 h-5" />
                  </div>
                </button>

                {/* Badge button: upload (+) or remove (x) */}
                {profile.avatarUrl ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeProfile({ avatarUrl: '' });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="Rimuovi foto"
                    aria-label="Rimuovi foto"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#f2f4f3] hover:bg-red-50 text-[#56615c] hover:text-red-600 flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer transition-transform active:scale-90"
                  >
                    <Icon name="close" className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Carica foto profilo"
                    aria-label="Carica foto profilo"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer transition-transform active:scale-90"
                  >
                    <Icon name="add" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Nome input */}
              <div className="flex-1 min-w-0">
                <label className="text-[12px] uppercase font-semibold text-[#56615c] block mb-1">
                  Nome
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => onChangeProfile({ name: e.target.value })}
                    placeholder="Il tuo nome (es. Luca)"
                    maxLength={30}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#f2f4f3] hover:bg-[#eceeed] focus:bg-white text-[15px] font-semibold text-[#191c1c] border border-transparent focus:border-[#84cc16] outline-none transition-all placeholder:text-[#56615c]/60"
                  />
                  {profile.name && (
                    <button
                      type="button"
                      onClick={() => onChangeProfile({ name: '' })}
                      title="Cancella nome"
                      className="absolute right-2.5 p-1 text-[#56615c] hover:text-[#191c1c] cursor-pointer"
                    >
                      <Icon name="close" className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#56615c] mt-1 truncate">
                  {profile.avatarUrl ? 'Foto personalizzata impostata' : 'Nessuna foto: icona omino bianco attiva'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sesso Biologico */}
        <div className="px-5 mt-4">
          <label className="text-[12px] uppercase tracking-wider text-[#56615c] font-bold block mb-1">
            Sesso Biologico
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['uomo', 'donna', 'altro'] as BiologicalSex[]).map((val) => {
              const active = profile.sex === val;
              const label = val.charAt(0).toUpperCase() + val.slice(1);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChangeProfile({ sex: val })}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-full font-medium text-[13px] transition-all cursor-pointer ${
                    active
                      ? 'bg-[#416900] text-white shadow-sm'
                      : 'bg-[#f2f4f3] text-[#191c1c] hover:bg-[#eceeed]'
                  }`}
                >
                  {active && (
                    <Icon name="check" className="w-[18px] h-[18px]" />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Biometric Measurements Bento Cards */}
        <div className="px-5 mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider text-[#56615c] font-bold">
              Metriche Corporee
            </span>
            <span className="text-[12px] text-[#416900] flex items-center gap-1">
              <Icon name="lock" className="w-[14px] h-[14px]" /> Standard Sanitario
            </span>
          </div>

          {/* Età Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] uppercase font-semibold text-[#56615c]">Età</span>
              <span className="text-[32px] font-bold text-[#191c1c] leading-none">
                {profile.age}{' '}
                <span className="text-[13px] text-[#56615c] font-normal">anni</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onChangeProfile({ age: Math.max(16, profile.age - 1) })}
                className="w-10 h-10 rounded-full bg-[#eceeed] flex items-center justify-center text-[#191c1c] active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="remove" className="w-5 h-5" />
              </button>
              <div className="relative flex-1 flex items-center">
                <input
                  aria-label="Età"
                  type="range"
                  min="16"
                  max="75"
                  value={profile.age}
                  onChange={(e) => onChangeProfile({ age: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#416900] h-2 bg-[#e6e9e8] rounded-full appearance-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => onChangeProfile({ age: Math.min(75, profile.age + 1) })}
                className="w-10 h-10 rounded-full bg-[#eceeed] flex items-center justify-center text-[#191c1c] active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="add" className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Altezza & Peso Cards Dual Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Altezza */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] flex flex-col justify-between">
              <div>
                <span className="text-[12px] uppercase font-semibold text-[#56615c] block">
                  Altezza
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[32px] font-bold text-[#191c1c] leading-none tracking-tight">
                    {profile.heightCm}
                  </span>
                  <span className="text-[13px] text-[#56615c]">cm</span>
                </div>
              </div>
              <div className="mt-4 pt-1 flex items-center justify-between text-[#56615c]">
                <button
                  type="button"
                  onClick={() => onChangeProfile({ heightCm: Math.max(130, profile.heightCm - 1) })}
                  className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  <Icon name="remove" className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-3 bg-[#84cc16] rounded-full inline-block"></span>
                  <span className="w-1 h-5 bg-[#416900] rounded-full inline-block"></span>
                  <span className="w-1 h-3 bg-[#84cc16] rounded-full inline-block"></span>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeProfile({ heightCm: Math.min(220, profile.heightCm + 1) })}
                  className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                >
                  <Icon name="add" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Peso Attuale */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] flex flex-col justify-between">
              <div>
                <span className="text-[12px] uppercase font-semibold text-[#56615c] block">
                  Peso Attuale
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[32px] font-bold text-[#191c1c] leading-none tracking-tight">
                    {profile.weightKg.toFixed(1)}
                  </span>
                  <span className="text-[13px] text-[#56615c]">kg</span>
                </div>
              </div>
              <div className="mt-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e6e9e8] rounded-full">
                  <Icon name="trending_up" className="w-3 h-3 text-[#416900]" />
                  <span className="text-[11px] text-[#191c1c] font-medium truncate">
                    Obiettivo: {profile.targetWeightKg.toFixed(1)} kg
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[#56615c]">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(40, Number((profile.weightKg - 0.5).toFixed(1)));
                      onChangeProfile({ weightKg: next });
                    }}
                    className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                  >
                    <Icon name="remove" className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-[#56615c] font-bold">+Massa</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(180, Number((profile.weightKg + 0.5).toFixed(1)));
                      onChangeProfile({ weightKg: next });
                    }}
                    className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                  >
                    <Icon name="add" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Obiettivo Principale */}
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] uppercase tracking-wider text-[#56615c] font-bold">
              Obiettivo Principale
            </span>
            <span className="text-[12px] text-[#416900] font-medium">1 Selezionato</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Crescita Muscolare */}
            <div
              onClick={() => onChangeProfile({ goal: 'crescita', targetWeightKg: Number((profile.weightKg + 3.5).toFixed(1)) })}
              className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                profile.goal === 'crescita'
                  ? 'bg-white shadow-sm border-[#e2e8e4]'
                  : 'bg-[#f2f4f3] border-transparent hover:bg-[#eceeed]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#84cc16]/20 text-[#416900] flex items-center justify-center shrink-0">
                  <Icon name="fitness_center" className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px] font-semibold text-[#191c1c] tracking-tight">
                      Crescita Muscolare
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-[#84cc16] text-[#102000] text-[10px] uppercase font-bold">
                      Consigliato
                    </span>
                  </div>
                  <p className="text-[13px] text-[#56615c] truncate mt-0.5">
                    Ipertrofia, stimolo meccanico e surplus controllato
                  </p>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2 ${
                  profile.goal === 'crescita'
                    ? 'bg-[#416900] text-white shadow-sm'
                    : 'bg-[#e1e3e2] text-[#56615c]'
                }`}
              >
                {profile.goal === 'crescita' && (
                  <Icon name="check" className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            {/* Definizione & Perdita Grasso */}
            <div
              onClick={() => onChangeProfile({ goal: 'definizione', targetWeightKg: Number((profile.weightKg - 4.0).toFixed(1)) })}
              className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                profile.goal === 'definizione'
                  ? 'bg-white shadow-sm border-[#e2e8e4]'
                  : 'bg-[#f2f4f3] border-transparent hover:bg-[#eceeed]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#e1e3e2] text-[#56615c] flex items-center justify-center shrink-0">
                  <Icon name="local_fire_department" className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[17px] font-semibold text-[#191c1c]">
                    Definizione &amp; Perdita Grasso
                  </span>
                  <p className="text-[13px] text-[#56615c] truncate mt-0.5">
                    Massimizza il dispendio energetico preservando la massa
                  </p>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2 ${
                  profile.goal === 'definizione'
                    ? 'bg-[#416900] text-white shadow-sm'
                    : 'bg-[#e1e3e2] text-[#56615c]'
                }`}
              >
                {profile.goal === 'definizione' && (
                  <Icon name="check" className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            {/* Ricomposizione Corporea */}
            <div
              onClick={() => onChangeProfile({ goal: 'ricomposizione', targetWeightKg: profile.weightKg })}
              className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                profile.goal === 'ricomposizione'
                  ? 'bg-white shadow-sm border-[#e2e8e4]'
                  : 'bg-[#f2f4f3] border-transparent hover:bg-[#eceeed]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#e1e3e2] text-[#56615c] flex items-center justify-center shrink-0">
                  <Icon name="autorenew" className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[17px] font-semibold text-[#191c1c]">
                    Ricomposizione Corporea
                  </span>
                  <p className="text-[13px] text-[#56615c] truncate mt-0.5">
                    Perdita adiposa e tonificazione simultanea bilanciata
                  </p>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2 ${
                  profile.goal === 'ricomposizione'
                    ? 'bg-[#416900] text-white shadow-sm'
                    : 'bg-[#e1e3e2] text-[#56615c]'
                }`}
              >
                {profile.goal === 'ricomposizione' && (
                  <Icon name="check" className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            {/* Forza & Performance */}
            <div
              onClick={() => onChangeProfile({ goal: 'forza', targetWeightKg: Number((profile.weightKg + 2.0).toFixed(1)) })}
              className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${
                profile.goal === 'forza'
                  ? 'bg-white shadow-sm border-[#e2e8e4]'
                  : 'bg-[#f2f4f3] border-transparent hover:bg-[#eceeed]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#e1e3e2] text-[#56615c] flex items-center justify-center shrink-0">
                  <Icon name="bolt" className="w-6 h-6 text-[#56615c]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[17px] font-semibold text-[#191c1c]">
                    Forza &amp; Performance
                  </span>
                  <p className="text-[13px] text-[#56615c] truncate mt-0.5">
                    Sviluppo di potenza neurale e carichi massimali
                  </p>
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2 ${
                  profile.goal === 'forza'
                    ? 'bg-[#416900] text-white shadow-sm'
                    : 'bg-[#e1e3e2] text-[#56615c]'
                }`}
              >
                {profile.goal === 'forza' && (
                  <Icon name="check" className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Esperienza di Allenamento */}
        <div className="px-5 mt-6">
          <label className="text-[12px] uppercase tracking-wider text-[#56615c] font-bold block mb-2">
            Esperienza di Allenamento
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onChangeProfile({ experience: 'beginner' })}
              className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                profile.experience === 'beginner'
                  ? 'bg-[#416900] text-white shadow-sm'
                  : 'bg-[#f2f4f3] text-[#191c1c] hover:bg-[#eceeed]'
              }`}
            >
              <span className="text-[15px]">Principiante (&lt; 1 anno)</span>
              <span className={`text-[12px] ${profile.experience === 'beginner' ? 'text-white/80' : 'text-[#56615c]'}`}>
                Fondamentali
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChangeProfile({ experience: 'intermediate' })}
              className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                profile.experience === 'intermediate'
                  ? 'bg-[#416900] text-white shadow-sm'
                  : 'bg-[#f2f4f3] text-[#191c1c] hover:bg-[#eceeed]'
              }`}
            >
              <span className="text-[15px] font-semibold flex items-center gap-2">
                <Icon name="verified" className="w-[18px] h-[18px]" />
                Intermedio (1-3 anni)
              </span>
              <span className={`text-[12px] ${profile.experience === 'intermediate' ? 'text-white/80' : 'text-[#56615c]'}`}>
                Periodizzazione attiva
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChangeProfile({ experience: 'advanced' })}
              className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                profile.experience === 'advanced'
                  ? 'bg-[#416900] text-white shadow-sm'
                  : 'bg-[#f2f4f3] text-[#191c1c] hover:bg-[#eceeed]'
              }`}
            >
              <span className="text-[15px]">Avanzato (3+ anni)</span>
              <span className={`text-[12px] ${profile.experience === 'advanced' ? 'text-white/80' : 'text-[#56615c]'}`}>
                Volume elevato
              </span>
            </button>
          </div>
        </div>

        {/* Frequenza Settimanale */}
        <div className="px-5 mt-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#e2e8e4]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[12px] uppercase font-semibold text-[#56615c] block">
                  Frequenza Settimanale
                </span>
                <span className="text-[17px] font-bold text-[#191c1c]">
                  {profile.selectedDays.length} giorni a settimana
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#d7e2dc] text-[#141e1a]">
                Ideale recupero
              </span>
            </div>

            {/* Days bubbles */}
            <div className="flex justify-between items-center gap-1 mt-3">
              {allDays.map((d) => {
                const isSelected = profile.selectedDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`flex-1 py-2 rounded-xl flex flex-col items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#416900] text-white shadow-xs'
                        : 'bg-[#eceeed] text-[#56615c] hover:bg-[#e1e3e2]'
                    }`}
                  >
                    <span>{d}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isSelected ? 'bg-[#84cc16]' : 'bg-transparent'
                      }`}
                    ></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Attrezzatura Disponibile */}
        <div className="px-5 mt-6">
          <label className="text-[12px] uppercase tracking-wider text-[#56615c] font-bold block mb-2">
            Attrezzatura Disponibile
          </label>
          <div className="flex flex-wrap gap-2">
            {['Palestra completa', 'Manubri a casa', 'Corpo libero'].map((eq) => {
              const active = profile.equipment.includes(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggleEquipment(eq)}
                  className={`px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#416900] text-white shadow-xs'
                      : 'bg-[#f2f4f3] text-[#191c1c] hover:bg-[#eceeed]'
                  }`}
                >
                  {active && (
                    <Icon name="check" className="w-4 h-4" />
                  )}
                  <span>{eq}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferenze Alimentari Bento Card */}
        <div className="px-5 mt-6 mb-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#e2e8e4]">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="restaurant" className="w-5 h-5 text-[#416900]" />
              <span className="text-[12px] uppercase font-semibold text-[#56615c]">
                Preferenze Alimentari
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleDiet('Onnivoro / Alto contenuto proteico')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                  profile.dietaryPreferences.includes('Onnivoro / Alto contenuto proteico')
                    ? 'bg-[#d7e2dc] text-[#141e1a]'
                    : 'bg-[#f2f4f3] text-[#56615c]'
                }`}
              >
                <span>Onnivoro / Alto contenuto proteico</span>
              </button>

              <button
                type="button"
                onClick={() => toggleDiet('Senza lattosio')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                  profile.dietaryPreferences.includes('Senza lattosio')
                    ? 'bg-[#e6e9e8] text-[#191c1c]'
                    : 'bg-[#f2f4f3] text-[#56615c]'
                }`}
              >
                <span>Senza lattosio</span>
              </button>

              <button
                type="button"
                onClick={() => toggleDiet('Vegetariano')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                  profile.dietaryPreferences.includes('Vegetariano')
                    ? 'bg-[#d7e2dc] text-[#141e1a]'
                    : 'bg-[#f2f4f3] text-[#56615c]'
                }`}
              >
                <span>Vegetariano</span>
              </button>
            </div>
          </div>
        </div>

        {/* Context Visual Anchor */}
        <div className="px-5 mt-2 mb-6">
          <div className="w-full h-32 rounded-2xl relative overflow-hidden bg-[#e1e3e2] shadow-sm">
            <img
              alt="Trainer biometric analysis"
              className="w-full h-full object-cover"
              src={ASSETS.trainerTablet}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/80 via-[#17211D]/30 to-transparent flex items-end p-4">
              <p className="text-white text-[12px] font-medium">
                Piano calcolato in tempo reale con intelligenza biometrica EVOLVE
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Navigation Bar */}
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md px-5 py-4 flex items-center justify-center shadow-lg border-t border-[#e2e8e4] z-30">
          <div className="w-full max-w-md flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Torna indietro"
              className="w-12 h-12 rounded-full bg-[#f2f4f3] text-[#191c1c] flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <Icon name="chevron_left" className="w-6 h-6" />
            </button>
            <button
              id="continue-to-summary-btn"
              type="button"
              onClick={onContinue}
              className="flex-1 h-12 rounded-full bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[17px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span>Continua alla sintesi</span>
              <Icon name="arrow_forward" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
