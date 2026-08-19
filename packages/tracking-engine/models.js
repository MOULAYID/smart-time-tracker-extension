export const EndReason = Object.freeze({
  TAB_CHANGED: "tab_changed", WINDOW_CHANGED: "window_changed", BROWSER_BLURRED: "browser_blurred",
  IDLE: "idle", PAUSED: "paused", TAB_CLOSED: "tab_closed", URL_CHANGED: "url_changed",
  RECOVERY_TIMEOUT: "recovery_timeout", SHUTDOWN: "shutdown"
});

export function createInterval(active, startAt, endAt, reason) {
  if (!active || !Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) return null;
  return {
    id: `${startAt}-${active.windowId}-${active.tabId}-${crypto.randomUUID()}`,
    tabId: active.tabId, windowId: active.windowId, url: active.url,
    title: active.title ?? "", hostname: active.hostname, domain: active.domain,
    startedAt: startAt, endedAt: endAt, activeSeconds: Math.floor((endAt - startAt) / 1000),
    endReason: reason, mediaState: active.mediaState ?? "unknown",
    fullscreenState: active.fullscreenState ?? "unknown", idleState: "active",
    classification: null,
    schemaVersion: 1
  };
}
