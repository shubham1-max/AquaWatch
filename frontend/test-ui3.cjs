const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.url().includes('/api/incidents') && !request.url().includes('stats')) {
            request.respond({
                content: 'application/json',
                headers: {"Access-Control-Allow-Origin": "*"},
                body: JSON.stringify({
                    data: [
                        { _id: "1", location: { coordinates: [77.5946, 12.9716] }, severity: "high", status: "open" },
                        { _id: "2", location: { coordinates: [77.5946, 12.9716] }, severity: "medium", status: "open" }
                    ],
                    pagination: { hasNextPage: false }
                })
            });
        } else if (request.url().includes('/api/incidents/stats')) {
            request.respond({
                content: 'application/json',
                headers: {"Access-Control-Allow-Origin": "*"},
                body: JSON.stringify({
                    data: [{ count: 2, status: 'open' }]
                })
            });
        } else {
            request.continue();
        }
    });

    console.log('Navigating to http://localhost:5173...');
    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'screenshot2.png' });
    } catch (e) {
        console.error('Navigation error:', e);
    }
    
    await browser.close();
    process.exit(0);
})();
