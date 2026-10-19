import React from 'react';
import { ASSETS } from '../data/mockData';
import { Icon } from './Icons';

interface ScreenHeroProps {
  onStartJourney: () => void;
  onAlreadyHaveAccount: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const ScreenHero: React.FC<ScreenHeroProps> = ({
  onStartJourney,
  onAlreadyHaveAccount,
  isDarkMode = false,
  onToggleTheme,
}) => {
  return (
    <div className="w-full min-h-screen bg-[#f8faf9] text-[#191c1c] flex flex-col items-center">
      <div className="w-full max-w-md px-5 pt-3 pb-12 flex flex-col relative">
        {/* Top bar with Dark Mode toggle */}
        {onToggleTheme && (
          <div className="w-full flex justify-end pt-1">
            <button
              id="hero-theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              aria-label={isDarkMode ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
              title={isDarkMode ? 'Passa al tema chiaro' : 'Passa alla Dark Mode'}
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#e2e8e4] flex items-center justify-center text-[#424936] hover:bg-[#f2f4f3] transition-colors cursor-pointer"
            >
              <div className={`transition-transform duration-300 ${isDarkMode ? 'rotate-90 text-[#84cc16]' : 'rotate-0 text-[#424936]'}`}>
                <Icon name={isDarkMode ? 'sun' : 'moon'} className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}

        {/* Brand & Micro Header */}
        <div className="flex flex-col items-center justify-center pt-1 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#182220] p-2.5 shadow-sm flex items-center justify-center mb-3 border border-[#eceeed] dark:border-[#2a3832]">
            <img
              alt="EVOLVE Brand Logo"
              className="w-full h-full object-contain dark:hidden"
              src={isDarkMode ? ASSETS.logoDark : ASSETS.logo}
            />
            <img
              alt="EVOLVE Brand Logo"
              className="w-full h-full object-contain hidden dark:block"
              src={ASSETS.logoDark}
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6e9e8] dark:bg-[#1e2b27] text-[#424936] dark:text-[#b8c4bc] text-[11px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse"></span>
            Il Tuo Personal Trainer Intelligente
          </div>
        </div>

        {/* Hero Visual Stage: Kinetic iOS Layered Card */}
        <div className="relative w-full rounded-3xl bg-white shadow-sm p-4 overflow-hidden mb-6 border border-[#e2e8e4]">
          {/* Atmospheric Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#84cc16]/15 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#d7e2dc]/40 blur-xl pointer-events-none"></div>

          <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-[#eceeed] shadow-inner">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{ backgroundImage: `url('${ASSETS.heroRunner}')` }}
            >
              <div className="w-full h-full bg-gradient-to-t from-[#17211D]/80 via-[#17211D]/20 to-transparent flex flex-col justify-end p-4">
                {/* Live Floating Biometric Preview Pills */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#84cc16]/20 flex items-center justify-center text-[#416900]">
                      <Icon name="vital_signs" className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] leading-tight text-[#56615c]">Recupero Oggi</span>
                      <span className="text-[13px] leading-tight text-[#191c1c] font-semibold">96% Ottimale</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm">
                    <Icon name="bolt" className="w-5 h-5 text-[#84cc16]" />
                    <span className="text-[13px] leading-tight text-[#191c1c] font-semibold">VO2 Max +2.4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Metric Mini-strip */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-1">
            <div className="bg-[#f2f4f3] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[12px] text-[#56615c]">Attività</span>
              <span className="text-[15px] font-bold text-[#191c1c]">540 kcal</span>
            </div>
            <div className="bg-[#f2f4f3] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[12px] text-[#56615c]">Idratazione</span>
              <span className="text-[15px] font-bold text-[#191c1c]">2.4 L</span>
            </div>
            <div className="bg-[#f2f4f3] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[12px] text-[#56615c]">Sonno Profondo</span>
              <span className="text-[15px] font-bold text-[#191c1c]">7h 45m</span>
            </div>
          </div>
        </div>

        {/* Narrative & Core Value Proposition */}
        <div className="flex flex-col mb-6 text-center">
          <h1 className="text-[38px] leading-[42px] font-extrabold text-[#191c1c] tracking-tight mb-2">
            La tua evoluzione<br />inizia qui.
          </h1>
          <p className="text-[15px] leading-[22px] text-[#424936] max-w-sm mx-auto">
            Programmi di allenamento su misura, nutrizione biologica intelligente e analisi continua dei tuoi progressi, tutto guidato dall'AI.
          </p>
        </div>

        {/* Key Value Highlights iOS Badges */}
        <div className="flex flex-col gap-2.5 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-[#e2e8e4]">
            <div className="w-8 h-8 rounded-full bg-[#84cc16]/25 text-[#416900] flex items-center justify-center shrink-0">
              <Icon name="check" className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-[#191c1c]">Piani iper-personalizzati</span>
              <span className="text-[12px] text-[#56615c] truncate">Adattamento continuo basato sul carico fisiologico</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-[#e2e8e4]">
            <div className="w-8 h-8 rounded-full bg-[#84cc16]/25 text-[#416900] flex items-center justify-center shrink-0">
              <Icon name="check" className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-[#191c1c]">Macro &amp; calorie in tempo reale</span>
              <span className="text-[12px] text-[#56615c] truncate">Bilanciamento istantaneo con scanner nutrizionale AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-[#e2e8e4]">
            <div className="w-8 h-8 rounded-full bg-[#84cc16]/25 text-[#416900] flex items-center justify-center shrink-0">
              <Icon name="check" className="w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-[#191c1c]">Feedback biometrico costante</span>
              <span className="text-[12px] text-[#56615c] truncate">Integrazione cardiovascolare e tempi di recupero ideali</span>
            </div>
          </div>
        </div>


        {/* Action Stack */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            id="start-journey-btn"
            type="button"
            onClick={onStartJourney}
            className="w-full py-4 px-6 rounded-2xl bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[18px] font-bold shadow-lg shadow-[#84cc16]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Inizia il tuo percorso</span>
            <Icon name="arrow_forward" className="w-[22px] h-[22px]" />
          </button>

          <button
            type="button"
            onClick={onAlreadyHaveAccount}
            className="py-2.5 px-4 rounded-full text-[#56615c] text-[15px] font-medium hover:text-[#191c1c] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Ho già un account</span>
            <Icon name="chevron_right" className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Legal Microcopy Footer */}
        <div className="pt-4 text-center">
          <p className="text-[12px] text-[#56615c]">
            Accedendo accetti i <a className="underline hover:text-[#191c1c]" href="#terms">Termini di Servizio</a> e la <a className="underline hover:text-[#191c1c]" href="#privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
