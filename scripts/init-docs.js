const fs = require('fs');
const path = require('path');

// 1. Safe configuration lookup from your /docs/ directory
const configPath = path.join(__dirname, '../docs/docs-config.json');
if (!fs.existsSync(configPath)) {
    console.error('Error: docs-config.json not found in /docs/. Run this after creating your config.');
    process.exit(1);
}

const config = require(configPath);
const placeholders = {
    '{{PROJECT_NAME}}': config.projectName || 'App',
    '{{PREFIX}}': config.componentPrefix || 'app',
    '{{BASE_URL}}': (config.baseUrl || 'http://localhost').replace(/\/$/, '')
};

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const TARGET_DIR = path.join(__dirname, '../docs');

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
    console.log(`Generated portable shell: docs/${fileName}`);
}

console.log('Compiling core helpdoc shell pages...');
buildTemplate('index.html');
buildTemplate('list.html');
console.log('✨ Shell setup complete!');