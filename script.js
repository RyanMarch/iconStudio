const colors = [
    '#3b82f6', // Blue
    '#9333ea', // Purple
    '#ef4444', // Red
    '#f97316', // Orange
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
];

const APP_CONFIG = {
    shape: { url: 'shape', default: 'circle', type: 'string' },
    color: { url: 'color', default: '#3b82f6', type: 'color' },
    icon: { url: 'icon', default: 'users', type: 'string' },
    baseSize: { url: 'bsize', default: 80, type: 'int' },
    badgeSize: { url: 'size', default: 40, type: 'int' },
    innerScale: { url: 'scale', default: 70, type: 'int' },
    rotation: { url: 'rot', default: 0, type: 'int' },
    badgePosition: { url: 'pos', default: 'bottom-right', type: 'string' },
    showShadows: { url: 'shadows', default: true, type: 'bool' },
    baseShape: { url: 'bshape', default: 'squircle', type: 'string' },
    baseColor: { url: 'bcolor', default: '#3b82f6', type: 'color' },
    baseColor2: { url: 'bcolor2', default: '#1D0945', type: 'color' },
    gradientType: { url: 'gt', default: 'linear', type: 'string' },
    gradientAngle: { url: 'ga', default: 135, type: 'int' },
    baseText: { url: 'bt', default: 'YOUR TEXT', type: 'string' },
    baseTextColor: { url: 'btc', default: '#ffffff', type: 'color' },
    baseFrame: { url: 'bf', default: 'none', type: 'string' },
    baseNoise: { url: 'bn', default: false, type: 'bool' },
    baseGlow: { url: 'bglow', default: false, type: 'bool' },
    baseVignette: { url: 'bv', default: false, type: 'bool' },
    baseDeepFried: { url: 'bdf', default: false, type: 'bool' },
    baseCRT: { url: 'bcrt', default: false, type: 'bool' },
    baseMono: { url: 'bm', default: false, type: 'bool' },
    baseZoom: { url: 'bz', default: 100, type: 'int' },
};

// Initialize state from config defaults
const state = Object.keys(APP_CONFIG).reduce((acc, key) => {
    acc[key] = APP_CONFIG[key].default;
    return acc;
}, {
    customBaseIcon: localStorage.getItem('iconStudio_baseIcon') || null
});

let deferredPrompt = null;
let desktopPromptType = null; // 'chromium' or 'safari'
let suppressHaptic = false;

function syncStateToURL() {
    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);

    const setOrDelete = (urlKey, val, def) => {
        let displayVal = val;
        let compareDef = def;

        // Handle color hex stripping for cleaner URLs
        if (urlKey === 'color' || urlKey === 'bcolor' || urlKey === 'bcolor2' || urlKey === 'btc') {
            if (typeof val === 'string' && val.startsWith('#')) displayVal = val.slice(1);
            if (typeof def === 'string' && def.startsWith('#')) compareDef = def.slice(1);
        }

        if (displayVal !== undefined && displayVal !== null && String(displayVal) !== String(compareDef)) {
            params.set(urlKey, displayVal);
        } else {
            params.delete(urlKey);
        }
    };

    // Sync all standard config properties
    Object.keys(APP_CONFIG).forEach(key => {
        const config = APP_CONFIG[key];
        setOrDelete(config.url, state[key], config.default);
    });

    if (document.body.classList.contains('screenshot-mode')) {
        params.set('mode', 'screenshot');
    } else {
        params.delete('mode');
    }

    if (state.customBaseIcon && state.customBaseIcon.startsWith('http')) {
        let displayUrl = state.customBaseIcon;
        const prefix = 'https://res.cloudinary.com/rm20abcd26/image/upload/';
        if (displayUrl.startsWith(prefix)) {
            displayUrl = 'cld:' + displayUrl.replace(prefix, '');
        }
        params.set('img', displayUrl);
    } else {
        params.delete('img');
    }

    const shareUrl = `${window.location.origin}/s/?${params.toString()}`;
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');

    // Share button is now always visible via HTML

    if (window.location.search !== (newSearch ? '?' + newSearch : '')) {
        window.history.replaceState({}, '', newUrl);
    }
}

function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);

    Object.keys(APP_CONFIG).forEach(key => {
        const config = APP_CONFIG[key];
        if (params.has(config.url)) {
            const val = params.get(config.url);
            if (config.type === 'int') {
                state[key] = parseInt(val);
            } else if (config.type === 'bool') {
                state[key] = val === 'true';
            } else if (config.type === 'color') {
                state[key] = val.startsWith('#') ? val : '#' + val;
            } else {
                state[key] = val;
            }
        }
    });

    if (params.has('img')) {
        let val = params.get('img');
        if (val.startsWith('cld:')) {
            val = 'https://res.cloudinary.com/rm20abcd26/image/upload/' + val.replace('cld:', '');
        }
        state.customBaseIcon = val;
    }

    if (params.get('mode') === 'screenshot') {
        document.body.classList.add('screenshot-mode');
    }
}

function init() {
    suppressHaptic = true; // Suppress haptics during initial render/restore

    // Detect Standalone Mode (already added to home screen / PWA)
    const isStandalone = window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
        document.body.classList.add('standalone-mode');
    }

    // Detect touch-primary or touch-emulated devices (like iPad, mobile)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0) {
        document.body.classList.add('touch-device');
    }

    loadStateFromURL();
    // Render colors
    const colorContainer = document.getElementById('color-presets');
    colors.forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = c;
        swatch.onclick = () => setColor(c);
        if (c === state.color) swatch.classList.add('active');
        colorContainer.appendChild(swatch);
    });

    // Initialize visual state
    setShape(state.shape);
    setColor(state.color);
    setIcon(state.icon);
    setBaseSize(state.baseSize);
    setBadgeSize(state.badgeSize);
    setInnerScale(state.innerScale);
    setBadgeRotation(state.rotation);
    setBadgePosition(state.badgePosition);
    toggleShadows(state.showShadows);
    setBaseShape(state.baseShape);
    setBaseColor1(state.baseColor);
    setBaseColor2(state.baseColor2);
    setBaseGradientType(state.gradientType);
    setBaseGradientAngle(state.gradientAngle);
    setBaseText(state.baseText);
    setBaseTextColor(state.baseTextColor);
    setBaseFrame(state.baseFrame);
    setBaseImageZoom(state.baseZoom);
    applyBaseEffects();

    if (state.customBaseIcon) {
        // Clear base text if it's the default "YOUR TEXT" when an image is present
        if (state.baseText === APP_CONFIG.baseText.default) {
            setBaseText('');
        }
        document.getElementById('base-img').src = state.customBaseIcon;
        document.getElementById('remove-base-icon').style.display = 'flex';
    }
    updateBaseControls();

    lucide.createIcons();

    // Disable right-click on the capture area
    document.getElementById('capture-area').addEventListener('contextmenu', (e) => e.preventDefault());

    // Setup dynamic scaling
    window.addEventListener('resize', updateAppScale);
    updateAppScale();

    // Subtle feedback for character limit
    const baseTextInput = document.getElementById('base-text-input');
    if (baseTextInput) {
        baseTextInput.addEventListener('keydown', (e) => {
            // If at limit and typing a normal character (length 1)
            if (baseTextInput.value.length >= 30 && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                baseTextInput.classList.remove('shake');
                void baseTextInput.offsetWidth; // Trigger reflow
                baseTextInput.classList.add('shake');
            }
        });
    }

    // Setup Drag and Drop + Paste
    setupDragAndDrop();
    setupPaste();

    // Sticky Mobile Preview logic
    setupStickyMobilePreview();

    // Set canonical URL to the clean root path so that macOS/iOS Safari "Add to Dock/Home Screen" uses a parameter-free URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;

    // PWA & iOS Custom Installer Prompts initialization
    registerServiceWorker();
    initIosPwaPrompt();
    initDesktopPwaPrompt();

    suppressHaptic = false; // Restore haptics after load
}

function setupStickyMobilePreview() {
    const canvas = document.querySelector('.icon-canvas-wrapper');
    const header = document.querySelector('.preview-header');
    const actions = document.querySelector('.preview-actions');
    if (!canvas) return;

    // Use IntersectionObserver to toggle a class when the element becomes stuck
    const observer = new IntersectionObserver(
        ([e]) => {
            e.target.classList.toggle('is-stuck', e.intersectionRatio < 1);
        },
        {
            threshold: [1],
            rootMargin: '-80px 0px 0px 0px' // Matches the -5rem top in CSS
        }
    );
    const previewSection = document.querySelector('.preview-section');
    if (previewSection) observer.observe(previewSection);

    const preview = previewSection;
    let scrollUpdateScheduled = false;

    const updateStickyState = () => {
        const isLandscapeMobile = window.innerWidth > window.innerHeight && window.innerHeight < 500;
        const isTablet = window.innerWidth >= 900 && window.innerWidth <= 1150;
        if (window.innerWidth > 1150 || isLandscapeMobile || isTablet || document.body.classList.contains('screenshot-mode')) {
            // Reset variables if not in mobile/normal mode or if in landscape mobile
            document.documentElement.style.removeProperty('--sticky-scale');
            document.documentElement.style.removeProperty('--sticky-opacity');
            document.documentElement.style.removeProperty('--sticky-pointer');
            document.documentElement.style.removeProperty('--sticky-margin');
            document.documentElement.style.removeProperty('--sticky-actions-h');
            document.documentElement.style.removeProperty('--sticky-actions-m');

            if (preview) {
                preview.classList.remove('is-stuck');
                preview.style.paddingTop = '';
                preview.style.paddingBottom = '';
            }
            return;
        }

        const scrollY = window.scrollY;
        const startScroll = 50;
        const activeScroll = Math.max(0, scrollY - startScroll);
        const maxScroll = 120;
        const factor = Math.min(1, activeScroll / maxScroll);

        const scale = 1 - (factor * 0.4);
        const opacity = 1 - (factor * 2.5); // Fade out actions very quickly
        const actionsH = factor > 0.6 ? 0 : 200 * (1 - factor * 1.6);
        const actionsM = factor > 0.6 ? 0 : 0.5 * (1 - factor * 1.6);
        const margin = - (factor * 40);

        document.documentElement.style.setProperty('--sticky-scale', scale);
        document.documentElement.style.setProperty('--sticky-opacity', Math.max(0, opacity));
        document.documentElement.style.setProperty('--sticky-pointer', opacity < 0.1 ? 'none' : 'all');
        document.documentElement.style.setProperty('--sticky-margin', `${margin}%`);
        document.documentElement.style.setProperty('--sticky-actions-h', `${actionsH}px`);
        document.documentElement.style.setProperty('--sticky-actions-m', `${actionsM}rem`);

        const paddingBottom = 2.25 - (factor * 1.75);
        if (preview) {
            preview.style.paddingBottom = `${paddingBottom}rem`;
        }
    };

    window.addEventListener('scroll', () => {
        if (scrollUpdateScheduled) return;
        scrollUpdateScheduled = true;
        requestAnimationFrame(() => {
            scrollUpdateScheduled = false;
            updateStickyState();
        });
    }, { passive: true });
}

function updateAppScale() {
    const container = document.getElementById('tool-container');
    if (!container || document.body.classList.contains('screenshot-mode')) {
        document.documentElement.style.setProperty('--app-scale', '1');
        return;
    }

    const isMobile = window.innerWidth <= 1150;

    if (isMobile) {
        if (window.innerWidth < 450) {
            const scale = (window.innerWidth - 20) / 420;
            document.documentElement.style.setProperty('--app-scale', Math.max(0.85, Math.min(1, scale)));
        } else {
            document.documentElement.style.setProperty('--app-scale', '1');
        }
        return;
    }

    // Full-screen desktop scaling: focuses on content density with 600px canvas
    const targetWidth = 1400;
    let scale = window.innerWidth / targetWidth;

    // Clamp scale: keep UI comfortable and readable
    scale = Math.min(Math.max(scale, 0.75), 1.25);

    document.documentElement.style.setProperty('--app-scale', scale);

    // Ensure text and badges scale correctly on resize now that we use px-based font sizing
    updateBasePreview();
    if (state.icon && !document.querySelector('#badge-icon-target svg')) {
        setIcon(state.icon, false);
    }
}

let ALL_ICONS = [
    'users', 'user', 'settings', 'mail', 'bell', 'search', 'home', 'star', 'heart', 'check', 'x', 'plus', 'minus',
    'upload-cloud', 'download', 'maximize', 'share-2', 'external-link', 'copy', 'trash-2', 'upload', 'sliders',
    'chevron-down', 'refresh-cw', 'info', 'shield', 'camera', 'image', 'lock', 'key', 'edit-3', 'trash', 'save',
    'download-cloud', 'share', 'link', 'calendar', 'clock', 'battery', 'wifi', 'globe', 'headphones', 'megaphone',
    'play', 'pause', 'stop', 'film', 'music', 'video', 'map-pin', 'flag', 'bookmark', 'book-open', 'shopping-cart',
    'credit-card', 'gift', 'anchor', 'rocket', 'sun', 'moon', 'cloud', 'leaf', 'fire', 'thumbs-up', 'thumbs-down',
    'battery-charging', 'battery', 'download-cloud', 'upload-cloud', 'brush', 'palette', 'layers'
];

async function fetchIconList() {
    // Local icon list is already populated to avoid unnecessary network dependencies.
    return;
}

function handleIconInput(val) {
    setIcon(val, false);
    filterSuggestions(val);
}

function showSuggestions() {
    const dropdown = document.getElementById('icon-dropdown');
    dropdown.classList.add('active');
    const input = document.getElementById('icon-input');
    if (input) input.setAttribute('aria-expanded', 'true');
    filterSuggestions(input.value);
}

let selectedIndex = -1;

function filterSuggestions(val) {
    const dropdown = document.getElementById('icon-dropdown');
    const query = val.toLowerCase();

    const filtered = ALL_ICONS
        .filter(icon => icon.includes(query))
        .sort((a, b) => {
            // 1. Exact match first
            if (a === query) return -1;
            if (b === query) return 1;
            // 2. Starts with query second
            const aStarts = a.startsWith(query);
            const bStarts = b.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;
            // 3. Alphabetical otherwise
            return a.localeCompare(b);
        })
        .slice(0, 48);

    if (filtered.length === 0) {
        dropdown.classList.remove('active');
        const input = document.getElementById('icon-input');
        if (input) input.setAttribute('aria-expanded', 'false');
        selectedIndex = -1;
        return;
    }

    dropdown.innerHTML = filtered.map((icon, idx) => `
        <div class="dropdown-item ${idx === selectedIndex ? 'selected' : ''}" onclick="setIcon('${icon}')" title="${icon}" data-index="${idx}">
            <i data-lucide="${icon}"></i>
        </div>
    `).join('');

    dropdown.classList.add('active');
    const input = document.getElementById('icon-input');
    if (input) input.setAttribute('aria-expanded', 'true');
    lucide.createIcons();
}
// Auto-highlight text on focus and tap/click
const iconInputEl = document.getElementById('icon-input');
if (iconInputEl) {
    let preventClearSelection = false;

    iconInputEl.addEventListener('focus', function () {
        showSuggestions();
        preventClearSelection = true;
        setTimeout(() => {
            this.select();
        }, 0);
    });

    iconInputEl.addEventListener('click', function () {
        showSuggestions();
    });

    iconInputEl.addEventListener('mouseup', function (e) {
        if (preventClearSelection) {
            e.preventDefault();
            preventClearSelection = false;
        }
    });

    iconInputEl.addEventListener('touchend', function (e) {
        if (preventClearSelection) {
            e.preventDefault();
            preventClearSelection = false;
        }
    });
}

// Keyboard navigation
document.getElementById('icon-input').addEventListener('keydown', (e) => {
    const dropdown = document.getElementById('icon-dropdown');
    const items = dropdown.querySelectorAll('.dropdown-item');

    if (!dropdown.classList.contains('active') || items.length === 0) {
        if (e.key === 'ArrowDown') showSuggestions();
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelection(items);
    } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
            e.preventDefault();
            const iconName = items[selectedIndex].title;
            setIcon(iconName);
        }
    } else if (e.key === 'Escape') {
        dropdown.classList.remove('active');
        e.target.setAttribute('aria-expanded', 'false');
    }
});

function updateSelection(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === selectedIndex);
        if (idx === selectedIndex) {
            item.scrollIntoView({ block: 'nearest' });
        }
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.icon-picker-wrapper')) {
        const dropdown = document.getElementById('icon-dropdown');
        if (dropdown) dropdown.classList.remove('active');
        const input = document.getElementById('icon-input');
        if (input) input.setAttribute('aria-expanded', 'false');
    }
});

function updateRemoveButtonVisibility() {
    const btn = document.getElementById('remove-base-icon');
    if (state.customBaseIcon) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

function updateBaseControls() {
    const hasCustomIcon = !!state.customBaseIcon;
    const gradientControls = document.getElementById('base-gradient-controls');
    const imageControls = document.getElementById('base-image-controls');

    if (gradientControls) gradientControls.classList.toggle('hidden', hasCustomIcon);
    if (imageControls) imageControls.classList.toggle('hidden', !hasCustomIcon);
}

function setBaseImageZoom(v) {
    state.baseZoom = v;
    const valEl = document.getElementById('base-zoom-val');
    const input = document.getElementById('base-zoom-input');
    const img = document.getElementById('base-img');

    if (valEl) valEl.innerText = v;
    if (input) input.value = v;
    if (img) {
        img.style.transform = `scale(${v / 100})`;
    }
    syncStateToURL();
}

function setShape(s) {
    triggerHaptic();
    state.shape = s;
    const shapeEl = document.getElementById('badge-shape');
    const iconEl = document.getElementById('badge-icon-target');

    shapeEl.className = 'badge-shape ' + s;

    // Special scaling for diamond to fit icons better
    iconEl.classList.toggle('diamond-scaling', s === 'diamond');

    document.querySelectorAll('.shape-btn').forEach(btn => {
        if (btn.dataset.shape) btn.classList.toggle('active', btn.dataset.shape === s);
    });
    syncStateToURL();
}

function setBaseShape(s) {
    triggerHaptic();
    state.baseShape = s;
    const shapes = ['square', 'squircle', 'roundrect', 'circle'];
    const elements = [
        document.getElementById('base-img'),
        document.getElementById('base-bg'),
        document.getElementById('base-frame'),
        document.getElementById('base-effects'),
        document.getElementById('base-overlay')
    ];

    elements.forEach(el => {
        if (!el) return;
        shapes.forEach(sh => el.classList.remove(sh));
        el.classList.add(s);
    });

    document.querySelectorAll('[data-base-shape]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.baseShape === s);
    });
    syncStateToURL();
}

function setBaseFrame(f) {
    triggerHaptic();
    state.baseFrame = f;
    const frame = document.getElementById('base-frame');
    const bg = document.getElementById('base-bg');

    if (frame) {
        frame.className = `base-frame ${f} ${state.baseShape}`;
        frame.style.display = f === 'none' ? 'none' : 'block';
    }

    if (bg) {
        // Remove existing frame classes
        bg.classList.forEach(cls => {
            if (cls.startsWith('frame-')) bg.classList.remove(cls);
        });
        if (f !== 'none') bg.classList.add('frame-' + f);
    }

    document.querySelectorAll('[data-base-frame]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.baseFrame === f);
    });

    updateBaseBackground();
    syncStateToURL();
}

function toggleBaseEffect(eff) {
    triggerHaptic();
    if (eff === 'noise') state.baseNoise = !state.baseNoise;
    if (eff === 'glow') state.baseGlow = !state.baseGlow;
    if (eff === 'vignette') state.baseVignette = !state.baseVignette;
    if (eff === 'deep-fried') state.baseDeepFried = !state.baseDeepFried;
    if (eff === 'crt') state.baseCRT = !state.baseCRT;
    if (eff === 'mono') state.baseMono = !state.baseMono;

    applyBaseEffects();
    syncStateToURL();
}

function applyBaseEffects() {
    const base = document.getElementById('base-bg');
    const effects = document.getElementById('base-effects');
    const overlay = document.getElementById('base-overlay');

    if (effects) {
        effects.classList.toggle('effect-glow', state.baseGlow);
        effects.classList.toggle('effect-vignette', state.baseVignette);
        effects.classList.toggle('effect-crt', state.baseCRT);
    }

    if (overlay) {
        overlay.classList.toggle('noise', state.baseNoise);
    }

    if (base) {
        base.classList.toggle('effect-deep-fried', state.baseDeepFried);
        base.classList.toggle('effect-monochrome', state.baseMono);
    }

    // Update button active states
    document.getElementById('effect-noise').classList.toggle('active', state.baseNoise);
    document.getElementById('effect-glow').classList.toggle('active', state.baseGlow);
    document.getElementById('effect-vignette').classList.toggle('active', state.baseVignette);
    document.getElementById('effect-deep-fried').classList.toggle('active', state.baseDeepFried);
    document.getElementById('effect-crt').classList.toggle('active', state.baseCRT);
    document.getElementById('effect-mono').classList.toggle('active', state.baseMono);
}

function setBaseColor1(c) {
    state.baseColor = c;
    const picker = document.getElementById('base-bg-color-1');
    if (picker) {
        picker.value = c;
        picker.parentElement.style.setProperty('--swatch-color', c);
    }
    updateBaseBackground();
    updateBaseIconFilter();
    syncStateToURL();
}

function setBaseColor2(c) {
    state.baseColor2 = c;
    const picker = document.getElementById('base-bg-color-2');
    if (picker) {
        picker.value = c;
        picker.parentElement.style.setProperty('--swatch-color', c);
    }
    updateBaseBackground();
    syncStateToURL();
}

function setBaseGradientType(t) {
    triggerHaptic();
    state.gradientType = t;

    // Update active state for buttons
    document.querySelectorAll('[data-grad-type]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gradType === t);
    });

    const angleGroup = document.getElementById('base-angle-group');
    if (angleGroup) {
        angleGroup.classList.toggle('hidden', !(t === 'linear' || t === 'conic'));
    }

    updateBaseBackground();
    syncStateToURL();
}

function setBaseGradientAngle(a) {
    state.gradientAngle = a;
    const val = document.getElementById('base-angle-val');
    const input = document.getElementById('base-angle-input');
    if (val) val.innerText = a;
    if (input) input.value = a;

    updateBaseBackground();
    syncStateToURL();
}

function setBaseText(val) {
    state.baseText = val;
    const input = document.getElementById('base-text-input');
    if (input) input.value = val;

    const countEl = document.getElementById('base-text-count');
    if (countEl) {
        countEl.innerText = `${val.length}/30`;
        countEl.classList.toggle('at-limit', val.length >= 30);
    }

    updateBasePreview();
    syncStateToURL();
}

function setBaseTextColor(color) {
    state.baseTextColor = color;
    const picker = document.getElementById('base-text-color');
    const ui = document.getElementById('base-text-color-ui');
    if (picker) picker.value = color;
    if (ui) ui.style.setProperty('--swatch-color', color);
    updateBasePreview();
    syncStateToURL();
}

function calculateDynamicFontSize(text, canvasWidth) {
    const textLength = text.length;
    const words = text.split(/\s+/);
    const longestWordLength = Math.max(...words.map(w => w.length));

    // charFactor determines how "tightly" we fit the characters.
    const charFactor = 0.85;

    // Calculate font size as a percentage of the container width
    // A base of 20 is more balanced for icon design than the previous 25
    let fontSizeBase = Math.min(20, 20 / (longestWordLength * charFactor / 4));
    const maxTotalFontSize = (20 * 3.5) / (textLength * charFactor / 4);
    fontSizeBase = Math.min(fontSizeBase, maxTotalFontSize);

    // Scale by the user's baseSize setting
    fontSizeBase = fontSizeBase * (state.baseSize / 80);

    // Minimum legible size
    if (fontSizeBase < 4) fontSizeBase = 4;

    // Convert percentage to actual pixels
    return (fontSizeBase * canvasWidth) / 100;
}

function updateBasePreview() {
    const imgEl = document.getElementById('base-img');
    const textEl = document.getElementById('base-text');

    const hasCustomIcon = !!state.customBaseIcon;
    const hasText = state.baseText && state.baseText.trim() !== '';
    const isDefaultText = state.baseText === 'YOUR TEXT';

    if (hasCustomIcon) {
        imgEl.style.display = 'block';
        if (imgEl.src !== state.customBaseIcon) {
            imgEl.src = state.customBaseIcon;
        }
    } else {
        imgEl.style.display = 'none';
    }

    if (hasText && !(hasCustomIcon && isDefaultText)) {
        textEl.style.display = 'flex';

        const textToShow = state.baseText;
        textEl.innerText = textToShow;
        textEl.style.color = state.baseTextColor;

        // Font size scaling: Now using pixel calculation for stability across browsers/zoom levels
        const canvas = document.getElementById('icon-canvas');
        const canvasWidth = canvas ? canvas.offsetWidth : 320;
        const fontSizePx = calculateDynamicFontSize(textToShow, canvasWidth);

        textEl.style.fontSize = fontSizePx + 'px';
        textEl.style.lineHeight = '0.95';

        const shadow = state.showShadows ? '0 10px 15px rgba(0,0,0,0.3)' : 'none';
        textEl.style.textShadow = shadow;
    } else {
        textEl.style.display = 'none';
    }
}

function updateBaseBackground() {
    const bg = document.getElementById('base-bg');
    if (!bg) return;

    // If there's a custom icon, hide the background gradient
    if (state.customBaseIcon) {
        bg.style.background = 'transparent';
        return;
    }

    let color1 = state.baseColor;
    let color2 = state.baseColor2;

    // Apply transparency for glass mode
    if (state.baseFrame === 'glass') {
        // Convert hex to 40% opacity hex
        color1 = color1 + '66';
        color2 = color2 + '66';
    }

    let gradient;
    if (state.gradientType === 'linear') {
        gradient = `linear-gradient(${state.gradientAngle}deg, ${color1}, ${color2})`;
    } else if (state.gradientType === 'radial') {
        gradient = `radial-gradient(circle, ${color1}, ${color2})`;
    } else if (state.gradientType === 'conic') {
        gradient = `conic-gradient(from ${state.gradientAngle}deg, ${color1}, ${color2}, ${color1})`;
    } else if (state.gradientType === 'mesh') {
        gradient = `
            radial-gradient(at 0% 0%, ${color1} 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${color2} 0px, transparent 50%),
            radial-gradient(at 100% 100%, ${color1} 0px, transparent 50%),
            radial-gradient(at 0% 100%, ${color2} 0px, transparent 50%),
            ${color1}
        `.trim().replace(/\n\s+/g, ' ');
    }

    bg.style.background = gradient;
}


function updateBaseIconFilter() {
    const img = document.getElementById('base-img');
    if (!img) return;

    const shadow = state.showShadows ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' : '';

    // If it's the placeholder, we check contrast for the "YOUR ICON" text
    if (!state.customBaseIcon) {
        const isLightBg = getContrastColor(state.baseColor) === '#0f172a';
        const brightness = isLightBg ? 'brightness(0.05)' : 'brightness(1)';
        img.style.filter = `${shadow} ${brightness}`.trim() || 'none';
    } else {
        img.style.filter = shadow || 'none';
    }
}

// Helper to generate a unique hash for a file (Content-Addressable Storage)
async function getFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to resize image if it exceeds max dimensions
async function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        // Safety timeout (10 seconds)
        const timeout = setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image processing timed out.'));
        }, 10000);

        img.onload = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(objectUrl);
            let width = img.width;
            let height = img.height;

            if (width <= maxSize && height <= maxSize) {
                resolve(file); // No resizing needed
                return;
            }

            if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
            } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const mimeType = file.type || 'image/jpeg';
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Image optimization failed.'));
                    return;
                }
                const resizedFile = new File([blob], file.name, {
                    type: mimeType,
                    lastModified: Date.now()
                });
                resolve(resizedFile);
            }, mimeType, 0.92);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not read image file. It may be corrupt or not an image.'));
        };
        img.src = objectUrl;
    });
}

async function handleBaseIconUpload(event) {
    const file = event.target.files[0];
    if (file) {
        await processImageUpload(file);
    }
    event.target.value = ''; // Clear for re-selection
}

async function processImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (overlay) overlay.classList.add('visible');
    if (loadingText) loadingText.innerText = 'Processing Image...';

    try {
        // 1. Instant Local Preview (Fastest response)
        // Cleanup previous blob URL if exists
        if (state.customBaseIcon && state.customBaseIcon.startsWith('blob:')) {
            URL.revokeObjectURL(state.customBaseIcon);
        }

        // Clear base text if it's the default "YOUR TEXT" when an image is uploaded
        if (state.baseText === APP_CONFIG.baseText.default) {
            setBaseText('');
        }

        const localUrl = URL.createObjectURL(file);
        state.customBaseIcon = localUrl;
        const imgEl = document.getElementById('base-img');
        if (imgEl) imgEl.src = localUrl;
        updateBaseControls();
        updateBasePreview();

        // 2. Auto-resize (Optimization)
        const optimizedFile = await resizeImage(file, 1500);

        // 3. File Size Check (4MB)
        if (optimizedFile.size > 4 * 1024 * 1024) {
            throw new Error('Image is too large (max 4MB after optimization).');
        }

        // Update local preview with the optimized one if it changed
        if (optimizedFile !== file) {
            const optimizedUrl = URL.createObjectURL(optimizedFile);
            // Cleanup the unoptimized localUrl
            URL.revokeObjectURL(localUrl);

            state.customBaseIcon = optimizedUrl;
            if (imgEl) imgEl.src = optimizedUrl;
        }

        if (loadingText) loadingText.innerText = 'Uploading to Cloud...';

        // 4. Generate content hash for deduplication
        const fileHash = await getFileHash(optimizedFile);

        const formData = new FormData();
        formData.append('file', optimizedFile);
        formData.append('upload_preset', 'iconStudio');
        formData.append('public_id', fileHash);
        formData.append('folder', 'User Uploads - Icon Studio');

        const response = await fetch('https://api.cloudinary.com/v1_1/rm20abcd26/image/upload', {
            method: 'POST',
            body: formData
        });

        let imageUrl;
        if (!response.ok) {
            let errorData;
            try { errorData = await response.json(); } catch (e) { errorData = {}; }

            if (errorData.error && errorData.error.message && errorData.error.message.includes('already exists')) {
                const ext = optimizedFile.name.split('.').pop() || 'png';
                imageUrl = `https://res.cloudinary.com/rm20abcd26/image/upload/v1/User%20Uploads%20-%20Icon%20Studio/${fileHash}.${ext}`;
            } else {
                throw new Error('Cloud storage unavailable.');
            }
        } else {
            const data = await response.json();
            imageUrl = data.secure_url;
        }

        // 5. Final Cloud URL Update
        state.customBaseIcon = imageUrl;
        if (imgEl) imgEl.src = imageUrl;
        localStorage.setItem('iconStudio_baseIcon', imageUrl);

    } catch (err) {
        console.warn('Upload failed, staying with local copy:', err);

        // If we have a local preview, we're mostly okay, just alert the user about sharing
        if (state.customBaseIcon && state.customBaseIcon.startsWith('blob:')) {
            alert('Cloud upload failed. Your icon will be visible locally, but sharing via URL will be disabled.');
            // Save to localStorage as DataURL since Blob URLs don't persist sessions
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    localStorage.setItem('iconStudio_baseIcon', e.target.result);
                };
                reader.readAsDataURL(file);
            } catch (e) { }
        } else {
            alert('Could not process this image. Please try another file.');
        }
    } finally {
        if (overlay) overlay.classList.remove('visible');
        updateRemoveButtonVisibility();
        updateBaseControls();
        updateBasePreview();
        updateBaseBackground();
        syncStateToURL();
    }
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('capture-area');
    if (!dropZone) return;

    let dragCounter = 0;

    // 1. Prevent default browser behavior everywhere
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // 2. Visual feedback on capture-area when dragging anywhere over the window
    window.addEventListener('dragenter', (e) => {
        dragCounter++;
        if (dragCounter === 1) {
            dropZone.classList.add('dragging');
        }
    });

    window.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            dropZone.classList.remove('dragging');
        }
    });

    // 3. Handle drop anywhere
    window.addEventListener('drop', (e) => {
        dragCounter = 0;
        dropZone.classList.remove('dragging');

        const file = e.dataTransfer.files[0];
        if (file) processImageUpload(file);
    }, false);
}

function setupPaste() {
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                processImageUpload(file);
                break;
            }
        }
    });
}

function resetBaseIcon() {
    suppressHaptic = true;
    state.customBaseIcon = null;
    localStorage.removeItem('iconStudio_baseIcon');
    const uploadInput = document.getElementById('base-icon-upload');
    if (uploadInput) uploadInput.value = '';

    // Restore default base background and zoom
    setBaseColor1(APP_CONFIG.baseColor.default);
    setBaseColor2(APP_CONFIG.baseColor2.default);
    setBaseImageZoom(APP_CONFIG.baseZoom.default);
    setBaseGradientType(APP_CONFIG.gradientType.default);
    setBaseGradientAngle(APP_CONFIG.gradientAngle.default);

    // Restore default text if it was cleared
    if (!state.baseText || state.baseText.trim() === '') {
        setBaseText(APP_CONFIG.baseText.default);
    }

    updateRemoveButtonVisibility();
    updateBaseControls();
    updateBasePreview();
    syncStateToURL();

    suppressHaptic = false;
    triggerHaptic();
}

function setBadgePosition(pos) {
    triggerHaptic();
    state.badgePosition = pos;
    const canvas = document.getElementById('icon-canvas');
    const wrap = document.getElementById('badge-wrap');
    const extraSettings = document.getElementById('badge-settings-extra');

    // Remove old position classes
    canvas.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');
    wrap.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');

    if (pos === 'none') {
        wrap.style.display = 'none';
        if (extraSettings) extraSettings.classList.add('hidden');
    } else {
        wrap.style.display = 'flex';
        if (extraSettings) extraSettings.classList.remove('hidden');
        // Add new position classes
        canvas.classList.add('pos-' + pos);
        wrap.classList.add('pos-' + pos);
    }

    document.querySelectorAll('[data-pos]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pos === pos);
    });
    syncStateToURL();
}

function getContrastColor(hex) {
    if (!hex || hex.length < 6) return 'white';
    if (hex.startsWith('#')) hex = hex.slice(1);

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Standard luminance calculation
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65 ? '#0f172a' : 'white';
}

function setColor(c) {
    triggerHaptic();
    state.color = c;
    document.getElementById('badge-shape').style.backgroundColor = c;
    document.getElementById('custom-color').value = c;
    document.getElementById('custom-color-ui').style.setProperty('--swatch-color', c);

    // Update icon color based on contrast
    const iconColor = getContrastColor(c);
    document.getElementById('badge-icon-target').style.color = iconColor;

    let matchedPreset = false;
    document.querySelectorAll('.color-swatch').forEach(sw => {
        const isActive = sw.style.backgroundColor === c || sw.style.backgroundColor.toLowerCase() === c.toLowerCase();
        sw.classList.toggle('active', isActive);
        if (isActive) matchedPreset = true;
    });

    // If it's a custom color (not in presets), show the rainbow picker as active
    document.getElementById('custom-color-ui').classList.toggle('active', !matchedPreset);
    syncStateToURL();
}

function setIcon(name, shouldHideDropdown = true) {
    triggerHaptic();
    if (shouldHideDropdown) {
        document.getElementById('icon-dropdown').classList.remove('active');
        selectedIndex = -1;
    }
    state.icon = name;
    document.getElementById('icon-input').value = name;
    const target = document.getElementById('badge-icon-target');

    // 1. Try to render as Lucide icon
    target.innerHTML = `<i data-lucide="${name}"></i>`;
    lucide.createIcons();

    // 2. Check if Lucide successfully rendered an SVG
    // Lucide replaces the <i> tag with an <svg> tag if found.
    const hasSvg = target.querySelector('svg');

    if (!hasSvg) {
        // 3. Fallback to text (like "8") if no icon was found
        target.innerHTML = `<span>${name}</span>`;

        const span = target.querySelector('span');
        // Dynamic font size calculation using the innerScale state
        // The badge is roughly 25-40% of the canvas width
        let fontSize = 12; // Base size in cqw

        if (name.length > 1) {
            const areaBase = (state.innerScale / 100) * 150;
            fontSize = Math.min(12, Math.sqrt(areaBase / (name.length * 0.8)));
            if (fontSize < 2) fontSize = 2;
        }

        const canvas = document.getElementById('icon-canvas');
        const canvasWidth = canvas ? canvas.offsetWidth : 320;
        span.style.fontSize = (fontSize * canvasWidth / 100) + 'px';
        span.style.whiteSpace = 'normal';
        span.style.wordBreak = name.includes(' ') ? 'normal' : 'break-all';
    }

    syncStateToURL();
}

function setBaseSize(v) {
    state.baseSize = v;
    document.getElementById('base-size-val').innerText = v;
    const input = document.getElementById('base-size-input');
    if (input) input.value = v;
    const bg = document.getElementById('base-bg');
    if (bg) {
        bg.style.width = v + '%';
        bg.style.height = v + '%';

        // Dynamic nudge: ensure (size + nudge) <= 100% to prevent overflow
        const nudge = Math.max(0, Math.min(4, 100 - v));
        document.documentElement.style.setProperty('--base-nudge', nudge + '%');
    }
    updateBasePreview();
    syncStateToURL();
}

function setBadgeSize(v) {
    state.badgeSize = v;
    document.getElementById('badge-size-val').innerText = v;
    const input = document.getElementById('badge-size-input');
    if (input) input.value = v;
    const wrap = document.getElementById('badge-wrap');
    wrap.style.width = v + '%';
    wrap.style.height = v + '%';
    syncStateToURL();
}

function setBadgeRotation(v) {
    state.rotation = v;
    document.getElementById('badge-rot-val').innerText = v;
    const input = document.getElementById('badge-rot-input');
    if (input) input.value = v;
    const wrap = document.getElementById('badge-wrap');
    wrap.style.transform = `rotate(${v}deg)`;
    syncStateToURL();
}

function setInnerScale(v) {
    state.innerScale = v;
    document.getElementById('inner-scale-val').innerText = v;
    const input = document.getElementById('inner-scale-input');
    if (input) input.value = v;
    const target = document.getElementById('badge-icon-target');
    target.style.width = v + '%';
    target.style.height = v + '%';

    // Re-render to update font scaling
    setIcon(state.icon);
    syncStateToURL();
}

function toggleShadows(v) {
    triggerHaptic();
    state.showShadows = v;

    // Sync both toggles
    const t1 = document.getElementById('shadow-toggle');
    const t2 = document.getElementById('shadow-toggle-sc');
    if (t1) t1.checked = v;
    if (t2) t2.checked = v;

    const badge = document.getElementById('badge-wrap');

    updateBaseIconFilter();
    updateBasePreview();
    badge.style.filter = v ? 'drop-shadow(0 12px 20px rgba(0,0,0,0.4))' : 'none';
    syncStateToURL();
}

function resetDefaults() {
    suppressHaptic = true;

    // 1. Reset file input but preserve the current state.customBaseIcon
    const uploadInput = document.getElementById('base-icon-upload');
    if (uploadInput) uploadInput.value = '';

    // 2. Restore all state values from APP_CONFIG
    Object.keys(APP_CONFIG).forEach(key => {
        state[key] = APP_CONFIG[key].default;
    });

    // 3. Update UI to match new state
    setShape(state.shape);
    setColor(state.color);
    setIcon(state.icon);
    setBaseSize(state.baseSize);
    setBadgeSize(state.badgeSize);
    setInnerScale(state.innerScale);
    setBadgeRotation(state.rotation);
    setBadgePosition(state.badgePosition);
    toggleShadows(state.showShadows);
    setBaseShape(state.baseShape);
    setBaseColor1(state.baseColor);
    setBaseColor2(state.baseColor2);
    setBaseGradientType(state.gradientType);
    setBaseGradientAngle(state.gradientAngle);
    setBaseText(state.baseText);
    setBaseTextColor(state.baseTextColor);
    setBaseFrame(state.baseFrame);
    setBaseImageZoom(state.baseZoom);
    applyBaseEffects();

    // 4. Update UI visibility
    updateRemoveButtonVisibility();
    updateBaseControls();
    updateBasePreview();

    // Sync final state to URL
    syncStateToURL();

    suppressHaptic = false;
    triggerHaptic();
}

function toggleScreenshotMode() {
    triggerHaptic();
    document.body.classList.toggle('screenshot-mode');
    updateAppScale();
    syncStateToURL();
}

// ─── Canvas Export Helpers ───────────────────────────────────────────────────

// Polyfill ctx.roundRect for iOS Safari < 16 and any other older browsers
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        const R = (typeof r === 'number') ? r : (Array.isArray(r) ? r[0] : 0);
        this.moveTo(x + R, y);
        this.lineTo(x + w - R, y);
        this.arcTo(x + w, y, x + w, y + R, R);
        this.lineTo(x + w, y + h - R);
        this.arcTo(x + w, y + h, x + w - R, y + h, R);
        this.lineTo(x + R, y + h);
        this.arcTo(x, y + h, x, y + h - R, R);
        this.lineTo(x, y + R);
        this.arcTo(x, y, x + R, y, R);
        this.closePath();
    };
}

function applyShapeClip(ctx, size, shape, radius) {
    // radius is the corner-radius fraction (0–0.5) for the shape
    ctx.beginPath();
    if (shape === 'circle') {
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    } else if (shape === 'square') {
        ctx.rect(0, 0, size, size);
    } else if (shape === 'roundrect') {
        const r = size * 0.12;
        ctx.roundRect(0, 0, size, size, r);
    } else { // squircle default
        const r = size * 0.22;
        ctx.roundRect(0, 0, size, size, r);
    }
    ctx.closePath();
}

function applyBadgeShapeClip(ctx, x, y, size, shape) {
    ctx.beginPath();
    const cx = x + size / 2, cy = y + size / 2, r = size / 2;
    if (shape === 'circle') {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (shape === 'square-hard') {
        ctx.rect(x, y, size, size);
    } else if (shape === 'roundrect') {
        ctx.roundRect(x, y, size, size, size * 0.20);
    } else if (shape === 'squircle') {
        ctx.roundRect(x, y, size, size, size * 0.22);
    } else if (shape === 'hexagon') {
        const pts = [[0.5, 0], [0.933, 0.25], [0.933, 0.75], [0.5, 1], [0.067, 0.75], [0.067, 0.25]];
        pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(x + px * size, y + py * size) : ctx.lineTo(x + px * size, y + py * size));
    } else if (shape === 'hexagon-h') {
        const pts = [[0.25, 0.067], [0.75, 0.067], [1, 0.5], [0.75, 0.933], [0.25, 0.933], [0, 0.5]];
        pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(x + px * size, y + py * size) : ctx.lineTo(x + px * size, y + py * size));
    } else if (shape === 'diamond') {
        ctx.moveTo(x + size * 0.5, y); ctx.lineTo(x + size, y + size * 0.5); ctx.lineTo(x + size * 0.5, y + size); ctx.lineTo(x, y + size * 0.5);
    } else if (shape === 'shield') {
        ctx.moveTo(x, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size, y + size * 0.75); ctx.lineTo(x + size * 0.5, y + size); ctx.lineTo(x, y + size * 0.75);
    } else {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.closePath();
}

function loadImageCORS(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
            // iOS Safari CORS cache bug: a previously-cached no-CORS response blocks
            // the CORS-flagged request. Cache-bust to force a fresh fetch with CORS headers.
            const bust = src.includes('?') ? '&_cb=' + Date.now() : '?_cb=' + Date.now();
            const img2 = new Image();
            img2.crossOrigin = 'anonymous';
            img2.onload = () => resolve(img2);
            img2.onerror = () => {
                // Final fallback: no-CORS (safe for blob: and data: URLs which need no CORS)
                const img3 = new Image();
                img3.onload = () => resolve(img3);
                img3.onerror = reject;
                img3.src = src;
            };
            img2.src = src + bust;
        };
        img.src = src;
    });
}

function buildGradient(ctx, type, angle, color1, color2, size) {
    if (type === 'radial') {
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, color1); g.addColorStop(1, color2); return g;
    } else if (type === 'conic') {
        // Use native conic if available (Safari 15+, Chrome 99+, etc)
        if (ctx.createConicGradient) {
            const rad = ((angle - 90) * Math.PI) / 180; // offset to match CSS
            const g = ctx.createConicGradient(rad, size / 2, size / 2);
            g.addColorStop(0, color1); g.addColorStop(0.5, color2); g.addColorStop(1, color1); return g;
        }
        // Fallback to radial approximation
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
        g.addColorStop(0, color1); g.addColorStop(0.5, color2); g.addColorStop(1, color1); return g;
    } else if (type === 'mesh') {
        // Handled directly in drawing block because it requires multiple draws
        return null;
    } else { // linear
        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad) * size, dy = Math.sin(rad) * size;
        const g = ctx.createLinearGradient(size / 2 - dx / 2, size / 2 - dy / 2, size / 2 + dx / 2, size / 2 + dy / 2);
        g.addColorStop(0, color1); g.addColorStop(1, color2); return g;
    }
}

// Pixel-level filter — replaces ctx.filter which is unreliable in Safari on offscreen canvases
function applyPixelFilter(canvas, effect) {
    const c = canvas.getContext('2d');
    const id = c.getImageData(0, 0, canvas.width, canvas.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
        let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        if (effect === 'deep-fried') {
            // brightness(1.2)
            r *= 1.2; g *= 1.2; b *= 1.2;
            // contrast(300%): (v - 0.5) * 3 + 0.5
            r = (r - 0.5) * 3 + 0.5;
            g = (g - 0.5) * 3 + 0.5;
            b = (b - 0.5) * 3 + 0.5;
            // saturate(1000%): lerp toward luminance with factor -9 (1 - 10)
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = lum + (r - lum) * 10;
            g = lum + (g - lum) * 10;
            b = lum + (b - lum) * 10;
            // sepia(10%): slight warm tint
            const sr = r * 0.9 + g * 0.09 + b * 0.01;
            const sg = r * 0.07 + g * 0.91 + b * 0.02;
            const sb = r * 0.06 + g * 0.09 + b * 0.85;
            r = sr * 0.9 + r * 0.1;
            g = sg * 0.9 + g * 0.1;
            b = sb * 0.9 + b * 0.1;
        } else if (effect === 'mono') {
            // grayscale(100%)
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = g = b = lum;
            // contrast(1.2)
            r = (r - 0.5) * 1.2 + 0.5;
            g = (g - 0.5) * 1.2 + 0.5;
            b = (b - 0.5) * 1.2 + 0.5;
            // brightness(1.1)
            r *= 1.1; g *= 1.1; b *= 1.1;
        }
        d[i] = Math.max(0, Math.min(255, r * 255));
        d[i + 1] = Math.max(0, Math.min(255, g * 255));
        d[i + 2] = Math.max(0, Math.min(255, b * 255));
    }
    c.putImageData(id, 0, 0);
}

async function exportPNG() {
    triggerHaptic();
    // Show overlay
    let overlay = document.getElementById('export-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'export-overlay';
        overlay.className = 'export-loading-overlay';
        overlay.innerHTML = `<div class="export-spinner"></div><div class="export-text" id="export-status-text">Rendering your icon...</div>`;
        document.body.appendChild(overlay);
    }
    const statusText = overlay.querySelector('#export-status-text') || overlay.querySelector('.export-text');
    overlay.classList.add('active');

    const btn = document.querySelector('.btn-export');
    if (btn) btn.disabled = true;

    try {
        const SIZE = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');

        // ── 1. Transparent background (icon is self-contained) ──
        ctx.clearRect(0, 0, SIZE, SIZE);

        // ── 2. Calculate base dimensions (mirrors CSS) ──
        const basePct = state.baseSize / 100;      // 0.5–1.0
        const nudgePct = Math.max(0, Math.min(4, 100 - state.baseSize)) / 100;
        const baseSize = SIZE * basePct;
        const nudge = SIZE * nudgePct;
        const pos = state.badgePosition;

        // Base offset: base nudges AWAY from badge corner
        let bx, by;
        if (pos === 'top-left') { bx = SIZE - baseSize - nudge; by = SIZE - baseSize - nudge; }
        else if (pos === 'top-right') { bx = nudge; by = SIZE - baseSize - nudge; }
        else if (pos === 'bottom-left') { bx = SIZE - baseSize - nudge; by = nudge; }
        else { bx = nudge; by = nudge; } // bottom-right (default)

        // ── 3. Draw base layer ──
        // Draw content to a temp canvas first so ctx.filter applies to the whole layer
        if (statusText && state.customBaseIcon) statusText.textContent = 'Loading image...';
        const bs = Math.ceil(baseSize);
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = bs; baseCanvas.height = bs;
        const bCtx = baseCanvas.getContext('2d');

        if (state.customBaseIcon) {
            try {
                const img = await loadImageCORS(state.customBaseIcon);
                const zoom = (state.baseZoom || 100) / 100;
                const scale = Math.max(bs / img.naturalWidth, bs / img.naturalHeight) * zoom;
                const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
                const dx = (bs - dw) / 2, dy = (bs - dh) / 2;
                // Glass reduces image opacity (mirrors .base-bg.frame-glass .base-icon { opacity: 0.85 })
                if (state.baseFrame === 'glass') bCtx.globalAlpha = 0.85;
                bCtx.drawImage(img, dx, dy, dw, dh);
                bCtx.globalAlpha = 1;
            } catch (e) {
                bCtx.fillStyle = '#1c1c1c';
                bCtx.fillRect(0, 0, bs, bs);
            }
        } else {
            let c1 = state.baseColor, c2 = state.baseColor2;
            if (state.baseFrame === 'glass') { c1 += '66'; c2 += '66'; }

            if (state.gradientType === 'mesh') {
                // Mesh: four radials in corners (mirrors CSS)
                bCtx.fillStyle = c1;
                bCtx.fillRect(0, 0, bs, bs);

                const r1 = bCtx.createRadialGradient(0, 0, 0, 0, 0, bs * 0.8);
                r1.addColorStop(0, c1); r1.addColorStop(1, 'transparent');
                bCtx.fillStyle = r1; bCtx.fillRect(0, 0, bs, bs);

                const r2 = bCtx.createRadialGradient(bs, 0, 0, bs, 0, bs * 0.8);
                r2.addColorStop(0, c2); r2.addColorStop(1, 'transparent');
                bCtx.fillStyle = r2; bCtx.fillRect(0, 0, bs, bs);

                const r3 = bCtx.createRadialGradient(bs, bs, 0, bs, bs, bs * 0.8);
                r3.addColorStop(0, c1); r3.addColorStop(1, 'transparent');
                bCtx.fillStyle = r3; bCtx.fillRect(0, 0, bs, bs);

                const r4 = bCtx.createRadialGradient(0, bs, 0, 0, bs, bs * 0.8);
                r4.addColorStop(0, c2); r4.addColorStop(1, 'transparent');
                bCtx.fillStyle = r4; bCtx.fillRect(0, 0, bs, bs);
            } else {
                bCtx.fillStyle = buildGradient(bCtx, state.gradientType, state.gradientAngle, c1, c2, bs);
                bCtx.fillRect(0, 0, bs, bs);
            }
        }

        // Vignette + Glow on temp canvas
        if (state.baseVignette) {
            const vg = bCtx.createRadialGradient(bs / 2, bs / 2, bs * 0.3, bs / 2, bs / 2, bs * 0.7);
            vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,0.4)');
            bCtx.fillStyle = vg; bCtx.fillRect(0, 0, bs, bs);
        }
        if (state.baseGlow) {
            const gg = bCtx.createRadialGradient(bs / 2, bs / 2, 0, bs / 2, bs / 2, bs * 0.5);
            gg.addColorStop(0, 'rgba(255,255,255,0.4)'); gg.addColorStop(1, 'transparent');
            bCtx.fillStyle = gg; bCtx.fillRect(0, 0, bs, bs);
        }
        // Noise Effect (mirrors .base-overlay.noise)
        if (state.baseNoise) {
            const noise = document.createElement('canvas');
            noise.width = 128; noise.height = 128;
            const nCtx = noise.getContext('2d');
            const nid = nCtx.createImageData(128, 128);
            for (let i = 0; i < nid.data.length; i += 4) {
                const v = Math.random() * 255;
                nid.data[i] = v; nid.data[i + 1] = v; nid.data[i + 2] = v;
                nid.data[i + 3] = 45; // ~0.18 opacity for export visibility
            }
            nCtx.putImageData(nid, 0, 0);
            bCtx.fillStyle = bCtx.createPattern(noise, 'repeat');
            bCtx.fillRect(0, 0, bs, bs);
        }
        // Frame overlays (mirrors .base-frame styles)
        if (state.baseFrame === 'glass') {
            // 1. Subtle white fog
            bCtx.fillStyle = 'rgba(255,255,255,0.05)';
            bCtx.fillRect(0, 0, bs, bs);
            // 2. Glossy highlight gradient
            const gfg = bCtx.createLinearGradient(0, 0, bs, bs);
            gfg.addColorStop(0, 'rgba(255,255,255,0.2)');
            gfg.addColorStop(1, 'transparent');
            bCtx.fillStyle = gfg;
            bCtx.fillRect(0, 0, bs, bs);
            // 3. Inner glow
            const ig = bCtx.createRadialGradient(bs / 2, bs / 2, bs * 0.35, bs / 2, bs / 2, bs * 0.71);
            ig.addColorStop(0, 'transparent');
            ig.addColorStop(1, 'rgba(255,255,255,0.2)');
            bCtx.fillStyle = ig;
            bCtx.fillRect(0, 0, bs, bs);
            // 4. White border stroke
            const frameThick = Math.max(6, bs * 0.012);
            bCtx.save();
            applyShapeClip(bCtx, bs, state.baseShape);
            bCtx.clip();
            applyShapeClip(bCtx, bs, state.baseShape);
            bCtx.strokeStyle = 'rgba(255,255,255,0.5)';
            bCtx.lineWidth = frameThick * 2;
            bCtx.stroke();
            bCtx.restore();
        } else if (state.baseFrame === 'glossy') {
            // Glossy Shine Effect (mirrors .base-frame.shine)
            bCtx.save();
            applyShapeClip(bCtx, bs, state.baseShape);
            bCtx.clip();
            const g = bCtx.createLinearGradient(0, -bs * 0.5, bs * 1.5, bs * 0.5);
            g.addColorStop(0, 'transparent');
            g.addColorStop(0.33, 'rgba(255, 255, 255, 0)');
            g.addColorStop(0.53, 'rgba(255, 255, 255, 0.4)');
            g.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            // Draw a large ellipse-like arc for the shine
            bCtx.fillStyle = g;
            bCtx.beginPath();
            bCtx.arc(bs / 2, -bs * 0.1, bs * 1.1, 0, Math.PI * 2);
            bCtx.fill();
            bCtx.restore();
        } else if (state.baseFrame === 'metallic') {
            // Metallic Effect (mirrors .base-frame.metallic)
            bCtx.save();
            bCtx.globalAlpha = 0.8;
            bCtx.globalCompositeOperation = 'overlay';
            const mg = bCtx.createLinearGradient(0, 0, bs, bs);
            mg.addColorStop(0, 'rgba(255, 255, 255, 0)');
            mg.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
            mg.addColorStop(0.45, 'rgba(255, 255, 255, 0.4)');
            mg.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            mg.addColorStop(0.55, 'rgba(255, 255, 255, 0.4)');
            mg.addColorStop(0.65, 'rgba(255, 255, 255, 0)');
            mg.addColorStop(1, 'rgba(255, 255, 255, 0)');
            bCtx.fillStyle = mg;
            bCtx.fillRect(0, 0, bs, bs);
            bCtx.restore();
        } else if (state.baseFrame === 'border') {
            // Border Effect (mirrors .base-frame.border)
            const frameThick = Math.max(6, bs * 0.012);
            bCtx.save();
            applyShapeClip(bCtx, bs, state.baseShape);
            bCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            bCtx.lineWidth = frameThick * 2;
            bCtx.stroke();
            // Inset shadow simulation
            const is = bCtx.createRadialGradient(bs / 2, bs / 2, bs * 0.4, bs / 2, bs / 2, bs * 0.5);
            is.addColorStop(0, 'transparent');
            is.addColorStop(1, 'rgba(0,0,0,0.2)');
            bCtx.fillStyle = is;
            bCtx.fillRect(0, 0, bs, bs);
            bCtx.restore();
        } else if (state.baseFrame === 'emboss') {
            // Emboss Effect (mirrors .base-frame.emboss)
            const thick = Math.max(6, bs * 0.01);
            bCtx.save();
            // Light top-left highlight
            bCtx.save();
            bCtx.translate(-thick / 3, -thick / 3);
            applyShapeClip(bCtx, bs, state.baseShape);
            bCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            bCtx.lineWidth = thick;
            bCtx.stroke();
            bCtx.restore();
            // Dark bottom-right shadow
            bCtx.save();
            bCtx.translate(thick / 3, thick / 3);
            applyShapeClip(bCtx, bs, state.baseShape);
            bCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            bCtx.lineWidth = thick;
            bCtx.stroke();
            bCtx.restore();
            // Subtle inner vignette for depth
            const es = bCtx.createRadialGradient(bs / 2, bs / 2, bs * 0.4, bs / 2, bs / 2, bs * 0.5);
            es.addColorStop(0, 'transparent');
            es.addColorStop(1, 'rgba(0,0,0,0.15)');
            bCtx.fillStyle = es;
            bCtx.fillRect(0, 0, bs, bs);
            bCtx.restore();
        }
        // CRT: scanlines + RGB sub-pixel grid (mirrors CSS background-size: 100% 3px, 3px 100%)
        if (state.baseCRT) {
            bCtx.save();
            bCtx.globalAlpha = 0.8;
            // Horizontal scanlines: dark stripe on bottom 1.5px of every 3px row
            bCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let y = 1; y < bs; y += 3) {
                bCtx.fillRect(0, y, bs, 1.5);
            }
            // RGB sub-pixel columns: R/G/B tint repeating every 3px
            for (let x = 0; x < bs; x += 3) {
                bCtx.fillStyle = 'rgba(255, 0, 0, 0.04)';
                bCtx.fillRect(x, 0, 1, bs);
                bCtx.fillStyle = 'rgba(0, 255, 0, 0.01)';
                bCtx.fillRect(x + 1, 0, 1, bs);
                bCtx.fillStyle = 'rgba(0, 0, 255, 0.04)';
                bCtx.fillRect(x + 2, 0, 1, bs);
            }
            // Ambient darkening overlay (replaces the ::after flicker at its midpoint)
            bCtx.fillStyle = 'rgba(18, 16, 16, 0.12)';
            bCtx.fillRect(0, 0, bs, bs);
            bCtx.restore();
        }

        // Composite base canvas onto main canvas with shape clip + pixel filters
        // Apply effects directly to baseCanvas pixels (avoids ctx.filter Safari bug)
        if (state.baseDeepFried) applyPixelFilter(baseCanvas, 'deep-fried');
        else if (state.baseMono) applyPixelFilter(baseCanvas, 'mono');

        ctx.save();
        ctx.translate(bx, by);
        applyShapeClip(ctx, bs, state.baseShape);
        ctx.clip();
        if (state.showShadows) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = bs * 0.05;
            ctx.shadowOffsetY = bs * 0.03;
        }
        ctx.drawImage(baseCanvas, 0, 0, bs, bs);
        ctx.shadowColor = 'transparent';
        ctx.restore();

        // ── 4. Draw base text ──
        if (state.baseText && state.baseText.trim()) {
            ctx.save();
            const fontSize = calculateDynamicFontSize(state.baseText, SIZE);
            ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
            ctx.fillStyle = state.baseTextColor || '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (state.showShadows) {
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = SIZE * 0.015;
                ctx.shadowOffsetY = SIZE * 0.01;
            }
            // Word-wrap the text
            const words = state.baseText.split(' ');
            const lines = [];
            let current = '';
            for (const w of words) {
                const test = current ? current + ' ' + w : w;
                if (ctx.measureText(test).width > baseSize * 0.85 && current) {
                    lines.push(current); current = w;
                } else { current = test; }
            }
            if (current) lines.push(current);
            const lineH = fontSize * 0.95;
            const totalH = lines.length * lineH;
            const startY = by + baseSize / 2 - totalH / 2 + lineH / 2;
            lines.forEach((line, i) => {
                ctx.fillText(line, bx + baseSize / 2, startY + i * lineH);
            });
            ctx.restore();
        }

        // ── 5. Draw badge ──
        if (pos !== 'none') {
            if (statusText) statusText.textContent = 'Rendering badge...';
            const badgePct = state.badgeSize / 100;
            const badgeSize = SIZE * badgePct;
            const badgeOffset = SIZE * 0.08;

            let bdgX, bdgY;
            if (pos === 'top-left') { bdgX = badgeOffset; bdgY = badgeOffset; }
            else if (pos === 'top-right') { bdgX = SIZE - badgeSize - badgeOffset; bdgY = badgeOffset; }
            else if (pos === 'bottom-left') { bdgX = badgeOffset; bdgY = SIZE - badgeSize - badgeOffset; }
            else { bdgX = SIZE - badgeSize - badgeOffset; bdgY = SIZE - badgeSize - badgeOffset; }

            // Badge pivot = its center; rotation mirrors CSS transform: rotate(Ndeg)
            const bdgCx = bdgX + badgeSize / 2;
            const bdgCy = bdgY + badgeSize / 2;
            const rotRad = ((state.rotation || 0) * Math.PI) / 180;

            ctx.save();
            // Translate to badge center, rotate, then draw badge at (-size/2, -size/2)
            ctx.translate(bdgCx, bdgCy);
            ctx.rotate(rotRad);

            const hbs = badgeSize / 2; // half badge size — local origin coords

            if (state.showShadows) {
                ctx.shadowColor = 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = badgeSize * 0.12;
                ctx.shadowOffsetY = badgeSize * 0.06;
            }

            // Draw badge background shape (centered on local origin)
            applyBadgeShapeClip(ctx, -hbs, -hbs, badgeSize, state.shape);
            ctx.fillStyle = state.color;
            ctx.fill();
            ctx.shadowColor = 'transparent';

            // Clip icon to badge shape
            ctx.clip();

            const iconScale = state.innerScale / 100;
            const iconSize = badgeSize * iconScale * 0.85;
            const iconColor = getContrastColor(state.color);
            // Icon centered at local origin
            const iconOff = -iconSize / 2;

            const svgEl = document.querySelector('#badge-icon-target svg');
            if (svgEl) {
                const svgClone = svgEl.cloneNode(true);
                svgClone.setAttribute('width', iconSize);
                svgClone.setAttribute('height', iconSize);
                svgClone.setAttribute('color', iconColor);
                svgClone.querySelectorAll('[stroke="currentColor"]').forEach(el => el.setAttribute('stroke', iconColor));
                svgClone.querySelectorAll('[fill="currentColor"]').forEach(el => el.setAttribute('fill', iconColor));
                const svgStr = new XMLSerializer().serializeToString(svgClone);
                const blob = new Blob([svgStr], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                try {
                    const svgImg = await loadImageCORS(url);
                    if (state.shape === 'diamond') {
                        ctx.scale(0.7, 0.7);
                        ctx.drawImage(svgImg, iconOff, iconOff, iconSize, iconSize);
                    } else {
                        ctx.drawImage(svgImg, iconOff, iconOff, iconSize, iconSize);
                    }
                } finally {
                    URL.revokeObjectURL(url);
                }
            } else {
                const spanEl = document.querySelector('#badge-icon-target span');
                if (spanEl) {
                    let fs = 12;
                    if (state.icon.length > 1) {
                        const areaBase = (state.innerScale / 100) * 150;
                        fs = Math.min(12, Math.sqrt(areaBase / (state.icon.length * 0.8)));
                        if (fs < 2) fs = 2;
                    }
                    ctx.font = `700 ${fs * SIZE / 100}px Outfit, sans-serif`;
                    ctx.fillStyle = iconColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(state.icon, 0, 0);
                }
            }

            ctx.restore();
        }

        // ── 6. Download ──
        if (statusText) statusText.textContent = 'Saving...';
        await new Promise(r => setTimeout(r, 100));

        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `icon-${state.icon}-${state.shape}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        }, 'image/png');

    } catch (err) {
        console.error('Export failed:', err);
        alert('Export failed: ' + err.message);
    } finally {
        overlay.classList.remove('active');
        if (btn) btn.disabled = false;
    }
}

async function handleShareClick() {
    // On mobile, trigger native share immediately
    if (window.innerWidth <= 1150) {
        await nativeShareOnly();
    }
}

async function copyURLOnly() {
    const btn = document.getElementById('share-btn');
    const originalContent = btn.innerHTML;

    let url = window.location.href;
    if (window.location.search) {
        url = window.location.origin + '/s/' + window.location.search;
    }

    try {
        await navigator.clipboard.writeText(url);

        // Visual feedback on the main button
        btn.innerHTML = '<i data-lucide="check" style="width:18px;height:18px"></i> Copied!';
        btn.classList.add('success');
        lucide.createIcons();

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('success');
            lucide.createIcons();
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy URL to clipboard.');
    }
}

async function nativeShareOnly() {
    let url = window.location.href;
    if (window.location.search) {
        url = window.location.origin + '/s/' + window.location.search;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Check out my icon design!',
                text: 'I designed this icon using Icon Studio.',
                url: url
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Native share failed:', err);
                // Fallback to copy if native share fails for some other reason
                await copyURLOnly();
            }
        }
    } else {
        // Fallback for desktop browsers that don't support navigator.share
        await copyURLOnly();
    }
}

// Listen for Esc to exit screenshot mode
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('screenshot-mode')) {
        toggleScreenshotMode();
    }
});

init();
function toggleBaseDrawer() {
    triggerHaptic();
    const drawer = document.getElementById('base-drawer');
    const trigger = document.getElementById('drawer-trigger');
    if (!drawer || !trigger) return;

    drawer.classList.toggle('active');
    trigger.classList.toggle('active');
}

// Ensure drawer is reset if window is resized above mobile breakpoint
window.addEventListener('resize', () => {
    if (window.innerWidth > 1150) {
        const drawer = document.getElementById('base-drawer');
        const trigger = document.getElementById('drawer-trigger');
        if (drawer) drawer.classList.remove('active');
        if (trigger) trigger.classList.remove('active');
    }
});

// PWA & iOS Custom Installation Prompt Helper Functions

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => {
                    console.log('[Service Worker] Registered successfully:', reg.scope);
                })
                .catch((err) => {
                    console.error('[Service Worker] Registration failed:', err);
                });
        });
    }
}

function positionIosPrompt() {
    const prompt = document.getElementById('ios-pwa-prompt');
    if (!prompt) return;

    // Check if we are in the single-column mobile layout
    const isSingleColumnMobile = window.innerWidth <= 899 && !window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    const controlsSections = document.querySelectorAll('.controls-section');
    const lastControlsSection = controlsSections[controlsSections.length - 1];

    if (isSingleColumnMobile) {
        // On single-column mobile, sit below the main container as a separate stacked panel
        if (prompt.parentElement !== document.body) {
            document.body.appendChild(prompt);
        }
    } else {
        // On tablet/iPad/desktop/landscape mobile, sit at the very end of the last controls sidebar (Badge controls)
        if (lastControlsSection && prompt.parentElement !== lastControlsSection) {
            lastControlsSection.appendChild(prompt);
        }
    }
}

function initIosPwaPrompt() {
    // Detect iOS / iPadOS (with support for Safari's Responsive Design Mode iPad presets)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && (
            navigator.maxTouchPoints > 0 ||
            'ontouchstart' in window ||
            window.matchMedia('(pointer: coarse)').matches ||
            ((window.innerWidth === 1133 && window.innerHeight === 744) || (window.innerWidth === 744 && window.innerHeight === 1133)) || // iPad mini 6
            ((window.innerWidth === 1024 && window.innerHeight === 768) || (window.innerWidth === 768 && window.innerHeight === 1024)) || // iPad 1-9
            ((window.innerWidth === 1180 && window.innerHeight === 820) || (window.innerWidth === 820 && window.innerHeight === 1180)) || // iPad Air / iPad 10
            ((window.innerWidth === 1194 && window.innerHeight === 834) || (window.innerWidth === 834 && window.innerHeight === 1194)) || // iPad Pro 11
            ((window.innerWidth === 1366 && window.innerHeight === 1024) || (window.innerWidth === 1024 && window.innerHeight === 1366))  // iPad Pro 12.9
        ));

    // Detect Standalone Mode (already added to home screen)
    const isStandalone = window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
        // Position it correctly based on the current screen size
        positionIosPrompt();

        // Show the elegant card immediately (no timer, always show on iOS mobile/tablet browsers)
        const prompt = document.getElementById('ios-pwa-prompt');
        if (prompt) {
            prompt.classList.add('collapsed'); // Start in collapsed mode
            prompt.classList.add('visible');
        }

        // Bind dynamic repositioning to window resize/orientation changes
        window.addEventListener('resize', positionIosPrompt);
    }
}

function expandIosPrompt(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    triggerHaptic();
    const prompt = document.getElementById('ios-pwa-prompt');
    if (prompt) {
        prompt.classList.remove('collapsed');
    }
}

function collapseIosPrompt(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    triggerHaptic();
    const prompt = document.getElementById('ios-pwa-prompt');
    if (prompt) {
        prompt.classList.add('collapsed'); // Only collapses back to compact bar
    }
}

// Progressive sensory haptic vibration clicks
function triggerHaptic() {
    if (suppressHaptic) return;

    // 1. Standard Vibration API (Android, Chrome, Firefox)
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(12); // Short crisp haptic tap
        } catch (e) {
            // Silently absorb security constraints in some browsers
        }
    }

    // 2. iOS Safari / PWA WebKit Haptic Workaround (iOS 18+)
    // Triggers click on label for checkbox switch to emit a native tactile pulse
    const hapticLabel = document.getElementById('haptic-label');
    if (hapticLabel) {
        try {
            hapticLabel.click();
        } catch (e) {
            // Silently absorb
        }
    }
}

// Bind functions to window so they are globally accessible from inline HTML event listeners
window.collapseIosPrompt = collapseIosPrompt;
window.expandIosPrompt = expandIosPrompt;
window.triggerHaptic = triggerHaptic;

// ── Desktop PWA Installer Prompt Helper Functions ──

// Capture programmatic Chromium install event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile/desktop Chrome
    e.preventDefault();
    deferredPrompt = e;

    // Initialize the desktop prompt for Chromium
    initDesktopPwaPrompt('chromium');
});

window.addEventListener('appinstalled', (e) => {
    console.log('[PWA] Installed successfully');
    deferredPrompt = null;
    const prompt = document.getElementById('desktop-pwa-prompt');
    if (prompt) prompt.classList.remove('visible');
});

function positionDesktopPrompt() {
    const prompt = document.getElementById('desktop-pwa-prompt');
    if (!prompt) return;

    // Check if we are in the single-column mobile layout
    const isSingleColumnMobile = window.innerWidth <= 1150 && !window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    const controlsSections = document.querySelectorAll('.controls-section');
    const lastControlsSection = controlsSections[controlsSections.length - 1];

    if (isSingleColumnMobile) {
        // On mobile, sit below the main container as a separate stacked panel
        if (prompt.parentElement !== document.body) {
            document.body.appendChild(prompt);
        }
    } else {
        // On tablet/iPad/desktop/landscape mobile, sit at the very end of the last controls sidebar (Badge controls)
        if (lastControlsSection && prompt.parentElement !== lastControlsSection) {
            lastControlsSection.appendChild(prompt);
        }
    }
}

function initDesktopPwaPrompt(forcedType) {
    // If dismissed previously, don't show
    if (localStorage.getItem('iconStudio_desktop_prompt_dismissed') === 'true') {
        return;
    }

    // Detect Standalone Mode (already added/installed)
    const isStandalone = window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Detect iOS / iPadOS (they use the iOS prompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && (
            navigator.maxTouchPoints > 0 ||
            'ontouchstart' in window ||
            window.matchMedia('(pointer: coarse)').matches ||
            ((window.innerWidth === 1133 && window.innerHeight === 744) || (window.innerWidth === 744 && window.innerHeight === 1133)) || // iPad mini 6
            ((window.innerWidth === 1024 && window.innerHeight === 768) || (window.innerWidth === 768 && window.innerHeight === 1024)) || // iPad 1-9
            ((window.innerWidth === 1180 && window.innerHeight === 820) || (window.innerWidth === 820 && window.innerHeight === 1180)) || // iPad Air / iPad 10
            ((window.innerWidth === 1194 && window.innerHeight === 834) || (window.innerWidth === 834 && window.innerHeight === 1194)) || // iPad Pro 11
            ((window.innerWidth === 1366 && window.innerHeight === 1024) || (window.innerWidth === 1024 && window.innerHeight === 1366))  // iPad Pro 12.9
        ));
    if (isIOS) return;

    // Determine target prompt type
    const isMac = /Macintosh|Mac OS X/.test(navigator.userAgent);
    const isMacSafari = isMac && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    let type = forcedType;
    if (!type) {
        if (isMacSafari) {
            type = 'safari';
        } else if (deferredPrompt) {
            type = 'chromium';
        } else {
            // Unsupported or no prompt available yet
            return;
        }
    }

    desktopPromptType = type;

    // Position it correctly based on the current screen size
    positionDesktopPrompt();

    // Dynamically adjust text based on the type
    const subtitle = document.getElementById('desktop-prompt-subtitle');
    const actionBtn = document.getElementById('desktop-prompt-action-btn');
    const instructionsText = document.getElementById('desktop-prompt-instructions-text');
    const stepsContainer = document.getElementById('desktop-prompt-steps-container');

    if (type === 'safari') {
        if (subtitle) subtitle.textContent = 'Add to Dock (Mac)';
        if (actionBtn) {
            actionBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Install
            `;
        }
        if (instructionsText) instructionsText.textContent = 'Install this web app on your device to design in full screen, use high-fidelity exports, and work offline.';
        if (stepsContainer) {
            stepsContainer.innerHTML = `
                <div class="desktop-prompt-step">
                    <div class="desktop-prompt-step-num">1</div>
                    <div class="desktop-prompt-step-text">
                        Open the <strong>File</strong> menu in Safari's top menu bar.
                    </div>
                </div>
                <div class="desktop-prompt-step">
                    <div class="desktop-prompt-step-num">2</div>
                    <div class="desktop-prompt-step-text">
                        Select <span class="ios-action-text">Add to Dock...</span>.
                    </div>
                </div>
            `;
        }
    } else if (type === 'chromium') {
        if (subtitle) subtitle.textContent = 'Install Desktop App';
        if (actionBtn) {
            actionBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Install
            `;
        }
        if (instructionsText) instructionsText.textContent = 'Install this web app on your device to design in full screen, use high-fidelity exports, and work offline.';
        if (stepsContainer) {
            stepsContainer.innerHTML = `
                <div class="desktop-prompt-step">
                    <div class="desktop-prompt-step-num">✓</div>
                    <div class="desktop-prompt-step-text">
                        Runs in a standalone window, freeing up your browser tab space.
                    </div>
                </div>
                <div class="desktop-prompt-step">
                    <div class="desktop-prompt-step-num">✓</div>
                    <div class="desktop-prompt-step-text">
                        Launches instantly from your Dock or desktop shortcut.
                    </div>
                </div>
                <button class="desktop-prompt-install-btn" style="width: 100%; justify-content: center; margin-top: 0.5rem;" onclick="handleDesktopInstallAction(event)">
                    Install Now
                </button>
            `;
        }
    }

    const prompt = document.getElementById('desktop-pwa-prompt');
    if (prompt) {
        prompt.classList.add('collapsed'); // Start collapsed/compact
        prompt.classList.add('visible');
    }

    // Bind dynamic repositioning to window resize/orientation changes
    window.addEventListener('resize', positionDesktopPrompt);
}

function expandDesktopPrompt(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    triggerHaptic();
    const prompt = document.getElementById('desktop-pwa-prompt');
    if (prompt) {
        prompt.classList.remove('collapsed');
    }
}

function collapseDesktopPrompt(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    triggerHaptic();
    const prompt = document.getElementById('desktop-pwa-prompt');
    if (prompt) {
        if (prompt.classList.contains('collapsed')) {
            // Already collapsed, dismiss/hide completely
            dismissDesktopPrompt();
        } else {
            prompt.classList.add('collapsed');
        }
    }
}

function dismissDesktopPrompt() {
    const prompt = document.getElementById('desktop-pwa-prompt');
    if (prompt) {
        prompt.classList.remove('visible');
    }
    localStorage.setItem('iconStudio_desktop_prompt_dismissed', 'true');
}

async function handleDesktopInstallAction(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    triggerHaptic();

    if (desktopPromptType === 'chromium' && deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Programmatic install choice outcome:', outcome);
        deferredPrompt = null;

        const prompt = document.getElementById('desktop-pwa-prompt');
        if (prompt) prompt.classList.remove('visible');
    } else {
        // For Safari, expand instructions card
        expandDesktopPrompt();
    }
}

// Bind functions to window so they are globally accessible from inline HTML event listeners
window.collapseDesktopPrompt = collapseDesktopPrompt;
window.expandDesktopPrompt = expandDesktopPrompt;
window.handleDesktopInstallAction = handleDesktopInstallAction;
