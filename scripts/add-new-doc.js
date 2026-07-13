const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Centralized configuration: Check Antigravity IDE environment tokens first, fallback to JSON
const configPath = path.join(__dirname, '../docs/docs-config.json');
const localConfig = fs.existsSync(configPath) ? require(configPath) : {};

const PROJECT_NAME = process.env.ANTIGRAVITY_PROJECT_NAME || localConfig.projectName || 'App';
const PREFIX = process.env.ANTIGRAVITY_COMP_PREFIX || localConfig.componentPrefix || 'app';
const BASE_URL = process.env.ANTIGRAVITY_BASE_URL || localConfig.baseUrl || 'http://localhost';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const DOCS_DIR = path.join(__dirname, '../docs');

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function main() {
    console.log('\n====================================');
    console.log(`    Create a New ${PROJECT_NAME} Page  `);
    console.log('====================================\n');

    let title = '';
    while (!title.trim()) {
        title = await askQuestion('Document Title (e.g. Template Management): ');
    }

    const folderSlug = slugify(title);
    const targetDir = path.join(DOCS_DIR, folderSlug);

    if (fs.existsSync(targetDir)) {
        console.error(`\nError: Directory already exists at docs/${folderSlug}`);
        rl.close();
        return;
    }

    const category = (await askQuestion('Category (Basics / General / [Guides]): ')).trim() || 'Guides';
    const description = (await askQuestion('Description / Meta Description: ')).trim() || 'No description provided.';

    // HTML template content
    const htmlContent = /*html*/ `<!DOCTYPE html>
        <html lang="en" translate="no" data-theme-style="tech">

        <head>
            <meta charset="UTF-8">
            <link rel="icon" type="image/png" href="/assets/favicon/favicon-96x96.png?v=2" sizes="96x96" />
            <link rel="icon" type="image/svg+xml" href="/assets/favicon/favicon.svg?v=2" />
            <link rel="shortcut icon" href="/assets/favicon/favicon.ico?v=2" />
            <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png?v=2" />
            <meta name="apple-mobile-web-app-title" content="${PROJECT_NAME}" />
            <link rel="manifest" href="/assets/favicon/site.webmanifest?v=2" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <meta name="google" content="notranslate">
            <script>
                (function () {
                    const savedTheme = localStorage.getItem('theme') || 'light';
                    if (savedTheme === 'system') {
                        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                        document.documentElement.setAttribute('data-theme-mode', 'system');
                    } else {
                        document.documentElement.setAttribute('data-theme', savedTheme);
                        document.documentElement.removeAttribute('data-theme-mode');
                    }
                })();
            </script>

            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

            <link rel="stylesheet" href="../../style.css">

            <title>${title} — ${PROJECT_NAME} Docs</title>
            <meta name="description" content="${description.replace(/"/g, '&quot;')}">
            <meta name="category" content="${category}">
            <meta name="doc-id" content="${folderSlug}">
            <link rel="canonical" href="${BASE_URL.replace(/\/$/, '')}/docs/${folderSlug}/">

            <link rel="stylesheet" href="../style.css">
            <script src="../docs-components.js" type="module"></script>
        </head>

        <body class="user-docs-page">
            <div class="docs-app-viewport">
                <div id="mobile-overlay" class="mobile-overlay"></div>

                <main class="docs-layout-container">
                    <docs-sidebar></docs-sidebar>

                    <div class="docs-content-column">
                        <docs-header></docs-header>

                        <docs-anchor-helper>
                            <section class="docs-article-body" aria-label="${title} Guide Content">

                            <article id="overview" class="doc-section">
                                <h1>${title} Guide</h1>
                                <p class="lead">
                                    ${description}
                                </p>
                                <p>
                                    Start writing your new documentation content here.
                                </p>
                            </article>

                            <nav class="inline-toc" aria-label="Table of contents">
                                <div class="toc-title">Table of Contents</div>
                                <ul class="toc-list">
                                    <li><a href="#section-1">1. First Section</a></li>
                                    <li><a href="#section-2">2. Second Section</a></li>
                                </ul>
                            </nav>

                            <hr class="section-divider">

                            <article id="section-1" class="doc-section">
                                <h2>1. First Section</h2>
                                <p>
                                    Add details about the first sub-section here.
                                </p>
                            </article>

                            <hr class="section-divider">

                            <article id="section-2" class="doc-section">
                                <h2>2. Second Section</h2>
                                <p>
                                    Add details about the second sub-section here.
                                </p>
                            </article>

                            </section>
                        </docs-anchor-helper>
                    </div>
                </main>

                <${PREFIX}-footer></${PREFIX}-footer>

                <div id="lightbox-modal" class="lightbox-modal" aria-hidden="true" role="dialog" aria-label="Image Viewer">
                    <button class="lightbox-close" aria-label="Close image viewer">&times;</button>
                    <img class="lightbox-content" id="lightbox-img" alt="">
                    <div class="lightbox-caption" id="lightbox-caption"></div>
                </div>
            </div>
        </body>

        </html>
    `;

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf-8');

    console.log(`\nCreated docs folder: docs/${folderSlug}`);
    console.log(`Created docs page:   docs/${folderSlug}/index.html`);

    try {
        console.log('Rebuilding search index...');
        execSync('node scripts/generate-docs-index.js', { stdio: 'inherit' });
    } catch (err) {
        console.error('Failed to rebuild search index:', err);
    }

    rl.close();
}

main().catch(err => {
    console.error(err);
    rl.close();
});