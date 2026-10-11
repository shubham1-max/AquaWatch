const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    let hasError = false;
    page.on('pageerror', err => {
        console.error('Page error:', err);
        hasError = true;
    });
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('Console error:', msg.text());
            hasError = true;
        }
    });

    console.log('Navigating to http://localhost:5173...');
    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'screenshot.png' });
    } catch (e) {
        console.error('Navigation error:', e);
        hasError = true;
    }
    
    await browser.close();
    
    if (hasError) {
        console.log('Test failed with errors.');
        process.exit(1);
    } else {
        console.log('Test passed cleanly.');
        process.exit(0);
    }
})();
