import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "apps/extension");
const output = resolve(root, "dist/extension");

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "packages"), { recursive: true });
await cp(resolve(source, "manifest.json"), resolve(output, "manifest.json"));
await cp(resolve(root, "packages/tracking-engine"), resolve(output, "packages/tracking-engine"), { recursive: true });
await cp(resolve(root, "packages/database"), resolve(output, "packages/database"), { recursive: true });
await cp(resolve(root, "packages/classification"), resolve(output, "packages/classification"), { recursive: true });
await cp(resolve(root, "packages/analytics"), resolve(output, "packages/analytics"), { recursive: true });
await cp(resolve(root, "packages/blocking-engine"), resolve(output, "packages/blocking-engine"), { recursive: true });
await cp(resolve(source, "timeline"), resolve(output, "timeline"), { recursive: true });
await cp(resolve(source, "dashboard"), resolve(output, "dashboard"), { recursive: true });
await cp(resolve(source, "focus"), resolve(output, "focus"), { recursive: true });
await cp(resolve(source, "blocked"), resolve(output, "blocked"), { recursive: true });

const worker = await readFile(resolve(source, "service-worker.js"), "utf8");
await writeFile(
  resolve(output, "service-worker.js"),
  worker.replaceAll("../../packages/", "./packages/"),
  "utf8"
);
const timeline = await readFile(resolve(output, "timeline/timeline.js"), "utf8");
await writeFile(resolve(output, "timeline/timeline.js"), timeline.replaceAll("../../../packages/", "../packages/"), "utf8");
const dashboard = await readFile(resolve(output, "dashboard/dashboard.js"), "utf8");
await writeFile(resolve(output, "dashboard/dashboard.js"), dashboard.replaceAll("../../../packages/", "../packages/"), "utf8");

console.log(`Built unpacked extension at ${output}`);
