// Dynamic blog post loader from GitHub
// Fetches markdown posts from pratyay360/blogs_md and renders them on the page

const GITHUB_OWNER = "Pratyay360";
const GITHUB_REPO = "blogs_md";
const POSTS_PATH = "content/posts";
const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main`;

// Load marked.js from CDN for markdown rendering
function loadMarked() {
  return new Promise((resolve, reject) => {
    if (window.marked) {
      resolve(window.marked);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = () => resolve(window.marked);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      frontmatter[key.trim()] = rest.join(":").trim().replace(/^["']|["']$/g, "");
    }
  }

  return { frontmatter, body: match[2] };
}

// Format date string
function formatDate(dateStr) {
  if (!dateStr || dateStr === "s") return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Fetch all markdown posts from GitHub
async function fetchPosts() {
  try {
    const response = await fetch(`${API_BASE}/contents/${POSTS_PATH}`);

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      console.error("Unexpected response format:", files);
      return [];
    }

    const markdownFiles = files.filter(
      (file) => file.type === "file" && file.name.endsWith(".md")
    );

    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        try {
          const response = await fetch(file.download_url);
          if (!response.ok) return null;
          const raw = await response.text();
          const { frontmatter, body } = parseFrontmatter(raw);

          return {
            title: frontmatter.title || file.name.replace(".md", ""),
            description: frontmatter.description || "",
            date: frontmatter.date || "",
            tags: frontmatter.tags ? frontmatter.tags.split(",").map((t) => t.trim()) : [],
            draft: frontmatter.draft === "true" || frontmatter.draft === "a",
            filename: file.name,
            url: file.html_url,
            rawUrl: file.download_url,
            body,
          };
        } catch (err) {
          console.error(`Failed to fetch ${file.name}:`, err);
          return null;
        }
      })
    );

    return posts
      .filter((p) => p !== null && !p.draft)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
}

// Render posts into a container
async function renderPosts(containerId = "dynamic-posts") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found`);
    return;
  }

  container.innerHTML = '<p class="fgshade3">Loading posts...</p>';

  try {
    const marked = await loadMarked();
    const posts = await fetchPosts();

    if (posts.length === 0) {
      container.innerHTML = '<p class="fgshade3">No posts found.</p>';
      return;
    }

    container.innerHTML = "";

    for (const post of posts) {
      const article = document.createElement("article");
      article.className = "post-item";
      article.style.cssText =
        "margin-bottom: 2em; padding-bottom: 1.5em; border-bottom: 1px solid #333;";

      const header = document.createElement("header");

      if (post.date) {
        const time = document.createElement("time");
        time.className = "fgshade3 font-mono ft-size-s";
        time.textContent = formatDate(post.date);
        header.appendChild(time);
      }

      const title = document.createElement("h2");
      title.style.cssText = "margin: 0.3em 0;";
      const link = document.createElement("a");
      link.href = post.url;
      link.target = "_blank";
      link.textContent = post.title;
      link.className = "wt-500";
      title.appendChild(link);
      header.appendChild(title);

      if (post.description) {
        const desc = document.createElement("p");
        desc.className = "fgshade2 ft-size-s";
        desc.textContent = post.description;
        header.appendChild(desc);
      }

      article.appendChild(header);

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "post-body ft-size-s";
      bodyDiv.innerHTML = marked.parse(post.body);
      article.appendChild(bodyDiv);

      if (post.tags && post.tags.length > 0) {
        const tagsP = document.createElement("p");
        tagsP.className = "ft-size-xs fgshade3";
        tagsP.textContent = "tags: " + post.tags.join(", ");
        article.appendChild(tagsP);
      }

      container.appendChild(article);
    }
  } catch (error) {
    console.error("Failed to render posts:", error);
    container.innerHTML = '<p class="fgshade3">Failed to load posts.</p>';
  }
}

// Auto-run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => renderPosts());
} else {
  renderPosts();
}

export { fetchPosts, renderPosts };
