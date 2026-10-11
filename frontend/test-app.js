import puppeteer from 'puppeteer';
import http from 'http';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    console.log("Page loaded successfully");
  } catch (err) {
    console.log("Failed to load page:", err.message);
  }

  await browser.close();
})();
