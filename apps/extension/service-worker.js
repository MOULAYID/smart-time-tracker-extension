import { TrackingEngine } from "../../packages/tracking-engine/engine.js";
import { IndexedDbTrackingRepository } from "../../packages/database/indexeddb-repository.js";
import { classifyInterval, validateClassification } from "../../packages/classification/classifier.js";

let engine;
let repository;
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
  repository = await new IndexedDbTrackingRepository().open();
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
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL("timeline/index.html") }));
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message.type !== "string") return false;
  (async () => {
    if (!repository) throw new Error("Database is not ready");
    if (message.type === "timeline:list") {
      const intervals = await repository.listIntervals(message.range);
      const rules = await repository.listClassificationRules();
      return intervals.map(interval => ({ ...interval, classification: classifyInterval(interval, rules) }));
    }
    if (message.type === "timeline:classify") {
      if (typeof message.id !== "string" || message.id.length > 200) throw new Error("Invalid interval ID");
      const classification = validateClassification(message.classification);
      await repository.updateIntervalClassification(message.id, classification);
      return classification;
    }
    throw new Error("Unsupported message type");
  })().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
boot();
