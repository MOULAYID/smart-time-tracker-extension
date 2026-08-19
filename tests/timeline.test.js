import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration, timelineRange } from "../packages/tracking-engine/timeline.js";
test("formats durations without losing seconds",()=>{assert.equal(formatDuration(42),"42s");assert.equal(formatDuration(125),"2m 5s");assert.equal(formatDuration(3720),"1h 2m");});
test("builds an exact local-day query range",()=>{const range=timelineRange("2026-08-19",-120);assert.equal(range.to-range.from,86_400_000);assert.equal(new Date(range.from).toISOString(),"2026-08-18T22:00:00.000Z");});
test("rejects malformed dates",()=>assert.throws(()=>timelineRange("19/08/2026")));
