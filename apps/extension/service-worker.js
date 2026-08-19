import { TrackingEngine } from "../../packages/tracking-engine/engine.js";
import { IndexedDbTrackingRepository } from "../../packages/database/indexeddb-repository.js";

let engine;
let focusedWindowId = chrome.windows.WINDOW_ID_NONE;

async function activeTab(windowId = focusedWindowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return null;
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  return tab ?? null;
}

async function observe() {
  if (!engine) return;
  const [tab, idleState] = await Promise.all([activeTab(), chrome.idle.queryState(300)]);
  await engine.observe({ tab, browserFocused: focusedWindowId !== chrome.windows.WINDOW_ID_NONE, idleState });
}

async function boot() {
  const repository = await new IndexedDbTrackingRepository().open();
  engine = new TrackingEngine({ repository });
  const lastFocused = await chrome.windows.getLastFocused();
  focusedWindowId = lastFocused.focused ? lastFocused.id : chrome.windows.WINDOW_ID_NONE;
  const [tab, idleState] = await Promise.all([activeTab(), chrome.idle.queryState(300)]);
  await engine.initialize({ tab, browserFocused: focusedWindowId !== chrome.windows.WINDOW_ID_NONE, idleState });
  chrome.idle.setDetectionInterval(300);
}

chrome.tabs.onActivated.addListener(observe);
chrome.tabs.onUpdated.addListener((_id, change) => { if (change.url || change.status === "complete") observe(); });
chrome.tabs.onRemoved.addListener(observe);
chrome.windows.onFocusChanged.addListener((windowId) => { focusedWindowId = windowId; observe(); });
chrome.idle.onStateChanged.addListener(observe);
chrome.runtime.onSuspend.addListener(() => { engine?.checkpoint(); });
chrome.runtime.onStartup.addListener(boot);
chrome.runtime.onInstalled.addListener(boot);
boot();
