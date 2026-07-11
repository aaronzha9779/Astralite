import { useMemo, useState } from 'react'
import { mainNavItems, shopNavItem } from '../data/fakeData'
import { useAppState } from '../hooks/useAppState'
import { getProtocolTrackerPath } from '../lib/protocols'
import { Dashboard } from './Dashboard'
import { IntegrationProtocolsPage } from './IntegrationProtocolsPage'
import { HabitsPage } from './HabitsPage'
import { Header } from './Header'
import { SettingsPage } from './SettingsPage'
import { Shop } from './Shop'
import { Sidebar } from './Sidebar'
import { StatsPage } from './StatsPage'
import './Layout.css'

export function Layout() {
  const [activeNavId, setActiveNavId] = useState('dashboard')
  const {
    activeAccountId,
    accounts,
    habits,
    archivedHabits,
    coreAspects,
    bountyTasks,
    checks,
    weeklyTasks,
    protocols,
    dashboard,
    archivedRewards,
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
    addManualTime,
    incrementHobby,
    setLinkedHabits,
    setLinkedCoreAspects,
    renameHabit,
    archiveHabit,
    restoreHabit,
    deleteHabit,
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
    setCategoryCollapsed,
    setSidebarOpen,
    setWeeklyOpen,
    setSettingsSectionOpen,
    setDailyGoal,
    resetToday,
    resetBestDay,
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
    restoreReward,
    reorderReward,
    updateProfile,
    deleteProtocol,
    updatePreferences,
    createAccount,
    switchAccount,
    deleteAccount,
    exportSaveFile,
    importSaveFile,
    saveError,
    updateProtocols,
  } = useAppState()
  const rawXpByHabit = useMemo(() => {
    return Object.fromEntries(
      habits.map((habit) => [habit.id, habit.totalXpEarned ?? 0]),
    )
  }, [habits])
  const activeProtocolTrackers = useMemo(
    () =>
      protocols
        .filter((protocol) => protocol.active && !protocol.pausedAt)
        .map((protocol) => {
          const trackerPath = getProtocolTrackerPath(protocol)
          const currentTask = trackerPath?.map((step) => step.title).join(' / ')
          return {
            id: protocol.id,
            title: protocol.title,
            thumbnailUrl: protocol.thumbnailUrl,
            thumbnailLabel: protocol.thumbnailLabel,
            currentTask: currentTask ?? 'All visible steps complete',
          }
        }),
    [protocols],
  )

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

    if (activeNavId === 'protocols') {
      return (
        <IntegrationProtocolsPage
          protocols={protocols}
          rewards={rewards}
          onDeleteProtocol={deleteProtocol}
          onUpdateProtocols={updateProtocols}
        />
      )
    }

    if (activeNavId === 'habits') {
      return (
        <HabitsPage
          habits={habits}
          archivedHabits={archivedHabits}
          coreAspects={coreAspects}
          bountyTasks={bountyTasks}
          timeRecords={timeRecords}
          preferences={preferences}
          streakSymbol={profile.streakSymbol}
          streakSymbolImageUrl={profile.streakSymbolImageUrl}
          onToggle={toggleHabit}
          onRenameHabit={renameHabit}
          onSetLinked={setLinkedHabits}
          onSetLinkedCoreAspects={setLinkedCoreAspects}
          onArchiveHabit={archiveHabit}
          onDeleteHabit={deleteHabit}
          onRestoreHabit={restoreHabit}
          onUpdatePreferences={updatePreferences}
          onResetToday={resetToday}
          dashboard={dashboard}
          onSetCategoryCollapsed={setCategoryCollapsed}
          onManualTime={addManualTime}
        />
      )
    }

    if (activeNavId === 'stats') {
      return (
        <StatsPage
          habits={habits}
          coreAspects={coreAspects}
          protocols={protocols}
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
          archivedRewards={archivedRewards}
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
          onRestoreReward={restoreReward}
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
          settingsSections={dashboard.settingsSections}
          onUpdateProfile={updateProfile}
          onCreateAccount={createAccount}
          onDeleteAccount={deleteAccount}
          preferences={preferences}
          rewards={rewards}
          onUpdatePreferences={updatePreferences}
          onResetBestDay={resetBestDay}
          canResetBestDay={statsPageSummary.some((stat) => stat.id === 'best-day' && stat.value !== '—')}
          onSoftReset={softReset}
          onFullReset={fullReset}
          onSettingsSectionOpenChange={setSettingsSectionOpen}
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
          activeProtocols={activeProtocolTrackers}
          activeAccountId={activeAccountId}
          open={dashboard.sidebarOpen}
          onOpenChange={setSidebarOpen}
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
