# Phase 1 tracking rules and verification

## Calculation rules

- `activeSeconds = floor((endedAt - startedAt) / 1000)`.
- Zero-second observations are discarded.
- Tab, URL, focused window, idle, pause, close, and shutdown boundaries close an interval.
- Minimized/unfocused and idle time never count.
- Background media is not counted. Foreground media is counted like other foreground activity; richer media semantics are a later enhancement and are explicitly not claimed here.

## Accuracy suite

Automated deterministic scenarios cover:

- Website A 5m → Website B 2m → browser unfocused 10m → Website A 3m (expected A=8m, B=2m).
- Active 1m → idle 10m → active 2m (expected 3m).
- Same-tab URL navigation interval boundaries.
- Window blur, tab switching, pause, non-trackable browser pages, and stale restart recovery.

## Known Phase 1 limitations

- The public-suffix normalizer includes a conservative common multi-label suffix set rather than the full Public Suffix List.
- System sleep has no direct Chrome event. Stale recovery prevents the sleep gap from being counted, with precision bounded by the last checkpoint.
- Media/fullscreen metadata fields are modeled but content-script-based detection is intentionally deferred because Phase 1 does not request all-site access.
