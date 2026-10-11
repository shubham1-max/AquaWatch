const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
    console.log('Starting dev server...');
    const server = spawn('npm.cmd', ['run', 'dev'], { stdio: 'pipe' });
    
    let serverStarted = false;
    server.stdout.on('data', (data) => {
        if (data.toString().includes('Local:')) {
            serverStarted = true;
        }
    });

    // Wait for server
    for (let i = 0; i < 20; i++) {
        if (serverStarted) break;
        await new Promise(r => setTimeout(r, 500));
    }

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
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'screenshot.png' });
    
    await browser.close();
    server.kill();
    
    if (hasError) {
        console.log('Test failed with errors.');
        process.exit(1);
    } else {
        console.log('Test passed cleanly.');
        process.exit(0);
    }
})();
