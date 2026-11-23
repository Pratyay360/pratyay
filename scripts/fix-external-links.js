const fs = require("node:fs");
const path = require("node:path");

const SITE_URL = "https://www.pratyay.online";
const AUTHOR_NAME = "Pratyay Mustafi";
const LOGO_URL = `${SITE_URL}/fanzine.webp`;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function generateBreadcrumbs(urlPath, pageTitle) {
  const parts = urlPath.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": `${SITE_URL}/`
    }
  ];

  let currentPath = "";
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    currentPath += `/${segment}`;
    const isLast = i === parts.length - 1;
    let name = segment.charAt(0).toUpperCase() + segment.slice(1);

    if (segment === "blog") name = "Blog";
    else if (segment === "devlog") name = "Devlog";
    else if (segment === "notes") name = "Notes";
    else if (segment === "contactme") name = "Contact";
    else if (isLast && pageTitle) name = pageTitle;

    items.push({
      "@type": "ListItem",
      "position": i + 2,
      "name": name,
      "item": `${SITE_URL}${currentPath}/`
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
}

let count = 0;
for (const file of walk("public")) {
  count++;
  let html = fs.readFileSync(file, "utf8");
  const relPath = path.relative("public", file);
  const urlPath = "/" + relPath.replace(/index\.html$/, "").replace(/\\/g, "/");

  // 1. Fix external links with rel="noopener noreferrer"
  html = html.replace(/<a\b([^>]*?)>/g, (match, attrs) => {
    if (!/href=["']https?:\/\//i.test(attrs)) return match;
    // Don't modify internal links if host is matched
    if (/href=["']https?:\/\/(?:www\.)?pratyay\.online/i.test(attrs)) return match;

    if (!/rel=/i.test(attrs)) {
      return `<a${attrs} rel="noopener noreferrer">`;
    }
    return match.replace(/rel=["']([^"']*)["']/i, (relMatch, relVal) => {
      let tokens = relVal.trim() ? relVal.trim().split(/\s+/) : [];
      if (!tokens.includes("noopener")) tokens.push("noopener");
      if (!tokens.includes("noreferrer")) tokens.push("noreferrer");
      return `rel="${tokens.join(" ")}"`;
    });
  });

  // 2. Ensure <img> tags have alt attributes for accessibility & SEO
  html = html.replace(/<img\b((?:(?!alt=)[^>])*)>/gi, (match, attrs) => {
    return `<img${attrs} alt="">`;
  });

  // 3. Extract metadata for Schema.org JSON-LD
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  let rawTitle = titleMatch ? titleMatch[1].trim() : "";
  let cleanTitle = rawTitle.replace(/\s*[-|]\s*Pratyay Mustafi.*$/i, "").trim();
  if (!cleanTitle) cleanTitle = rawTitle;

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const description = descMatch ? descMatch[1].trim() : "";

  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : `${SITE_URL}${urlPath}`;

  const dateMatch = html.match(/<meta\s+property=["']article:published_time["']\s+content=["'](.*?)["']/i);
  const publishedDate = dateMatch ? dateMatch[1].trim() : "";

  const tagMatches = [...html.matchAll(/<meta\s+property=["']article:tag["']\s+content=["'](.*?)["']/gi)];
  const tags = tagMatches.map(m => m[1].trim());

  const jsonLdSnippets = [];

  // 4. Breadcrumb schema for non-root pages (skip error pages)
  const is404 = urlPath === "/404/" || urlPath === "/404.html" || urlPath.startsWith("/404");
  if (urlPath !== "/" && urlPath !== "" && !is404) {
    const breadcrumbs = generateBreadcrumbs(urlPath, cleanTitle);
    if (breadcrumbs) {
      jsonLdSnippets.push(breadcrumbs);
    }
  }

  // 5. BlogPosting schema for blog posts
  const isBlogPost = urlPath.startsWith("/blog/") && urlPath !== "/blog/" && html.includes('itemtype="https://schema.org/BlogPosting"');
  if (isBlogPost) {
    let wordCount = 0;
    const contentMatch = html.match(/<div class="e-content"[^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch) {
      const text = stripHtml(contentMatch[1]);
      wordCount = text.split(/\s+/).filter(Boolean).length;
    }

    const blogPosting = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      "headline": cleanTitle,
      "description": description,
      "image": LOGO_URL,
      "datePublished": publishedDate,
      "dateModified": publishedDate,
      "author": {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        "name": AUTHOR_NAME,
        "url": `${SITE_URL}/`
      },
      "publisher": {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        "name": AUTHOR_NAME,
        "url": `${SITE_URL}/`,
        "logo": {
          "@type": "ImageObject",
          "url": LOGO_URL
        }
      },
      "inLanguage": "en-US",
      "keywords": tags.length > 0 ? tags.join(", ") : undefined,
      "wordCount": wordCount > 0 ? wordCount : undefined
    };

    jsonLdSnippets.push(blogPosting);
  }

  // Remove any previously injected SEO JSON-LD to prevent duplication on multiple runs
  html = html.replace(/\s*<!-- INJECTED_SEO_JSON_LD -->[\s\S]*?<!-- \/INJECTED_SEO_JSON_LD -->/g, "");

  // Inject JSON-LD before </head> if any snippets exist
  if (jsonLdSnippets.length > 0) {
    const scripts = jsonLdSnippets
      .map(s => `\t<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n\t</script>`)
      .join("\n");
    const wrapped = `\n<!-- INJECTED_SEO_JSON_LD -->\n${scripts}\n<!-- /INJECTED_SEO_JSON_LD -->\n`;
    html = html.replace("</head>", `${wrapped}</head>`);
  }

  fs.writeFileSync(file, html);
}

console.log(`SEO Enhancement & External Link Audit: Processed ${count} HTML files in public/.`);
