# Smart Time Tracker Extension

Local-first Manifest V3 attention tracking. The project is being delivered in strict verified phases.

## Current status: Phase 3 — Analytics

Implemented active-tab tracking, browser foreground detection, idle exclusion, duration calculation, domain normalization, service-worker recovery checkpoints, and IndexedDB persistence.

Phase 2 adds a functional date-filtered activity timeline, deterministic default classification,
classification precedence, and manual category/productivity corrections persisted to IndexedDB.
Click the extension toolbar icon or open its Options page to view the timeline.

Phase 3 adds local aggregation, date ranges, productivity/category/domain/hour charts,
context-switch metrics, and a fully explained focus score. The toolbar icon now opens
the dashboard; its Activity Timeline link opens Phase 2 history and editing.

## Test

```bash
npm run build
npm test
npm run check
```

Load the generated `dist/extension` directory as an unpacked extension in `chrome://extensions`.

See [Phase 1 architecture](docs/architecture.md) and [tracking rules](docs/tracking-rules.md).
