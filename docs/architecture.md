# Phase 1 architecture

The tracking system is split into three boundaries:

1. `apps/extension`: translates Chrome events into observations.
2. `packages/tracking-engine`: deterministic state machine and interval calculations.
3. `packages/database`: versioned IndexedDB persistence.

`npm run build` assembles these boundaries into the self-contained `dist/extension`
directory required by Chrome. Source modules remain separate for testing and maintenance.

## Event and interval model

Chrome events are observations, not stored history. The engine converts consecutive eligible observations into immutable `ActivityInterval` rows with start/end timestamps, active seconds, tab/window identity, URL/title, normalized domain, end reason, and media/fullscreen placeholders. Raw URL/title remain local.

An interval is eligible only while tracking is unpaused, Chrome has a focused window, the user is active, the selected tab is active, and its URL uses HTTP(S). Background tabs never accrue time.

## Foreground, idle and recovery

- Window focus is sourced from `windows.onFocusChanged`; `WINDOW_ID_NONE` immediately closes the interval.
- Idle state is sourced from `chrome.idle`, with a five-minute Phase 1 default. Idle/locked states close the interval; resume starts a new one.
- Each transition checkpoints the current state. On a service-worker restart, a recent checkpoint can resume. A stale checkpoint is closed at its last known safe timestamp, capped by the recovery gap, preventing artificial multi-hour sessions.
- Chrome's `onSuspend` is best-effort only; correctness does not depend on it.

## Permissions

- `tabs`: read the active tab URL/title and react to tab changes.
- `idle`: exclude idle/locked computer time.
- `storage`: reserved for small user settings; high-volume history uses IndexedDB.

No host permission, browsing-history permission, content script, remote code, or incognito access is requested in Phase 1.

## Database

IndexedDB `smart-time-tracker`, schema version 1:

- `activityIntervals` keyed by interval ID, indexed by `startedAt` and `domain`.
- `trackerState` keyed by `current`, containing only recoverable in-progress state.

Future schema changes must increment the version and add explicit migrations.
