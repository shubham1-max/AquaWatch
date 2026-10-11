const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    let callCount = 0;
    
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.url().includes('/api/incidents') && !request.url().includes('stats')) {
            callCount++;
            let incidents = [];
            if (callCount === 1) {
                incidents = [
                    { _id: "1", location: { coordinates: [77.5946, 12.9716] }, severity: "high", status: "open" }
                ];
            } else {
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
                    pagination: { hasNextPage: false }
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
    
    // Check initial markers
    const markers1 = await page.$$('.custom-marker');
    console.log('Initial markers:', markers1.length);
    
    // Simulate updating incidents (e.g. by clicking load more, but we just trigger a re-fetch in UI)
    // Actually, App.jsx only fetches on mount. Let's trigger a re-render by doing something else.
    // Like clicking a filter or toggling view?
    // There are no functional filters in the top-ui-row? "All Severity", "All Status". They are just <select> with no onChange!
    // Wait, the filters don't even have onChange handlers?
    console.log('Done');
    await browser.close();
    process.exit(0);
})();
