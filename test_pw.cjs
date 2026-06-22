const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    fs.writeFileSync('dummy.mp4', 'test video file content');
    
    console.log("Launching playwright...");
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    let networkStatus = 0;
    
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('console', async msg => {
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        console.log('PW CONSOLE:', args);
    });

    page.on('response', async response => {
        if (response.url().includes('supabase.co/storage')) {
            if (response.request().method() === 'POST') {
                networkStatus = response.status();
            }
        }
    });

    console.log("Navigating...");
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    
    console.log("Locating file input...");
    await page.waitForSelector('#raw-file-input', { state: 'attached' });
    
    // Evaluate script to forcefully trigger it in case setInputFiles is being weird
    await page.evaluate(() => {
        console.log("Evaluating inside browser...");
        const fileInput = document.getElementById('raw-file-input');
        if (!fileInput) console.log("FILE INPUT MISSING");
    });
    
    console.log("Uploading file...");
    const fileInput = page.locator('#raw-file-input');
    await fileInput.setInputFiles('dummy.mp4');
    
    await page.waitForTimeout(8000);
    
    console.log("\n--- TEST RESULTS ---");
    console.log("NETWORK STATUS:", networkStatus);
    
    await browser.close();
})();
