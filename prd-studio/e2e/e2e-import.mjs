// Verifies the Import button loads an on-disk PRD (rendered by the schema package's own
// examples) back into the Angular UI correctly.
// Requires `npm run render:example` to have been run first, so example-output/docs/*.md exists.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(here, "..", "example-output", "docs");
if (!existsSync(SOURCE_DIR)) {
  throw new Error(`${SOURCE_DIR} does not exist — run "npm run render:example" first.`);
}

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

  const appName = await page.locator(".content input[type=text]").first().inputValue();
  console.log(`Imported app name field: "${appName}"`);
  if (appName !== "Invoicely") throw new Error(`Expected "Invoicely", got "${appName}"`);

  const moduleTabs = await page.locator(".module-row .tab-btn").allTextContents();
  console.log(`Module tabs: ${JSON.stringify(moduleTabs)}`);
  if (!moduleTabs.some((t) => t.toLowerCase().includes("invoicing"))) {
    throw new Error(`Expected an Invoicing module tab, got ${JSON.stringify(moduleTabs)}`);
  }

  await page.click(".module-row .tab-btn:has-text('Invoicing')");
  await page.waitForSelector("app-feature-panel");
  await page.waitForTimeout(300);
  const entityTitles = await page.locator(".prd-canvas-node-title").allTextContents();
  console.log(`Canvas entities: ${JSON.stringify(entityTitles)}`);
  if (!entityTitles.includes("Invoice") || !entityTitles.includes("InvoiceItem")) {
    throw new Error(`Expected Invoice + InvoiceItem, got ${JSON.stringify(entityTitles)}`);
  }
} finally {
  await browser.close();
}

if (errors.length > 0) {
  console.error("Console/page errors:", errors);
  process.exit(1);
}
console.log("\nImport check passed.");
