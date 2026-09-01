import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5173/");
await page.waitForSelector(".app-shell");

const sizes = [
  { name: "desktop", width: 1400, height: 900 },
  { name: "tablet", width: 1000, height: 900 },
  { name: "mobile", width: 420, height: 850 },
];

for (const s of sizes) {
  await page.setViewportSize({ width: s.width, height: s.height });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/tmp/prd-studio-responsive-${s.name}.png` });
  console.log(`Captured ${s.name} (${s.width}x${s.height})`);
}

await browser.close();
