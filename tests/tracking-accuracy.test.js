import test from "node:test";
import assert from "node:assert/strict";
import { TrackingEngine } from "../packages/tracking-engine/engine.js";
import { MemoryRepository } from "./helpers/memory-repository.js";

const tab = (id, domain, windowId = 1) => ({ id, windowId, url: `https://${domain}/page`, title: domain, active: true });

test("accuracy scenario: A 5m, B 2m, minimized 10m, A 3m", async () => {
  let now = 0; const repo = new MemoryRepository();
  const engine = new TrackingEngine({ repository: repo, clock: () => now });
  await engine.initialize({ tab: tab(1, "a.test"), browserFocused: true, idleState: "active" });
  now += 5 * 60_000; await engine.observe({ tab: tab(2, "b.test"), browserFocused: true, idleState: "active" });
  now += 2 * 60_000; await engine.observe({ tab: tab(2, "b.test"), browserFocused: false, idleState: "active" });
  now += 10 * 60_000; await engine.observe({ tab: tab(1, "a.test"), browserFocused: true, idleState: "active" });
  now += 3 * 60_000; await engine.shutdown();
  const totals = Object.groupBy(repo.intervals, x => x.domain);
  assert.equal(totals["a.test"].reduce((s, x) => s + x.activeSeconds, 0), 8 * 60);
  assert.equal(totals["b.test"].reduce((s, x) => s + x.activeSeconds, 0), 2 * 60);
});

test("idle interval is excluded and resume starts a fresh interval", async () => {
  let now = 0; const repo = new MemoryRepository();
  const engine = new TrackingEngine({ repository: repo, clock: () => now });
  await engine.initialize({ tab: tab(1, "study.test"), browserFocused: true, idleState: "active" });
  now = 60_000; await engine.observe({ tab: tab(1, "study.test"), browserFocused: true, idleState: "idle" });
  now = 11 * 60_000; await engine.observe({ tab: tab(1, "study.test"), browserFocused: true, idleState: "active" });
  now = 13 * 60_000; await engine.shutdown();
  assert.equal(repo.intervals.reduce((s, x) => s + x.activeSeconds, 0), 3 * 60);
});

test("same tab navigation creates separate accurate intervals", async () => {
  let now = 0; const repo = new MemoryRepository();
  const engine = new TrackingEngine({ repository: repo, clock: () => now });
  await engine.initialize({ tab: tab(1, "docs.test"), browserFocused: true, idleState: "active" });
  now = 30_000; await engine.observe({ tab: { ...tab(1, "docs.test"), url: "https://docs.test/second" }, browserFocused: true, idleState: "active" });
  now = 75_000; await engine.shutdown();
  assert.deepEqual(repo.intervals.map(x => x.activeSeconds), [30, 45]);
  assert.equal(repo.intervals[0].endReason, "url_changed");
});
