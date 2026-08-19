export const PRODUCTIVITY_LEVELS = Object.freeze([
  "highly_productive", "productive", "neutral", "distracting", "highly_distracting"
]);

export const DEFAULT_CATEGORIES = Object.freeze([
  "Development", "Data Analytics", "Learning", "Research", "Work", "Communication",
  "Career", "Finance", "Productivity", "Shopping", "News", "Social Media",
  "Entertainment", "Gaming", "Video", "Music", "Other"
]);

const DEFAULT_DOMAIN_RULES = Object.freeze({
  "github.com": ["Development", "productive"],
  "stackoverflow.com": ["Development", "productive"],
  "developer.mozilla.org": ["Development", "productive"],
  "instagram.com": ["Social Media", "distracting"],
  "facebook.com": ["Social Media", "distracting"],
  "tiktok.com": ["Entertainment", "highly_distracting"]
});

function matchRule(rule, interval) {
  if (!rule?.enabled) return false;
  if (rule.type === "page") return interval.url === rule.pattern;
  if (rule.type === "domain") return interval.domain === rule.pattern;
  return false;
}

/** Classification precedence: manual interval correction > user page > user domain > known domain > neutral. */
export function classifyInterval(interval, userRules = []) {
  if (interval.classification?.source === "manual_correction") return interval.classification;
  const ordered = [...userRules].sort((a, b) => (a.type === "page" ? -1 : 1) - (b.type === "page" ? -1 : 1));
  const userRule = ordered.find(rule => matchRule(rule, interval));
  if (userRule) return { category: userRule.category, productivityLevel: userRule.productivityLevel, source: "user_rule" };
  const known = DEFAULT_DOMAIN_RULES[interval.domain];
  if (known) return { category: known[0], productivityLevel: known[1], source: "default" };
  return { category: "Other", productivityLevel: "neutral", source: "default" };
}

export function validateClassification(input) {
  if (!input || typeof input !== "object") throw new Error("Classification is required");
  const category = String(input.category ?? "").trim();
  if (!category || category.length > 60) throw new Error("Category must contain 1–60 characters");
  if (!PRODUCTIVITY_LEVELS.includes(input.productivityLevel)) throw new Error("Invalid productivity level");
  return { category, productivityLevel: input.productivityLevel, source: "manual_correction" };
}
