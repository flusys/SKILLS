// Ad-hoc first-pass check of the Angular rewrite: load, add a module, add an entity, edit a
// field, watch the canvas + lint panel react, take a screenshot. Not a permanent test file.
import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:5173/");
await page.waitForSelector(".app-shell", { timeout: 8000 });
console.log("App shell loaded.");
await page.screenshot({ path: "/tmp/prd-studio-1-initial.png" });

await page.click("button.tab-btn:has-text('Bootstrap')");
await page.waitForTimeout(300);
console.log("Bootstrap tab active.");

await page.click("button:has-text('Add module')");
await page.waitForTimeout(500);
const canvasVisible = await page.locator("app-canvas svg").count();
console.log(`Canvas svg present: ${canvasVisible > 0}`);
await page.screenshot({ path: "/tmp/prd-studio-2-module-added.png" });

const entityNodes = await page.locator(".prd-canvas-node").count();
console.log(`Entity nodes on canvas: ${entityNodes}`);

await page.click("app-canvas .prd-canvas-node >> nth=0");
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/prd-studio-3-entity-selected.png" });

const inspectorNameInput = page.locator("app-entity-inspector input[type=text]").first();
await inspectorNameInput.fill("Invoice");
await inspectorNameInput.blur();
await page.waitForTimeout(400);
const titleAfter = await page.locator(".prd-canvas-node-title").allTextContents();
console.log(`Canvas titles after rename: ${JSON.stringify(titleAfter)}`);

await page.waitForTimeout(700);
const lintText = await page.locator("app-lint-panel").textContent();
console.log(`Lint panel snippet: ${lintText?.slice(0, 150)}`);

await page.screenshot({ path: "/tmp/prd-studio-4-final.png", fullPage: true });
await browser.close();

console.log(`\nConsole/page errors: ${errors.length}`);
for (const e of errors) console.log(" -", e);
if (errors.length > 0) process.exit(1);
console.log("Quick check passed.");
