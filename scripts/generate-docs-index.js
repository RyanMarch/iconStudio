const fs = require('fs');
const path = require('path');

// Centralized configuration: Check Antigravity IDE environment tokens first, fallback to JSON
const configPath = path.join(__dirname, '../docs/docs-config.json');
const localConfig = fs.existsSync(configPath) ? require(configPath) : {};

const PROJECT_NAME = process.env.ANTIGRAVITY_PROJECT_NAME || localConfig.projectName || 'App';

const DOCS_DIR = path.join(__dirname, '../docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'search-index.json');

function cleanText(text) {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function generateIndex() {
    const entries = [];
    if (!fs.existsSync(DOCS_DIR)) return;

    const files = fs.readdirSync(DOCS_DIR);

    // Escape special characters in project name for regex safety
    const safeProjectName = PROJECT_NAME.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const stripProjectRegex = new RegExp(`\\s*—\\s*${safeProjectName}\\s*Docs`, 'i');

    for (const file of files) {
        const fullPath = path.join(DOCS_DIR, file);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const indexPath = path.join(fullPath, 'index.html');
        if (!fs.existsSync(indexPath)) continue;

        const html = fs.readFileSync(indexPath, 'utf-8');

        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        let title = titleMatch ? titleMatch[1] : '';
        title = title.replace(stripProjectRegex, '').replace(/\s*Naming\s*Guide/i, '').trim();

        const excerptMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
            html.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
        const excerpt = excerptMatch ? excerptMatch[1] : '';

        const categoryMatch = html.match(/<meta\s+name="category"\s+content="([^"]+)"/i) ||
            html.match(/<meta\s+content="([^"]+)"\s+name="category"/i);
        const category = categoryMatch ? categoryMatch[1] : 'Guides';

        const idMatch = html.match(/<meta\s+name="doc-id"\s+content="([^"]+)"/i) ||
            html.match(/<meta\s+content="([^"]+)"\s+name="doc-id"/i);
        const id = idMatch ? idMatch[1] : file;

        const headings = [];
        const headingRegex = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
        let match;
        while ((match = headingRegex.exec(html)) !== null) {
            const rawHeadingText = match[2];
            const cleanHeading = cleanText(rawHeadingText.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, ''));
            if (cleanHeading && cleanHeading !== 'Table of Contents' && !headings.includes(cleanHeading)) {
                headings.push(cleanHeading);
            }
        }

        const finalHeadings = headings.filter(h => h.toLowerCase() !== 'overview');

        entries.push({
            id,
            title,
            path: `${file}/`,
            category,
            headings: ['Overview', ...finalHeadings],
            excerpt,
            lastUpdated: new Date().toISOString().split('T')[0]
        });
    }

    const categoryOrder = { 'Basics': 1, 'General': 2, 'Guides': 3 };
    entries.sort((a, b) => {
        const orderA = categoryOrder[a.category] || 99;
        const orderB = categoryOrder[b.category] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2), 'utf-8');
    console.log(`Successfully generated docs search-index.json at ${OUTPUT_FILE}`);
}

generateIndex();