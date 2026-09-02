#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const { execSync } = require("node:child_process");
const os = require("node:os");

const REPO_URL = "https://github.com/Pratyay360/blogs_md.git";
const REPO_BRANCH = "main";

// Mapping from source directory in blogs_md to destination directory in blog and default layout
const DIRECTORY_MAPPINGS = [
  { src: "content/posts", dest: "content/blog", layout: "post.shtml" },
  { src: "content/blog", dest: "content/blog", layout: "post.shtml" },
  { src: "content/devlogs", dest: "content/devlog", layout: "page.shtml" },
  { src: "content/notes", dest: "content/notes", layout: "page.shtml" },
  { src: "content/projects", dest: "content/projects", layout: "project.shtml" },
];

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function convertFile(sourceFilePath, targetSmdPath, defaultLayout) {
  // console.log(`  -> Converting: ${sourceFilePath} -> ${targetSmdPath}`);
  await fs.mkdir(path.dirname(targetSmdPath), { recursive: true });
  const tempMdPath = targetSmdPath.replace(/\.smd$/, ".md");
  await fs.copyFile(sourceFilePath, tempMdPath);

  try {
    execSync(`md2smd "${tempMdPath}"`, { stdio: "inherit" });
  } finally {
    // Clean up temporary .md file
    await fs.unlink(tempMdPath).catch(() => { });
  }

  // Verify .smd was generated and ensure layout is defined
  if (await fileExists(targetSmdPath)) {
    let content = await fs.readFile(targetSmdPath, "utf-8");
    if (content.startsWith("---") && !content.includes(".layout =")) {
      content = content.replace(/^---\n/, `---\n.layout = "${defaultLayout}",\n`);
      await fs.writeFile(targetSmdPath, content, "utf-8");
    }
  }
}

async function getFilesRecursively(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "blogs-md-"));
  console.log(`Cloning ${REPO_URL} (${REPO_BRANCH}) into ${tmpDir}...`);

  try {
    execSync(`git -c core.hooksPath=/dev/null clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${tmpDir}"`, {
      stdio: "inherit",
    });

    for (const mapping of DIRECTORY_MAPPINGS) {
      const srcDir = path.join(tmpDir, mapping.src);
      if (!(await fileExists(srcDir))) {
        continue;
      }

      const mdFiles = await getFilesRecursively(srcDir);
      for (const srcFile of mdFiles) {
        const relativePath = path.relative(srcDir, srcFile);
        const targetSmd = path.join(mapping.dest, relativePath.replace(/\.md$/, ".smd"));
        await convertFile(srcFile, targetSmd, mapping.layout);
      }
    }

    console.log("Successfully fetched and converted all content!");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { });
  }
}

main().catch((err) => {
  console.error("Error fetching content:", err);
  process.exit(1);
});
