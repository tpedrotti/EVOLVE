import { useState, useEffect } from 'react';
import type {
  AppScreen,
  MainTab,
  UserProfile,
  WorkoutRoutine,
  MealEntry,
  PhotoEntry,
  CoachMessage,
  WorkoutSessionLog,
} from './types';
import {
  ASSETS,
  INITIAL_USER_PROFILE,
  INITIAL_WORKOUT_ROUTINES,
  INITIAL_MEALS,
  INITIAL_COACH_MESSAGES,
} from './data/mockData';
import { ScreenHero } from './components/ScreenHero';
import { ScreenQuestionnaire } from './components/ScreenQuestionnaire';
import { ScreenPlanSummary } from './components/ScreenPlanSummary';
import { ScreenHomeDashboard } from './components/ScreenHomeDashboard';
import { ScreenWorkout } from './components/ScreenWorkout';
import { ScreenDieta } from './components/ScreenDieta';
import { ScreenTrend } from './components/ScreenTrend';
import { ScreenFoto } from './components/ScreenFoto';
import { ScreenCoachAI } from './components/ScreenCoachAI';
import { askCoachAI, type AttachedMedia } from './services/geminiCoach';
import {
  loadHydrationHistory,
  saveTodayHydration,
  resetTodayHydration,
} from './utils/hydration';
import { calculateTargetNutrition } from './utils/fitnessLogic';
import { getScheduledWorkoutForDate, getEffectiveToday } from './utils/workoutSchedule';
import {
  loadAllMediaEntries,
  saveMediaEntry,
  deleteMediaEntry,
} from './utils/mediaStorage';
import { getEffectiveTodayKey } from './utils/mealValidation';
import { loadWorkoutHistory } from './utils/workoutTracking';

import { TopHeader } from './components/TopHeader';
import { BottomNavBar } from './components/BottomNavBar';
import { ActiveWorkoutModal } from './components/ActiveWorkoutModal';
import { AddMealModal } from './components/AddMealModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Check autostart param from ultra mode instructions (?autostart=1)
  const isAutostart = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(
    isAutostart ? 'main_app' : 'onboarding_hero'
  );
  const [currentTab, setCurrentTab] = useState<MainTab>('home');

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('evolve_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.avatarUrl === ASSETS.userLucaAvatar) {
          parsed.avatarUrl = '';
        }
        return { ...INITIAL_USER_PROFILE, ...parsed };
      }
    } catch {
      // ignore
    }
    return INITIAL_USER_PROFILE;
  });
  const [workoutRoutines, setWorkoutRoutines] = useState<WorkoutRoutine[]>(() => {
    try {
      const saved = localStorage.getItem('evolve_workout_routines');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_WORKOUT_ROUTINES;
  });

  const handleUpdateWorkoutRoutines = (updated: WorkoutRoutine[]) => {
    setWorkoutRoutines(updated);
    try {
      localStorage.setItem('evolve_workout_routines', JSON.stringify(updated));
    } catch {}
  };

  const handleResetWorkoutRoutines = () => {
    setWorkoutRoutines(INITIAL_WORKOUT_ROUTINES);
    try {
      localStorage.removeItem('evolve_workout_routines');
    } catch {}
  };

  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSessionLog[]>(() => loadWorkoutHistory());

  const [meals, setMeals] = useState<MealEntry[]>(() => {
    try {
      const saved = localStorage.getItem('evolve_meals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_MEALS;
  });
  const [addMealPrefilledDate, setAddMealPrefilledDate] = useState<string | undefined>();
  const [hydrationData, setHydrationData] = useState(() => loadHydrationHistory());
  const waterHistory = hydrationData.history;
  const waterLiters = hydrationData.todayLiters;

  // Daily reset listener: ensures today's hydration automatically resets to 0L when day rolls over
  useEffect(() => {
    const handleCheckDailyReset = () => {
      const refreshed = loadHydrationHistory();
      setHydrationData(refreshed);
    };

    handleCheckDailyReset();
    const interval = setInterval(handleCheckDailyReset, 30000);
    window.addEventListener('focus', handleCheckDailyReset);
    document.addEventListener('visibilitychange', handleCheckDailyReset);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleCheckDailyReset);
      document.removeEventListener('visibilitychange', handleCheckDailyReset);
    };
  }, []);

  const [completedWorkoutsCount, setCompletedWorkoutsCount] = useState<number>(3);

  // Active workout live modal
  const [activeWorkout, setActiveWorkout] = useState<WorkoutRoutine | null>(null);

  // Add meal modal
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);

  // Photo & Video progress media
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  useEffect(() => {
    loadAllMediaEntries().then((saved) => {
      if (saved && saved.length > 0) {
        setPhotos(saved);
      }
    });
  }, []);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Photo modal open state (reported by ScreenFoto)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Coach AI state & persistence
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>(() => {
    try {
      const saved = localStorage.getItem('evolve_coach_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const isLegacyOnly = parsed.every((m: CoachMessage) => m.id === 'c1' || m.id === 'c2');
          if (isLegacyOnly) {
            return INITIAL_COACH_MESSAGES;
          }
          const cleaned = parsed.filter((m: CoachMessage) => m.id !== 'c1' && m.id !== 'c2');
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_COACH_MESSAGES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('evolve_coach_chat_history', JSON.stringify(coachMessages));
    } catch {
      // ignore
    }
  }, [coachMessages]);

  const handleClearCoachHistory = () => {
    setCoachMessages(INITIAL_COACH_MESSAGES);
    try {
      localStorage.removeItem('evolve_coach_chat_history');
    } catch {}
  };

  const effectiveToday = getEffectiveToday(profile);
  const todaySchedule = getScheduledWorkoutForDate(
    workoutRoutines,
    profile,
    effectiveToday,
    profile.timeZone
  );
  const todayWorkout = todaySchedule.isRestDay ? null : todaySchedule.routine;

  const handleSendCoachMessage = async (text: string, media?: AttachedMedia) => {
    const userMsg: CoachMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      mediaUrl: media ? (media.thumbnailUrl || media.dataUrl) : undefined,
      mediaType: media ? media.mediaType : undefined,
      mediaDurationSec: media ? media.durationSec : undefined,
    };

    const updated = [...coachMessages, userMsg];
    setCoachMessages(updated);
    setIsCoachLoading(true);

    try {
      const reply = await askCoachAI(
        text,
        updated,
        {
          profile,
          todayWorkout: todayWorkout || undefined,
          todaySchedule: todaySchedule,
          meals,
          waterLiters,
          completedWorkoutsCount,
        },
        media
      );

      const aiMsg: CoachMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply.text,
        mealEstimate: reply.mealEstimate,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      };

      setCoachMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn('Coach AI error:', err);
    } finally {
      setIsCoachLoading(false);
    }
  };

  const isAnyModalOpen = Boolean(activeWorkout || isAddMealOpen || isSettingsOpen || isPhotoModalOpen || isCoachOpen);

  // Dark mode theme state with localStorage persistence and system preference fallback
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('evolve_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('evolve_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDarkMode = theme === 'dark';

  // Handle URL changes if any
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentScreen, currentTab]);

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('evolve_user_profile', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleAddWater = (amountL: number) => {
    const nextAmount = Number((waterLiters + amountL).toFixed(2));
    const updated = saveTodayHydration(nextAmount);
    setHydrationData(updated);
  };

  const handleResetWater = () => {
    const updated = resetTodayHydration();
    setHydrationData(updated);
  };

  const handleAddMeal = (newMeal: Omit<MealEntry, 'id'>) => {
    const todayKey = getEffectiveTodayKey(profile);
    const entry: MealEntry = {
      ...newMeal,
      id: `meal-${Date.now()}`,
      date: newMeal.date || todayKey,
    };
    setMeals((prev) => {
      const updated = [entry, ...prev];
      try {
        localStorage.setItem('evolve_meals', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteMeal = (id: string) => {
    setMeals((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem('evolve_meals', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleFinishWorkout = (sessionLog?: WorkoutSessionLog) => {
    if (activeWorkout) {
      setCompletedWorkoutsCount((prev) => Math.min(profile.weeklyDays, prev + 1));
      setWorkoutHistory(loadWorkoutHistory());
      setActiveWorkout(null);
    }
  };

  const handleApplyProgressionToRoutine = (exerciseId: string, newWeightKg: number) => {
    setWorkoutRoutines((prev) => {
      const updated = prev.map((r) => ({
        ...r,
        exercises: r.exercises.map((e) => (e.id === exerciseId ? { ...e, targetWeightKg: newWeightKg } : e)),
      }));
      try {
        localStorage.setItem('evolve_workout_routines', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleAddPhoto = (media: Omit<PhotoEntry, 'id'>) => {
    const entry: PhotoEntry = { ...media, id: `media-${Date.now()}` };
    setPhotos((prev) => [entry, ...prev]);
    saveMediaEntry(entry).catch((err) => console.warn('Failed to persist media entry', err));
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    deleteMediaEntry(id).catch((err) => console.warn('Failed to delete media entry', err));
  };


  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#191c1c] flex flex-col font-sans selection:bg-[#84cc16]/30">
      {/* 1. Onboarding Screen 1: Hero Landing */}
      {currentScreen === 'onboarding_hero' && (
        <ScreenHero
          onStartJourney={() => setCurrentScreen('onboarding_questionnaire')}
          onAlreadyHaveAccount={() => setCurrentScreen('main_app')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* 2. Onboarding Screen 2: Questionnaire (Step 3 of 5) */}
      {currentScreen === 'onboarding_questionnaire' && (
        <ScreenQuestionnaire
          profile={profile}
          onChangeProfile={handleUpdateProfile}
          onBack={() => setCurrentScreen('onboarding_hero')}
          onContinue={() => setCurrentScreen('onboarding_summary')}
        />
      )}

      {/* 3. Onboarding Screen 3: Plan Summary */}
      {currentScreen === 'onboarding_summary' && (
        <ScreenPlanSummary
          profile={profile}
          onBack={() => setCurrentScreen('onboarding_questionnaire')}
          onCreateJourney={() => setCurrentScreen('main_app')}
        />
      )}

      {/* 4. Main App Experience (Screen 4 + Interactive Tabs) */}
      {currentScreen === 'main_app' && (
        <div className="flex-1 flex flex-col w-full relative">
          {/* Top Header */}
          <TopHeader
            onOpenProfile={() => setCurrentTab('trend')}
            onRestartOnboarding={() => setCurrentScreen('onboarding_hero')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            avatarUrl={profile.avatarUrl}
            todayWaterLiters={waterLiters}
            hydrationGoalLiters={3.0}
            todayCalories={meals.reduce((sum, m) => sum + m.calories, 0)}
            targetCalories={calculateTargetNutrition(profile).calories}
            workoutTitle={todaySchedule.isRestDay ? `Riposo (${todaySchedule.dayName})` : (todayWorkout?.title || 'Allenamento')}
            isDemoData={true}
          />

          {/* Main View Port Container */}
          <main className="flex-1 w-full pt-16 pb-28">
            {currentTab === 'home' && (
              <ScreenHomeDashboard
                profile={profile}
                todayWorkout={todayWorkout}
                todaySchedule={todaySchedule}
                meals={meals}
                waterLiters={waterLiters}
                onAddWater={handleAddWater}
                onResetWater={handleResetWater}
                onStartWorkout={() => todayWorkout && setActiveWorkout(todayWorkout)}
                onOpenAddMeal={() => setIsAddMealOpen(true)}
                completedWorkoutsCount={completedWorkoutsCount}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'workout' && (
              <ScreenWorkout
                routines={workoutRoutines}
                profile={profile}
                onStartRoutine={(routine) => setActiveWorkout(routine)}
                onUpdateRoutines={handleUpdateWorkoutRoutines}
                onResetToDefault={handleResetWorkoutRoutines}
              />
            )}

            {currentTab === 'dieta' && (
              <ScreenDieta
                profile={profile}
                meals={meals}
                onOpenAddMeal={(prefilledDate) => {
                  setAddMealPrefilledDate(prefilledDate);
                  setIsAddMealOpen(true);
                }}
                onDeleteMeal={handleDeleteMeal}
                onOpenCoach={() => setIsCoachOpen(true)}
              />
            )}

            {currentTab === 'trend' && (
              <ScreenTrend
                profile={profile}
                waterHistory={waterHistory}
                todayWater={waterLiters}
                workoutHistory={workoutHistory}
                isDarkMode={isDarkMode}
                onToggleTheme={toggleTheme}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'foto' && (
              <ScreenFoto
                photos={photos}
                onAddPhoto={handleAddPhoto}
                onDeletePhoto={handleDeletePhoto}
                onModalOpenChange={setIsPhotoModalOpen}
              />
            )}
          </main>

          {/* Floating iOS Bottom Navigation Bar */}
          <BottomNavBar
            currentTab={currentTab}
            onTabChange={(tab) => setCurrentTab(tab)}
            isHidden={isAnyModalOpen}
            onOpenCoach={() => setIsCoachOpen(true)}
          />

          {/* Active Live Workout Modal */}
          {activeWorkout && (
            <ActiveWorkoutModal
              routine={activeWorkout}
              onClose={() => setActiveWorkout(null)}
              onFinishWorkout={handleFinishWorkout}
              onApplyProgression={handleApplyProgressionToRoutine}
            />
          )}

          {/* Add Meal Logger Modal */}
          {isAddMealOpen && (
            <AddMealModal
              profile={profile}
              initialDate={addMealPrefilledDate}
              onClose={() => {
                setIsAddMealOpen(false);
                setAddMealPrefilledDate(undefined);
              }}
              onAddMeal={handleAddMeal}
            />
          )}

          {/* Settings Modal */}
          {isSettingsOpen && (
            <SettingsModal
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onClose={() => setIsSettingsOpen(false)}
              onRestartOnboarding={() => {
                setIsSettingsOpen(false);
                setCurrentScreen('onboarding_hero');
              }}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />
          )}

          {/* Coach AI Full-Screen View */}
          {isCoachOpen && (
            <div className="fixed inset-0 z-50 bg-[#f8faf9] flex flex-col overflow-y-auto">
              <ScreenCoachAI
                profile={profile}
                messages={coachMessages}
                onSendMessage={handleSendCoachMessage}
                onBack={() => setIsCoachOpen(false)}
                onClearHistory={handleClearCoachHistory}
                onAddMealFromCoach={(meal) => {
                  const now = new Date();
                  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                  const todayKey = getEffectiveTodayKey(profile);
                  handleAddMeal({
                    name: meal.name,
                    mealType: meal.mealType,
                    calories: meal.calories,
                    proteinG: meal.proteinG,
                    carbsG: meal.carbsG,
                    fatsG: meal.fatsG,
                    sugarsG: meal.sugarsG ?? 0,
                    fiberG: meal.fiberG ?? 0,
                    time: timeStr,
                    date: todayKey,
                  });
                }}
                isLoading={isCoachLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
