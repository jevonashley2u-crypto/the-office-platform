const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log("Creating dummy video...");
    fs.writeFileSync('dummy_video.mp4', 'dummy video content');

    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    let uploadSuccess = false;
    let networkLogs = [];
    
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    
    page.on('request', request => {
        if (request.url().includes('supabase.co')) {
            networkLogs.push(`REQUEST: ${request.method()} ${request.url()}`);
        }
    });
    
    page.on('response', async response => {
        if (response.url().includes('supabase.co')) {
            networkLogs.push(`RESPONSE CODE: ${response.status()}`);
            if (response.request().method() === 'POST' && response.url().includes('storage')) {
                try {
                    const body = await response.text();
                    networkLogs.push(`RESPONSE BODY: ${body}`);
                    if (response.status() === 200) {
                        uploadSuccess = true;
                    }
                } catch(e) {}
            }
        }
    });

    console.log("Navigating to http://localhost:3000/admin.html...");
    await page.goto('http://localhost:3000/admin.html', { waitUntil: 'networkidle0' });
    
    console.log("Locating file input...");
    const fileInput = await page.$('#raw-file-input');
    if (!fileInput) {
        console.error("COULD NOT FIND FILE INPUT!");
        process.exit(1);
    }
    
    console.log("Uploading file via puppeteer...");
    await fileInput.uploadFile('dummy_video.mp4');
    
    // Wait for the UI to update and network request to finish
    await new Promise(r => setTimeout(r, 5000));
    
    console.log("\n--- NETWORK LOGS ---");
    networkLogs.forEach(log => console.log(log));
    
    console.log("\n--- TEST RESULT ---");
    if (uploadSuccess) {
        console.log("✅ Upload successful");
    } else {
        console.log("❌ Upload failed or no network request was made.");
    }
    
    await browser.close();
})();
