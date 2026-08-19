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

const worker = await readFile(resolve(source, "service-worker.js"), "utf8");
await writeFile(
  resolve(output, "service-worker.js"),
  worker.replaceAll("../../packages/", "./packages/"),
  "utf8"
);

console.log(`Built unpacked extension at ${output}`);
