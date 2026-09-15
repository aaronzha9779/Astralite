# Astralite

> A responsive habit and productivity system built around habits, XP, quests, rewards, and long-term progression.

**(https://astralite-ruddy.vercel.app/)**

## Overview

Astralite is a personal habit-tracking application designed to make consistency feel more like progressing through a game by giving the user a multitude of customizable tracking options. 

Instead of simply checking off habits, Astralite turns daily actions into a progression system with **XP, levels, quests, rewards, statistics, streaks, and customizable goals**.

The project started as a personal productivity tool and evolved into a larger frontend application focused on state management, persistent user data, and building a cohesive interactive experience. I built it as a way of consolidating multiple workspaces and trackers into one place so that I would no longer be overwhelmed. 

## Features

### Dashboard

* Track daily habits, hobbies, and activities
* Monitor daily goals, tasks, and progress
* Complete bounties, checks, and weekly tasks
* Earn XP from completed activities

### Progression System

* Gain XP from habit completion and other activities
* Clear and Visual progress
* Maintain streaks

### Protocols / Quests

* Create multi-step protocols that break big goals into smaller manageable tasks
* View active quests directly from the sidebar
* Link protocols to the broader progression system

### Goals & Statistics

* Track core aspects and long-term objectives
* Review completion history and time records
* Monitor productivity statistics

### Reward Shop

* Create custom rewards for completing tasks and habits
* Purchase rewards using earned XP
* Archive and restore rewards

### Accounts & Save Files

* Create and switch between multiple local accounts
* Customize profiles
* Export account data as JSON
* Import previously exported save files
* Reset or restore application data

## Tech Stack

* **React 19**
* **TypeScript**
* **Vite**
* **CSS**
* **ESLint**
* **partycles** for visual effects

The application is built as a client-side React application with application state managed through custom React hooks and persisted through local save data.

## Getting Started

### Prerequisites

* Node.js
* npm

### Installation

Clone the repository:

```bash
git clone https://github.com/aaronzha9779/Astralite.git
cd Astralite
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will provide a local development URL in the terminal.

### Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run ESLint with:

```bash
npm run lint
```

## How to Use

1. Open Astralite and create or configure your profile.
2. Add the habits and goals you want to track.
3. Complete activities throughout the day to earn XP.
4. Use the dashboard to monitor daily progress.
5. Build larger goals into multi-step protocols.
6. Spend earned XP on custom rewards.
7. Use the statistics page to review your progress over time.
8. Export your save file periodically if you want a portable backup.
9. Use daily to manage your tasks and habits in one place!


## Engineering Notes

* Designing a centralized application state model for habits, goals, rewards, accounts, protocols, statistics, and progression.
* Building reusable React components around a shared state layer.
* Implementing XP and level progression.
* Creating multi-step protocol/quest tracking.
* Supporting multiple local user accounts.
* Implementing JSON-based save-file export and import.
* Building persistent UI state for dashboards, settings, history, and navigation.
* Creating a custom reward economy around earned XP.
* Developing the application as a responsive, interactive frontend rather than a collection of isolated pages.

## Project Structure

```text
src/
├── components/     # UI components and application pages
├── data/            # Application data and defaults
├── hooks/           # Application state and reusable React hooks
├── lib/             # Utility and protocol logic
├── types/           # TypeScript types
├── App.tsx
└── main.tsx
```

## Future Improvements/Updates

* Cloud synchronization
* Authentication
* Cross-device account syncing
* Mobile-first improvements
* More advanced analytics
* Additional progression systems
* Social/accountability features
* Automated reminders and notifications

## Status

Astralite is an actively evolving personal project.
The current version focuses on the core habit, progression, quest, reward, and save-file systems.

---

Built by **Aaron Zhang**.
