import React, { useState, useEffect } from 'react';
import type { MealEntry, UserProfile } from '../types';
import { calculateTargetNutrition } from '../utils/fitnessLogic';
import {
  getEffectiveTodayKey,
  getShiftedDateKey,
  formatShortMealDate,
} from '../utils/mealValidation';
import { Icon } from './Icons';

interface ScreenDietaProps {
  profile: UserProfile;
  meals: MealEntry[];
  onOpenAddMeal: (prefilledDate?: string) => void;
  onDeleteMeal: (id: string) => void;
  onOpenCoach?: () => void;
}

export const ScreenDieta: React.FC<ScreenDietaProps> = ({
  profile,
  meals,
  onOpenAddMeal,
  onDeleteMeal,
  onOpenCoach,
}) => {
  const todayKey = getEffectiveTodayKey(profile);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  // Sync selectedDate if profile simulatedDate changes (e.g. from demo settings)
  useEffect(() => {
    setSelectedDate(todayKey);
  }, [todayKey]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('evolve_dieta_history_open');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  // Categories are closed by default when viewing or expanding history
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Dishes/meals are closed by default; user can click to expand and see full details
  const [expandedMealIds, setExpandedMealIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem('evolve_dieta_history_open', String(isHistoryOpen));
    } catch {}
  }, [isHistoryOpen]);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleMealExpand = (mealId: string) => {
    setExpandedMealIds((prev) => ({
      ...prev,
      [mealId]: !prev[mealId],
    }));
  };

  const goToPreviousDay = () => {
    setSelectedDate((prev) => getShiftedDateKey(prev, -1));
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => getShiftedDateKey(prev, 1));
  };

  const [historyViewMode, setHistoryViewMode] = useState<'day' | 'all'>('day');

  const nutrition = calculateTargetNutrition(profile);

  // Filter meals for the selected date. For backward compatibility with meals without date, default to todayKey.
  const dayMeals = meals.filter((m) => (m.date || todayKey) === selectedDate);

  // Sort all meals chronologically descending (most recent date and time first)
  const sortedAllMeals = [...meals].sort((a, b) => {
    const dateA = a.date || todayKey;
    const dateB = b.date || todayKey;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (b.time || '').localeCompare(a.time || '');
  });

  const displayedMeals = historyViewMode === 'day' ? dayMeals : sortedAllMeals;

  const totalCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = dayMeals.reduce((sum, m) => sum + m.proteinG, 0);
  const totalCarbs = dayMeals.reduce((sum, m) => sum + m.carbsG, 0);
  const totalFats = dayMeals.reduce((sum, m) => sum + m.fatsG, 0);
  const totalSugars = dayMeals.reduce((sum, m) => sum + (m.sugarsG || 0), 0);
  const totalFiber = dayMeals.reduce((sum, m) => sum + (m.fiberG || 0), 0);

  const remainingCalories = Math.max(0, nutrition.calories - totalCalories);

  const mealCategories: { key: MealEntry['mealType']; label: string }[] = [
    { key: 'colazione', label: 'Colazione' },
    { key: 'pranzo', label: 'Pranzo' },
    { key: 'spuntino', label: 'Spuntino & Pre-Workout' },
    { key: 'cena', label: 'Cena' },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-md px-5 pb-32 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#416900]">
              Nutrizione Biologica
            </span>
            <h2 className="text-[24px] font-bold text-[#191c1c] tracking-tight">
              Diario Alimentare
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenAddMeal(selectedDate)}
            aria-haspopup="dialog"
            aria-label="Registra nuovo alimento nel diario alimentare"
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-[#84cc16] hover:bg-[#91db2a] text-[#102000] text-[13px] font-bold shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#416900]"
          >
            <Icon name="add" className="w-4 h-4" />
            <span>Aggiungi</span>
          </button>
        </div>

        {/* Date Navigator Bar */}
        <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-[#e2e8e4] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goToPreviousDay}
            aria-label="Giorno precedente"
            title="Giorno precedente"
            className="w-9 h-9 rounded-xl bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Icon name="chevron_left" className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f8faf9] border border-[#e2e8e4] truncate">
              <Icon name="calendar_today" className="w-4 h-4 text-[#416900] shrink-0" />
              <span className="text-[13px] font-bold text-[#191c1c] truncate">
                {formatShortMealDate(selectedDate, todayKey)}
              </span>
            </div>
            {selectedDate !== todayKey && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayKey)}
                aria-label="Torna a oggi"
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#84cc16]/20 text-[#386a00] hover:bg-[#84cc16]/30 cursor-pointer transition-colors shrink-0"
              >
                Oggi
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goToNextDay}
            aria-label="Giorno successivo"
            title="Giorno successivo"
            className="w-9 h-9 rounded-xl bg-[#f2f4f3] hover:bg-[#e6e9e8] text-[#191c1c] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Icon name="chevron_right" className="w-5 h-5" />
          </button>
        </div>

        {/* Nutritional Summary Banner */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8e4]">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-bold text-[#386a00] uppercase tracking-wide">Target Attivo Diario</span>
                <span className="text-[10px] text-[#56615c]">• {nutrition.surplusDeficitLabel}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[32px] font-extrabold text-[#191c1c] leading-none">
                  {totalCalories.toLocaleString()}
                </span>
                <span className="text-[14px] text-[#56615c] font-semibold">
                  / {nutrition.calories.toLocaleString()} kcal
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[12px] text-[#56615c] block">Rimanenti</span>
              <span className="text-[20px] font-bold text-[#386a00]">
                {remainingCalories.toLocaleString()} kcal
              </span>
            </div>
          </div>

          {/* Macro Progress Bars: Proteine, Carbo, Grassi */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#e2e8e4]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#191c1c]">
                <span>Proteine</span>
                <span>{totalProtein}g</span>
              </div>
              <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#84cc16] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalProtein / nutrition.proteinGrams) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-[#56615c] mt-1 block">Target {nutrition.proteinGrams}g</span>
            </div>

            <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#e2e8e4]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#191c1c]">
                <span>Carbo</span>
                <span>{totalCarbs}g</span>
              </div>
              <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalCarbs / nutrition.carbsGrams) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-[#56615c] mt-1 block">Target {nutrition.carbsGrams}g</span>
            </div>

            <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#e2e8e4]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#191c1c]">
                <span>Grassi</span>
                <span>{totalFats}g</span>
              </div>
              <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#f43f5e] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalFats / nutrition.fatsGrams) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-[#56615c] mt-1 block">Target {nutrition.fatsGrams}g</span>
            </div>
          </div>

          {/* Secondary Nutritional Info: Zuccheri & Fibre */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#e2e8e4]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#191c1c]">
                <span>Zuccheri</span>
                <span>{totalSugars}g</span>
              </div>
              <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalSugars > (nutrition.sugarsMaxGrams || 70) ? 'bg-[#ef4444]' : 'bg-[#a855f7]'
                  }`}
                  style={{
                    width: `${Math.min(100, (totalSugars / (nutrition.sugarsMaxGrams || 70)) * 100)}%`,
                  }}
                ></div>
              </div>
              <span className="text-[10px] text-[#56615c] mt-1 block">
                Target &lt;{nutrition.sugarsMaxGrams || 70}g
              </span>
            </div>

            <div className="p-2.5 bg-[#f8faf9] rounded-xl border border-[#e2e8e4]/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#191c1c]">
                <span>Fibre</span>
                <span>{totalFiber}g</span>
              </div>
              <div className="w-full h-1.5 bg-[#e1e3e2] rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#10b981] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totalFiber / (nutrition.fiberTargetGrams || 35)) * 100)}%`,
                  }}
                ></div>
              </div>
              <span className="text-[10px] text-[#56615c] mt-1 block">
                Target {nutrition.fiberTargetGrams || 35}g
              </span>
            </div>
          </div>
        </div>

        {/* Sezione Storico Pasti con Tendina e Filtro */}
        <div className="flex items-center justify-between px-1 pt-1 select-none">
          <div
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2 cursor-pointer group"
            title={isHistoryOpen ? 'Comprimi lo storico pasti' : 'Espandi lo storico pasti'}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#56615c] group-hover:text-[#191c1c] transition-colors">
              Storico Pasti
            </span>
            <span className="text-[11px] font-bold text-[#386a00] bg-[#84cc16]/20 px-2 py-0.5 rounded-full">
              {historyViewMode === 'day' ? `${dayMeals.length} oggi` : `${meals.length} totali`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro Vista: Giorno selezionato vs Tutti */}
            <div
              className="inline-flex rounded-lg bg-[#e6e9e8] p-0.5"
              role="radiogroup"
              aria-label="Filtro visualizzazione storico pasti"
            >
              <button
                type="button"
                onClick={() => setHistoryViewMode('day')}
                aria-pressed={historyViewMode === 'day'}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  historyViewMode === 'day'
                    ? 'bg-white text-[#386a00] shadow-xs'
                    : 'text-[#56615c] hover:text-[#191c1c]'
                }`}
              >
                Giorno ({dayMeals.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryViewMode('all')}
                aria-pressed={historyViewMode === 'all'}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  historyViewMode === 'all'
                    ? 'bg-white text-[#386a00] shadow-xs'
                    : 'text-[#56615c] hover:text-[#191c1c]'
                }`}
              >
                Tutti ({meals.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-7 h-7 rounded-full bg-white border border-[#e2e8e4] text-[#386a00] flex items-center justify-center hover:bg-[#f2f4f3] transition-all cursor-pointer shadow-2xs active:scale-95"
              aria-label={isHistoryOpen ? 'Comprimi lo storico pasti' : 'Espandi lo storico pasti'}
            >
              <Icon name={isHistoryOpen ? 'expand_less' : 'expand_more'} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vista Compressa / Nascosta */}
        {!isHistoryOpen ? (
          <div
            onClick={() => setIsHistoryOpen(true)}
            className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4] hover:border-[#84cc16] transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99] select-none"
            title="Espandi diario"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#84cc16]/15 flex items-center justify-center text-[#386a00] group-hover:scale-105 transition-transform shrink-0">
                <Icon name="restaurant" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors">
                  {historyViewMode === 'all'
                    ? `Tutti i Pasti Registrati (${meals.length})`
                    : selectedDate === todayKey
                      ? 'Registro Pasti di Oggi'
                      : `Registro Pasti · ${formatShortMealDate(selectedDate, todayKey)}`}
                </h4>
                <p className="text-[12px] text-[#56615c] mt-0.5">
                  {(historyViewMode === 'all'
                    ? meals.reduce((sum, m) => sum + m.calories, 0)
                    : totalCalories
                  ).toLocaleString()}{' '}
                  kcal registrate
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#f2f4f3] group-hover:bg-[#e6e9e8] flex items-center justify-center text-[#386a00] transition-colors shrink-0">
              <Icon name="expand_more" className="w-5 h-5" />
            </div>
          </div>
        ) : (
          /* Vista Espansa con Categorie Richiudibili */
          <div className="space-y-3 animate-fadeIn">
            {mealCategories.map((cat) => {
              const categoryMeals = displayedMeals.filter((m) => m.mealType === cat.key);
              const categoryKcal = categoryMeals.reduce((sum, m) => sum + m.calories, 0);
              const isCategoryOpen = Boolean(openCategories[cat.key]);

              return (
                <div
                  key={cat.key}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8e4]"
                >
                  {/* Category Accordion Header */}
                  <div
                    onClick={() => toggleCategory(cat.key)}
                    className={`flex items-center justify-between cursor-pointer select-none group transition-all ${
                      isCategoryOpen ? 'pb-2 border-b border-[#f2f4f3]' : 'py-0.5'
                    }`}
                    title={isCategoryOpen ? 'Comprimi pasto' : 'Espandi pasto'}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="restaurant" className="w-[18px] h-[18px] text-[#416900]" />
                      <span className="text-[15px] font-bold text-[#191c1c] group-hover:text-[#386a00] transition-colors">
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f2f4f3] text-[#56615c]">
                        {categoryMeals.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[#56615c]">
                        {categoryKcal} kcal
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[#f2f4f3] group-hover:bg-[#e6e9e8] flex items-center justify-center text-[#56615c] group-hover:text-[#386a00] transition-colors">
                        <Icon
                          name={isCategoryOpen ? 'expand_less' : 'expand_more'}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Items List (Collapsible) */}
                  {isCategoryOpen && (
                    <div className="pt-2">
                      {categoryMeals.length === 0 ? (
                        <p className="text-[12px] text-[#8c9992] py-1 italic">
                          Nessun alimento registrato per questo pasto.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {categoryMeals.map((meal) => {
                            const isMealOpen = Boolean(expandedMealIds[meal.id]);

                            return (
                              <div
                                key={meal.id}
                                className="rounded-xl bg-[#f8faf9] text-[13px] border border-[#eceeed]/60 hover:border-[#84cc16]/40 transition-all overflow-hidden"
                              >
                                {/* Header del piatto (Mostra solo Titolo e Data) */}
                                <div
                                  onClick={() => toggleMealExpand(meal.id)}
                                  className="flex items-center justify-between p-3 cursor-pointer select-none group"
                                  title={isMealOpen ? 'Comprimi piatto' : 'Espandi dettagli piatto'}
                                >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-bold text-[#191c1c] truncate group-hover:text-[#386a00] transition-colors">
                                      {meal.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {/* Data del piatto */}
                                      <span className="inline-flex items-center gap-1 font-bold text-[#386a00] bg-[#84cc16]/15 px-2 py-0.5 rounded-md text-[10px] shrink-0">
                                        <Icon name="calendar_today" className="w-3 h-3 text-[#386a00]" />
                                        <span>{formatShortMealDate(meal.date || todayKey, todayKey)}</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="w-7 h-7 rounded-full bg-[#f2f4f3] group-hover:bg-[#e6e9e8] flex items-center justify-center text-[#56615c] group-hover:text-[#386a00] transition-colors shrink-0">
                                    <Icon
                                      name={isMealOpen ? 'expand_less' : 'expand_more'}
                                      className="w-4 h-4"
                                    />
                                  </div>
                                </div>

                                {/* Dettagli Espansi del Piatto */}
                                {isMealOpen && (
                                  <div className="p-3 pt-0 border-t border-[#eceeed]/60 space-y-3 animate-fadeIn">
                                    {/* Immagine del Piatto (se presente) */}
                                    {meal.imageUrl && (
                                      <div className="w-full h-44 rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 border border-[#e2e8e4]/60 relative mt-3">
                                        <img
                                          src={meal.imageUrl}
                                          alt={meal.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}

                                    {/* Calorie ed Orario */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-black/20 border border-[#e2e8e4]/60 mt-3">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-lg bg-[#84cc16]/20 flex items-center justify-center text-[#386a00]">
                                          <Icon name="local_fire_department" className="w-4 h-4 text-[#386a00]" />
                                        </div>
                                        <span className="text-[14px] font-extrabold text-[#191c1c]">
                                          {meal.calories} kcal
                                        </span>
                                      </div>
                                      {meal.time && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#56615c] bg-[#f2f4f3] px-2 py-0.5 rounded-md">
                                          <Icon name="schedule" className="w-3.5 h-3.5 text-[#56615c]" />
                                          <span>{meal.time}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Griglia Nutrizionale Completa */}
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center text-[11px]">
                                      <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-[#e2e8e4]/60">
                                        <span className="text-[10px] text-[#56615c] block font-semibold">Proteine</span>
                                        <span className="font-extrabold text-[#191c1c]">{meal.proteinG}g</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-[#e2e8e4]/60">
                                        <span className="text-[10px] text-[#56615c] block font-semibold">Carbo</span>
                                        <span className="font-extrabold text-[#191c1c]">{meal.carbsG}g</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-[#e2e8e4]/60">
                                        <span className="text-[10px] text-[#56615c] block font-semibold">Grassi</span>
                                        <span className="font-extrabold text-[#191c1c]">{meal.fatsG}g</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-[#e2e8e4]/60">
                                        <span className="text-[10px] text-[#56615c] block font-semibold">Zuccheri</span>
                                        <span className="font-extrabold text-[#7e22ce]">{meal.sugarsG ?? 0}g</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-white dark:bg-black/20 border border-[#e2e8e4]/60 col-span-2 sm:col-span-1">
                                        <span className="text-[10px] text-[#56615c] block font-semibold">Fibre</span>
                                        <span className="font-extrabold text-[#059669]">{meal.fiberG ?? 0}g</span>
                                      </div>
                                    </div>

                                    {/* Nota del Piatto (se presente) */}
                                    {meal.notes && (
                                      <div className="p-2.5 rounded-xl bg-[#f2f4f3] dark:bg-[#1a2420] border border-[#e2e8e4]/60 text-[12px] flex items-start gap-2">
                                        <Icon name="description" className="w-4 h-4 text-[#416900] dark:text-[#84cc16] shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[10px] uppercase font-bold text-[#56615c] block mb-0.5">Note &amp; Ingredienti</span>
                                          <p className="text-[#191c1c] italic leading-relaxed">{meal.notes}</p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Azione: Elimina Piatto */}
                                    <div className="flex items-center justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => onDeleteMeal(meal.id)}
                                        aria-label={`Elimina ${meal.name}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors cursor-pointer"
                                      >
                                        <Icon name="delete" className="w-4 h-4 text-[#ba1a1a]" />
                                        <span>Elimina pasto</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
