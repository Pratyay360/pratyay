const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files = files.concat(walk(full));
    else if (stat.isFile() && full.endsWith('.html')) files.push(full);
  }
  return files;
}

function minifyHtml(html) {
  // Extract sensitive blocks that must not be minified internally
  const blocks = [];
  html = html.replace(/<(pre|code|textarea|script|style)([\s\S]*?)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, inner) => {
    const token = `__MINIFY_BLOCK_${blocks.length}__`;
    blocks.push(`<${tag}${attrs}>${inner}</${tag}>`);
    return token;
  });

  // Remove HTML comments, but keep conditional comments and comments starting with ! (e.g. <!---->)
  html = html.replace(/<!--([\s\S]*?)-->/g, (m, c) => {
    // keep if conditional comment or if it starts with [ or !
    if (/^\s*\[if\b/i.test(c) || /^\s*!/.test(c) || /^\s*#/.test(c)) return `<!--${c}-->`;
    return '';
  });

  // Collapse whitespace between tags
  html = html.replace(/>\s+</g, '><');

  // Collapse multiple spaces
  html = html.replace(/[ \t\f\v]{2,}/g, ' ');

  // Remove leading/trailing whitespace
  html = html.trim();

  // Put blocks back
  for (let i = 0; i < blocks.length; i++) {
    const token = `__MINIFY_BLOCK_${i}__`;
    html = html.replace(token, blocks[i]);
  }
  return html;
}

const targetDir = path.join(process.cwd(), 'public', 'blog');
if (!fs.existsSync(targetDir)) {
  console.error('Directory public/blog not found');
  process.exit(1);
}

const files = walk(targetDir);
if (files.length === 0) {
  console.log('No HTML files found under public/blog');
  process.exit(0);
}

for (const f of files) {
  try {
    const orig = fs.readFileSync(f, 'utf8');
    const min = minifyHtml(orig);
    fs.writeFileSync(f, min, 'utf8');
    const origSize = Buffer.byteLength(orig, 'utf8');
    const newSize = Buffer.byteLength(min, 'utf8');
    console.log(`Minified ${path.relative(process.cwd(), f)}: ${origSize} -> ${newSize}`);
  } catch (e) {
    console.error('Error processing', f, e);
  }
}
