import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDomain, isTrackableUrl } from "../packages/tracking-engine/domain.js";
import { TrackingEngine } from "../packages/tracking-engine/engine.js";
import { MemoryRepository } from "./helpers/memory-repository.js";

const tab = (id, url, windowId = 1) => ({ id, windowId, url, title: url, active: true });

test("normalizes common hosts while preserving registrable country domains", () => {
  assert.equal(normalizeDomain("https://www.youtube.com/watch?v=1"), "youtube.com");
  assert.equal(normalizeDomain("m.youtube.com"), "youtube.com");
  assert.equal(normalizeDomain("https://news.bbc.co.uk"), "bbc.co.uk");
  assert.equal(normalizeDomain("LOCALHOST:3000"), "localhost");
  assert.equal(normalizeDomain("not a url /"), null);
});

test("tracks only http(s) pages", () => {
  assert.equal(isTrackableUrl("https://example.com"), true);
  assert.equal(isTrackableUrl("chrome://settings"), false);
  assert.equal(isTrackableUrl("file:///secret"), false);
});

test("closes intervals on tab, idle and blur transitions", async () => {
  let now = 0; const repo = new MemoryRepository();
  const engine = new TrackingEngine({ repository: repo, clock: () => now });
  await engine.initialize({ tab: tab(1, "https://a.test"), browserFocused: true, idleState: "active" });
  now = 5_000; await engine.observe({ tab: tab(2, "https://b.test"), browserFocused: true, idleState: "active" });
  now = 7_000; await engine.observe({ tab: tab(2, "https://b.test"), browserFocused: true, idleState: "idle" });
  now = 10_000; await engine.observe({ tab: tab(1, "https://a.test"), browserFocused: true, idleState: "active" });
  now = 13_000; await engine.observe({ tab: tab(1, "https://a.test"), browserFocused: false, idleState: "active" });
  assert.deepEqual(repo.intervals.map(x => [x.domain, x.activeSeconds, x.endReason]), [
    ["a.test", 5, "tab_changed"], ["b.test", 2, "idle"], ["a.test", 3, "browser_blurred"]
  ]);
});

test("pause closes activity and prevents new tracking", async () => {
  let now = 0; const repo = new MemoryRepository();
  const engine = new TrackingEngine({ repository: repo, clock: () => now });
  await engine.initialize({ tab: tab(1, "https://a.test"), browserFocused: true, idleState: "active" });
  now = 4_000; await engine.setPaused(true);
  now = 8_000; await engine.observe({ tab: tab(2, "https://b.test"), browserFocused: true, idleState: "active" });
  assert.equal(repo.intervals.length, 1);
  assert.equal(repo.intervals[0].activeSeconds, 4);
});

test("recovery caps stale sessions instead of inventing hours", async () => {
  let now = 3_600_000;
  const repo = new MemoryRepository({ active: { ...tab(1, "https://a.test"), hostname: "a.test", domain: "a.test" }, startedAt: 0, lastCheckpointAt: 30_000, browserFocused: true, idleState: "active", paused: false });
  const engine = new TrackingEngine({ repository: repo, clock: () => now, settings: { recoveryGapMs: 60_000 } });
  await engine.initialize({ browserFocused: false, idleState: "active", tab: null });
  assert.equal(repo.intervals[0].activeSeconds, 30);
  assert.equal(repo.intervals[0].endReason, "recovery_timeout");
});
