import { readFile } from "node:fs/promises";
const manifest = JSON.parse(await readFile(new URL("../apps/extension/manifest.json", import.meta.url)));
if (manifest.manifest_version !== 3) throw new Error("Manifest V3 is required");
const allowed = new Set(["tabs", "idle", "storage"]);
for (const permission of manifest.permissions ?? []) if (!allowed.has(permission)) throw new Error(`Unexpected permission: ${permission}`);
if (!manifest.background?.service_worker) throw new Error("Service worker is missing");
console.log("Manifest and least-privilege permission check passed.");
