const fs = require('fs');
const acorn = require('acorn'); // acorn is a standard JS parser

try {
    const jsContent = fs.readFileSync('js/admin.js', 'utf8');
    acorn.parse(jsContent, { ecmaVersion: 2022 });
    console.log("admin.js syntax is completely valid!");
} catch(e) {
    console.error("SYNTAX ERROR IN ADMIN.JS:", e);
}
