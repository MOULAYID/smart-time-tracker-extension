# Smart Time Tracker Extension

Local-first Manifest V3 attention tracking. The project is being delivered in strict verified phases.

## Current status: Phase 1 — Tracking Engine

Implemented active-tab tracking, browser foreground detection, idle exclusion, duration calculation, domain normalization, service-worker recovery checkpoints, and IndexedDB persistence.

## Test

```bash
npm test
npm run check
```

Load `apps/extension` as an unpacked extension in `chrome://extensions` for browser testing.

See [Phase 1 architecture](docs/architecture.md) and [tracking rules](docs/tracking-rules.md).
