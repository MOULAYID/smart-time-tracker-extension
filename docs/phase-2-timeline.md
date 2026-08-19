# Phase 2 — Timeline and classification

## Delivered

- Date-filtered chronological activity history with tracked-time totals.
- Default domain classification and explicit precedence: manual correction, user page rule, user domain rule, known domain, neutral fallback.
- Editable category and five-level productivity classification persisted on each interval.
- Validated, allowlisted message boundary between the extension page and service worker.
- IndexedDB migration from schema 1 to 2, preserving Phase 1 history.

## Privacy and security

The timeline is an extension-origin page. It reads local IndexedDB only through validated runtime messages. Text is rendered through `textContent`; no browsing data is inserted as HTML. No new permission or network request is introduced.

## Known limitations

- The interface edits individual intervals. Creating and managing permanent user rules is modeled by the classifier and database but is not exposed in this Phase 2 UI.
- Classification is deliberately deterministic and local. AI/page-content classification belongs to the later intelligence phase.
- The timeline currently returns at most 500 intervals per day to keep the page responsive.
