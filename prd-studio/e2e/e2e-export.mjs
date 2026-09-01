// Imports the known-good Invoicing example (so the draft is schema-valid), then exports it
// through the real Export button and confirms the status line reports success.
// Requires `npm run render:example` to have been run first, so example-output/docs/*.md exists.
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(here, "..", "example-output", "docs");
if (!existsSync(SOURCE_DIR)) {
  throw new Error(`${SOURCE_DIR} does not exist — run "npm run render:example" first.`);
}
// Unique per run so concurrent/repeated runs never collide; cleaned up before exit either way.
const TARGET_DIR = mkdtempSync(join(tmpdir(), "prd-studio-export-roundtrip-"));

const errors = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto("http://localhost:5173/");
  await page.waitForSelector(".app-shell");

  await page.fill(".top-bar input[type=text]", SOURCE_DIR);
  await page.click("button:has-text('Import from docs/')");
  await page.waitForTimeout(800);

  await page.fill(".top-bar input[type=text]", TARGET_DIR);
  await page.click("button:has-text('Export to docs/')");
  await page.waitForTimeout(1000);

  const status = await page.locator(".status-text").textContent();
  console.log(`Status: ${status}`);
  if (!status?.includes("Exported")) throw new Error(`Expected an "Exported" status, got "${status}"`);
} finally {
  await browser.close();
  rmSync(TARGET_DIR, { recursive: true, force: true });
}

if (errors.length > 0) {
  console.error("Console/page errors:", errors);
  process.exit(1);
}
console.log("\nExport check passed.");
