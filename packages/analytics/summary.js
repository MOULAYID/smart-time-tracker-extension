const PRODUCTIVE = new Set(["productive", "highly_productive"]);
const DISTRACTING = new Set(["distracting", "highly_distracting"]);

function add(map, key, seconds) { map[key] = (map[key] ?? 0) + seconds; }

export function focusScore(intervals) {
  const active = intervals.reduce((sum, item) => sum + item.activeSeconds, 0);
  if (!active) return { score: 0, factors: [] };
  const productive = intervals.filter(x => PRODUCTIVE.has(x.classification.productivityLevel)).reduce((s,x)=>s+x.activeSeconds,0);
  const distracted = intervals.filter(x => DISTRACTING.has(x.classification.productivityLevel)).reduce((s,x)=>s+x.activeSeconds,0);
  const chronological = [...intervals].sort((a,b)=>a.startedAt-b.startedAt);
  let disruptiveSwitches = 0;
  for (let i=1;i<chronological.length;i++) {
    if (chronological[i-1].classification.productivityLevel !== chronological[i].classification.productivityLevel) disruptiveSwitches++;
  }
  const longest = Math.max(0, ...intervals.filter(x=>PRODUCTIVE.has(x.classification.productivityLevel)).map(x=>x.activeSeconds));
  const parts = {
    productiveRatio: Math.round(45 * productive / active),
    distractionControl: Math.round(30 * (1 - distracted / active)),
    uninterruptedFocus: Math.round(15 * Math.min(longest / 2700, 1)),
    contextStability: Math.round(10 * Math.max(0, 1 - disruptiveSwitches / Math.max(intervals.length - 1, 1)))
  };
  return { score: Math.max(0, Math.min(100, Object.values(parts).reduce((a,b)=>a+b,0))), factors: [
    { key:"productiveRatio", label:"Productive-time ratio", points:parts.productiveRatio, maximum:45 },
    { key:"distractionControl", label:"Distraction control", points:parts.distractionControl, maximum:30 },
    { key:"uninterruptedFocus", label:"Uninterrupted focus", points:parts.uninterruptedFocus, maximum:15 },
    { key:"contextStability", label:"Context stability", points:parts.contextStability, maximum:10 }
  ]};
}

export function buildSummary(intervals, range) {
  const totals = { active:0, productive:0, neutral:0, distracted:0 };
  const byCategory = {}, byDomain = {}, byHour = {};
  const chronological = [...intervals].sort((a,b)=>a.startedAt-b.startedAt);
  let tabSwitches = 0, productiveInterruptions = 0;
  for (const item of chronological) {
    const seconds = Math.max(0, item.activeSeconds || 0);
    totals.active += seconds;
    const level = item.classification.productivityLevel;
    if (PRODUCTIVE.has(level)) totals.productive += seconds;
    else if (DISTRACTING.has(level)) totals.distracted += seconds;
    else totals.neutral += seconds;
    add(byCategory, item.classification.category, seconds);
    add(byDomain, item.domain, seconds);
    add(byHour, String(new Date(item.startedAt).getHours()).padStart(2,"0"), seconds);
  }
  for (let i=1;i<chronological.length;i++) {
    if (chronological[i].tabId !== chronological[i-1].tabId) tabSwitches++;
    if (PRODUCTIVE.has(chronological[i-1].classification.productivityLevel) && !PRODUCTIVE.has(chronological[i].classification.productivityLevel)) productiveInterruptions++;
  }
  const rank = object => Object.entries(object).sort((a,b)=>b[1]-a[1]).map(([name,seconds])=>({name,seconds}));
  return { range, totals, byCategory:rank(byCategory), byDomain:rank(byDomain), byHour:rank(byHour), tabSwitches, productiveInterruptions, intervalCount:intervals.length, focus:focusScore(intervals) };
}
