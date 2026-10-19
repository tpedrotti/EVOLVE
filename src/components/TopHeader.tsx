import React, { useState } from 'react';
import { ASSETS } from '../data/mockData';
import { Icon } from './Icons';
import { UserAvatar } from './UserAvatar';

import { generateLiveNotifications, type NotificationItem } from '../utils/metrics';

interface TopHeaderProps {
  onOpenProfile: () => void;
  onRestartOnboarding: () => void;
  onOpenSettings: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  avatarUrl?: string;
  todayWaterLiters?: number;
  hydrationGoalLiters?: number;
  todayCalories?: number;
  targetCalories?: number;
  workoutTitle?: string;
  isDemoData?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenProfile,
  onRestartOnboarding,
  onOpenSettings,
  isDarkMode = false,
  onToggleTheme,
  avatarUrl,
  todayWaterLiters = 0.0,
  hydrationGoalLiters = 3.0,
  todayCalories = 2220,
  targetCalories = 2850,
  workoutTitle = 'Giorno 1: Petto, Tricipiti e Avambracci',
  isDemoData = true,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications: NotificationItem[] = generateLiveNotifications({
    todayWaterLiters,
    hydrationGoalLiters,
    todayCalories,
    targetCalories,
    workoutTitle,
  });

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#f8faf9]/85 backdrop-blur-xl border-b border-[#e2e8e4]/60 pt-safe flex justify-center">
      <div className="w-full max-w-md h-16 px-5 flex items-center justify-between relative">
        {/* Brand Logo */}
        <div className="flex items-center">
          <img
            alt="EVOLVE"
            className="h-8 w-auto object-contain dark:hidden"
            src={isDarkMode ? ASSETS.logoDark : ASSETS.logo}
          />
          <img
            alt="EVOLVE"
            className="h-8 w-auto object-contain hidden dark:block"
            src={ASSETS.logoDark}
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle Button (Light / Dark) */}
          {onToggleTheme && (
            <button
              id="theme-toggle-header-btn"
              type="button"
              onClick={onToggleTheme}
              aria-label={isDarkMode ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
              title={isDarkMode ? 'Passa al tema chiaro' : 'Passa alla Dark Mode'}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#e6e9e8] transition-colors text-[#424936] cursor-pointer"
            >
              <div className={`transition-transform duration-300 ${isDarkMode ? 'rotate-90 text-[#84cc16]' : 'rotate-0 text-[#424936]'}`}>
                <Icon name={isDarkMode ? 'sun' : 'moon'} className="w-5 h-5" />
              </div>
            </button>
          )}

          {/* Notifications button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
              }}
              aria-label="Notifiche"
              className="w-11 h-11 flex items-center justify-center relative rounded-full hover:bg-[#e6e9e8] transition-colors text-[#424936] cursor-pointer"
            >
              <Icon name="notifications" className="w-6 h-6" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#84cc16] ring-2 ring-[#f8faf9]"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-[#e2e8e4] p-3.5 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-[#eceeed]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#191c1c]">Notifiche Biometriche</span>
                    <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse" />
                  </div>
                  <span className="text-[10px] text-[#416900] bg-[#84cc16]/20 px-2 py-0.5 rounded-full font-bold">
                    {isDemoData ? 'Demo Sincronizzata' : 'Dati Reali'}
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-2.5 max-h-80 overflow-y-auto no-scrollbar">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-2.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4]/70 text-[12px] flex flex-col justify-between hover:border-[#84cc16]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#191c1c] flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${notif.category === 'hydration' ? 'bg-[#0284c7]' : notif.category === 'nutrition' ? 'bg-[#ca8a04]' : 'bg-[#84cc16]'}`} />
                          <span>{notif.title}</span>
                        </div>
                        <span className="text-[10px] text-[#86928d] font-medium">{notif.timestamp}</span>
                      </div>
                      <p className="text-[#56615c] mt-1 text-[11px] leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.valueContext && (
                        <div className="mt-1.5 pt-1 border-t border-[#f2f4f3] flex justify-between items-center text-[10px] text-[#86928d]">
                          <span>Dato rilevato:</span>
                          <span className="font-bold text-[#191c1c]">{notif.valueContext}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#eceeed] flex items-center justify-between text-[10px] text-[#86928d]">
                  <span>Fonte: Dashboard Home (Consistente)</span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="font-bold text-[#386a00] hover:underline cursor-pointer"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            )}
          </div>



          {/* User Profile Avatar Button - Opens Settings */}
          <div className="relative">
            <button
              id="profile-settings-btn"
              type="button"
              onClick={onOpenSettings}
              aria-label="Apri Impostazioni Profilo"
              title="Apri Impostazioni Profilo"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
            >
              <UserAvatar
                avatarUrl={avatarUrl}
                name="Utente"
                className="w-8 h-8 ring-2 ring-[#c1cab0]/40 group-hover:ring-[#84cc16] transition-colors"
              />
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#84cc16] shadow-xs flex items-center justify-center text-[#102000] ring-1 ring-white">
                <Icon name="settings" className="w-2.5 h-2.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
