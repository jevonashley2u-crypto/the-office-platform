const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const js = fs.readFileSync('js/admin.js', 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  beforeParse(window) {
    // Mock supabase
    window.supabase = {
      createClient: () => {
        console.log("Mock createClient called");
        return {
          storage: { from: () => ({ upload: async () => ({ data: 'ok', error: null }) }) },
          from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
          functions: { invoke: async () => ({ data: {reply: 'test'}, error: null }) }
        };
      }
    };
    
    // Intercept console
    const originalConsoleError = window.console.error;
    window.console.error = function(...args) {
      console.log("JSDOM ERROR:", ...args);
      originalConsoleError.apply(window.console, args);
    };
    
    window.addEventListener("error", (event) => {
      console.log("GLOBAL ERROR:", event.error);
    });
  }
});

// Inject our script
const script = dom.window.document.createElement("script");
script.textContent = js;
dom.window.document.body.appendChild(script);

setTimeout(() => {
    console.log("Checking if elements were bound correctly...");
    const btn = dom.window.document.getElementById('upload-btn');
    if (btn) {
        console.log("Upload button found!");
    } else {
        console.log("Upload button missing!");
    }
    
    const fileInput = dom.window.document.getElementById('raw-file-input');
    console.log("Triggering change event...");
    // Mock files array
    Object.defineProperty(fileInput, 'files', {
        value: [{ name: 'test.mp4', type: 'video/mp4' }]
    });
    
    const event = new dom.window.Event('change');
    fileInput.dispatchEvent(event);
    
    setTimeout(() => {
        const percent = dom.window.document.getElementById('upload-percent');
        console.log("Upload UI state:", percent.innerHTML);
    }, 500);
}, 1000);
