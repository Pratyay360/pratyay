#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const GITHUB_OWNER = "Pratyay360";
const GITHUB_REPO = "blogs_md";
const DEVLOG_PATH = "content/devlog";
const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

async function main() {
  console.log(`Fetching devlogs from ${GITHUB_OWNER}/${GITHUB_REPO}/${DEVLOG_PATH}...`);

  const response = await fetch(`${API_BASE}/contents/${DEVLOG_PATH}`);
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }
  const files = await response.json();
  if (!Array.isArray(files)) {
    console.log("No files found or unexpected response.");
    return;
  }

  const mdFiles = files.filter(
    (f) => f.type === "file" && f.name.endsWith(".md")
  );

  if (mdFiles.length === 0) {
    console.log("No markdown files found.");
    return;
  }

  for (const file of mdFiles) {
    const raw = await (await fetch(file.download_url)).text();
    const { frontmatter, body } = parseFrontmatter(raw);
    const slug = file.name.replace(/\.md$/, "");
    const date = parseDate(frontmatter.date) || extractDateFromSlug(slug) || "1990-01-01";
    const title = frontmatter.title || slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const smd = `---
.title = "${escapeZiggy(title)}",
.date = .date("${date}"),
.layout = "devlog.shtml",
---

${body}
`;

    const outDir = path.join("content", "devlog", slug);
    const outPath = path.join(outDir, "index.smd");
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, smd);
    console.log(`  ✓ ${outPath}`);
  }

  console.log(`Done. ${mdFiles.length} devlogs synced.`);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (val) frontmatter[line.slice(0, idx).trim()] = val;
    }
  }
  return { frontmatter, body: match[2] };
}

function parseDate(val) {
  if (!val || val === "s") return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function extractDateFromSlug(slug) {
  const m = slug.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function escapeZiggy(s) {
  return s.replace(/"/g, '\\"').replace(/\n/g, " ");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
