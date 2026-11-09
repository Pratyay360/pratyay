#!/usr/bin/env node
// Minify the site's CSS and JS in public/ after a Zine build.
//
// Zine copies assets/ verbatim into public/, so the readable sources in
// assets/ stay untouched and only the generated output gets minified.
// Already-minified files (*.min.js / *.min.css) and generated bundles
// (public/pagefind) are skipped.
import { readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TARGET_DIRS = ["public/css", "public/js"];
const SKIP_DIRS = new Set(["pagefind"]);
const ESBUILD_VERSION = "0.25";

const isMinified = (file) => /\.min\.(?:js|css)$/i.test(file);

async function collect(dir, out = []) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) await collect(full, out);
		} else if (/\.(?:js|css)$/i.test(entry.name) && !isMinified(entry.name)) {
			out.push(full);
		}
	}
	return out;
}

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
		let stderr = "";
		child.stderr.on("data", (chunk) => (stderr += chunk));
		child.on("error", reject);
		child.on("close", (code) =>
			code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.trim()}`)),
		);
	});
}

const files = (await Promise.all(TARGET_DIRS.map((dir) => collect(path.join(ROOT, dir))))).flat();

if (files.length === 0) {
	console.log("minify: nothing to minify");
	process.exit(0);
}

let before = 0;
let after = 0;
let failed = 0;

for (const file of files) {
	const size = (await stat(file)).size;
	try {
		await run("npx", ["-y", `esbuild@${ESBUILD_VERSION}`, file, "--minify", "--allow-overwrite", "--log-level=error", `--outfile=${file}`]);
		const next = (await stat(file)).size;
		before += size;
		after += next;
		console.log(`  ${path.relative(ROOT, file)}: ${size} -> ${next} bytes`);
	} catch (err) {
		failed++;
		console.error(`  ${path.relative(ROOT, file)}: FAILED — ${err.message}`);
	}
}

const pct = before ? (100 - (after / before) * 100).toFixed(1) : "0.0";
console.log(`minify: ${files.length - failed}/${files.length} files, ${before} -> ${after} bytes (${pct}% smaller)`);

if (failed > 0) process.exit(1);
