import { createInterval, EndReason } from "./models.js";
import { isTrackableUrl, normalizeDomain } from "./domain.js";

const DEFAULTS = { idleThresholdSeconds: 300, recoveryGapMs: 60_000 };

export class TrackingEngine {
  constructor({ repository, clock = () => Date.now(), settings = {} }) {
    if (!repository) throw new Error("repository is required");
    this.repository = repository;
    this.clock = clock;
    this.settings = { ...DEFAULTS, ...settings };
    this.state = { active: null, startedAt: null, browserFocused: false, idleState: "active", paused: false };
  }

  async initialize(observation = {}) {
    const recovered = await this.repository.loadTrackerState();
    const now = this.clock();
    const hasRecoverableStart = Number.isFinite(recovered?.startedAt);
    if (recovered?.active && hasRecoverableStart && now - recovered.lastCheckpointAt <= this.settings.recoveryGapMs) {
      this.state = { ...this.state, ...recovered };
    } else if (recovered?.active && hasRecoverableStart) {
      const safeEnd = Math.min(recovered.lastCheckpointAt ?? now, recovered.startedAt + this.settings.recoveryGapMs);
      await this.#persistInterval(recovered.active, recovered.startedAt, safeEnd, EndReason.RECOVERY_TIMEOUT);
    }
    await this.observe(observation);
  }

  async observe({ tab, browserFocused = this.state.browserFocused, idleState = this.state.idleState } = {}) {
    const now = this.clock();
    const eligible = !this.state.paused && browserFocused && idleState === "active" && this.#toActivity(tab);
    const currentKey = this.state.active && `${this.state.active.windowId}:${this.state.active.tabId}:${this.state.active.url}`;
    const nextKey = eligible && `${eligible.windowId}:${eligible.tabId}:${eligible.url}`;
    if (currentKey !== nextKey || !eligible) {
      const reason = this.#endReason({ eligible, browserFocused, idleState, tab });
      await this.#close(now, reason);
    }
    this.state.browserFocused = browserFocused;
    this.state.idleState = idleState;
    if (eligible && !this.state.active) {
      this.state.active = eligible;
      this.state.startedAt = now;
    } else if (eligible) {
      this.state.active = eligible;
    }
    await this.checkpoint();
  }

  async setPaused(paused) {
    if (Boolean(paused) === this.state.paused) return;
    if (paused) await this.#close(this.clock(), EndReason.PAUSED);
    this.state.paused = Boolean(paused);
    await this.checkpoint();
  }

  async checkpoint() {
    await this.repository.saveTrackerState({ ...this.state, lastCheckpointAt: this.clock() });
  }

  async shutdown() {
    await this.#close(this.clock(), EndReason.SHUTDOWN);
    await this.checkpoint();
  }

  #toActivity(tab) {
    if (!tab || !tab.active || !isTrackableUrl(tab.url)) return null;
    const parsed = new URL(tab.url);
    return { tabId: tab.id, windowId: tab.windowId, url: tab.url, title: tab.title ?? "",
      hostname: parsed.hostname.toLowerCase(), domain: normalizeDomain(tab.url),
      mediaState: tab.mediaState ?? "unknown", fullscreenState: tab.fullscreenState ?? "unknown" };
  }

  #endReason({ eligible, browserFocused, idleState, tab }) {
    if (!browserFocused) return EndReason.BROWSER_BLURRED;
    if (idleState !== "active") return EndReason.IDLE;
    if (!tab) return EndReason.TAB_CLOSED;
    if (this.state.active && tab.id === this.state.active.tabId && tab.url !== this.state.active.url) return EndReason.URL_CHANGED;
    if (this.state.active && tab.windowId !== this.state.active.windowId) return EndReason.WINDOW_CHANGED;
    return eligible ? EndReason.TAB_CHANGED : EndReason.TAB_CLOSED;
  }

  async #close(endAt, reason) {
    if (!this.state.active) return;
    await this.#persistInterval(this.state.active, this.state.startedAt, endAt, reason);
    this.state.active = null;
    this.state.startedAt = null;
  }

  async #persistInterval(active, startAt, endAt, reason) {
    const interval = createInterval(active, startAt, endAt, reason);
    if (interval?.activeSeconds > 0) await this.repository.addInterval(interval);
  }
}
