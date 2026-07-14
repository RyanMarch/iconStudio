/**
 * Reusable Web Components for Icon Studio
 */

class IconStudioLogo extends HTMLElement {
    connectedCallback() {
        this.innerHTML = /*html*/`
            <img src="/assets/favicon/favicon.svg" alt="Icon Studio Logo" style="width: 100%; height: 100%; display: block;" />
        `;
    }
}

class IconStudioHeader extends HTMLElement {
    connectedCallback() {
        const activePage = this.getAttribute('active-page') || '';

        const navLinks = [
            { href: '/app/', label: 'App', key: 'app' },
            { href: '/support/', label: 'Guides', key: 'guides' }
        ];

        const navHTML = navLinks
            .map(({ href, label, key }) => {
                const isActive = activePage === key ? ' active' : '';
                return `<a href="${href}" class="nav-link${isActive}">${label}</a>`;
            })
            .join('');

        this.innerHTML = /*html*/ `
            <header class="app-header">
                <a href="/" class="header-logo" style="text-decoration: none;">
                    <iconstudio-logo></iconstudio-logo>
                    <span class="header-logo-name">Icon Studio</span>
                </a>
                <div class="header-actions">
                    <nav class="header-nav" aria-label="Main Navigation">
                        ${navHTML}
                    </nav>
                    <button id="mobile-nav-toggle" class="mobile-nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </header>
        `;

        const toggleBtn = this.querySelector('#mobile-nav-toggle');
        const headerNav = this.querySelector('.header-nav');
        if (toggleBtn && headerNav) {
            toggleBtn.addEventListener('click', () => {
                const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', !isExpanded);
                headerNav.classList.toggle('active', !isExpanded);

                const menuIcon = toggleBtn.querySelector('.menu-icon');
                const closeIcon = toggleBtn.querySelector('.close-icon');
                if (menuIcon && closeIcon) {
                    menuIcon.style.display = isExpanded ? 'block' : 'none';
                    closeIcon.style.display = isExpanded ? 'none' : 'block';
                }
            });
        }
    }
}

class IconStudioFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = /*html*/ `
            <footer class="page-footer">
                <div class="footer-container">
                    <p class="footer-copyright">&copy; <span id="copyright-year">${new Date().getFullYear()}</span> Icon Studio • <a href="https://ryanmarch.me/">Ryan March</a></p>
                    <div class="footer-links">
                        <a href="/terms/" class="footer-link">Terms</a>
                        <a href="/terms/#privacy-policy" class="footer-link">Privacy</a>
                    </div>
                    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
                        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        <svg class="system-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <span id="theme-status" class="theme-status"></span>
                    </button>
                </div>
            </footer>
        `;

        const themeToggle = this.querySelector('#theme-toggle');
        const themeStatus = this.querySelector('#theme-status');
        let themeStatusTimeout;

        const updateThemeColorMeta = (theme) => {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) return;
            let isLight = false;
            if (theme === 'light') {
                isLight = true;
            } else if (theme === 'system') {
                isLight = !window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            meta.setAttribute('content', isLight ? '#8aaacc' : '#020617');
        };

        const showThemeStatus = (text) => {
            if (!themeStatus) return;
            themeStatus.textContent = text;
            themeStatus.classList.add('visible');
            clearTimeout(themeStatusTimeout);
            themeStatusTimeout = setTimeout(() => {
                themeStatus.classList.remove('visible');
            }, 2000);
        };

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (typeof window.triggerHaptic === 'function') {
                    window.triggerHaptic();
                }
                const currentTheme = localStorage.getItem('theme') || 'dark';
                let newTheme;
                let statusText;

                if (currentTheme === 'dark') {
                    newTheme = 'light';
                    statusText = 'Light Theme';
                } else if (currentTheme === 'light') {
                    newTheme = 'system';
                    statusText = 'System Theme';
                } else {
                    newTheme = 'dark';
                    statusText = 'Dark Theme';
                }

                if (newTheme === 'system') {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', newTheme);
                }

                localStorage.setItem('theme', newTheme);
                updateThemeColorMeta(newTheme);
                showThemeStatus(statusText);
            });
        }
    }
}

customElements.define('iconstudio-logo', IconStudioLogo);
customElements.define('iconstudio-header', IconStudioHeader);
customElements.define('iconstudio-footer', IconStudioFooter);
