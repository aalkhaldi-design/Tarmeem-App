# UI_SPECS.md — Tarmeem UI Specifications

---

## 1. TarmeemLogo SVG Spec

The logo is **hand-authored SVG** — not a traced image. Each element must be individually animatable for the splash choreography.

### Structure

```svg
<svg viewBox="0 0 120 110" aria-hidden="true">
  <!-- Crown — two rotated squares -->
  <g className="trm-crown">
    <rect x="25" y="5"  width="22" height="22" rx="3" transform="rotate(45 36 16)" fill="#4A1F66" />
    <rect x="73" y="5"  width="22" height="22" rx="3" transform="rotate(45 84 16)" fill="#4A1F66" />
  </g>
  <!-- Wall — 3 rows, 5/3/4 layout, P=Purple T=Teal alternating -->
  <!-- Each brick gets className="trm-brick" + inline style {{ animationDelay: '--d' }} -->
  <g className="trm-wall" transform="translate(0,42)">
    <!-- Row 1 (5 bricks): P T T T P -->
    <rect className="trm-brick" style={{animationDelay:'0ms'}}   x="2"   y="0"  width="20" height="16" rx="2" fill="#4A1F66"/>
    <rect className="trm-brick" style={{animationDelay:'60ms'}}  x="25"  y="0"  width="20" height="16" rx="2" fill="#43bba1"/>
    <rect className="trm-brick" style={{animationDelay:'120ms'}} x="48"  y="0"  width="20" height="16" rx="2" fill="#43bba1"/>
    <rect className="trm-brick" style={{animationDelay:'180ms'}} x="71"  y="0"  width="20" height="16" rx="2" fill="#43bba1"/>
    <rect className="trm-brick" style={{animationDelay:'240ms'}} x="94"  y="0"  width="20" height="16" rx="2" fill="#4A1F66"/>
    <!-- Row 2 (3 bricks): T P T — offset, staggered after row 1 -->
    <rect className="trm-brick" style={{animationDelay:'60ms'}}  x="13"  y="20" width="28" height="16" rx="2" fill="#43bba1"/>
    <rect className="trm-brick" style={{animationDelay:'120ms'}} x="46"  y="20" width="28" height="16" rx="2" fill="#4A1F66"/>
    <rect className="trm-brick" style={{animationDelay:'180ms'}} x="79"  y="20" width="28" height="16" rx="2" fill="#43bba1"/>
    <!-- Row 3 (4 bricks): P T P T -->
    <rect className="trm-brick" style={{animationDelay:'0ms'}}   x="2"   y="40" width="25" height="16" rx="2" fill="#4A1F66"/>
    <rect className="trm-brick" style={{animationDelay:'60ms'}}  x="31"  y="40" width="25" height="16" rx="2" fill="#43bba1"/>
    <rect className="trm-brick" style={{animationDelay:'120ms'}} x="60"  y="40" width="25" height="16" rx="2" fill="#4A1F66"/>
    <rect className="trm-brick" style={{animationDelay:'180ms'}} x="89"  y="40" width="25" height="16" rx="2" fill="#43bba1"/>
  </g>
</svg>
```

### 5 Variants

| Variant | Description |
|---|---|
| `icon` | Crown + wall only, no wordmark |
| `horizontal` | Crown + wall left, "ترميم Tarmeem" right |
| `stacked` | Crown + wall top, wordmark below |
| `full` | Full lockup with tagline |
| `monogram` | Single letter mark |

### 3 Color Modes

| Mode | Description |
|---|---|
| `brand` | Purple `#4A1F66` + teal `#43bba1` (default) |
| `white` | All white (for dark/colored backgrounds) |
| `mono` | Single-color (black or white depending on bg) |

### Crown Detail

- Two rotated squares (`transform="rotate(45)"`)
- Rounded corners (`rx="3"`)
- Purple `#4A1F66` fill
- Wrapped in `<g className="trm-crown-drop-wrap">` for splash animation

### Wall Detail

- 3 rows: 5 bricks / 3 bricks / 4 bricks (5/3/4 layout)
- Purple (P) `#4A1F66` and Teal (T) `#43bba1` alternating
- Row 1: P T T T P
- Row 2: T P T (wider bricks, offset for brick-wall stagger)
- Row 3: P T P T
- Each brick has `className="trm-brick"` and inline `--d` CSS custom property for animation delay stagger (60ms between bricks)
- Total: 12 bricks

---

## 2. Splash Choreography

Pure CSS, ~1800ms total. No framer-motion.

### Timeline

| Time | Element | Animation |
|---|---|---|
| 0–300ms | `.trm-splash` parent | Background fade-in |
| 300–800ms | `.trm-brick` (all 12) | Rise bottom-up, 60ms stagger per brick |
| 700–1100ms | `.trm-crown-drop-wrap` | Crown drops from above with bounce |
| 1000–1400ms | `.trm-wordmark` | Wordmark rises from below |
| 1400–1800ms | `.trm-crown-pulse-wrap` | Crown gentle pulse (continues infinitely) |

### CSS Implementation (verbatim from `src/index.css`)

```css
.trm-splash { animation: trm-bg-fade 300ms ease-out forwards; }
@keyframes trm-bg-fade { from { opacity: 0; } to { opacity: 1; } }

/* Bricks rise bottom-up with per-brick stagger via the --d custom property */
.trm-splash .trm-brick {
  opacity: 0;
  transform-origin: center;
  animation: trm-brick-rise 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(300ms + var(--d, 0ms));
}
@keyframes trm-brick-rise {
  from { opacity: 0; transform: translateY(8px) scale(0.6); }
  to   { opacity: 1; transform: translateY(0)   scale(1);   }
}

/* Crown drops with bounce, starts ~700ms */
.trm-splash .trm-crown-drop-wrap {
  opacity: 0;
  transform-origin: 60px 16px;
  animation: trm-crown-drop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 700ms forwards;
}
@keyframes trm-crown-drop {
  from { opacity: 0; transform: translateY(-30px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Crown gentle pulse, kicks in after drop completes (~1400ms) */
.trm-splash .trm-crown-pulse-wrap {
  transform-origin: 60px 16px;
  animation: trm-crown-pulse 3s ease-in-out 1400ms infinite;
}
@keyframes trm-crown-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}

/* Wordmark rises from below at ~1000ms */
.trm-splash .trm-wordmark {
  opacity: 0;
  animation: trm-wordmark-rise 400ms ease-out 1000ms forwards;
}
@keyframes trm-wordmark-rise {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Standalone animated logo (spinners, not splash) — gentle pulse only */
.trm-animated { animation: trm-gentle-pulse 2s ease-in-out infinite; transform-origin: center; }
@keyframes trm-gentle-pulse {
  0%, 100% { transform: scale(1);    opacity: 1;   }
  50%      { transform: scale(1.04); opacity: 0.9; }
}

/* Reduced-motion override — disables every Tarmeem animation */
@media (prefers-reduced-motion: reduce) {
  .trm-splash *, .trm-animated, .trm-skeleton { animation: none !important; opacity: 1 !important; transform: none !important; }
}
```

### `TarmeemSplash` Component

- Accepts `onComplete` callback (fires after ~1800ms).
- Outside `.trm-splash`, the logo renders **static** — choreography CSS only fires inside that parent.
- Splash is a full-screen overlay that calls `onComplete` then unmounts.

---

## 3. Theme Tokens

Single source of truth in `src/index.css`. Components reference via Tailwind utility names configured in `tailwind.config.js`. **No hardcoded hex anywhere else in the app.**

### CSS Variables (verbatim)

```css
:root {
  /* Brand (constant across themes) */
  --tarmeem-purple:       #4A1F66;
  --tarmeem-purple-light: #6B3D87;
  --tarmeem-purple-dark:  #3A1652;
  --tarmeem-teal:         #43bba1;
  --tarmeem-teal-light:   #7AC8AD;
  --tarmeem-accent:       #a871f7;
  --tarmeem-cream:        #FFF8E7;

  /* Light theme (defaults) */
  --bg-app:              #F8F9FA;
  --bg-surface:          #FFFFFF;
  --bg-surface-elevated: #FFFFFF;
  --bg-surface-sunken:   #F1F3F5;
  --bg-input:            #FFFFFF;
  --border-subtle:       #E5E7EB;
  --border-default:      #D1D5DB;
  --text-primary:        #111827;
  --text-secondary:      #4B5563;
  --text-tertiary:       #9CA3AF;
  --shadow-card:         0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-card-hover:   0 4px 12px rgba(74, 31, 102, 0.12);
}

.dark {
  --bg-app:              #050505;
  --bg-surface:          #0a0a0a;
  --bg-surface-elevated: #111111;
  --bg-surface-sunken:   #050505;
  --bg-input:            #111111;
  --border-subtle:       #1F1F1F;
  --border-default:      #2D2D2D;
  --text-primary:        #F9FAFB;
  --text-secondary:      #D1D5DB;
  --text-tertiary:       #6B7280;
  --shadow-card:         0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-card-hover:   0 8px 24px rgba(168, 113, 247, 0.15);
}
```

### Tailwind Token Names (`tailwind.config.js`)

```js
colors: {
  'app-bg':           'var(--bg-app)',
  surface:            'var(--bg-surface)',
  'surface-up':       'var(--bg-surface-elevated)',
  'surface-down':     'var(--bg-surface-sunken)',
  'input-bg':         'var(--bg-input)',
  'border-subtle':    'var(--border-subtle)',
  'border-default':   'var(--border-default)',
  fg:                 'var(--text-primary)',
  'fg-muted':         'var(--text-secondary)',
  'fg-faint':         'var(--text-tertiary)',
  brand:              'var(--tarmeem-purple)',
  'brand-light':      'var(--tarmeem-purple-light)',
  'brand-dark':       'var(--tarmeem-purple-dark)',
  'brand-teal':       'var(--tarmeem-teal)',
  'brand-teal-light': 'var(--tarmeem-teal-light)',
  'brand-accent':     'var(--tarmeem-accent)',
  'brand-cream':      'var(--tarmeem-cream)',
},
boxShadow: {
  card:         'var(--shadow-card)',
  'card-hover': 'var(--shadow-card-hover)',
},
fontFamily: {
  sans:    ['Tajawal', 'system-ui', 'sans-serif'],
  display: ['Tajawal', 'system-ui', 'sans-serif'],
},
```

### Default Theme

Dark mode is the **default**. `ThemeProvider` reads from `localStorage` key `'tarmeem-theme'`, defaults to `'dark'` if not set.

---

## 4. Skeleton Shimmer

```css
.trm-skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-surface-sunken) 0%,
    var(--border-subtle)     50%,
    var(--bg-surface-sunken) 100%
  );
  background-size: 200% 100%;
  animation: trm-shimmer 1.5s ease-in-out infinite;
  border-radius: 0.5rem;
}
@keyframes trm-shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
```

---

## 5. RTL Rules

- All UI is `dir="rtl"` by default (set at `<html>` level or `<div dir="rtl">`).
- Tajawal font at `font-sans` via `tailwind.config.js`. No other fonts.
- Use `start-*`/`end-*`, `ms-*`/`me-*` Tailwind RTL variants over `left-*`/`right-*` where available.
- Text alignment: `text-right` is the default; use `text-left` only for code/numbers/LTR content.
- Arabic text in the codebase must be preserved exactly — do not paraphrase form titles, role names, or department names.
- Icon placement: icons lead (appear at the end of text in RTL), e.g., for arrows use `rotate-180` when flipping directional icons for RTL.

---

## 6. CroquisEditor (SVG Drawing Canvas)

Defined in `src/components/forms/_shared.tsx`. Used in F-08 DiagnosisBinder for floor-plan markup.

**Key implementation details:**
- Uses `pointer events` + `getCoalescedEvents()` for smooth iOS strokes.
- Per-instance undo stack, capped at 20 entries per croquis instance.
- Inline pin labels via `<foreignObject>` (not `<text>`) to support Arabic labels.
- Canvas background: `bg-surface-up` (theme token, not hardcoded `bg-white`).
- Brand-constant `#4A1F66` stroke and `#43bba1` fixture color are intentional brand markers.

---

## 7. FileUploader

Defined in `src/components/ui/FileUploader.tsx`.

**Key implementation details:**
- Progress keyed by **UUID** (not filename) — avoids collision on camera-roll duplicates like `IMG_0001.jpg`.
- Real drag-and-drop: `onDragOver` + `onDrop` handlers on the label element.
- Firebase Storage path: `projects/{projectRefId}/forms/{formId}/{uuid}-{filename}`.
- Files appended via `arrayUnion` to `form.files[]` on Firestore.
- `maxSizeMb` prop (default 20 MB).
- `disabled` prop explicitly controls drag-drop (since `<fieldset disabled>` doesn't catch drag events on labels).

---

## 8. FormComments

Defined in `src/components/ui/FormComments.tsx`.

- Stored in `forms/{id}/comments` subcollection (not inline in form data — avoids Firestore 1 MB doc limit).
- Keyboard shortcut: `Cmd/Ctrl + Enter` to send (matches Slack/GitHub behavior).
- Real-time listener on the subcollection.

---

## 9. F-08 Mobile Scroll-Snap Tabs

F-08 DiagnosisBinder uses mobile scroll-snap tabs (not a bottom-sheet) for its sections:
- General Info, Croquis, Works, Furniture, Summary
- Sticky scroll-snap pattern (same as the Phase tabs on ProjectDetail)
- A draggable container with an SVG canvas inside fights itself — scroll-snap avoids the conflict.

---

## 10. Dashboard Widgets (MVP)

Six widgets in the Dashboard MVP:
1. `KpiStrip` — key numbers across all projects
2. `MyDayWidget` — forms awaiting the current user
3. `PhaseFunnel` — project count by phase
4. `ActivityTimeline` — recent form actions
5. `SlaBreachHeatmap` — managers/admins only
6. `BudgetSnapshot` — FINANCE/EXEC only

Deferred to v2.1: DepartmentWorkload stacked-bar, WeeklyStars leaderboard.
