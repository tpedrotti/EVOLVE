import React, { useState } from 'react';
import { ASSETS } from '../data/mockData';
import {
  calculateTargetNutrition,
  calculate12WeekProjection,
} from '../utils/fitnessLogic';
import type { UserProfile } from '../types';
import { Icon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ScreenPlanSummaryProps {
  profile: UserProfile;
  onBack: () => void;
  onCreateJourney: () => void;
}

export const ScreenPlanSummary: React.FC<ScreenPlanSummaryProps> = ({
  profile,
  onBack,
  onCreateJourney,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nutrition = calculateTargetNutrition(profile);
  const projection = calculate12WeekProjection(profile);

  const goalNameMap: Record<string, string> = {
    crescita: 'Ipertrofia Muscolare',
    definizione: 'Definizione & Cut',
    ricomposizione: 'Ricomposizione Corporea',
    forza: 'Forza & Potenza',
  };

  const experienceNameMap: Record<string, string> = {
    beginner: 'Livello Base',
    intermediate: 'Livello Intermedio',
    advanced: 'Livello Avanzato',
  };

  const handleCreateJourney = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onCreateJourney();
    }, 600);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8faf9] dark:bg-[#0e1512] text-[#191c1c] dark:text-[#e2e8e4] flex flex-col items-center">
      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#f8faf9]/85 dark:bg-[#0e1512]/85 backdrop-blur-xl border-b border-[#e2e8e4]/60 dark:border-[#2a3832]/60 pt-safe flex justify-center">
        <div className="w-full max-w-md h-16 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Torna indietro"
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#e6e9e8] transition-colors text-[#191c1c] cursor-pointer"
          >
            <Icon name="arrow_back_ios_new" className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <img
              alt="EVOLVE Brand Logo"
              className="h-6 w-auto object-contain dark:hidden"
              src={ASSETS.logo}
            />
            <img
              alt="EVOLVE Brand Logo"
              className="h-6 w-auto object-contain hidden dark:block"
              src={ASSETS.logoDark}
            />
            <h1 className="text-[20px] font-semibold text-[#191c1c] tracking-tight">
              Plan Summary
            </h1>
          </div>

          <div className="w-11 h-11 flex items-center justify-center">
            <UserAvatar
              avatarUrl={profile.avatarUrl}
              name={profile.name}
              className="w-8 h-8 ring-1 ring-[#c1cab0]/40"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md pt-20 px-5 pb-32">
        {/* Status Badge & Micro Header */}
        <div className="flex items-center justify-between pt-2 pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#416900]/10">
            <Icon name="verified" className="w-4 h-4 text-[#416900]" />
            <span className="text-[11px] font-bold text-[#416900] uppercase tracking-wider">
              Analisi Biometrica Completata
            </span>
          </div>
          <span className="text-[12px] text-[#56615c]">Accuratezza 98.4%</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col gap-1 mt-1 mb-5">
          <h2 className="text-[24px] leading-[30px] font-bold text-[#191c1c] tracking-tight">
            Il tuo piano EVOLVE è pronto.
          </h2>
          <p className="text-[15px] leading-[22px] text-[#56615c]">
            Basato su 14 parametri corporei e sul tuo obiettivo prioritario di{' '}
            <span className="font-semibold text-[#191c1c]">
              {goalNameMap[profile.goal] || 'Ipertrofia Muscolare'}
            </span>.
          </p>
        </div>

        {/* Profilo Biometrico Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] mb-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f2f4f3]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e6e9e8] flex items-center justify-center text-[#424936]">
                <Icon name="fingerprint" className="w-[18px] h-[18px]" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[#56615c] font-bold">
                Parametri Acquisiti
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#416900] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse"></span>
              Calibrato
            </span>
          </div>

          {/* Metric Chips Matrix */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f2f4f3]">
              <Icon name="person" className="w-5 h-5 text-[#56615c]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#56615c]">Dati Demografici</span>
                <span className="text-[13px] font-semibold text-[#191c1c] capitalize truncate">
                  {profile.sex}, {profile.age} anni
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f2f4f3]">
              <Icon name="straighten" className="w-5 h-5 text-[#56615c]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#56615c]">Statura &amp; Massa</span>
                <span className="text-[13px] font-semibold text-[#191c1c] truncate">
                  {profile.heightCm} cm · {profile.weightKg.toFixed(1)} kg
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f2f4f3]">
              <Icon name="trending_up" className="w-5 h-5 text-[#56615c]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#56615c]">Esperienza</span>
                <span className="text-[13px] font-semibold text-[#191c1c] truncate">
                  {experienceNameMap[profile.experience] || 'Livello Intermedio'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f2f4f3]">
              <Icon name="calendar_today" className="w-5 h-5 text-[#56615c]" />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#56615c]">Frequenza</span>
                <span className="text-[13px] font-semibold text-[#191c1c] truncate">
                  {profile.weeklyDays} sessioni / sett
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Nutrizionali Suggeriti */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] mb-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e6e9e8] flex items-center justify-center text-[#424936]">
                <Icon name="restaurant" className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#56615c] font-bold block">
                  Fabbisogno Energetico
                </span>
                <h3 className="text-[20px] font-bold text-[#191c1c] leading-tight">
                  Target Nutrizionale
                </h3>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#416900]/10 text-[#416900] text-[12px] font-bold">
              {nutrition.surplusDeficitLabel}
            </span>
          </div>

          {/* Main Calorie Display */}
          <div className="flex items-center justify-between bg-[#f2f4f3] p-4 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[12px] text-[#56615c]">Obiettivo Giornaliero</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[32px] font-extrabold text-[#191c1c] tracking-tight">
                  {nutrition.calories.toLocaleString()}
                </span>
                <span className="text-[15px] font-semibold text-[#56615c]">kcal / die</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-right">
              <Icon name="bolt" className="w-5 h-5 text-[#416900]" />
              <span className="text-[12px] font-medium text-[#56615c] max-w-[130px] leading-tight text-right">
                Surplus controllato per massa magra pulita
              </span>
            </div>
          </div>

          {/* Macro Split Progress Bars */}
          <div className="flex flex-col gap-3">
            {/* Proteine */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[#191c1c] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]"></span>
                  Proteine ({nutrition.proteinPct}%)
                </span>
                <span className="font-bold text-[#191c1c]">
                  {nutrition.proteinGrams}g{' '}
                  <span className="text-[12px] text-[#56615c] font-normal">
                    ({nutrition.proteinKcal} kcal)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#eceeed] overflow-hidden">
                <div
                  className="h-full bg-[#84cc16] rounded-full transition-all duration-700"
                  style={{ width: `${nutrition.proteinPct}%` }}
                ></div>
              </div>
            </div>

            {/* Carboidrati */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[#191c1c] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                  Carboidrati ({nutrition.carbsPct}%)
                </span>
                <span className="font-bold text-[#191c1c]">
                  {nutrition.carbsGrams}g{' '}
                  <span className="text-[12px] text-[#56615c] font-normal">
                    ({nutrition.carbsKcal.toLocaleString()} kcal)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#eceeed] overflow-hidden">
                <div
                  className="h-full bg-[#f59e0b] rounded-full transition-all duration-700"
                  style={{ width: `${nutrition.carbsPct}%` }}
                ></div>
              </div>
            </div>

            {/* Grassi */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[#191c1c] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
                  Grassi ({nutrition.fatsPct}%)
                </span>
                <span className="font-bold text-[#191c1c]">
                  {nutrition.fatsGrams}g{' '}
                  <span className="text-[12px] text-[#56615c] font-normal">
                    ({nutrition.fatsKcal} kcal)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#eceeed] overflow-hidden">
                <div
                  className="h-full bg-[#f43f5e] rounded-full transition-all duration-700"
                  style={{ width: `${nutrition.fatsPct}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Scheda di Allenamento Personalizzata */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e6e9e8] flex items-center justify-center text-[#424936]">
                <Icon name="fitness_center" className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#56615c] font-bold block">
                  Programmazione Forza &amp; Volume
                </span>
                <h3 className="text-[20px] font-bold text-[#191c1c] leading-tight">
                  Scheda Assegnata
                </h3>
              </div>
            </div>
            <span className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center text-[#191c1c]">
              <Icon name="tune" className="w-5 h-5" />
            </span>
          </div>

          {/* Workout Plan Banner */}
          <div className="relative overflow-hidden rounded-xl bg-[#e6e9e8] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#191c1c] text-white uppercase tracking-wider">
                Split {profile.weeklyDays} Giorni
              </span>
              <div className="flex items-center gap-1 text-[#56615c] text-[12px] font-medium">
                <Icon name="schedule" className="w-4 h-4" />
                60-70 min / sessione
              </div>
            </div>

            <h4 className="text-[20px] font-bold text-[#191c1c] leading-snug">
              Upper / Lower Power &amp; Hypertrophy
            </h4>
            <p className="text-[13px] text-[#56615c]">
              Periodizzazione ondulata mirata a stimoli tensivi meccanici e pump metabolico ad alta efficienza.
            </p>

            {/* Focus Muscolare Pills */}
            <div className="pt-2 flex flex-col gap-1.5">
              <span className="text-[11px] text-[#56615c] uppercase font-bold tracking-wider">
                Focus Muscolare Primario:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Pettorali', 'Dorsali', 'Spalle (Deltoidi)', 'Catena Posteriore'].map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-full bg-white text-[13px] font-semibold text-[#191c1c] shadow-xs"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Workout Routine Days Mini-List */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="p-3 rounded-xl bg-[#f2f4f3] flex flex-col gap-1">
              <span className="text-[11px] text-[#56615c] font-medium">Giorno 1 · Lunedì</span>
              <span className="text-[13px] font-bold text-[#191c1c]">Petto, Tricipiti &amp; Avambracci</span>
            </div>
            <div className="p-3 rounded-xl bg-[#f2f4f3] flex flex-col gap-1">
              <span className="text-[11px] text-[#56615c] font-medium">Giorno 2 · Martedì</span>
              <span className="text-[13px] font-bold text-[#191c1c]">Schiena, Bicipiti &amp; Avambracci</span>
            </div>
            <div className="p-3 rounded-xl bg-[#f2f4f3] flex flex-col gap-1">
              <span className="text-[11px] text-[#56615c] font-medium">Giorno 3 · Giovedì</span>
              <span className="text-[13px] font-bold text-[#191c1c]">Spalle, Braccia &amp; Avambracci</span>
            </div>
            <div className="p-3 rounded-xl bg-[#f2f4f3] flex flex-col gap-1">
              <span className="text-[11px] text-[#56615c] font-medium">Giorno 4 · Venerdì</span>
              <span className="text-[13px] font-bold text-[#191c1c]">Gambe &amp; Polpacci</span>
            </div>
          </div>
        </div>

        {/* Visual Lifestyle Imagery Card */}
        <div className="relative rounded-2xl overflow-hidden shadow-sm mb-4 h-36 flex items-end p-4 border border-[#e2e8e4]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${ASSETS.gymGuyStrength}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#17211D]/90 via-[#17211D]/40 to-transparent"></div>
          <div className="relative z-10 flex flex-col text-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#acf847]">
              Guida Intelligente
            </span>
            <p className="text-[15px] font-semibold text-white">
              Recupero e stimolo muscolare bilanciati scientificamente.
            </p>
          </div>
        </div>

        {/* Proiezione e Andamento Atteso */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e6e9e8] flex items-center justify-center text-[#424936]">
                <Icon name="show_chart" className="w-[18px] h-[18px]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#56615c] font-bold block">
                  Proiezione a 12 Settimane
                </span>
                <h3 className="text-[20px] font-bold text-[#191c1c] leading-tight">
                  Andamento Atteso
                </h3>
              </div>
            </div>
            <span className="text-[13px] font-bold text-[#416900]">
              {projection.totalDeltaKg >= 0 ? `+${projection.totalDeltaKg}` : projection.totalDeltaKg} kg est.
            </span>
          </div>

          {/* Projected Rate Metric */}
          <div className="p-3 rounded-xl bg-[#f2f4f3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="speed" className="w-5 h-5 text-[#416900]" />
              <span className="text-[13px] text-[#56615c]">Ritmo di accrescimento:</span>
            </div>
            <span className="text-[15px] font-bold text-[#191c1c]">
              {projection.rateLabel}
            </span>
          </div>

          {/* Inline SVG Trend Curve Chart */}
          <div className="w-full flex flex-col gap-2 pt-1">
            <div className="w-full h-32 relative">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 340 120">
                <defs>
                  <linearGradient id="curveGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#84cc16" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="20" x2="340" y2="20" stroke="#e1e3e2" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1="60" x2="340" y2="60" stroke="#e1e3e2" strokeDasharray="4 4" strokeWidth="1" />
                <line x1="0" y1="100" x2="340" y2="100" stroke="#e1e3e2" strokeDasharray="4 4" strokeWidth="1" />

                <path d="M 0 105 Q 85 92, 170 65 T 340 22 L 340 115 L 0 115 Z" fill="url(#curveGradient)" />
                <path d="M 0 105 Q 85 92, 170 65 T 340 22" fill="none" stroke="#416900" strokeWidth="3" strokeLinecap="round" />

                <circle cx="0" cy="105" r="4.5" fill="#ffffff" stroke="#416900" strokeWidth="2.5" />
                <circle cx="170" cy="65" r="4.5" fill="#ffffff" stroke="#416900" strokeWidth="2.5" />
                <circle cx="340" cy="22" r="6" fill="#84cc16" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#56615c] px-1">
              <span>{projection.points[0]?.label || 'Oggi'}</span>
              <span>{projection.points[1]?.label || 'Settimana 6'}</span>
              <span className="font-semibold text-[#191c1c]">{projection.points[2]?.label || 'Settimana 12'}</span>
            </div>
          </div>

          {/* Scientific Transparency Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f2f4f3] mt-1">
            <Icon name="info" className="w-5 h-5 text-[#56615c] shrink-0 mt-0.5" />
            <p className="text-[12px] leading-relaxed text-[#56615c]">
              L'adattamento metabolico viene ricalcolato settimanalmente dai tuoi check-in biometrici e dai volumi sollevati in palestra. Nessuna stima è rigida: EVOLVE cresce con te.
            </p>
          </div>
        </div>

        {/* Sticky Fixed Bottom Action Panel */}
        <div className="fixed bottom-0 inset-x-0 p-4 bg-[#f8faf9]/90 dark:bg-[#0e1512]/90 backdrop-blur-xl border-t border-[#e2e8e4]/60 dark:border-[#2a3832]/60 z-40 flex justify-center">
          <div className="w-full max-w-md">
            <button
              id="cta-create-journey-btn"
              type="button"
              onClick={handleCreateJourney}
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[17px] font-bold shadow-lg shadow-[#84cc16]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Generazione in corso...</span>
                </>
              ) : (
                <>
                  <span>Crea il mio percorso</span>
                  <Icon name="arrow_forward" className="w-[22px] h-[22px]" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
