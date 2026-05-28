import { useEffect, useMemo, useState } from 'react'
import { mainNavItems, shopNavItem } from '../data/fakeData'
import { useAppState } from '../hooks/useAppState'
import { Dashboard } from './Dashboard'
import { HabitsPage } from './HabitsPage'
import { Header } from './Header'
import { SettingsPage } from './SettingsPage'
import { Shop } from './Shop'
import { Sidebar } from './Sidebar'
import { StatsPage } from './StatsPage'
import { TimerPage } from './TimerPage'
import './Layout.css'

export function Layout() {
  const [activeNavId, setActiveNavId] = useState('dashboard')
  const {
    activeAccountId,
    accounts,
    habits,
    coreAspects,
    bountyTasks,
    checks,
    weeklyTasks,
    dashboard,
    completions,
    timeRecords,
    rewards,
    preferences,
    purchasedRewards,
    dailySpinUsed,
    profile,
    uxpBurst,
    statsPageSummary,
    toggleHabit,
    incrementHobby,
    addManualTime,
    logTimerSession,
    setLinkedHabits,
    setLinkedCoreAspects,
    addHabit,
    addCoreAspect,
    addBountyTask,
    addCheck,
    addWeeklyTask,
    incrementCoreAspect,
    toggleBountyTask,
    toggleCheck,
    toggleWeeklyTask,
    removeBountyTask,
    removeCheck,
    removeWeeklyTask,
    setBountiesOpen,
    setChecksOpen,
    setWeeklyOpen,
    setDailyGoal,
    resetToday,
    softReset,
    fullReset,
    addQuote,
    removeQuote,
    shuffleQuote,
    purchaseReward,
    spinDailyReward,
    addReward,
    updateReward,
    removeReward,
    reorderReward,
    updateProfile,
    updatePreferences,
    createAccount,
    switchAccount,
    deleteAccount,
    exportSaveFile,
    importSaveFile,
    saveError,
  } = useAppState()
  const [timerHabitId, setTimerHabitId] = useState(habits[0]?.id ?? '')
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const rawXpByHabit = useMemo(() => {
    return Object.fromEntries(
      habits.map((habit) => [habit.id, habit.totalXpEarned ?? 0]),
    )
  }, [habits])

  useEffect(() => {
    if (!habits.some((habit) => habit.id === timerHabitId)) {
      setTimerHabitId(habits[0]?.id ?? '')
    }
  }, [habits, timerHabitId])

  useEffect(() => {
    if (!timerRunning) return
    const intervalId = window.setInterval(() => {
      setTimerElapsed((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [timerRunning])

  function handleTimerReset() {
    setTimerRunning(false)
    if (timerElapsed >= 60 && timerHabitId) {
      logTimerSession(timerHabitId, Math.round(timerElapsed / 60))
    }
    setTimerElapsed(0)
  }

  function renderMain() {
    if (activeNavId === 'dashboard') {
      return (
        <Dashboard
          habits={habits}
          coreAspects={coreAspects}
          bountyTasks={bountyTasks}
          checks={checks}
          weeklyTasks={weeklyTasks}
          streakSymbol={profile.streakSymbol}
          streakSymbolImageUrl={profile.streakSymbolImageUrl}
          preferences={preferences}
          rawXpByHabit={rawXpByHabit}
          dashboard={dashboard}
          onToggle={toggleHabit}
          onIncrementHobby={incrementHobby}
          onAdd={addHabit}
          onBountyToggle={toggleBountyTask}
          onBountyAdd={addBountyTask}
          onBountyRemove={removeBountyTask}
          onBountiesOpenChange={setBountiesOpen}
          onCheckToggle={toggleCheck}
          onCheckAdd={addCheck}
          onCheckRemove={removeCheck}
          onChecksOpenChange={setChecksOpen}
          onWeeklyToggle={toggleWeeklyTask}
          onWeeklyAdd={addWeeklyTask}
          onWeeklyRemove={removeWeeklyTask}
          onWeeklyOpenChange={setWeeklyOpen}
          onSetDailyGoal={setDailyGoal}
          onAddQuote={addQuote}
          onRemoveQuote={removeQuote}
          onShuffleQuote={shuffleQuote}
        />
      )
    }

    if (activeNavId === 'timer') {
      return (
        <TimerPage
          habits={habits}
          habitId={timerHabitId}
          elapsed={timerElapsed}
          running={timerRunning}
          onHabitIdChange={setTimerHabitId}
          onStart={() => setTimerRunning(true)}
          onStop={() => setTimerRunning(false)}
          onReset={handleTimerReset}
          onManualTime={addManualTime}
        />
      )
    }

    if (activeNavId === 'habits') {
      return (
        <HabitsPage
          habits={habits}
          coreAspects={coreAspects}
          bountyTasks={bountyTasks}
          timeRecords={timeRecords}
          preferences={preferences}
          streakSymbol={profile.streakSymbol}
          streakSymbolImageUrl={profile.streakSymbolImageUrl}
          onToggle={toggleHabit}
          onSetLinked={setLinkedHabits}
          onSetLinkedCoreAspects={setLinkedCoreAspects}
          onUpdatePreferences={updatePreferences}
          onResetToday={resetToday}
        />
      )
    }

    if (activeNavId === 'stats') {
      return (
        <StatsPage
          habits={habits}
          coreAspects={coreAspects}
          completions={completions}
          timeRecords={timeRecords}
          stats={statsPageSummary}
          onAddCoreAspect={addCoreAspect}
          onIncrementCoreAspect={incrementCoreAspect}
        />
      )
    }

    if (activeNavId === 'shop') {
      return (
        <Shop
          profile={profile}
          rewards={rewards}
          purchasedRewards={purchasedRewards}
          dailySpinUsed={dailySpinUsed}
          dailySpinOptions={{
            uxp: preferences.dailySpinUxps,
            rewards: rewards.filter((reward) =>
              preferences.dailySpinRewardIds.includes(reward.id),
            ),
          }}
          onPurchase={purchaseReward}
          onSpinDaily={spinDailyReward}
          onAddReward={addReward}
          onUpdateReward={updateReward}
          onRemoveReward={removeReward}
          onReorderReward={reorderReward}
          saveError={saveError}
        />
      )
    }

    if (activeNavId === 'settings') {
      return (
        <SettingsPage
          profile={profile}
          accounts={accounts}
          activeAccountId={activeAccountId}
          onUpdateProfile={updateProfile}
          onCreateAccount={createAccount}
          onDeleteAccount={deleteAccount}
          preferences={preferences}
          rewards={rewards}
          onUpdatePreferences={updatePreferences}
          onSoftReset={softReset}
          onFullReset={fullReset}
        />
      )
    }

    return (
      <main className="dashboard dashboard--placeholder">
        <h1 className="dashboard__title">
          {mainNavItems.find((item) => item.id === activeNavId)?.label ??
            shopNavItem.label}
        </h1>
        <p className="dashboard__subtitle">Coming soon</p>
      </main>
    )
  }

  return (
    <div className="layout">
      <Header
        mainNavItems={mainNavItems}
        shopNavItem={shopNavItem}
        activeNavId={activeNavId}
        availableXp={profile.availableXp}
        onNavClick={setActiveNavId}
      />
      <div className="layout__body">
        <Sidebar
          profile={profile}
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSwitchAccount={switchAccount}
          onExportSaveFile={exportSaveFile}
          onImportSaveFile={importSaveFile}
        />
        {uxpBurst ? (
          <div className="layout__uxp-burst" role="status" aria-live="polite">
            +{uxpBurst.amount} UXP
          </div>
        ) : null}
        {renderMain()}
      </div>
    </div>
  )
}
