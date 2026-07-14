const fs = require('fs');
const path = require('path');

// 1. Safe configuration lookup from your /support/ directory
const configPath = path.join(__dirname, '../support/docs-config.json');
if (!fs.existsSync(configPath)) {
    console.error('Error: docs-config.json not found in /support/. Run this after creating your config.');
    process.exit(1);
}

const config = require(configPath);
const defaultFontsUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
const fontsConfig = config.googleFontsUrl !== undefined ? config.googleFontsUrl : true;
let fontsHtml = '';
if (fontsConfig) {
    const url = typeof fontsConfig === 'string' ? fontsConfig : defaultFontsUrl;
    fontsHtml = `<!-- Preconnect Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${url}" rel="stylesheet">`;
}

const placeholders = {
    '{{PROJECT_NAME}}': config.projectName || 'App',
    '{{PREFIX}}': config.componentPrefix || 'app',
    '{{BASE_URL}}': (config.baseUrl || 'http://localhost').replace(/\/$/, ''),
    '{{FAVICON_DIR}}': config.faviconDir || './assets/favicon',
    '{{FONTS_LOAD_LINK}}': fontsHtml
};

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const TARGET_DIR = path.join(__dirname, '../support');

function buildTemplate(fileName) {
    const srcPath = path.join(TEMPLATE_DIR, fileName);
    const destPath = path.join(TARGET_DIR, fileName);

    if (!fs.existsSync(srcPath)) return;

    let content = fs.readFileSync(srcPath, 'utf-8');

    // Swap out all template placeholders dynamically
    Object.keys(placeholders).forEach(token => {
        const regex = new RegExp(token, 'g');
        content = content.replace(regex, placeholders[token]);
    });

    fs.writeFileSync(destPath, content, 'utf-8');
    console.log(`Generated portable shell: support/${fileName}`);
}

console.log('Compiling core helpdoc shell pages...');
buildTemplate('index.html');
buildTemplate('list.html');
console.log('✨ Shell setup complete!');
