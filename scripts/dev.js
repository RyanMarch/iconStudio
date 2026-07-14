const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

async function dev() {
    console.log('Building initial files for development...');
    fs.mkdirSync('dist', { recursive: true });
    
    // Copy static files
    const filesToCopy = ['index.html', 'share-template.html', 'sw.js', 'robots.txt', 'sitemap.xml'];
    filesToCopy.forEach(file => {
        if (fs.existsSync(file)) fs.copyFileSync(file, path.join('dist', file));
    });
    
    if (fs.existsSync('app/index.html')) {
        fs.mkdirSync('dist/app', { recursive: true });
        fs.copyFileSync('app/index.html', 'dist/app/index.html');
    }
    
    ['support', 'assets', 'js'].forEach(dir => {
        if (fs.existsSync(dir)) {
            copyRecursiveSync(dir, path.join('dist', dir));
        }
    });

    // Watch/compile JS and CSS using esbuild context API (no minification, with sourcemaps)
    console.log('Starting esbuild watchers...');
    const jsCtx = await esbuild.context({
        entryPoints: ['script.js'],
        outfile: 'dist/script.js',
        sourcemap: true,
    });
    
    const cssCtx = await esbuild.context({
        entryPoints: ['style.css'],
        outfile: 'dist/style.css',
        sourcemap: true,
    });

    await jsCtx.watch();
    await cssCtx.watch();

    // Watch other files for copy updates
    const watchDirs = ['.', 'app', 'support', 'assets', 'js'];
    watchDirs.forEach(dir => {
        if (!fs.existsSync(dir)) return;
        fs.watch(dir, { recursive: dir !== '.' }, (eventType, filename) => {
            if (!filename) return;
            if (filename.startsWith('dist') || filename.startsWith('node_modules') || filename.startsWith('.git')) return;
            
            const srcPath = path.join(dir, filename);
            if (!fs.existsSync(srcPath)) return;
            if (srcPath === 'script.js' || srcPath === 'style.css') return;
            
            try {
                const destPath = path.join('dist', dir === '.' ? '' : dir, filename);
                copyRecursiveSync(srcPath, destPath);
                console.log(`Updated: ${srcPath} -> ${destPath}`);
            } catch (err) {
                // Ignore transient copy issues during rapid saves
            }
        });
    });

    console.log('Starting Wrangler dev server...');
    const wrangler = spawn('npx', ['wrangler', 'pages', 'dev', 'dist'], {
        stdio: 'inherit',
        shell: true
    });

    wrangler.on('close', (code) => {
        jsCtx.dispose();
        cssCtx.dispose();
        process.exit(code);
    });
}

dev().catch(err => {
    console.error(err);
    process.exit(1);
});
