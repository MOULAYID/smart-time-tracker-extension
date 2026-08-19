# Smart Time Tracker Extension

Local-first Manifest V3 attention tracking. The project is being delivered in strict verified phases.

## Current status: Phase 1 — Tracking Engine

Implemented active-tab tracking, browser foreground detection, idle exclusion, duration calculation, domain normalization, service-worker recovery checkpoints, and IndexedDB persistence.

## Test

```bash
npm run build
npm test
npm run check
```

Load the generated `dist/extension` directory as an unpacked extension in `chrome://extensions`.

See [Phase 1 architecture](docs/architecture.md) and [tracking rules](docs/tracking-rules.md).
