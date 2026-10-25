# Feelgood Theme Architecture: Navigation & Color System

This document outlines the design, features, and implementation of the dual navigation orientation system, dark/light color modes, and dynamic telemetry color-coding in **LuCI Theme Feelgood** for modern OpenWrt releases (21.02, 23.05, 24.10, and 25.x / master).

---

## 1. Core Concept & Design Goals

### A. Navigation Orientation
* **Horizontal Tabs (Default)**: Main navigation categories (`Status`, `System`, `Network`, etc.) are placed horizontally across the top header bar with smooth dropdown submenus. Desktop content expands to full screen width (max 1400px centered), freeing up 15–20% of screen real estate previously lost to a fixed left sidebar.
* **Vertical Sidebar (Selectable)**: Users who prefer the classic vertical sidebar layout can switch instantly via a header toggle (`⬌ Horizontal` / `⬍ Vertical`). The left sidebar smoothly opens with an accordion menu.
* **Mobile / Tablet Responsive Drawer**: On viewports ≤ 992px, the menu automatically collapses into an off-canvas drawer triggered by the hamburger icon (`.showSide`).

### B. Color Modes & Visual Hierarchy
* **Dark Theme (Default)**: Designed for comfort, reduced eye strain, and clear visual hierarchy during network operations.
  - **Unused Space / Canvas**: Deep dark slate (`#090d16`), non-distracting background for page margins and empty areas.
  - **Information Display Areas (Cards / Sections)**: Elevated dark navy-slate containers (`#141b29`) with subtle borders (`#212f45`) that immediately draw the eye to functional controls.
  - **Table Headers**: Distinct `#192336` banner with crisp `#f8fafc` titles.
  - **Alternating Table Rows**: Clear contrast differentiation (Odd: `#131926`, Even: `#172133`, Hover: `#1e2c44`) preventing eye fatigue when scanning long client or firewall rule lists.
  - **High-Visibility Typography**:
    - Section Headings: `#f8fafc` (crisp 700 bold slate white).
    - Form Titles & Labels: `#e2e8f0` (semi-bold 600).
    - General Body Text: `#f1f5f9`.
    - Secondary Descriptions: `#94a3b8` (never washed out, > 7:1 contrast ratio).
    - Metrics, Quantities & Numbers: Luminous, high-contrast monospace highlights (`#38bdf8`, `#34d399`, `#fbbf24`, `#f43f5e`).
  - **Zero White-on-White Collisions**: All legacy LuCI hardcoded light backgrounds (`.warning`, `.alert-message`, `.ifacebox`, `.ifacebadge`, `#syslog`, diagnostic `pre` terminals) are completely themed so text and numbers never fade or disappear.
* **White / Light Theme (Selectable)**: For users who prefer a crisp, high-key interface (`#EBF1F6` canvas, `#ffffff` cards). Selectable via the header button (`🌙 Dark` / `☀️ Light`).
* **Instant Persistence**: Selected preferences are saved in browser `localStorage` (`luci-theme-feelgood-nav`, `luci-theme-feelgood-color`) and applied prior to initial paint via an anti-FOUC script in `<head>`, ensuring zero flickering.

---

## 2. Telemetry Color-Coding Reference

### 📶 WiFi Connectivity & Signal Quality
| Metric (Signal) | Quality Level | Dark Theme Styling | Light Theme Styling | Operational Semantics |
| :--- | :---: | :--- | :--- | :--- |
| **≥ -55 dBm** (≥ 75%) | `excellent` | Emerald Green (`#10b981`) on translucent dark mint | Emerald Green on soft mint pill | Optimal signal, max MCS |
| **-67 to -56 dBm** (50–74%) | `good` | Cyan (`#06b6d4`) on translucent dark cyan | Cyan on sky-blue pill | Strong stable connection |
| **-79 to -68 dBm** (25–49%) | `fair` | Warm Amber (`#f59e0b`) on translucent dark gold | Warm Amber on gold pill | Moderate signal, possible retries |
| **≤ -80 dBm** (< 25%) | `poor` | Coral Red (`#f43f5e`) on translucent dark rose | Coral Red on rose pill | Weak reception / deadzone |
| **Noise floor (≤ -90 dBm)** | `noise` | Slate Gray (`#94a3b8`) on dark chip | Slate Gray on soft gray pill | Background RF noise |

---

### 🚀 Data Rates & Physical Link Speeds
| Speed Range / Negotiation | Tier | Dark Badge Color | Applications |
| :--- | :---: | :--- | :--- |
| **≥ 1000 Mbit/s**, `1000base`, `2.5G`, `10G` | `gigabit` | Electric Violet (`#a855f7`) | Multi-gigabit WAN/LAN, 1G Fiber |
| **100 – 999 Mbit/s**, `100base` | `fast` | Emerald Green (`#10b981`) | Fast broadband, Wi-Fi 5/6 links |
| **10 – 99 Mbit/s**, `10base` | `normal` | Sky Blue (`#38bdf8`) | Legacy links |
| **< 10 Mbit/s**, `no link`, `down` | `low` / `down` | Muted Steel (`#94a3b8`) | Disconnected or throttling |

---

### 🔄 Network Traffic Direction (TX / RX)
* **TX (Upload ▲)**: Vivid Lavender/Purple (`#c084fc` on `rgba(192, 132, 252, 0.18)`).
* **RX (Download ▼)**: Mint/Emerald (`#34d399` on `rgba(52, 211, 153, 0.18)`).

---

### 📡 Frequency Bands & Wireless Radios
* **6 GHz (Wi-Fi 6E / Wi-Fi 7)**: Vivid Violet (`#c084fc`).
* **5 GHz (Wi-Fi 5 / Wi-Fi 6)**: Azure Sky (`#38bdf8`).
* **2.4 GHz**: Warm Amber (`#fbbf24`).

---

### 📊 System Resource Health (CPU, RAM, Flash)
Progress bars (`.cbi-progressbar`) dynamically shift colors based on utilization percentage:
* **0% – 59% (Normal)**: Healthy Teal / Cyan (`--bar-normal`).
* **60% – 84% (Warning)**: Attention Amber (`--bar-warning`).
* **85% – 100% (Critical)**: Danger Red (`--bar-critical`) to warn of memory/storage exhaustion.

---

### 🌡️ System Thermal Info & Sensor Health
Hardware thermal telemetry is automatically retrieved via standard Linux `sysfs` (`/sys/class/thermal/thermal_zone*` and `/sys/class/hwmon/*`) and color-coded dynamically:

| Temperature Range | Tier | Dark Theme Badge | Operational State |
| :--- | :---: | :--- | :--- |
| **< 50 °C** (< 122 °F) | `cool` | Ice Cyan (`#38bdf8`) | Optimal / cool idle |
| **50 °C – 69 °C** (122–156 °F) | `normal` | Emerald Green (`#10b981`) | Normal operating temperature |
| **70 °C – 84 °C** (157–184 °F) | `hot` | Warm Amber (`#f59e0b`) | Elevated load / warm environment |
| **≥ 85 °C** (≥ 185 °F) | `critical` | Crimson Red (`#f43f5e`) with pulsing glow | Thermal throttling danger threshold |

* **Dedicated Thermal Overview Card**: Includes [`15_thermal.js`](file:///home/shaanair/Projects/luci-theme-feelgood/luci-theme-feelgood/htdocs/luci-static/resources/view/status/include/15_thermal.js) for modern LuCI, displaying SoC, Wi-Fi radio, and hardware monitor temperatures directly on the Overview page.

---

### 🌐 Network Identifiers & Operational Status
| Type / Pattern | Badge Class | Dark Theme Styling | Semantics |
| :--- | :---: | :--- | :--- |
| **IPv4 Address / CIDR** (`192.168.8.1`, `10.0.0.1/24`) | `.badge-ip` | Cyan monospace (`#38bdf8`) on translucent navy-cyan chip with 🌐 icon | High-readability IP addressing |
| **MAC Address** (`00:1A:2B:3C:4D:5E`) | `.badge-mac` | Lavender monospace (`#c084fc`) on translucent violet chip with 🏷️ icon | Client hardware identification |
| **Status: Good** (`Connected`, `Up`, `Running`, `Online`) | `.badge-status-good` | Emerald Green (`#34d399`) on `rgba(52, 211, 153, 0.18)` | Active and healthy interface / service |
| **Status: Warning** (`Restarting`, `Pending`, `Reloading`) | `.badge-status-warn` | Amber Gold (`#fbbf24`) on `rgba(251, 191, 36, 0.18)` | Transitional state requiring attention |
| **Status: Bad** (`Disabled`, `Stopped`, `Down`, `Offline`) | `.badge-status-bad` | Coral Red (`#f43f5e`) on `rgba(244, 63, 94, 0.18)` | Inactive, faulted, or shut down |

---

## 3. Global Visual Symmetry & Component System

To ensure a balanced layout across all LuCI views, the theme enforces a unified geometric grid:

### A. Network & Upstream Key-Value Columns
* **Fixed Label Anchor (`115px`)**: Labels (`Address:`, `Gateway:`, `DNS:`, `Protocol:`, `Connected:`) are locked to `flex: 0 0 115px; min-width: 115px;`.
* **Zero Ragged Wrapping**: `<br>` tags between entries are eliminated; each entry is rendered as a clean flex row (`.ifacebox-body .nowrap`).
* **Column Alignment**: All values and IP badges (`🌐 10.162.21.205/24`, `🌐 10.162.21.74`) begin at the exact same horizontal position.

### B. Port Status Cards & Dedicated USB Ethernet Support
* **Proportional Port Cards (`.port-card`)**: Single and multi-port interfaces render as compact `140px` cards in a flexible row (`.port-status-container`), eliminating stretched 1fr grid cells.
* **Dedicated USB Ethernet Symbol**: USB network devices (`usb0`, `usb1`) receive a specialized USB Ethernet SVG with link-state detection.
* **Symmetrical Traffic Grid**: Port statistics (`▲ TX` and `▼ RX`) are displayed as balanced twin badges in the bottom section.

### C. CBI Form Values & Input Elements
* **Two-Column Form Grid**: `.cbi-value` forms use a flexbox layout where `.cbi-value-title` occupies `240px` with left alignment and semi-bold typography, separated by subtle borders (`1px solid var(--border-color)`).
* **Uniform Control Heights**: All text inputs, password fields, select boxes, dropdowns (`.cbi-dropdown`), and action buttons (`.btn`, `.cbi-button`) are normalized to `34px – 36px` height with matching `8px` rounded corners.
* **Top Header Controls**: Navigation toggle (`[ ⬌ Horizontal ]`), theme toggle (`[ 🌙 Dark ]`), and logout button are aligned inside `.btn-con` with uniform `32px` height, `16px` pill radius, and `8px` spacing.
* **Table Rows & Cells**: Table cells across status and configuration pages feature uniform `0.65rem 0.85rem` padding with centered vertical alignment (`vertical-align: middle;`).
* **CBI Tabs & Navigation**: `.cbi-tabmenu` and `.tabs` use a flex tab bar with active accent indicators (`border-bottom: 2px solid var(--accent-color)`).

---

## 4. How It Is Implemented

The architecture consists of three synchronized layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTML Document Lifecycle                         │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. Early Head Script           │ Reads localStorage / UCI preference   │
│    (header.ut)                 │ Sets <html data-theme-color="dark">   │
│                                │ Sets <html data-theme-nav="horizontal"│
│                                │ Prevents Flash of Unstyled Content    │
├────────────────────────────────┼───────────────────────────────────────┤
│ 2. Dual-Engine Navigation      │ Renders horizontal tabs into          │
│    (menu-feelgood.js)          │ #topNavBox with hover dropdowns.      │
│                                │ Renders vertical menu into #navBox.   │
│                                │ Manages toggle buttons and storage.   │
├────────────────────────────────┼───────────────────────────────────────┤
│ 3. Smart Colorizer Engine      │ MutationObserver monitors #maincontent│
│    (menu-feelgood.js)          │ Debounced with requestAnimationFrame  │
│                                │ Adds semantic data-* & .badge-colored │
├────────────────────────────────┼───────────────────────────────────────┤
│ 4. Semantic CSS Variables      │ CSS variables switch dynamically      │
│    (cascade.css)               │ based on data-theme-color and nav     │
└────────────────────────────────┴───────────────────────────────────────┘
```

### A. Anti-FOUC (Flash of Unstyled Content) Initialization (`header.ut`)
In `<head>`, before stylesheets or body render:
```javascript
(function() {
    var serverColor = '{{ initial_color }}';
    var serverNav = '{{ initial_nav }}';
    var color = localStorage.getItem('luci-theme-feelgood-color') || serverColor || 'dark';
    var nav = localStorage.getItem('luci-theme-feelgood-nav') || serverNav || 'horizontal';
    document.documentElement.setAttribute('data-theme-color', color);
    document.documentElement.setAttribute('data-theme-nav', nav);
    document.documentElement.setAttribute('data-theme-style', color === 'dark' ? 'modern' : 'light');
})();
```

### B. Dual Navigation Builder (`menu-feelgood.js`)
* `renderHorizontalMenu(tree, url)` constructs an accessible horizontal navigation tree into `#topNavBox`.
* Top items show category title and dropdown caret (`▾`).
* Sub-items drop down on hover (desktop) or touch click (mobile/tablet).
* `renderMainMenu(tree, url)` continues to power the vertical sidebar `#navBox` for vertical mode and mobile drawer.

### C. Theme Variable Architecture (`cascade.css`)
* CSS variables (`--bg-canvas`, `--bg-card`, `--text-heading`, etc.) adapt to `html[data-theme-color="dark"]` and `html[data-theme-color="light"]`.
* Layout switches seamlessly between `html[data-theme-nav="horizontal"]` and `html[data-theme-nav="vertical"]`.

---

## 4. Customization & UCI Defaults

Administrators can set the router-wide default in `/etc/config/luci`:
```bash
uci set luci.theme_feelgood.color='dark'       # Options: 'dark', 'light'
uci set luci.theme_feelgood.nav='horizontal'   # Options: 'horizontal', 'vertical'
uci commit luci
```
Users can switch preferences at any time using the header toggle buttons (`[ ⬌ Horizontal ]` and `[ 🌙 Dark ]`).
