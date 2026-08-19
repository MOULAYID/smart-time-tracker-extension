import { TrackingEngine } from "../../packages/tracking-engine/engine.js";
import { IndexedDbTrackingRepository } from "../../packages/database/indexeddb-repository.js";
import { classifyInterval, validateClassification } from "../../packages/classification/classifier.js";
import { buildSummary } from "../../packages/analytics/summary.js";
import { createFocusSession, evaluateBlocking, validateDomain } from "../../packages/blocking-engine/rules.js";

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
  await enforce(tab);
}
async function localState(){const d=await chrome.storage.local.get(["focusSession","websiteLimits","blockingOverrides"]);return{focus:d.focusSession||null,limits:d.websiteLimits||[],overrides:d.blockingOverrides||{}}}
async function enforce(tab){if(!tab?.url?.startsWith("http"))return;const domain=new URL(tab.url).hostname.toLowerCase().replace(/^www\./,"");const state=await localState();if(state.focus?.active&&state.focus.endsAt&&state.focus.endsAt<=Date.now()){state.focus.active=false;await chrome.storage.local.set({focusSession:state.focus})}const start=new Date();start.setHours(0,0,0,0);const rows=await repository.listIntervals({from:start.getTime(),to:start.getTime()+86400000,limit:2000}),usageSeconds=rows.filter(x=>x.domain===domain).reduce((s,x)=>s+x.activeSeconds,0),decision=evaluateBlocking({domain,now:Date.now(),...state,usageSeconds});if(decision.blocked){const target=chrome.runtime.getURL(`blocked/index.html?domain=${encodeURIComponent(domain)}&reason=${decision.reason}&level=${decision.level}`);await chrome.tabs.update(tab.id,{url:target})}}

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
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") }));
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
    if (message.type === "analytics:summary") {
      const intervals = await repository.listIntervals({ ...message.range, limit: 2000 });
      const rules = await repository.listClassificationRules();
      return buildSummary(intervals.map(interval => ({ ...interval, classification: classifyInterval(interval, rules) })), message.range);
    }
    if(message.type==="focus:status")return localState();
    if(message.type==="focus:start"){const focusSession=createFocusSession(message.input);await chrome.storage.local.set({focusSession});return focusSession}
    if(message.type==="focus:stop"){const d=await chrome.storage.local.get("focusSession"),f=d.focusSession;if(f){f.active=false;f.endedAt=Date.now();await chrome.storage.local.set({focusSession:f})}return f||null}
    if(message.type==="limits:save"){const domain=validateDomain(message.input?.domain),minutes=Number(message.input?.minutes);if(!Number.isFinite(minutes)||minutes<1||minutes>1440)throw new Error("Limit must be 1–1440 minutes");const d=await chrome.storage.local.get("websiteLimits"),limits=d.websiteLimits||[],rule={id:crypto.randomUUID(),domain,minutes,level:message.input.level==="soft"?"soft":"hard",enabled:true,schedule:null},next=[...limits,rule];await chrome.storage.local.set({websiteLimits:next});return next}
    if(message.type==="limits:delete"){const d=await chrome.storage.local.get("websiteLimits"),next=(d.websiteLimits||[]).filter(x=>x.id!==message.id);await chrome.storage.local.set({websiteLimits:next});return next}
    if(message.type==="blocking:override"){const domain=validateDomain(message.domain),d=await chrome.storage.local.get("blockingOverrides"),overrides={...(d.blockingOverrides||{}),[domain]:Date.now()+300000};await chrome.storage.local.set({blockingOverrides:overrides});return overrides[domain]}
    throw new Error("Unsupported message type");
  })().then(data => sendResponse({ ok: true, data })).catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
boot();
