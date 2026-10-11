const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  try {
    await page.goto('http://127.0.0.1:63125', { waitUntil: 'load', timeout: 20000 });
    await new Promise(r => setTimeout(r, 5000));
    const html = await page.evaluate(() => document.querySelector('.leaflet-marker-pane')?.innerHTML);
    console.log('MARKER PANE HTML:', html.substring(0, 500));
  } catch (err) {
    console.log('PAGE ERROR:', err.message);
  }

  await browser.close();
})();
