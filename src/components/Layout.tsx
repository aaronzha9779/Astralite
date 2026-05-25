import { useState } from 'react'
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
    weeklyTasks,
    dashboard,
    completions,
    timeRecords,
    rewards,
    purchasedRewards,
    profile,
    stats,
    statsPageSummary,
    toggleHabit,
    addManualTime,
    logTimerSession,
    setLinkedHabits,
    addHabit,
    addWeeklyTask,
    toggleWeeklyTask,
    removeWeeklyTask,
    setWeeklyOpen,
    setDailyGoal,
    resetToday,
    fullReset,
    addQuote,
    removeQuote,
    shuffleQuote,
    purchaseReward,
    addReward,
    updateReward,
    removeReward,
    reorderReward,
    updateProfile,
    createAccount,
    switchAccount,
    exportSaveFile,
    importSaveFile,
  } = useAppState()

  function renderMain() {
    if (activeNavId === 'dashboard') {
      return (
        <Dashboard
          habits={habits}
          weeklyTasks={weeklyTasks}
          dashboard={dashboard}
          stats={stats}
          onToggle={toggleHabit}
          onAdd={addHabit}
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
          onSessionComplete={logTimerSession}
          onManualTime={addManualTime}
        />
      )
    }

    if (activeNavId === 'habits') {
      return (
        <HabitsPage
          habits={habits}
          timeRecords={timeRecords}
          onToggle={toggleHabit}
          onSetLinked={setLinkedHabits}
          onResetToday={resetToday}
        />
      )
    }

    if (activeNavId === 'stats') {
      return (
        <StatsPage
          habits={habits}
          completions={completions}
          timeRecords={timeRecords}
          stats={statsPageSummary}
        />
      )
    }

    if (activeNavId === 'shop') {
      return (
        <Shop
          profile={profile}
          rewards={rewards}
          purchasedRewards={purchasedRewards}
          onPurchase={purchaseReward}
          onAddReward={addReward}
          onUpdateReward={updateReward}
          onRemoveReward={removeReward}
          onReorderReward={reorderReward}
        />
      )
    }

    if (activeNavId === 'settings') {
      return (
        <SettingsPage
          profile={profile}
          onUpdateProfile={updateProfile}
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
          onCreateAccount={createAccount}
          onExportSaveFile={exportSaveFile}
          onImportSaveFile={importSaveFile}
        />
        {renderMain()}
      </div>
    </div>
  )
}
