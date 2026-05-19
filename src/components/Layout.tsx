import { useState } from 'react'
import { mainNavItems, shopNavItem } from '../data/fakeData'
import { useAppState } from '../hooks/useAppState'
import { Dashboard } from './Dashboard'
import { HabitsPage } from './HabitsPage'
import { Header } from './Header'
import { Shop } from './Shop'
import { Sidebar } from './Sidebar'
import { StatsPage } from './StatsPage'
import { TimerPage } from './TimerPage'
import './Layout.css'

export function Layout() {
  const [activeNavId, setActiveNavId] = useState('dashboard')
  const {
    habits,
    weeklyTasks,
    dashboard,
    completions,
    timeRecords,
    purchasedRewards,
    profile,
    stats,
    statsPageSummary,
    toggleHabit,
    addManualCompletion,
    addManualTime,
    logTimerSession,
    setLinkedHabits,
    setHabitWeights,
    addHabit,
    addWeeklyTask,
    toggleWeeklyTask,
    removeWeeklyTask,
    setWeeklyOpen,
    setDailyGoal,
    addQuote,
    removeQuote,
    shuffleQuote,
    purchaseReward,
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
          onManualCompletion={addManualCompletion}
          onSetLinked={setLinkedHabits}
          onSetWeights={setHabitWeights}
        />
      )
    }

    if (activeNavId === 'stats') {
      return (
        <StatsPage completions={completions} stats={statsPageSummary} />
      )
    }

    if (activeNavId === 'shop') {
      return (
        <Shop
          profile={profile}
          purchasedRewards={purchasedRewards}
          onPurchase={purchaseReward}
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
        onNavClick={setActiveNavId}
      />
      <div className="layout__body">
        <Sidebar profile={profile} />
        {renderMain()}
      </div>
    </div>
  )
}
