// Shiki-based syntax highlighting for Zine code blocks.
//
// Zine renders fenced code blocks server-side with tree-sitter as:
//   <pre><code class="<lang>"><span class="keyword">...</span></code></pre>
// This script re-highlights those blocks client-side with Shiki (TextMate
// grammars, many more languages + prettier themes).
//
// Usage: loaded as <script type="module"> from head.shtml.
// Docs: https://shiki.style/guide/install#cdn-usage

import { codeToHtml } from "https://cdn.jsdelivr.net/npm/shiki@3.0.0/+esm";

// Theme configuration: Gruvbox dark matches the site's retro palette and Giscus setup
const THEME = "gruvbox-dark-hard";

// Zine/tree-sitter language names -> Shiki language ids.
const LANG_ALIASES = {
  console: "shellsession",
  shell: "bash",
  sh: "bash",
  "c++": "cpp",
  shtml: "html",
  superhtml: "html",
  smd: "markdown",
  supermd: "markdown",
  ziggy: "zig",
};

const SKIP_LANGS = new Set(["=html"]);

function resolveLang(raw) {
  if (!raw) return "plaintext";
  // Zine emits `class="zig"`; handle `language-zig` too just in case.
  const name = raw.trim().split(/\s+/)[0].replace(/^language-/, "").toLowerCase();
  if (SKIP_LANGS.has(name) || name.startsWith("=")) return null;
  return LANG_ALIASES[name] ?? name;
}

function createCopyButton(code) {
  const button = document.createElement("button");
  button.className = "code-copy-btn";
  button.type = "button";
  button.setAttribute("aria-label", "Copy code to clipboard");
  button.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>Copy</span>
  `;

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      button.classList.add("copied");
      const label = button.querySelector("span");
      if (label) label.textContent = "Copied!";
      setTimeout(() => {
        button.classList.remove("copied");
        if (label) label.textContent = "Copy";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  });

  return button;
}

async function highlightBlock(pre, codeEl) {
  const lang = resolveLang(codeEl.className);
  if (lang === null) return; // e.g. inlined =html, leave alone

  // textContent decodes entities and strips Zine's tree-sitter spans,
  // giving us the raw source to re-highlight.
  const code = codeEl.textContent.replace(/\n$/, "");

  try {
    const html = await codeToHtml(code, { lang, theme: THEME });
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const shikiPre = tpl.content.firstElementChild;
    if (!shikiPre) return;

    shikiPre.dataset.lang = lang;

    const container = document.createElement("div");
    container.className = "code-block-container";
    container.appendChild(shikiPre);
    container.appendChild(createCopyButton(code));

    pre.replaceWith(container);
  } catch {
    // Fallback to plaintext if language is unknown
    if (lang !== "plaintext") {
      try {
        const html = await codeToHtml(code, { lang: "plaintext", theme: THEME });
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();
        const shikiPre = tpl.content.firstElementChild;
        if (shikiPre) {
          shikiPre.dataset.lang = lang;
          const container = document.createElement("div");
          container.className = "code-block-container";
          container.appendChild(shikiPre);
          container.appendChild(createCopyButton(code));
          pre.replaceWith(container);
          return;
        }
      } catch {
        /* leave Zine's tree-sitter output as-is */
      }
    }

    // If Shiki failed completely, preserve tree-sitter output but wrap with copy button
    if (!pre.classList.contains("shiki-fallback")) {
      pre.classList.add("shiki-fallback");
      const container = document.createElement("div");
      container.className = "code-block-container";
      pre.replaceWith(container);
      container.appendChild(pre);
      container.appendChild(createCopyButton(code));
    }
  }
}

async function highlightAll() {
  const blocks = document.querySelectorAll("pre > code");
  for (const codeEl of blocks) {
    const pre = codeEl.parentElement;
    if (pre?.tagName === "PRE" && !pre.classList.contains("shiki") && !pre.classList.contains("shiki-fallback")) {
      await highlightBlock(pre, codeEl);
    }
  }
}

// Run ASAP but after parsing; module scripts are deferred by default,
// so DOM is ready here. Also re-run for lazily injected content.
highlightAll();
new MutationObserver(() => highlightAll()).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
