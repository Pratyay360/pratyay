const CONFIG = {
    owner: 'pratyay360',
    repo: 'blogs_md',
    branch: 'master',
    targetElementId: 'dynamic-content',
    debug: false
};

function log(message, data) {
    if (CONFIG.debug) {
        console.log(`[Blog] ${message}`, data || '');
    }
}

async function fetchFileTree() {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }
    const data = await response.json();
    return data.tree
        .filter(item => item.type === 'blob' && item.path.endsWith('.md'))
        .sort((a, b) => b.path.localeCompare(a.path));
}

async function fetchFileContent(path) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}?ref=${CONFIG.branch}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }
    const data = await response.json();
    return atob(data.content.replace(/\n/g, ''));
}

function parseFrontmatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: text };
    const meta = {};
    match[1].split('\n').forEach(line => {
        const m = line.match(/^(\w+):\s*(.+)$/);
        if (m) meta[m[1]] = m[2];
    });
    return { meta, body: match[2] };
}

function extractTitle(body) {
    const m = body.match(/^#\s+(.+)$/m);
    return m ? m[1] : null;
}

function extractDate(meta, filename) {
    if (meta.date) return new Date(meta.date);
    const m = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}`);
    return new Date(0);
}

function stripFirstHeading(body) {
    return body.replace(/^#\s+.+\n?/, '').trim();
}

function getExcerpt(body, maxLen) {
    maxLen = maxLen || 200;
    const text = body
        .replace(/^#{1,6}\s+.+$/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*_~`>\[\]!#\-]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function markdownToHtml(md) {
    let html = md;

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
        return '<pre><code class="language-' + lang + '">' + escapeHtml(code.trimEnd()) + '</code></pre>';
    });

    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;" />');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    html = html.replace(/^---$/gm, '<hr>');

    html = html.replace(/^(\s*)[-*+]\s+(.+)$/gm, '$1<li>$2</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, '$1<li>$2</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, function(match) {
        if (match.includes('<ul>')) return match;
        return '<ol>' + match + '</ol>';
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/^\|(.+)\|$/gm, function(_, content) {
        const cells = content.split('|').map(function(c) { return c.trim(); });
        if (cells.every(function(c) { return /^[-:]+$/.test(c); })) return '<!--table-separator-->';
        return '<tr>' + cells.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
    });
    html = html.replace(/((?:<tr>.*<\/tr>\n?<!--table-separator-->\n?)?(?:<tr>.*<\/tr>\n?)+)/g, function(match) {
        const rows = match.replace('<!--table-separator-->\n', '').split('\n').filter(Boolean);
        if (rows.length < 1) return match;
        let table = '<table>';
        rows.forEach(function(row, i) {
            if (i === 0) {
                table += '<thead>' + row.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</thead><tbody>';
            } else {
                table += row;
            }
        });
        table += '</tbody></table>';
        return table;
    });

    html = html.replace(/\n{2,}/g, '\n');
    const lines = html.split('\n');
    const wrapped = lines.map(function(line) {
        line = line.trim();
        if (!line || line.startsWith('<')) return line;
        return '<p>' + line + '</p>';
    });
    html = wrapped.join('\n');

    return html;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatDate(date) {
    if (date.getTime() === 0) return '';
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
}

function renderPosts(container, posts) {
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<p>No blog posts found.</p>';
        return;
    }

    var listing = document.createElement('div');
    listing.className = 'blog-listing';

    posts.forEach(function(post) {
        var article = document.createElement('article');
        article.className = 'blog-post';

        var dateDiv = document.createElement('div');
        dateDiv.className = 'blog-post-date';
        dateDiv.textContent = formatDate(post.date);

        var titleEl = document.createElement('h2');
        titleEl.className = 'blog-post-title';
        var titleLink = document.createElement('a');
        titleLink.href = '#';
        titleLink.textContent = post.title;
        titleLink.addEventListener('click', function(e) {
            e.preventDefault();
            var full = article.querySelector('.blog-post-full');
            if (full) {
                full.classList.toggle('open');
                toggle.textContent = full.classList.contains('open') ? 'Collapse' : 'Read more';
            }
        });
        titleEl.appendChild(titleLink);

        var excerpt = document.createElement('p');
        excerpt.className = 'blog-post-excerpt';
        excerpt.textContent = post.excerpt;

        var fullContent = document.createElement('div');
        fullContent.className = 'blog-post-full';
        fullContent.innerHTML = markdownToHtml(post.body);

        var toggle = document.createElement('button');
        toggle.className = 'blog-post-toggle';
        toggle.textContent = 'Read more';
        toggle.addEventListener('click', function() {
            fullContent.classList.toggle('open');
            toggle.textContent = fullContent.classList.contains('open') ? 'Collapse' : 'Read more';
        });

        article.appendChild(dateDiv);
        article.appendChild(titleEl);
        article.appendChild(excerpt);
        article.appendChild(toggle);
        article.appendChild(fullContent);
        listing.appendChild(article);
    });

    container.appendChild(listing);

    if (typeof renderMathInElement === 'function') {
        try { renderMathInElement(container, { delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ]}); } catch(e) { log('Math render failed:', e); }
    }
}

async function initBlog() {
    var container = document.getElementById(CONFIG.targetElementId);
    if (!container) {
        log('No #dynamic-content found, skipping');
        return;
    }

    try {
        var files = await fetchFileTree();
        log('Found files:', files.length);

        var posts = [];
        for (var i = 0; i < files.length; i++) {
            try {
                var raw = await fetchFileContent(files[i].path);
                var parsed = parseFrontmatter(raw);
                var title = parsed.meta.title || extractTitle(parsed.body) || files[i].path.replace('.md', '').replace(/-/g, ' ');
                var date = extractDate(parsed.meta, files[i].path);
                var body = stripFirstHeading(parsed.body);
                posts.push({
                    title: title,
                    date: date,
                    excerpt: getExcerpt(body),
                    body: body,
                    path: files[i].path
                });
            } catch (err) {
                log('Error loading ' + files[i].path + ':', err.message);
            }
        }

        posts.sort(function(a, b) { return b.date - a.date; });

        renderPosts(container, posts);

    } catch (err) {
        console.error('Blog load error:', err);
        container.innerHTML = '<p class="blog-error">Failed to load blog posts. Please try again later.</p>';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlog);
} else {
    initBlog();
}
