const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    let callCount = 0;
    
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.url().includes('/api/incidents') && !request.url().includes('stats')) {
            callCount++;
            let incidents = [];
            if (callCount === 1) {
                // First fetch returns 1 incident
                incidents = [
                    { _id: "1", location: { coordinates: [77.5946, 12.9716] }, severity: "high", status: "open" }
                ];
            } else {
                // Second fetch returns 2 incidents
                incidents = [
                    { _id: "1", location: { coordinates: [77.5946, 12.9716] }, severity: "high", status: "open" },
                    { _id: "2", location: { coordinates: [77.5946, 12.9716] }, severity: "medium", status: "open" }
                ];
            }
            request.respond({
                content: 'application/json',
                headers: {"Access-Control-Allow-Origin": "*"},
                body: JSON.stringify({
                    data: incidents,
                    pagination: { hasNextPage: true }
                })
            });
        } else if (request.url().includes('/api/incidents/stats')) {
            request.respond({
                content: 'application/json',
                headers: {"Access-Control-Allow-Origin": "*"},
                body: JSON.stringify({
                    data: [{ count: 1, status: 'open' }]
                })
            });
        } else {
            request.continue();
        }
    });

    console.log('Navigating...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Switch to List view to load more
    await page.click('.toggle-btn:nth-child(2)');
    await new Promise(r => setTimeout(r, 500));
    
    // Click load more
    await page.click('.load-more-btn');
    await new Promise(r => setTimeout(r, 1000));
    
    // Switch back to Map view
    await page.click('.toggle-btn:nth-child(1)');
    await new Promise(r => setTimeout(r, 500));
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'screenshot4.png' });
    
    await browser.close();
    process.exit(0);
})();
