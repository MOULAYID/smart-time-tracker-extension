const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "com.au", "net.au", "org.au", "co.nz",
  "co.jp", "co.in", "com.br", "com.mx", "com.tr", "com.cn", "com.sg",
  "com.sa", "com.qa", "com.ar", "co.za"
]);

/** Returns a stable registrable-domain approximation without transmitting URLs. */
export function normalizeDomain(input) {
  if (!input || typeof input !== "string") return null;
  let hostname;
  try {
    hostname = new URL(input.includes("://") ? input : `https://${input}`).hostname;
  } catch {
    return null;
  }
  hostname = hostname.toLowerCase().replace(/^www\d*\./, "").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return hostname || null;
  }
  const labels = hostname.split(".");
  if (labels.length <= 2) return hostname;
  const suffix = labels.slice(-2).join(".");
  return MULTI_LABEL_SUFFIXES.has(suffix) ? labels.slice(-3).join(".") : suffix;
}

export function isTrackableUrl(url) {
  if (!url || typeof url !== "string") return false;
  try { return ["http:", "https:"].includes(new URL(url).protocol); }
  catch { return false; }
}
