'use strict';
'require baseclass';
'require ui';

/**
 * Slide animation utilities replacing legacy jQuery slideUp/slideDown
 */
const SlideAnimations = {
	durations: {
		fast: 200,
		normal: 300
	},

	getDuration(d) {
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
			return 0;
		return typeof d === 'string' ? (this.durations[d] || this.durations.normal) : (d || this.durations.normal);
	},

	slideDown(element, duration, callback) {
		if (!element) return;
		this.stop(element);
		const animDuration = this.getDuration(duration);

		element.style.display = 'block';
		element.style.overflow = 'hidden';
		element.style.height = '0px';
		element.style.transition = 'height ' + animDuration + 'ms ease-out';
		element.offsetHeight; // force reflow

		const targetHeight = element.scrollHeight;
		element.style.height = targetHeight + 'px';

		const timer = setTimeout(() => {
			element.style.height = '';
			element.style.overflow = '';
			element.style.transition = '';
			delete element._slideTimer;
			if (typeof callback === 'function') callback();
		}, animDuration);
		element._slideTimer = timer;
	},

	slideUp(element, duration, callback) {
		if (!element) return;
		this.stop(element);
		const animDuration = this.getDuration(duration);

		element.style.overflow = 'hidden';
		element.style.height = element.scrollHeight + 'px';
		element.style.transition = 'height ' + animDuration + 'ms ease-out';
		element.offsetHeight; // force reflow

		element.style.height = '0px';

		const timer = setTimeout(() => {
			element.style.display = 'none';
			element.style.height = '';
			element.style.overflow = '';
			element.style.transition = '';
			delete element._slideTimer;
			if (typeof callback === 'function') callback();
		}, animDuration);
		element._slideTimer = timer;
	},

	stop(element) {
		if (element && element._slideTimer) {
			clearTimeout(element._slideTimer);
			delete element._slideTimer;
			element.style.transition = '';
			element.offsetHeight;
		}
	}
};

/**
 * Smart Colorizer Engine
 * Enriches LuCI telemetry with contextual semantic tags for:
 * - Signal quality & WiFi connectivity
 * - Data rates and link speeds
 * - Traffic direction (TX/RX counters)
 * - Frequency bands (2.4G, 5G, 6G)
 * - System resource usage levels (Memory, Storage, CPU)
 * - Port statuses
 */
const Colorizer = {
	isBusy: false,
	rafId: null,

	init() {
		this.schedule();
		const target = document.querySelector('#maincontent') || document.body;
		if (target) {
			const observer = new MutationObserver(() => this.schedule());
			observer.observe(target, { childList: true, subtree: true });
		}
	},

	schedule() {
		if (this.rafId !== null) return;
		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.colorize();
		});
	},

	colorize() {
		if (this.isBusy) return;
		this.isBusy = true;
		try {
			this.colorizeProgressBars();
			this.colorizeElements();
		} catch (err) {
			console.warn('Feelgood Colorizer error:', err);
		} finally {
			this.isBusy = false;
		}
	},

	colorizeProgressBars() {
		const bars = document.querySelectorAll('.cbi-progressbar');
		for (let i = 0; i < bars.length; i++) {
			const bar = bars[i];
			const child = bar.firstElementChild;
			let pct = null;

			if (child && child.style.width) {
				const m = child.style.width.match(/(\d+(?:\.\d+)?)%/);
				if (m) pct = parseFloat(m[1]);
			}
			if (pct === null && bar.getAttribute('title')) {
				const m = bar.getAttribute('title').match(/(\d+(?:\.\d+)?)%/);
				if (m) pct = parseFloat(m[1]);
			}
			if (pct === null && bar.textContent) {
				const m = bar.textContent.match(/(\d+(?:\.\d+)?)%/);
				if (m) pct = parseFloat(m[1]);
			}

			if (pct !== null) {
				const level = pct >= 85 ? 'critical' : (pct >= 60 ? 'warning' : 'normal');
				if (bar.getAttribute('data-level') !== level)
					bar.setAttribute('data-level', level);
			}
		}
	},

	colorizeElements() {
		const cells = document.querySelectorAll('#maincontent td, #maincontent .td, #maincontent .ifacebox-body, #maincontent .cbi-value-field');
		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];

			// Never modify cells containing input controls
			if (cell.querySelector('input, select, textarea, button, form, .cbi-dropdown'))
				continue;

			// Skip if already parsed and content hasn't changed
			if (cell.dataset.colorizedText === cell.textContent)
				continue;

			this.processCell(cell);
		}
	},

	processCell(cell) {
		const rawText = cell.textContent.trim();
		if (!rawText) return;

		let html = cell.innerHTML;
		let modified = false;

		// 1. WiFi Signal & Quality (e.g. "-54 dBm" or "Signal: -65 dBm / Quality: 80%")
		if (/-?\d+\s*dBm/i.test(html) && !cell.querySelector('.badge-signal')) {
			html = html.replace(/(-?\d+)\s*dBm/gi, (match, valStr) => {
				const val = Math.abs(parseInt(valStr, 10));
				let q = 'poor';
				if (val <= 55) q = 'excellent';
				else if (val <= 67) q = 'good';
				else if (val <= 79) q = 'fair';
				else if (val >= 90) q = 'noise'; // Noise floor indicator

				return `<span class="badge-colored badge-signal" data-quality="${q}">${match}</span>`;
			});
			modified = true;
		}

		// 2. Data Rates (e.g. "866.7 Mbit/s", "1.2 Gbit/s", "54 Mbit/s")
		if (/\b\d+(?:\.\d+)?\s*(?:Gbit\/s|Mbit\/s|Kbit\/s|Gbps|Mbps|Kbps)\b/i.test(html) && !cell.querySelector('.badge-rate')) {
			html = html.replace(/(\d+(?:\.\d+)?)\s*(Gbit\/s|Mbit\/s|Kbit\/s|Gbps|Mbps|Kbps)/gi, (match, numStr, unit) => {
				let num = parseFloat(numStr);
				const u = unit.toLowerCase();
				if (u.startsWith('g')) num *= 1000;
				else if (u.startsWith('k')) num /= 1000;

				let tier = 'low';
				if (num >= 1000) tier = 'gigabit';
				else if (num >= 100) tier = 'fast';
				else if (num >= 10) tier = 'normal';

				return `<span class="badge-colored badge-rate" data-speed="${tier}">${match}</span>`;
			});
			modified = true;
		}

		// 3. Traffic direction indicators (▲ TX and ▼ RX)
		if ((html.includes('▲') || html.includes('▼')) && !cell.querySelector('.badge-traffic')) {
			html = html
				.replace(/▲\s*([^<,\n\r]+)/g, '<span class="badge-colored badge-traffic badge-tx"><span class="traffic-icon">▲</span> $1</span>')
				.replace(/▼\s*([^<,\n\r]+)/g, '<span class="badge-colored badge-traffic badge-rx"><span class="traffic-icon">▼</span> $1</span>');
			modified = true;
		}

		// 4. WiFi Frequency Bands (e.g. "5.180 GHz" or "2.437 GHz" or "6 GHz")
		if (/\b\d+(?:\.\d+)?\s*GHz\b/i.test(html) && !cell.querySelector('.badge-band')) {
			html = html.replace(/(\d+(?:\.\d+)?)\s*GHz/gi, (match, freqStr) => {
				const freq = parseFloat(freqStr);
				let band = '2g';
				if (freq >= 5.9) band = '6g';
				else if (freq >= 4.9) band = '5g';

				return `<span class="badge-colored badge-band" data-band="${band}">${match}</span>`;
			});
			modified = true;
		}

		// 5. Port Link Speeds (e.g. "1000baseT/Full", "100baseT/Full", "no link")
		if (/(?:1000base|2500base|100base|10gbase|no link)/i.test(html) && !cell.querySelector('.badge-link')) {
			html = html.replace(/\b([0-9]+base[A-Za-z0-9\/]+|no link)\b/gi, (match) => {
				let tier = 'low';
				if (/10000base|10gbase/i.test(match)) tier = 'gigabit';
				else if (/2500base|2\.5g/i.test(match)) tier = 'gigabit';
				else if (/1000base/i.test(match)) tier = 'gigabit';
				else if (/100base/i.test(match)) tier = 'fast';
				else if (/no link/i.test(match)) tier = 'down';

				return `<span class="badge-colored badge-link" data-link-speed="${tier}">${match}</span>`;
			});
			modified = true;
		}

		// 6. Uptime stability tag
		if (/^\s*\d+d\s+\d+h/i.test(rawText) && !cell.querySelector('.badge-uptime')) {
			html = `<span class="badge-colored badge-uptime" data-uptime="stable">${html}</span>`;
			modified = true;
		} else if (/^\s*(?:[0-5]?[0-9]m|[0-5]?[0-9]s)/i.test(rawText) && !/\d+h|\d+d/i.test(rawText) && !cell.querySelector('.badge-uptime') && rawText.length < 15) {
			html = `<span class="badge-colored badge-uptime" data-uptime="recent">${html}</span>`;
			modified = true;
		}

		// 7. System Thermal / Temperature (e.g. "48.5 °C", "52°C", "110°F")
		if (/\b\d+(?:\.\d+)?\s*(?:°C|℃|°F|℉)\b/i.test(html) && !cell.querySelector('.badge-thermal')) {
			html = html.replace(/(\d+(?:\.\d+)?)\s*(°C|℃|°F|℉)/gi, (match, valStr, unit) => {
				let tempC = parseFloat(valStr);
				if (unit.includes('F') || unit.includes('℉'))
					tempC = (tempC - 32) * 5 / 9;

				let tier = 'normal';
				if (tempC < 50) tier = 'cool';
				else if (tempC < 70) tier = 'normal';
				else if (tempC < 85) tier = 'hot';
				else tier = 'critical';

				return `<span class="badge-colored badge-thermal" data-temp="${tier}"><span class="thermal-icon">🌡️</span> ${match}</span>`;
			});
			modified = true;
		}

		// 8. IP Addresses (e.g. "192.168.8.1" or "10.0.0.1/24")
		if (/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/\d{1,2})?\b/.test(html) && !cell.querySelector('.badge-ip')) {
			html = html.replace(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/\d{1,2})?\b/g, (match) => {
				return `<span class="badge-colored badge-ip"><span class="ip-icon">🌐</span> ${match}</span>`;
			});
			modified = true;
		}

		// 9. MAC Addresses (e.g. "00:1A:2B:3C:4D:5E")
		if (/\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/.test(html) && !cell.querySelector('.badge-mac')) {
			html = html.replace(/\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g, (match) => {
				return `<span class="badge-colored badge-mac"><span class="mac-icon">🏷️</span> ${match}</span>`;
			});
			modified = true;
		}

		// 10. Operational Status Keywords (Only when exact short cell or tagged)
		if (/^(?:Connected|Associated|Running|Up|Online)$/i.test(rawText) && !cell.querySelector('.badge-status-good')) {
			html = `<span class="badge-colored badge-status-good">${rawText}</span>`;
			modified = true;
		} else if (/^(?:Disabled|Stopped|Down|Disconnected|Offline)$/i.test(rawText) && !cell.querySelector('.badge-status-bad')) {
			html = `<span class="badge-colored badge-status-bad">${rawText}</span>`;
			modified = true;
		} else if (/^(?:Restarting|Pending|Reloading)$/i.test(rawText) && !cell.querySelector('.badge-status-warn')) {
			html = `<span class="badge-colored badge-status-warn">${rawText}</span>`;
			modified = true;
		}

		if (modified) {
			cell.innerHTML = html;
			cell.dataset.colorizedText = cell.textContent;
		}
	}
};

/**
 * Feelgood Theme Main Module
 */
return baseclass.extend({
	__init__() {
		this.oScroll = null;
		this.setupThemeSwitcher();
		ui.menu.load().then(this.render.bind(this));
	},

	setupThemeSwitcher() {
		// 1. Navigation Orientation (Horizontal vs Vertical) - Default: horizontal
		const currentNav = document.documentElement.getAttribute('data-theme-nav') ||
			localStorage.getItem('luci-theme-feelgood-nav') || 'horizontal';
		document.documentElement.setAttribute('data-theme-nav', currentNav);

		const navBtn = document.querySelector('#nav_layout_btn');
		if (navBtn) {
			const navLabel = navBtn.querySelector('.nav-label');
			const navIcon = navBtn.querySelector('.toggle-icon');
			const updateNavUI = (nav) => {
				if (navLabel) navLabel.textContent = nav === 'vertical' ? 'Vertical' : 'Horizontal';
				if (navIcon) navIcon.textContent = nav === 'vertical' ? '⬍' : '⬌';
				navBtn.setAttribute('title', nav === 'vertical' ? _('Switch to Horizontal Navigation') : _('Switch to Vertical Navigation'));
			};
			updateNavUI(currentNav);

			navBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const oldNav = document.documentElement.getAttribute('data-theme-nav') || 'horizontal';
				const nextNav = oldNav === 'horizontal' ? 'vertical' : 'horizontal';
				document.documentElement.setAttribute('data-theme-nav', nextNav);
				localStorage.setItem('luci-theme-feelgood-nav', nextNav);
				updateNavUI(nextNav);
			});
		}

		// 2. Color Theme (Dark vs Light/White) - Default: dark
		const currentColor = document.documentElement.getAttribute('data-theme-color') ||
			localStorage.getItem('luci-theme-feelgood-color') || 'dark';
		document.documentElement.setAttribute('data-theme-color', currentColor);
		document.documentElement.setAttribute('data-theme-style', currentColor === 'dark' ? 'modern' : 'light');

		const colorBtn = document.querySelector('#theme_color_btn') || document.querySelector('#theme_style_btn');
		if (colorBtn) {
			const colorLabel = colorBtn.querySelector('.color-label') || colorBtn.querySelector('.style-label');
			const colorIcon = colorBtn.querySelector('.toggle-icon') || colorBtn.querySelector('.style-icon');
			const updateColorUI = (color) => {
				if (colorLabel) colorLabel.textContent = color === 'light' ? 'Light' : 'Dark';
				if (colorIcon) colorIcon.textContent = color === 'light' ? '☀️' : '🌙';
				colorBtn.setAttribute('title', color === 'light' ? _('Switch to Dark Theme') : _('Switch to White / Light Theme'));
			};
			updateColorUI(currentColor);

			colorBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const oldColor = document.documentElement.getAttribute('data-theme-color') || 'dark';
				const nextColor = oldColor === 'dark' ? 'light' : 'dark';
				document.documentElement.setAttribute('data-theme-color', nextColor);
				document.documentElement.setAttribute('data-theme-style', nextColor === 'dark' ? 'modern' : 'light');
				localStorage.setItem('luci-theme-feelgood-color', nextColor);
				updateColorUI(nextColor);

				// Re-colorize telemetry
				Colorizer.schedule();
			});
		}
	},

	render(tree) {
		var node = tree;
		var url = '';

		// 1. Hide loading overlay
		var loading = document.querySelector('.loading');
		if (loading) {
			loading.style.opacity = '0';
			loading.style.visibility = 'hidden';
		}

		// 2. Render mode menu (modemenu in footer)
		this.renderModeMenu(node);

		// 3. Render tab menu (if dispatch path >= 3)
		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}

		// 4. Attach sidebar toggle event listeners
		var showSide = document.querySelector('.showSide');
		var darkMask = document.querySelector('.darkMask');

		if (showSide)
			showSide.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

		if (darkMask)
			darkMask.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

		window.addEventListener('resize', ui.createHandlerFn(this, 'handleResize'), true);

		// 5. Setup password visibility toggle
		this.setupPasswordToggle();

		// 6. Update body classes for view styling
		this.updateBodyClasses();

		// 7. Initialize custom scrollbar on desktop
		this.initScrollBar();

		// 8. Initialize Smart Colorizer
		Colorizer.init();
	},

	renderMainMenu(tree, url, level) {
		var currentLevel = (level || 0) + 1;
		var children = ui.menu.getChildren(tree);

		if (children.length === 0 || currentLevel > 2)
			return E([]);

		var ul = E('ul', { 'class': level ? 'slide-menu' : 'nav scroll' });

		for (var i = 0; i < children.length; i++) {
			var child = children[i];

			// Handle Logout node specifically
			if (currentLevel === 1 && (child.name === 'logout' || child.name === 'admin/logout')) {
				var logoutBtn = document.querySelector('#logout_btn');
				if (logoutBtn) {
					var logoutA = logoutBtn.querySelector('a');
					if (logoutA) {
						logoutA.href = L.url(child.name);
						logoutA.textContent = _(child.title);
					}
					logoutBtn.style.display = 'inline-block';
				}
				continue;
			}

			var submenu = this.renderMainMenu(child, url + '/' + child.name, currentLevel);
			var hasChildren = submenu.children.length > 0;

			// If level 1 child has no children and resembles logout
			if (currentLevel === 1 && !hasChildren && child.name.indexOf('logout') !== -1) {
				var logoutBtn = document.querySelector('#logout_btn');
				if (logoutBtn) {
					var logoutA = logoutBtn.querySelector('a');
					if (logoutA) {
						logoutA.href = L.url(url, child.name);
						logoutA.textContent = _(child.title);
					}
					logoutBtn.style.display = 'inline-block';
				}
				continue;
			}

			var isActive = (
				(L.env.dispatchpath[currentLevel] === child.name) &&
				(L.env.dispatchpath[currentLevel - 1] === tree.name)
			);

			if (hasChildren) {
				var liClass = 'slide' + (isActive ? ' active' : '');
				var aClass = 'menu' + (isActive ? ' active' : '');
				if (isActive)
					submenu.style.display = 'block';
				else
					submenu.style.display = 'none';

				var li = E('li', { 'class': liClass }, [
					E('a', {
						'class': aClass,
						'data-title': child.title.replace(/\s+/g, '_'),
						'href': '#',
						'click': ui.createHandlerFn(this, 'handleMenuExpand')
					}, [ _(child.title) ]),
					submenu
				]);
				ul.appendChild(li);
			} else {
				var liClass = isActive ? 'active' : '';
				var li = E('li', { 'class': liClass }, [
					E('a', {
						'data-title': child.title.replace(/\s+/g, '_'),
						'href': L.url(url, child.name),
						'click': function() {
							var loading = document.querySelector('.loading');
							if (loading) {
								loading.style.opacity = '1';
								loading.style.visibility = 'visible';
							}
						}
					}, [ _(child.title) ])
				]);
				ul.appendChild(li);
			}
		}

		if (currentLevel === 1) {
			var navBox = document.querySelector('#navBox');
			if (navBox) {
				navBox.innerHTML = '';
				navBox.appendChild(ul);
			}
		}

		return ul;
	},

	renderHorizontalMenu(tree, url) {
		var topNavBox = document.querySelector('#topNavBox');
		if (!topNavBox) return;

		var children = ui.menu.getChildren(tree);
		if (!children || children.length === 0) return;

		var ul = E('ul', { 'class': 'nav-horizontal' });

		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child.name === 'logout' || child.name === 'admin/logout')
				continue;

			var subChildren = ui.menu.getChildren(child);
			var hasChildren = subChildren.length > 0;
			var isTopActive = (L.env.dispatchpath && L.env.dispatchpath[1] === child.name);

			if (hasChildren) {
				var subUl = E('ul', { 'class': 'dropdown-menu' });
				for (var j = 0; j < subChildren.length; j++) {
					var subChild = subChildren[j];
					var isSubActive = isTopActive && (L.env.dispatchpath && L.env.dispatchpath[2] === subChild.name);
					var subLi = E('li', { 'class': 'dropdown-item' + (isSubActive ? ' active' : '') }, [
						E('a', {
							'href': L.url(url, child.name, subChild.name),
							'click': function() {
								var loading = document.querySelector('.loading');
								if (loading) {
									loading.style.opacity = '1';
									loading.style.visibility = 'visible';
								}
							}
						}, [ _(subChild.title) ])
					]);
					subUl.appendChild(subLi);
				}

				var topLi = E('li', {
					'class': 'nav-item has-dropdown' + (isTopActive ? ' active' : ''),
					'mouseenter': function() {
						var d = this.querySelector('.dropdown-menu');
						if (d) d.classList.add('show');
					},
					'mouseleave': function() {
						var d = this.querySelector('.dropdown-menu');
						if (d) d.classList.remove('show');
					}
				}, [
					E('a', {
						'class': 'nav-link' + (isTopActive ? ' active' : ''),
						'href': '#',
						'click': function(e) {
							e.preventDefault();
							e.stopPropagation();
							var d = this.parentNode.querySelector('.dropdown-menu');
							if (d) {
								var wasShow = d.classList.contains('show');
								var all = document.querySelectorAll('.nav-horizontal .dropdown-menu.show');
								for (var k = 0; k < all.length; k++) all[k].classList.remove('show');
								if (!wasShow) d.classList.add('show');
							}
						}
					}, [
						E('span', { 'class': 'nav-title' }, [ _(child.title) ]),
						E('span', { 'class': 'dropdown-caret' }, [ '▾' ])
					]),
					subUl
				]);
				ul.appendChild(topLi);
			} else {
				var isTopActive = (L.env.dispatchpath && L.env.dispatchpath[1] === child.name);
				var topLi = E('li', { 'class': 'nav-item' + (isTopActive ? ' active' : '') }, [
					E('a', {
						'class': 'nav-link' + (isTopActive ? ' active' : ''),
						'href': L.url(url, child.name),
						'click': function() {
							var loading = document.querySelector('.loading');
							if (loading) {
								loading.style.opacity = '1';
								loading.style.visibility = 'visible';
							}
						}
					}, [
						E('span', { 'class': 'nav-title' }, [ _(child.title) ])
					])
				]);
				ul.appendChild(topLi);
			}
		}

		topNavBox.innerHTML = '';
		topNavBox.appendChild(ul);

		if (!this._dropdownDismissBound) {
			this._dropdownDismissBound = true;
			document.addEventListener('click', function(e) {
				if (!e.target.closest('.nav-item.has-dropdown')) {
					var openDropdowns = document.querySelectorAll('.nav-horizontal .dropdown-menu.show');
					for (var k = 0; k < openDropdowns.length; k++)
						openDropdowns[k].classList.remove('show');
				}
			});
		}
	},

	renderModeMenu(tree) {
		var menu = document.querySelector('#modemenu');
		if (!menu) return;

		var children = ui.menu.getChildren(tree);
		for (var i = 0; i < children.length; i++) {
			var isActive = (L.env.requestpath.length ? children[i].name == L.env.requestpath[0] : i === 0);
			if (i > 0)
				menu.appendChild(E('span', { 'class': 'divider' }, [' | ']));

			menu.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': L.url(children[i].name) }, [ _(children[i].title) ])
			]));

			if (isActive) {
				this.renderMainMenu(children[i], children[i].name);
				this.renderHorizontalMenu(children[i], children[i].name);
			}
		}

		if (children.length > 1)
			menu.style.display = '';
	},

	renderTabMenu(tree, url, level) {
		var container = document.querySelector('#tabmenu');
		if (!container) return E([]);

		var currentLevel = (level || 0) + 1;
		var ul = E('ul', { 'class': 'tabs' });
		var children = ui.menu.getChildren(tree);
		var activeNode = null;

		if (children.length === 0)
			return E([]);

		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			var isActive = (L.env.dispatchpath[currentLevel + 2] === child.name);
			var activeClass = isActive ? ' active' : '';
			var className = 'tabmenu-item-' + child.name + activeClass;

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ])
			]));

			if (isActive)
				activeNode = child;
		}

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, currentLevel);

		return ul;
	},

	handleMenuExpand(ev) {
		var a = ev.currentTarget;
		var slide = a.parentNode;
		var slideMenu = a.nextElementSibling;
		if (!slideMenu) return;

		var isOpen = slideMenu.style.display === 'block' || a.classList.contains('active');

		// Close other open submenus
		var allActiveMenus = document.querySelectorAll('.main-left .nav > .slide > .slide-menu');
		for (var i = 0; i < allActiveMenus.length; i++) {
			var menu = allActiveMenus[i];
			if (menu !== slideMenu) {
				SlideAnimations.stop(menu);
				SlideAnimations.slideUp(menu, 'fast');
				menu.classList.remove('active');
				if (menu.previousElementSibling)
					menu.previousElementSibling.classList.remove('active');
				if (menu.parentNode)
					menu.parentNode.classList.remove('active');
			}
		}

		if (isOpen) {
			SlideAnimations.slideUp(slideMenu, 'fast', () => {
				a.classList.remove('active');
				slideMenu.classList.remove('active');
				slide.classList.remove('active');
			});
		} else {
			a.classList.add('active');
			slideMenu.classList.add('active');
			slide.classList.add('active');
			SlideAnimations.slideDown(slideMenu, 'fast');
		}

		if (this.oScroll)
			this.oScroll.setSize(200);

		ev.preventDefault();
		ev.stopPropagation();
	},

	handleSidebarToggle(ev) {
		var mainLeft = document.querySelector('.main-left');
		var darkMask = document.querySelector('.darkMask');
		var mainRight = document.querySelector('.main-right');
		if (!mainLeft) return;

		var isOpen = mainLeft.classList.contains('open') || mainLeft.style.width === '100%';

		if (isOpen) {
			if (darkMask) darkMask.style.display = 'none';
			mainLeft.style.width = '0';
			mainLeft.classList.remove('open');
			if (mainRight) mainRight.style.overflowY = 'auto';
		} else {
			if (darkMask) darkMask.style.display = 'block';
			mainLeft.style.width = '100%';
			mainLeft.classList.add('open');
			if (mainRight) mainRight.style.overflowY = 'hidden';
		}

		ev.preventDefault();
		ev.stopPropagation();
	},

	handleResize(ev) {
		var mainLeft = document.querySelector('.main-left');
		var darkMask = document.querySelector('.darkMask');
		if (window.innerWidth > 992) {
			if (mainLeft) {
				mainLeft.style.width = '';
				mainLeft.classList.remove('open');
			}
			if (darkMask) {
				darkMask.style.display = 'none';
			}
		}
	},

	setupPasswordToggle() {
		var eyeBtns = document.querySelectorAll('.pwd-eye-icon, .login > .main .cbi-value-last .cbi-value-field > div');
		if (eyeBtns.length === 0) {
			var pwdField = document.querySelector('.login input[name="luci_password"]');
			if (pwdField && pwdField.parentNode && !pwdField.parentNode.querySelector('.pwd-eye-icon')) {
				var eye = E('div', { 'class': 'pwd-eye-icon' });
				pwdField.parentNode.appendChild(eye);
				eyeBtns = [eye];
			}
		}

		for (var i = 0; i < eyeBtns.length; i++) {
			var btn = eyeBtns[i];
			btn.addEventListener('click', function(e) {
				var parent = this.parentNode;
				var input = parent.querySelector('input[type="password"], input[type="text"]');
				if (!input) return;

				if (parent.classList.contains('op-eye')) {
					parent.classList.remove('op-eye');
					input.type = 'password';
				} else {
					parent.classList.add('op-eye');
					input.type = 'text';
				}
			});
		}
	},

	updateBodyClasses() {
		var path = L.env.dispatchpath;
		if (!path || !path.length) return;

		// Clear previous dynamic node- classes
		var classes = document.body.className.split(/\s+/);
		for (var i = 0; i < classes.length; i++) {
			if (classes[i].indexOf('node-') === 0 && classes[i] !== 'node-main-login') {
				document.body.classList.remove(classes[i]);
			}
		}

		if (path[0] === 'admin' && path.length > 2) {
			document.body.classList.add('node-' + path[1] + '-' + path[2]);
		}
		document.body.classList.add('node-' + path.join('-'));
	},

	initScrollBar() {
		if (typeof window.MyScrollBar === 'function' && window.innerWidth > 992) {
			var navBox = document.getElementById('navBox');
			if (navBox && navBox.querySelector('.nav')) {
				try {
					this.oScroll = new window.MyScrollBar({
						selId: 'navBox',
						time: 100,
						bgColor: 'transparent',
						barColor: 'rgba(131, 157, 214, 0.48)',
						enterColor: 'rgba(131, 157, 214, 0.8)',
						enterShow: false
					});
				} catch (e) {
					console.warn('MyScrollBar init failed:', e);
				}
			}
		}
	}
});
