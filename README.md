# Mubu.com: Smooth Scrolling / Smooth Zoom / Custom Fonts — Edge Extension

Current version: **v1.2.0**

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat-square" alt="License: MIT" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&amp;logo=nodedotjs&amp;logoColor=white" alt="Node.js >=22" /></a>
</p>
<p align="center">English · <a href="README.zh.md">中文</a></p>

### **Tips**

- Mubu is a mind mapping application (Webpage/Windows/macOS). It's like XMind with most of the formatting and styling features stripped away.
- Mubu.com works smoothly when accessed from mainland China or Hong Kong IP addresses.
- This extension is for webpage users.


## Why these features?

Scrolling and zooming in the Mubu web app, as well as in its Windows / macOS desktop clients, can feel sluggish—even less responsive than the Android / iOS apps.

This extension adds **accumulative + eased** scrolling / panning / zooming to mubu.com at the browser level. It also lets you change the interface font to **any font installed on your local machine**.

## Extension Features at a Glance

Takes effect when mubu.com (including all its subdomains) is opened in Edge.

### 1. Mind Map Mode

- **Scroll wheel to pan the canvas**: Accumulative + eased. Multiple consecutive wheel movements accumulate into a total offset and transition smoothly (instead of several wheel movements resulting in only one scroll).
- **Ctrl / ⌘ + scroll wheel to zoom**: Accumulative + eased, with the zoom center precisely following the cursor.

### 2. Global Font (Customizable)

Click the extension icon in the toolbar to open the font panel:

- Automatically lists **all fonts installed on your local machine** (approximately 229 tested, including Chinese-named fonts such as SimSun, KaiTi, Microsoft YaHei, and STKaiti).
- Supports **search and filtering** (e.g. enter “SimSun”, “Source Han”, or “Noto”) and **manual entry** of any font name.
- Switch to **frequently used fonts** with one click.
- Select **(Do not change font / Mubu default)** to disable the font override and restore Mubu's native font.
- Your selection is **applied in real time** to open Mubu tabs and saved for the next time you open the site.

Font override coverage:

- Page DOM text and UI (outline, sidebar, buttons, menus, etc.).
- **Mind map canvas text** (implemented by patching `CanvasRenderingContext2D.font`).
- Note: Canvas text changes take full effect **after refreshing the page**.

The default font is **Noto Serif SC** (must be installed locally; if unavailable, the extension automatically falls back to Source Han Serif SC / SimSun / serif).

### 3. Explicitly Unmodified Areas

- **Scrolling on outline pages**: Native browser behavior is preserved; this extension does not intervene.
- **Ctrl + scroll wheel outside mind map areas**: Remains browser page zoom.

## Installation

### Easy Method: Load the Unpacked Extension in Edge (Recommended)

1. Open Edge and enter `edge://extensions` in the address bar.
2. Turn on **Developer mode** in the lower-left corner.
3. Click **Load unpacked**.
4. Select the **mubu-smooth-scroll-scale-extend-on-edge** folder in this repository.
5. Open or refresh any page on mubu.com.
6. Click the extension icon in the upper-right toolbar and choose your preferred font.

Notes:

- This extension requests two permissions:
  - `storage` — saves your font selection.
  - `fontSettings` — reads the list of installed fonts (Edge will display a permission prompt saying “Read and change your font settings”; this extension **only reads font settings and does not modify system fonts**).
- Upgrading from an older version: The folder name and permissions have changed. It is recommended that you first **remove the old extension** from `edge://extensions`, then load the unpacked extension again.

### Geek Method: Node.js Script (No Extension Installation Required; Script Must Keep Running)

Node.js must be installed on your local machine:

```bash
node mubu_smooth_scroll.mjs
```

The script launches an instance of Edge with a debugging port and injects the patch. Keep the terminal window open; press `Ctrl+C` to exit.

| Variable | Description | Default |
| --- | --- | --- |
| EDGE_PATH | Full path to `msedge.exe` | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| MUBU_URL | URL to open | `https://mubu.com/app` |
| MUBU_PORT | Debugging port | `9222` |
| MUBU_FONT | Font name (set to an empty string to leave the font unchanged) | `Noto Serif SC` |

## Using the Font Panel

| Action | Description |
| --- | --- |
| Select a font from the list | Automatically fills the input field |
| Search box at the top | Filters the font list |
| Enter a font manually | Supports font names that do not appear in the list |
| Save and Apply | Saves the selection to extension storage; open Mubu pages update immediately |
| Refresh the page | Reloads the current tab (refresh once to apply canvas text changes) |

## How It Works

| File | Runtime Context | Purpose |
| --- | --- | --- |
| `content-bridge.js` | Isolated world (`ISOLATED`) | Reads the selected font from `chrome.storage.sync`, writes it to the `<html data-mubu-font-family>` attribute, and listens for changes to keep it synchronized in real time. It also caches the selection in the page's `localStorage`, so the font is already applied on the first render after a page reload. |
| `content.js` | Main world (`world: "MAIN"`) | Watches the attribute, injects `font-family` CSS for DOM text, patches `CanvasRenderingContext2D.prototype.font` for canvas text, and implements accumulative easing for mind map panning / zooming. |
| `popup.html` / `popup.js` | Extension popup | Enumerates fonts using `chrome.fontSettings.getFontList()` and saves the selection. |
| `smooth-scroll.patch.js` | — | Same contents as `content.js`, provided for use by Method B. |

Key Technical Details:

1. **Why are fonts handled by two separate scripts?** The canvas font patch must run in `world: "MAIN"`, but the main world cannot access the `chrome.*` APIs. The `<html data-mubu-font-family>` attribute is therefore used as a communication channel between the two worlds (the DOM is shared between them).
2. **Why is `<script>` injection no longer used?** Early versions entered the main world by injecting inline scripts, which could be blocked by the page's CSP. Switching to `world: "MAIN"` eliminates the need for script injection.
3. **Canvas text**: Mind map text is rendered through `CanvasRenderingContext2D`. The `ctx.font` value looks like `normal 400 16px "Helvetica Neue", ...`. The patch replaces the entire font-family portion after the font size in the setter.
4. **Mind map panning / zooming**: The canvas has no DOM scrolling container. The extension therefore intercepts `wheel` events, then redispatches the eased deltas to `.minder-container` as **synthetic `wheel` events**, reusing the site's native panning / zooming logic (without relying on the site's bundled hash values).
5. **Zoom-center correction**: Chrome scales the synthetic event's `offsetX/offsetY` by `1 / devicePixelRatio`. Therefore, when redispatching the event, `clientX/clientY` are multiplied by `devicePixelRatio` so that the zoom center precisely follows the cursor.

## File Reference

| File | Description |
| --- | --- |
| `manifest.json` | Extension manifest (Manifest V3; declares the `storage` / `fontSettings` permissions) |
| `content-bridge.js` | Settings bridge (isolated world) |
| `content.js` | Main-world patch: fonts + smooth panning / zooming |
| `popup.html` / `popup.js` | Font selection panel |
| `smooth-scroll.patch.js` | Copy of the patch (identical to `content.js`, used by the Node.js script) |
| `mubu_smooth_scroll.mjs` | Method B launcher script |

## FAQ

**Q: The Mubu official website won't open.**

- Try using an IP address in China mainland or Hong Kong, China.

**Q: The font is not taking effect.**

- Make sure the selected font is actually installed (it should be searchable in the panel).
- Refresh the page. Mind map canvas text requires a refresh to take full effect.
- If Mubu's own **Custom Font** setting is enabled, this extension takes priority by using `!important`. To use Mubu's own font setting instead, select **Do not change font** in the panel.

**Q: The font list in the panel is empty.**

- Check whether the extension's permissions have been revoked (`edge://extensions` → Details → Permissions).
- You can also enter a font name directly in the input field.

**Q: The mind map is not scrolling smoothly.**

- This extension only takes over wheel events when the pointer is inside the mind map canvas (`.minder-container`).

**Q: Will this affect other websites?**

- No. The extension only matches `https://mubu.com/*` and `https://*.mubu.com/*`.

## Changelog

- **v1.2.0**: Fonts can now be selected in the popup from **fonts installed on the local machine**; added font search / manual entry / frequently used fonts; fixed duplicate font stacks; added `MUBU_FONT` to the Node.js script.
- **v1.0.0**: Added smooth mind map panning / zooming; set Noto Serif SC as the default global font.

## Future Plans

1. Contributions via branches to support other major mind mapping apps, such as XMind, are welcome.
2. Contributions via branches to support other browsers, such as Google Chrome, are welcome.
