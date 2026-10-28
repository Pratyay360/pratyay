const fs = require("node:fs");
const path = require("node:path");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

for (const file of walk("public")) {
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/<a\b([^>]*?)>/g, (match, attrs) => {
    if (!/href=["']https?:\/\//i.test(attrs)) return match;
    if (/rel=/i.test(attrs)) return match;
    return `<a${attrs} rel="noopener noreferrer">`;
  });
  fs.writeFileSync(file, html);
}
console.log("Fixed external link rel attributes.");
