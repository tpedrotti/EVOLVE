import React from 'react';
import type { MainTab } from '../types';
import { Icon } from './Icons';

interface BottomNavBarProps {
  currentTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  isHidden?: boolean;
  onOpenCoach?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onTabChange,
  isHidden = false,
  onOpenCoach,
}) => {
  const tabs: { id: MainTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'workout', label: 'Workout', icon: 'fitness_center' },
    { id: 'dieta', label: 'Dieta', icon: 'restaurant' },
    { id: 'trend', label: 'Trend', icon: 'monitoring' },
    { id: 'foto', label: 'Foto', icon: 'photo_camera' },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none pb-3 transition-all duration-300 ${
        isHidden ? 'opacity-0 translate-y-12 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Coach AI Floating Quick-Access Pill (appena sopra la barra) */}
      {onOpenCoach && (
        <div className="w-[calc(100%-2rem)] max-w-md flex justify-center mb-2 pointer-events-none">
          <button
            id="coach-ai-fab-btn"
            type="button"
            onClick={onOpenCoach}
            aria-label="Apri Coach AI"
            title="Chat con il Coach AI Biometrico"
            className="pointer-events-auto flex items-center gap-2 bg-[#191c1c] hover:bg-[#2c3330] active:scale-95 text-white px-4 py-1.5 rounded-full shadow-[0_8px_20px_rgba(25,28,28,0.22)] border border-white/10 transition-all cursor-pointer group"
          >
            <div className="w-5 h-5 rounded-full bg-[#84cc16] flex items-center justify-center text-[#102000] group-hover:scale-110 transition-transform shadow-xs">
              <Icon name="neurology" className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-[#f8faf9]">Coach AI</span>
            <span className="w-2 h-2 rounded-full bg-[#84cc16] ring-2 ring-[#191c1c] animate-pulse"></span>
          </button>
        </div>
      )}

      <nav
        aria-label="Navigazione principale"
        className="pointer-events-auto w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-2xl rounded-full shadow-[0_10px_24px_rgba(23,33,29,0.12)] px-1 py-1.5 flex items-center justify-between border border-[#e2e8e4]/80"
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={`flex-1 h-12 flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                isActive
                  ? 'text-[#191c1c]'
                  : 'text-[#56615c] hover:text-[#191c1c]'
              }`}
            >
              <div className={`transition-transform ${isActive ? 'scale-110 text-[#191c1c]' : 'text-[#56615c]'}`}>
                <Icon name={tab.icon} className="w-[22px] h-[22px]" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full bg-[#84cc16] absolute -bottom-0.5 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              ></span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
