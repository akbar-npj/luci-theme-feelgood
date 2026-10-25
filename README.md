# LuCI Feelgood Theme

## About
Feelgood is a concise, modern, and flat theme for OpenWrt's LuCI web administration interface. Originally based on `luci-theme-material`, it provides a sleek responsive layout for desktop, tablet, and mobile browsers.

This theme has been fully ported to support modern OpenWrt releases (**OpenWrt 21.02, 22.03, 23.05, 24.10, and 25.x / master**) using the modern LuCI client-side JavaScript architecture and `ucode` (`.ut`) template engine, while preserving backward compatibility with legacy Lua (`.htm`) environments.

## Features
* **Modern LuCI Architecture**: Native support for modern OpenWrt client-side rendering (`LuCI JavaScript`) and `ucode` templates.
* **Dual Navigation Orientations**:
  * **Horizontal Tabs (Default)**: Full-width topbar with categories and dropdown submenus, maximizing screen real estate.
  * **Vertical Sidebar (Selectable)**: Classic left sidebar accordion menu, toggleable anytime via the header button.
* **Dark Theme (Default) & White Theme (Selectable)**:
  * **Dark Theme (Default)**: Deep obsidian slate background (`#0e121a`), comfortable for long sessions, with no shiny blinding white glare.
  * **White / Light Theme (Selectable)**: Crisp, high-contrast light theme with subtle borders.
  * **Zero-FOUC Instant Switching**: Saved in `localStorage` and applied before DOM rendering.
* **Smart Telemetry Color-Coding**: Dynamic contextual color-coding for Wi-Fi signal quality, data rates, traffic directions (TX/RX), frequency bands, and multi-level progress bars.
* **Hardware Thermal Telemetry**: Real-time multi-zone SoC, Wi-Fi radio, and motherboard temperature monitoring on the LuCI status overview.
* **Responsive Layout**: Optimized views with off-canvas mobile drawer for phones and tablets.
* **Modal Dialog & Modern Widgets**: Full styling for modern LuCI modals, progress bars, search dropdowns, and status badges.
* **Password Toggle**: Show/hide password button on the login screen.

See [COLOR_CODING_ARCHITECTURE.md](COLOR_CODING_ARCHITECTURE.md) for full architecture details.

## Installation & Usage

### Method 1: In OpenWrt Buildroot (Feeds)
Add the following line to your `feeds.conf.default`:
```bash
src-git feelgood https://github.com/akbar-npj/luci-theme-feelgood.git
```
Then update and install the feed:
```bash
./scripts/feeds update feelgood
./scripts/feeds install -a -p feelgood
```
Select the theme in `make menuconfig`:
```text
LuCI --->
    4. Themes --->
        <*> luci-theme-feelgood
```

### Method 2: Clone directly into package directory
```bash
git clone https://github.com/akbar-npj/luci-theme-feelgood.git package/luci-theme-feelgood
make menuconfig
```

### Method 3: Manual Installation on Router
If copying files directly to a running OpenWrt router:
1. Copy `luci-theme-feelgood/htdocs/luci-static/*` to `/www/luci-static/`.
2. Copy `luci-theme-feelgood/ucode/template/themes/feelgood/*` to `/usr/share/ucode/luci/template/themes/feelgood/`.
3. Run:
```bash
uci set luci.themes.Feelgood=/luci-static/feelgood
uci set luci.themes.FeelgoodHighContrast=/luci-static/feelgood
uci set luci.main.mediaurlbase=/luci-static/feelgood
uci set luci.theme_feelgood.color='dark'
uci set luci.theme_feelgood.nav='horizontal'
uci commit luci
/etc/init.d/uhttpd restart
```

## License
* LuCI Theme Feelgood: Copyright (C) 2018-2026 Akbar NPJ
* Modern Port & LuCI Support: Copyright (C) 2018-2026 LuCI Team / Akbar NPJ
* Licensed under the Apache License, Version 2.0.

## Previews
### PC Login
<div align=center><img src="previews/login-pc.png" alt="login-pc"/></div>

### PC Overview
<div align=center><img src="previews/overview-pc.png" alt="overview-pc"/></div>

### iPad Login
<div align=center><img src="previews/login-ipad.png" alt="login-ipad"/></div>

### iPad Overview
<div align=center><img src="previews/overview-ipad.png" alt="overview-ipad"/></div>

### Mobile Login
<div align=center><img src="previews/login-mobile.png" alt="login-mobile"/></div>

### Mobile Overview
<div align=center><img src="previews/overview-mobile.png" alt="overview-mobile"/></div>
