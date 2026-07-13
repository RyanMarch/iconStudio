/**
 * iconStudio — Help Docs Web Components
 * Phase 2 (partial): <docs-header> and <docs-sidebar>
 *
 * Usage: add <script type="module" src="../docs-components.js"></script>
 * to every docs HTML page before closing </body>.
 *
 * Components registered here:
 *   - DocsHeader   → <docs-header>
 *   - DocsSidebar  → <docs-sidebar>
 *
 * Pending (Phase 2 continued):
 *   - DocsSearch   → <docs-search>
 *   - DocsGrid     → <docs-grid>
 *   - DocsAnchorHelper → <docs-anchor-helper>
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
 * Inline SVG helpers (Lucide subset — no external dependency)
 * ─────────────────────────────────────────────────────────────────────────── */
const SVG = {
  /** Wrap a path string in a 24×24 Lucide-style <svg> */
  make(pathD, { size = 24, ariaLabel = null, ariaHidden = true } = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    if (ariaHidden) svg.setAttribute('aria-hidden', 'true');
    if (ariaLabel) svg.setAttribute('aria-label', ariaLabel);
    svg.innerHTML = pathD;
    return svg;
  },

  // Icon paths
  MENU: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  X: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  SEARCH: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  CHEVRON_R: '<polyline points="9 18 15 12 9 6"/>',
  BOOK_OPEN: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  HOME: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  EXTERNAL: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
};


/* ─────────────────────────────────────────────────────────────────────────────
 * <docs-header>
 *
 * Observed attributes:
 *   logo-href    — URL the logo/wordmark links to (default: '/')
 *   logo-label   — Accessible text for the logo link (default: 'iconStudio')
 *   docs-href    — URL of the docs home page (default: '/docs/')
 *   docs-label   — Label shown after the separator (default: 'Help Center')
 *   theme-toggle — If present, renders a dark/light mode toggle button
 *   nav-src      — URL to nav.json for site navigation links in header & mobile sidebar
 *
 * Behaviour:
 *   - Logo (icon + gradient name) on the left.
 *   - Right side (RTL order): mobile-only menu button → search icon (expands
 *     inline search field on click) → desktop-only site nav links.
 *   - Mobile toggle opens/closes the <docs-sidebar> via 'docs:sidebar-toggle'.
 *   - Search field is hidden by default; the magnifying-glass button toggles it.
 *   - Fetches nav-src JSON for site nav links (shared with sidebar mobile nav).
 * ─────────────────────────────────────────────────────────────────────────── */
class DocsHeader extends HTMLElement {
  static get observedAttributes() {
    return ['logo-href', 'logo-label', 'docs-href', 'docs-label', 'theme-toggle', 'nav-src'];
  }

  constructor() {
    super();
    this._sidebarOpen = false;
    this._searchOpen = false;
    this._navData = null;
  }

  connectedCallback() {
    this._loadNav().then(() => {
      this._render();
      this._bindEvents();
      this._syncToggleIcon();
    });
  }

  attributeChangedCallback(name) {
    if (!this.isConnected) return;
    if (name === 'nav-src') {
      this._navData = null;
      this._loadNav().then(() => { this._render(); this._bindEvents(); });
    } else {
      this._render();
      this._bindEvents();
    }
  }

  /* ── Fetch site nav ── */
  async _loadNav() {
    const src = this.getAttribute('nav-src');
    if (!src || this._navData) return;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`[docs-header] nav fetch ${res.status}`);
      this._navData = await res.json();
    } catch (err) {
      console.warn('[docs-header]', err);
      this._navData = [];
    }
  }

  /* ── Render ── */
  _render() {
    const logoHref = this.getAttribute('logo-href') ?? '/';
    const logoLabel = this.getAttribute('logo-label') ?? 'iconStudio';
    const hasTheme = this.hasAttribute('theme-toggle');

    // Build desktop nav links HTML
    const currentPath = location.pathname.replace(/\/?$/, '/');
    const navLinksHtml = this._buildDesktopNav(currentPath);

    this.innerHTML = /* html */`
      <style>
        /* ── DocsHeader scoped styles ── */
        .dh-inner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          position: relative;
        }

        /* Logo group */
        .dh-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex-shrink: 0;
          text-decoration: none;
          color: inherit;
        }
        .dh-logo-img {
          width: 28px;
          height: 28px;
          display: block;
        }
        .dh-logo-name {
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          white-space: nowrap;
        }

        /* Spacer */
        .dh-spacer { flex: 1 1 auto; min-width: 0; }

        /* Right-side action cluster */
        .dh-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        /* Desktop site nav */
        .dh-site-nav {
          display: flex;
          align-items: center;
          gap: 0.125rem;
        }
        .dh-nav-link {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.7rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--docs-text-muted, #5a6a7e);
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .dh-nav-link:hover {
          background: var(--docs-bg-secondary, #f0f4f8);
          color: var(--docs-text, #1a202c);
        }
        .dh-nav-link.active {
          color: var(--docs-accent, #2563eb);
          background: var(--docs-accent-light, rgba(37,99,235,0.1));
          font-weight: 600;
        }
        @media (max-width: 768px) { .dh-site-nav { display: none; } }

        /* Search toggle button + expandable field */
        .dh-search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--docs-text-muted, #5a6a7e);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          flex-shrink: 0;
        }
        .dh-search-btn:hover {
          background: var(--docs-bg-secondary, #f0f4f8);
          color: var(--docs-text, #1a202c);
        }
        .dh-search-btn[aria-expanded="true"] {
          color: var(--docs-accent, #2563eb);
          background: var(--docs-accent-light, rgba(37,99,235,0.1));
        }

        .dh-search-field {
          display: flex;
          align-items: center;
          overflow: hidden;
          width: 0;
          opacity: 0;
          transition: width 0.25s ease, opacity 0.2s ease;
          flex-shrink: 0;
        }
        .dh-search-field.open {
          width: clamp(160px, 18vw, 260px);
          opacity: 1;
        }
        .dh-search-field docs-search {
          display: block;
          width: 100%;
        }
        @media (max-width: 768px) {
          .dh-search-field {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            z-index: 50;
            overflow: visible;
          }
          .dh-search-field.open {
            width: 100%;
            opacity: 1;
            margin: 5px auto;
          }
        }

        /* Mobile menu toggle */
        .dh-menu-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--docs-text-muted, #5a6a7e);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          flex-shrink: 0;
        }
        .dh-menu-btn:hover {
          background: var(--docs-bg-secondary, #f0f4f8);
          color: var(--docs-text, #1a202c);
        }
        @media (max-width: 768px) { .dh-menu-btn { display: flex; } }
      </style>

      <nav class="dh-inner" role="navigation" aria-label="Docs global navigation">

        <!-- Logo: icon + gradient name -->
        <a class="dh-logo" href="${logoHref}" aria-label="${logoLabel} home">
          <img
            class="dh-logo-img"
            src="/assets/favicon/favicon.svg"
            alt=""
            aria-hidden="true"
            loading="eager"
          />
          <span class="dh-logo-name">${logoLabel}</span>
        </a>

        <div class="dh-spacer"></div>

        <!-- Right-side actions -->
        <div class="dh-actions">

          <!-- Desktop site nav (hidden on mobile) -->
          ${navLinksHtml ? `<div class="dh-site-nav" role="list">${navLinksHtml}</div>` : ''}

          <!-- Search toggle -->
          <div class="dh-search-field" id="dh-search-field" aria-live="polite">
            <docs-search id="docs-header-search" aria-label="Search documentation"></docs-search>
          </div>
          <button
            class="dh-search-btn"
            id="dh-search-btn"
            type="button"
            aria-label="Toggle search"
            aria-expanded="false"
            aria-controls="dh-search-field"
          ></button>

          ${hasTheme ? /* html */`
          <button
            class="docs-feedback-btn"
            id="docs-theme-toggle"
            type="button"
            aria-label="Toggle colour theme"
            title="Toggle colour theme"
          >
            <span class="docs-theme-icon-sun" aria-hidden="true">☀︎</span>
            <span class="docs-theme-icon-moon" aria-hidden="true">☾</span>
          </button>` : ''}

          <!-- Mobile menu button (only visible on small screens) -->
          <button
            class="dh-menu-btn"
            id="docs-mobile-toggle"
            aria-controls="docs-sidebar"
            aria-expanded="false"
            aria-label="Toggle navigation menu"
            type="button"
          ></button>
        </div>

      </nav>
    `;

    // Inject SVG icons imperatively to avoid innerHTML XSS concerns
    const searchBtn = this.querySelector('#dh-search-btn');
    searchBtn?.appendChild(SVG.make(SVG.SEARCH, { size: 18 }));

    const menuBtn = this.querySelector('#docs-mobile-toggle');
    menuBtn?.appendChild(SVG.make(SVG.MENU, { size: 18 }));

    // Re-apply search open state if it was open before re-render
    if (this._searchOpen) {
      this.querySelector('#dh-search-field')?.classList.add('open');
      searchBtn?.setAttribute('aria-expanded', 'true');
    }
  }

  /* ── Build desktop nav link HTML from _navData ── */
  _buildDesktopNav(currentPath) {
    if (!this._navData?.length) return '';
    return this._navData.flatMap((section) => section.links ?? []).map((link) => {
      const linkPath = (link.href ?? '').replace(/\/?$/, '/');
      const isActive = currentPath === linkPath ||
        (currentPath.startsWith(linkPath) && linkPath !== '/docs/' && linkPath !== '/');
      return /* html */`
        <a
          class="dh-nav-link${isActive ? ' active' : ''}"
          href="${link.href}"
          ${isActive ? 'aria-current="page"' : ''}
          role="listitem"
        >${link.title}</a>`;
    }).join('');
  }

  /* ── Events ── */
  _bindEvents() {
    const menuBtn = this.querySelector('#docs-mobile-toggle');
    menuBtn?.addEventListener('click', () => this._handleSidebarToggle());

    const searchBtn = this.querySelector('#dh-search-btn');
    searchBtn?.addEventListener('click', () => this._handleSearchToggle());

    const themeBtn = this.querySelector('#docs-theme-toggle');
    themeBtn?.addEventListener('click', () => this._handleThemeToggle());

    // Close search when clicking outside the header
    document.addEventListener('click', (e) => {
      if (this._searchOpen && !this.contains(e.target)) this._closeSearch();
    }, { capture: true });
  }

  _handleSidebarToggle() {
    this._sidebarOpen = !this._sidebarOpen;
    this._syncToggleIcon();
    document.dispatchEvent(new CustomEvent('docs:sidebar-toggle', {
      bubbles: true,
      detail: { open: this._sidebarOpen },
    }));
  }

  _syncToggleIcon() {
    const menuBtn = this.querySelector('#docs-mobile-toggle');
    if (!menuBtn) return;
    menuBtn.setAttribute('aria-expanded', String(this._sidebarOpen));
    menuBtn.innerHTML = '';
    menuBtn.appendChild(SVG.make(this._sidebarOpen ? SVG.X : SVG.MENU, { size: 18 }));
  }

  _handleSearchToggle() {
    this._searchOpen ? this._closeSearch() : this._openSearch();
  }

  _openSearch() {
    this._searchOpen = true;
    const field = this.querySelector('#dh-search-field');
    const btn = this.querySelector('#dh-search-btn');
    field?.classList.add('open');
    btn?.setAttribute('aria-expanded', 'true');
    // Focus the input inside docs-search
    setTimeout(() => {
      this.querySelector('docs-search input, #dh-search-field input')?.focus();
    }, 260);
  }

  _closeSearch() {
    this._searchOpen = false;
    const field = this.querySelector('#dh-search-field');
    const btn = this.querySelector('#dh-search-btn');
    field?.classList.remove('open');
    btn?.setAttribute('aria-expanded', 'false');
  }

  _handleThemeToggle() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (_) { /* quota full */ }
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
 * <docs-sidebar>
 *
 * Observed attributes:
 *   src   — URL of the navigation config JSON (see schema below). Required.
 *   label — aria-label for the <nav> (default: 'Documentation navigation')
 *
 * Navigation config JSON schema  (docs/nav.json):
 * [
 *   {
 *     "section": "Getting Started",          // optional group label
 *     "links": [
 *       {
 *         "title": "Introduction",
 *         "href": "/docs/introduction/",
 *         "id": "introduction"               // must match <meta name="doc-id">
 *       }
 *     ]
 *   }
 * ]
 *
 * Behaviour:
 *   - Fetches nav.json once (cached in _navData) on first connect.
 *   - Compares each link's href to location.pathname to detect the active page.
 *   - Under the active link, scrapes the current document's <h2> elements
 *     and renders them as an indented sublink list.
 *   - Listens for 'docs:sidebar-toggle' to open/close on mobile.
 *   - Injects an overlay <div> into document.body for mobile backdrop.
 * ─────────────────────────────────────────────────────────────────────────── */
class DocsSidebar extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'label'];
  }

  constructor() {
    super();
    this._navData = null;   // cached fetch result
    this._overlay = null;
  }

  connectedCallback() {
    this.id = this.id || 'docs-sidebar';
    this.setAttribute('role', 'complementary');
    this.setAttribute('aria-label', this.getAttribute('label') ?? 'Documentation navigation');

    this._ensureOverlay();
    this._load();

    // Listen for mobile toggle events from <docs-header>
    document.addEventListener('docs:sidebar-toggle', (e) => {
      e.detail.open ? this._open() : this._close();
    });

    // Close sidebar when user clicks the overlay
    this._overlay.addEventListener('click', () => {
      this._close();
      document.dispatchEvent(new CustomEvent('docs:sidebar-toggle', {
        bubbles: true,
        detail: { open: false },
      }));
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('open')) {
        this._close();
        document.dispatchEvent(new CustomEvent('docs:sidebar-toggle', {
          bubbles: true,
          detail: { open: false },
        }));
      }
    });
  }

  attributeChangedCallback(name) {
    if (name === 'src' && this.isConnected) {
      this._navData = null; // invalidate cache
      this._load();
    }
  }

  /* ── Overlay element (mobile backdrop scrim) ── */
  _ensureOverlay() {
    let overlay = document.getElementById('docs-sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'docs-sidebar-overlay';
      overlay.className = 'docs-sidebar-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }
    this._overlay = overlay;
  }

  /* ── Fetch nav config ── */
  async _load() {
    const src = this.getAttribute('src');
    if (!src) {
      this._renderNav([]);
      return;
    }

    if (!this._navData) {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to load nav: ${res.status}`);
        this._navData = await res.json();
      } catch (err) {
        console.warn('[docs-sidebar]', err);
        this._navData = [];
      }
    }

    this._renderNav(this._navData);
  }

  /* ── Render nav markup ── */
  _renderNav(sections) {
    const currentPath = location.pathname.replace(/\/?$/, '/'); // normalise trailing slash
    const h2s = this._scrapeHeadings();

    // Build site-nav sections (all links, no inline sublinks)
    const siteNavHtml = sections.map((section) => {
      const linksHtml = section.links.map((link) => {
        const linkPath = link.href.replace(/\/?$/, '/');
        const isActive = currentPath === linkPath ||
          (currentPath.startsWith(linkPath) && linkPath !== '/docs/');

        return /* html */`
          <li class="docs-nav-item">
            <a
              class="docs-nav-link${isActive ? ' active' : ''}"
              href="${link.href}"
              ${isActive ? 'aria-current="page"' : ''}
            >${link.title}</a>
          </li>`;
      }).join('');

      const sectionLabelHtml = section.section
        ? /* html */`<p class="docs-nav-section-label">${section.section}</p>`
        : '';

      return /* html */`
        <div class="docs-nav-section">
          ${sectionLabelHtml}
          <ul class="docs-nav-list" role="list">
            ${linksHtml}
          </ul>
        </div>`;
    }).join('<hr class="docs-nav-divider" aria-hidden="true">');

    // Build page-headings block (only when there are headings to show)
    const headingsHtml = h2s.length ? /* html */`
      <hr class="docs-nav-divider" aria-hidden="true">
      <div class="docs-nav-section">
        <p class="docs-nav-section-label">On this page</p>
        <ul class="docs-nav-sublist" role="list">
          ${h2s.map(({ id, text }) => /* html */`
            <li class="docs-nav-subitem">
              <a class="docs-nav-sublink" href="#${id}" data-anchor="${id}">${text}</a>
            </li>
          `).join('')}
        </ul>
      </div>` : '';

    this.innerHTML = /* html */`
      <nav aria-label="${this.getAttribute('label') ?? 'Documentation navigation'}">
        ${siteNavHtml || '<p class="docs-nav-section-label" style="padding:.5rem">No navigation configured.</p>'}
        ${headingsHtml}
      </nav>`;

    this._bindSublinks();
    this._highlightActiveAnchor();
  }

  /* ── Scrape h2 headings from the current article ── */
  _scrapeHeadings() {
    const article = document.querySelector('.docs-article') ?? document.querySelector('main') ?? document.body;
    return Array.from(article.querySelectorAll('h2[id]')).map((el) => ({
      id: el.id,
      text: el.textContent.trim(),
    }));
  }

  /* ── Smooth-scroll sublinks + active-on-scroll highlight ── */
  _bindSublinks() {
    this.querySelectorAll('.docs-nav-sublink[data-anchor]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.getElementById(link.dataset.anchor);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', `#${link.dataset.anchor}`);

          // Close sidebar on mobile after anchor click
          if (window.matchMedia('(max-width: 960px)').matches) {
            this._close();
            document.dispatchEvent(new CustomEvent('docs:sidebar-toggle', {
              bubbles: true,
              detail: { open: false },
            }));
          }
        }
      });
    });
  }

  /* ── Highlight sublink matching the current URL hash ── */
  _highlightActiveAnchor() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const link = this.querySelector(`.docs-nav-sublink[data-anchor="${hash}"]`);
    link?.classList.add('active');
  }

  /* ── Mobile open / close ── */
  _open() {
    this.classList.add('open');
    this._overlay?.classList.add('open');
    // Trap focus back to first nav link when opened
    this.querySelector('.docs-nav-link')?.focus();
  }

  _close() {
    this.classList.remove('open');
    this._overlay?.classList.remove('open');
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
 * <docs-search>
 *
 * Observed attributes:
 *   index-src  — URL to search-index.json (default: /docs/search-index.json)
 *   placeholder — Input placeholder text
 *   max-results — Max dropdown results to show (default: 8)
 *
 * search-index.json entry schema:
 * {
 *   "id":       "introduction",
 *   "title":    "Introduction",
 *   "href":     "/docs/introduction/",
 *   "excerpt":  "A short description…",
 *   "category": "Getting Started",
 *   "tags":     ["intro", "start"],
 *   "headings": [ { "text": "Overview", "anchor": "overview" } ]
 * }
 *
 * Behaviour:
 *   - Fetches index-src once on first input focus; result cached in
 *     DocsSearch._indexCache (class-level, shared across all instances).
 *   - Matching: normalises query, then scores each entry by prefix hit on
 *     title/tags/headings (weight 3), excerpt (weight 1), and a simple Porter
 *     stem pass for common English suffixes.
 *   - Renders an ARIA combobox pattern (role=combobox / listbox / option).
 *   - Keyboard: ArrowDown/Up to move selection, Enter to navigate, Escape to
 *     clear input and close dropdown.
 * ─────────────────────────────────────────────────────────────────────────── */
class DocsSearch extends HTMLElement {
  static get observedAttributes() {
    return ['index-src', 'placeholder', 'max-results'];
  }

  /** Shared across all <docs-search> instances on the page */
  static _indexCache = null;
  static _indexPromise = null;

  constructor() {
    super();
    this._activeIndex = -1;  // currently highlighted result row
    this._results = [];  // current result set
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this._render();
      this._bindEvents();
    }
  }

  /* ── DOM skeleton ── */
  _render() {
    const placeholder = this.getAttribute('placeholder') ?? 'Search docs…';
    const inputId = `docs-search-input-${Math.random().toString(36).slice(2, 7)}`;
    const listId = `docs-search-list-${Math.random().toString(36).slice(2, 7)}`;

    this.innerHTML = /* html */`
      <div class="docs-search-wrapper">

        <span class="docs-search-icon" aria-hidden="true">
          ${SVG.make(SVG.SEARCH, { size: 16 }).outerHTML}
        </span>

        <input
          id="${inputId}"
          class="docs-search-input"
          type="text"
          role="combobox"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="${placeholder}"
          aria-label="Search documentation"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls="${listId}"
          aria-activedescendant=""
          style="outline:none;box-shadow:none;-webkit-appearance:none;appearance:none;border:none;background:transparent;"
        />

        <ul
          id="${listId}"
          class="docs-search-dropdown docs-search-dropdown-list"
          role="listbox"
          aria-label="Search results"
        ></ul>
      </div>
    `;

    // Stash references
    this._input = this.querySelector('input');
    this._list = this.querySelector('ul');
  }

  /* ── Event wiring ── */
  _bindEvents() {
    const input = this._input;
    if (!input) return;

    // Lazy-load index on first focus
    input.addEventListener('focus', () => this._ensureIndex(), { once: true });

    input.addEventListener('input', () => this._handleInput());

    input.addEventListener('keydown', (e) => this._handleKeydown(e));

    // "/" global shortcut — focus this search input
    document.addEventListener('keydown', (e) => {
      if (
        e.key === '/' &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) this._closeDropdown();
    });

    // Close on blur (with small delay so click-on-result fires first)
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!this.contains(document.activeElement)) this._closeDropdown();
      }, 150);
    });
  }

  /* ── Index loading ── */
  async _ensureIndex() {
    if (DocsSearch._indexCache) return;

    // Deduplicate concurrent fetches across multiple instances
    if (!DocsSearch._indexPromise) {
      const src = this.getAttribute('index-src') ?? '/docs/search-index.json';
      DocsSearch._indexPromise = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`[docs-search] HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          DocsSearch._indexCache = data;
          return data;
        })
        .catch((err) => {
          console.warn('[docs-search]', err);
          DocsSearch._indexCache = [];
        });
    }

    await DocsSearch._indexPromise;
  }

  /* ── Input handler ── */
  _handleInput() {
    const raw = this._input.value.trim();
    if (!raw) {
      this._closeDropdown();
      return;
    }
    this._activeIndex = -1;
    this._results = this._query(raw);
    this._renderResults(raw);
  }

  /* ── Client-side search ── */
  _query(raw) {
    const index = DocsSearch._indexCache;
    if (!index?.length) return [];

    const max = parseInt(this.getAttribute('max-results') ?? '8', 10);
    const tokens = this._tokenise(raw); // normalised query tokens

    const scored = index.map((entry) => {
      let score = 0;

      // Fields to search, with weights
      const fields = [
        { text: entry.title ?? '', weight: 4 },
        { text: (entry.tags ?? []).join(' '), weight: 3 },
        { text: (entry.headings ?? []).map((h) => h.text).join(' '), weight: 2 },
        { text: entry.category ?? '', weight: 2 },
        { text: entry.excerpt ?? '', weight: 1 },
      ];

      for (const token of tokens) {
        const stem = this._stem(token);
        for (const { text, weight } of fields) {
          const norm = this._normalise(text);
          // Prefix match
          if (norm.includes(token)) score += weight * 2;
          // Stem match (partial)
          else if (stem && norm.includes(stem)) score += weight;
        }
      }

      return { entry, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map(({ entry }) => entry);
  }

  /** Lowercase, remove punctuation, split on whitespace */
  _tokenise(str) {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  /** Normalise a field string for comparison */
  _normalise(str) {
    return str.toLowerCase().replace(/[^\w\s]/g, ' ');
  }

  /**
   * Minimal Porter-style suffix stripper for common English endings.
   * Returns the stem, or empty string if the word is too short to stem.
   */
  _stem(word) {
    if (word.length < 4) return '';
    return word
      .replace(/nesses$/, 'ness')
      .replace(/ments$/, 'ment')
      .replace(/ations$/, 'ate')
      .replace(/ings$/, 'ing')
      .replace(/tion$/, 'te')
      .replace(/ness$/, '')
      .replace(/ment$/, '')
      .replace(/ing$/, '')
      .replace(/ies$/, 'y')
      .replace(/ed$/, '')
      .replace(/er$/, '')
      .replace(/ly$/, '')
      .replace(/s$/, '');
  }

  /* ── Render dropdown results ── */
  _renderResults(raw) {
    const list = this._list;
    if (!list) return;

    list.innerHTML = '';

    if (!this._results.length) {
      list.innerHTML = `<li class="docs-search-no-results" role="option" aria-selected="false">
        No results for "${this._escHtml(raw)}"
      </li>`;
      this._appendFullSearchRow(raw);
      this._openDropdown();
      return;
    }

    this._results.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'docs-search-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.id = `docs-search-opt-${i}`;

      // Category badge
      const categoryHtml = entry.category
        ? `<span class="docs-search-item-category">${this._escHtml(entry.category)}</span>`
        : '';

      // Highlight matching tokens in title
      const titleHtml = this._highlight(entry.title ?? '', raw);

      // Excerpt
      const excerptHtml = entry.excerpt
        ? `<span class="docs-search-item-excerpt">${this._escHtml(entry.excerpt)}</span>`
        : '';

      // Matching headings sub-list
      let matchesHtml = '';
      if (entry.headings?.length) {
        const tokens = this._tokenise(raw);
        const matchedHeadings = entry.headings.filter((h) => {
          const norm = this._normalise(typeof h === 'string' ? h : h.text ?? '');
          return tokens.some((t) => norm.includes(t) || (this._stem(t) && norm.includes(this._stem(t))));
        });
        if (matchedHeadings.length) {
          const items = matchedHeadings.slice(0, 3).map((h) => {
            const text = typeof h === 'string' ? h : h.text ?? '';
            return `<li>${this._escHtml(text)}</li>`;
          }).join('');
          matchesHtml = `<ul class="docs-search-item-matches"><li style="font-size:0.75rem;font-weight:600;color:var(--docs-text-muted);list-style:none">Matches:</li>${items}</ul>`;
        }
      }

      li.innerHTML = /* html */`
        <span class="docs-search-item-icon" aria-hidden="true">
          ${SVG.make(SVG.BOOK_OPEN, { size: 15 }).outerHTML}
        </span>
        <span class="docs-search-item-body">
          ${categoryHtml}
          <span class="docs-search-item-title">${titleHtml}</span>
          ${excerptHtml}
          ${matchesHtml}
        </span>
      `;

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._navigate(entry.href);
      });

      li.addEventListener('mousemove', () => this._setActive(i));

      list.appendChild(li);
    });

    this._appendFullSearchRow(raw);
    this._openDropdown();
  }

  /** Append the "Full Search" footer item to the dropdown */
  _appendFullSearchRow(raw) {
    const list = this._list;
    if (!list) return;

    const li = document.createElement('li');
    li.className = 'docs-search-full-search';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.id = 'docs-search-opt-full';
    li.innerHTML = /* html */`
      ${SVG.make(SVG.SEARCH, { size: 14 }).outerHTML}
      See all results matching <strong>&ldquo;${this._escHtml(raw)}&rdquo;</strong>
    `;

    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._navigateFullSearch(raw);
    });

    li.addEventListener('mousemove', () => this._setActive(this._results.length));

    list.appendChild(li);
  }

  /* ── Keyboard navigation ── */
  _handleKeydown(e) {
    // +1 for the Full Search row at the end
    const total = this._results.length + 1;
    if (!this._isOpen()) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._setActive((this._activeIndex + 1) % total);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._setActive((this._activeIndex - 1 + total) % total);
        break;

      case 'Enter':
        e.preventDefault();
        if (this._activeIndex === this._results.length) {
          // Full Search row selected
          this._navigateFullSearch(this._input.value.trim());
        } else if (this._activeIndex >= 0 && this._results[this._activeIndex]) {
          this._navigate(this._results[this._activeIndex].href);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this._input.value = '';
        this._closeDropdown();
        break;
    }
  }

  /** Set visually and ARIA-selected row */
  _setActive(index) {
    // All selectable items: result rows + Full Search row
    const items = [
      ...this._list.querySelectorAll('.docs-search-item'),
      this._list.querySelector('.docs-search-full-search'),
    ].filter(Boolean);
    if (!items.length) return;

    // De-select previous
    if (this._activeIndex >= 0) {
      items[this._activeIndex]?.classList.remove('aria-selected');
      items[this._activeIndex]?.setAttribute('aria-selected', 'false');
    }

    this._activeIndex = index;
    const current = items[index];
    if (!current) return;

    current.setAttribute('aria-selected', 'true');
    this._input.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
  }

  /* ── Navigation ── */
  _navigate(href) {
    if (!href) return;
    this._closeDropdown();
    this._input.value = '';
    location.href = href;
  }

  _navigateFullSearch(query) {
    if (!query) return;
    this._closeDropdown();
    location.href = `/docs/list.html?q=${encodeURIComponent(query)}`;
  }

  /* ── Dropdown open / close ── */
  _isOpen() {
    return this._list?.classList.contains('open') ?? false;
  }

  _openDropdown() {
    this._list?.classList.add('open');
    this._input?.setAttribute('aria-expanded', 'true');
  }

  _closeDropdown() {
    this._list?.classList.remove('open');
    this._input?.setAttribute('aria-expanded', 'false');
    this._input?.setAttribute('aria-activedescendant', '');
    this._activeIndex = -1;
  }

  /* ── Helpers ── */
  _escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Wrap each matching token in <mark> */
  _highlight(text, raw) {
    const escaped = this._escHtml(text);
    const tokens = this._tokenise(raw);
    let result = escaped;

    for (const token of tokens) {
      const re = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    }

    return result;
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
 * <docs-grid>
 *
 * Observed attributes:
 *   src          — URL to search-index.json (default: /docs/search-index.json)
 *   ids          — Space-separated doc-id values to include, e.g. ids="intro faq"
 *   featured     — Boolean presence; when set, only entries with home-feature=true
 *                  are shown (overridden by ids if both present)
 *   category     — Filter to a single category string (case-insensitive)
 *   max          — Maximum cards to render (default: unlimited)
 *
 * Renders a .docs-grid of .docs-card anchor elements sourced from
 * search-index.json. Reuses DocsSearch._indexCache when available so the JSON
 * is never fetched twice on the same page.
 * ─────────────────────────────────────────────────────────────────────────── */
class DocsGrid extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'ids', 'featured', 'category', 'max'];
  }

  connectedCallback() {
    this._load();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._load();
  }

  /* ── Fetch (reuse search cache when possible) ── */
  async _load() {
    this._renderSkeleton();

    let index = DocsSearch._indexCache;

    if (!index) {
      const src = this.getAttribute('src') ?? '/docs/search-index.json';
      try {
        // Piggyback on any in-flight search fetch
        if (DocsSearch._indexPromise) {
          await DocsSearch._indexPromise;
          index = DocsSearch._indexCache ?? [];
        } else {
          DocsSearch._indexPromise = fetch(src)
            .then((r) => {
              if (!r.ok) throw new Error(`[docs-grid] HTTP ${r.status}`);
              return r.json();
            })
            .then((data) => {
              DocsSearch._indexCache = data;
              return data;
            })
            .catch((err) => {
              console.warn('[docs-grid]', err);
              DocsSearch._indexCache = [];
            });
          await DocsSearch._indexPromise;
          index = DocsSearch._indexCache ?? [];
        }
      } catch (err) {
        console.warn('[docs-grid]', err);
        index = [];
      }
    }

    this._renderCards(index);
  }

  /* ── Skeleton shimmer (shown while fetching) ── */
  _renderSkeleton() {
    const count = parseInt(this.getAttribute('max') ?? '3', 10);
    this.innerHTML = `<div class="docs-grid" aria-busy="true" aria-label="Loading articles">${Array.from({ length: Math.min(count, 6) }).map(() =>
      `<div class="docs-card" aria-hidden="true">
           <div class="docs-skeleton" style="width:32px;height:32px;border-radius:6px"></div>
           <div class="docs-skeleton" style="height:1rem;width:70%;margin-top:.5rem"></div>
           <div class="docs-skeleton" style="height:.75rem;width:90%;margin-top:.375rem"></div>
           <div class="docs-skeleton" style="height:.75rem;width:60%;margin-top:.25rem"></div>
         </div>`
    ).join('')
      }</div>`;
  }

  /* ── Filter and render cards ── */
  _renderCards(index) {
    let entries = index;

    // Priority 1: explicit ids list
    const idsAttr = this.getAttribute('ids');
    if (idsAttr) {
      const allowed = new Set(idsAttr.trim().split(/\s+/));
      entries = entries.filter((e) => allowed.has(e.id));
      // Preserve the author-specified order
      entries.sort((a, b) => {
        const ai = [...allowed].indexOf(a.id);
        const bi = [...allowed].indexOf(b.id);
        return ai - bi;
      });
    } else if (this.hasAttribute('featured')) {
      // Priority 2: featured flag
      entries = entries.filter((e) => e['home-feature'] === true || e['home-feature'] === 'true');
    }

    // Priority 3: optional category filter (stacks on top of either above)
    const catAttr = this.getAttribute('category');
    if (catAttr) {
      const cat = catAttr.trim().toLowerCase();
      entries = entries.filter((e) => (e.category ?? '').toLowerCase() === cat);
    }

    // Max cap
    const max = this.getAttribute('max');
    if (max) entries = entries.slice(0, parseInt(max, 10));

    if (!entries.length) {
      this.innerHTML = `
        <div class="docs-empty-state">
          ${SVG.make(SVG.BOOK_OPEN, { size: 40 }).outerHTML}
          <p>No articles found.</p>
        </div>`;
      return;
    }

    const cardsHtml = entries.map((entry) => {
      const category = entry.category
        ? `<span class="docs-card-category">${this._esc(entry.category)}</span>`
        : '';

      return /* html */`
        <a class="docs-card" href="/docs/${this._esc(entry.path)}">
          ${category}
          <span class="docs-card-title">${this._esc(entry.title ?? '')}</span>
          ${entry.excerpt ? `<span class="docs-card-excerpt">${this._esc(entry.excerpt)}</span>` : ''}
          <span class="docs-card-read-link" aria-hidden="true">Read Guide &rarr;</span>
        </a>`;
    }).join('');

    this.innerHTML = `<div class="docs-grid">${cardsHtml}</div>`;
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
 * <docs-anchor-helper>
 *
 * No observed attributes. Place once per article page as a sibling of
 * .docs-article (or inside it):
 *   <docs-anchor-helper></docs-anchor-helper>
 *
 * Behaviour:
 *   1. Injects a #-link anchor button after the text of every h2, h3, h4
 *      inside .docs-article that already has an id (or auto-generates one).
 *   2. Clicking the anchor copies the resolved URL to the clipboard and
 *      briefly flashes the heading with a 'copied' class.
 *   3. On DOMContentLoaded (or immediately if already loaded), smooth-scrolls
 *      to location.hash respecting the fixed header offset
 *      (--docs-header-height, defaults to 60px).
 * ─────────────────────────────────────────────────────────────────────────── */
class DocsAnchorHelper extends HTMLElement {
  connectedCallback() {
    // Wait one microtask so sibling .docs-article is in the DOM
    Promise.resolve().then(() => {
      this._injectAnchors();
      this._scrollToHash();
    });
  }

  /* ── Inject anchor links into headings ── */
  _injectAnchors() {
    const article = document.querySelector('.docs-article') ?? document.querySelector('main');
    if (!article) return;

    article.querySelectorAll('h2, h3, h4').forEach((heading) => {
      // Auto-generate id if missing
      if (!heading.id) {
        heading.id = this._slugify(heading.textContent);
      }

      // Skip if anchor already injected (e.g. hot-reload)
      if (heading.querySelector('.docs-anchor-link')) return;

      const link = document.createElement('a');
      link.className = 'docs-anchor-link';
      link.href = `#${heading.id}`;
      link.setAttribute('aria-label', `Link to section: ${heading.textContent.trim()}`);
      link.appendChild(SVG.make(SVG.CHEVRON_R, { size: 14 }));

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this._smoothScroll(heading.id);
        this._copyToClipboard(`${location.origin}${location.pathname}#${heading.id}`);
        this._flashHeading(heading);
      });

      heading.appendChild(link);
    });
  }

  /* ── Smooth scroll with header offset ── */
  _scrollToHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;

    const doScroll = () => {
      const target = document.getElementById(hash);
      if (target) this._smoothScroll(hash);
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      // Use rAF so layout is settled after anchor injection
      requestAnimationFrame(doScroll);
    } else {
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(doScroll), { once: true });
    }
  }

  _smoothScroll(id) {
    const target = document.getElementById(id);
    if (!target) return;

    // Read the CSS variable; fall back to 60px if not defined
    const headerH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--docs-header-height') || '60',
      10
    );

    const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  }

  /* ── Clipboard copy ── */
  async _copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Clipboard API unavailable (HTTP / older browser) — silent fail
    }
  }

  /* ── Briefly highlight the heading to confirm copy ── */
  _flashHeading(heading) {
    heading.classList.add('copied');
    setTimeout(() => heading.classList.remove('copied'), 1500);
  }

  /* ── Slug generator ── */
  _slugify(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
 * Register custom elements
 * ─────────────────────────────────────────────────────────────────────────── */
if (!customElements.get('docs-header')) customElements.define('docs-header', DocsHeader);
if (!customElements.get('docs-sidebar')) customElements.define('docs-sidebar', DocsSidebar);
if (!customElements.get('docs-search')) customElements.define('docs-search', DocsSearch);
if (!customElements.get('docs-grid')) customElements.define('docs-grid', DocsGrid);
if (!customElements.get('docs-anchor-helper')) customElements.define('docs-anchor-helper', DocsAnchorHelper);
