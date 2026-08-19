import { formatDuration, timelineRange } from "../../../packages/tracking-engine/timeline.js";

const elements = { date: document.querySelector("#date"), total: document.querySelector("#total"), count: document.querySelector("#count"), status: document.querySelector("#status"), list: document.querySelector("#timeline"), template: document.querySelector("#row-template") };
const today = new Date();
elements.date.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

function send(message) {
  return chrome.runtime.sendMessage(message).then(response => {
    if (!response?.ok) throw new Error(response?.error || "Extension request failed");
    return response.data;
  });
}

function localTime(timestamp) { return new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit"}).format(timestamp); }

async function save(row, interval, button) {
  button.disabled = true; button.textContent = "Saving…";
  try {
    const classification = await send({ type:"timeline:classify", id:interval.id, classification:{ category:row.querySelector(".category").value, productivityLevel:row.querySelector(".level").value } });
    row.querySelector(".source").textContent = classification.source.replaceAll("_"," ");
    button.textContent = "Saved";
  } catch (error) { button.textContent = error.message; }
  finally { setTimeout(() => { button.disabled=false; button.textContent="Save classification"; }, 1200); }
}

function render(intervals) {
  elements.list.replaceChildren();
  elements.count.textContent = intervals.length;
  elements.total.textContent = formatDuration(intervals.reduce((sum,item)=>sum+item.activeSeconds,0));
  elements.status.hidden = intervals.length > 0;
  elements.status.textContent = "No tracked activity for this date yet.";
  for (const interval of intervals) {
    const row = elements.template.content.firstElementChild.cloneNode(true);
    row.querySelector("time").textContent = `${localTime(interval.startedAt)}–${localTime(interval.endedAt)}`;
    row.querySelector("h2").textContent = interval.domain;
    row.querySelector(".title").textContent = interval.title || interval.url;
    row.querySelector(".duration").textContent = formatDuration(interval.activeSeconds);
    row.querySelector(".category").value = interval.classification.category;
    row.querySelector(".level").value = interval.classification.productivityLevel;
    row.querySelector(".source").textContent = interval.classification.source.replaceAll("_"," ");
    row.querySelector("button").addEventListener("click", event => save(row,interval,event.currentTarget));
    elements.list.append(row);
  }
}

async function load() {
  elements.status.hidden=false; elements.status.textContent="Loading activity…";
  try { render(await send({ type:"timeline:list", range:timelineRange(elements.date.value) })); }
  catch(error) { elements.status.textContent = `Could not load activity: ${error.message}`; }
}
elements.date.addEventListener("change", load);
load();
