# INFINITEWORLDS — Brand Guide

> Every word reshapes reality.

This document defines the visual and verbal identity of Infiniteworlds. Use it when referencing, embedding, or extending the project.

---

## 1. Voice & Tone

**Voice:** mystical, precise, slightly unsettling. We speak as though the void is listening.

**Do:**
- "Every word reshapes reality."
- "Speak them into existence."
- "What should remain?"

**Don't:**
- "Build amazing AI worlds with our cutting-edge platform!"
- "Get started in minutes!"
- Generic marketing speak. We're a portal, not a product page.

---

## 2. Logo

The mark is **two interlocking portals** forming an infinity. The right one falls into the left, the left rises into the right. It is also two eyes, or two worlds.

### Variants

| File | Use |
|---|---|
| `logo-mark.svg` | Primary mark, dark backgrounds |
| `logo-mark-light.svg` | Mark on photographic or color backgrounds |
| `logo-wordmark.svg` | Text-only, wide horizontal layouts |
| `logo-full.svg` | Mark + wordmark lockup, the default for headers |

### Clear space
Minimum clear space around the mark = the height of one portal radius (44px in the source). Do not crop, recolor, or rotate the mark.

### Sizing
- Favicon: **32×32** minimum
- App icon / dock: **256×256** preferred
- Lockup horizontal: **never below 200px wide**

---

## 3. Color Palette

See `palette.svg` for visual reference.

### Void Family — backgrounds, depth
| Name | Hex | Use |
|---|---|---|
| Absolute Void | `#000005` | Page background, modal scrim |
| Deep Cosmos | `#0a0518` | Card surfaces, panels |
| Nebula Edge | `#1a0a3a` | Elevated surface, hover state |

### Mystic Family — accents, interaction
| Name | Hex | Use |
|---|---|---|
| Portal Heart | `#7a3acc` | Primary buttons, focus rings |
| Spirit Edge | `#aa66ff` | Hover states, glow |
| Primary Accent | `#cc88ff` | All highlights, headings, links |
| Body Light | `#e0c8ff` | Body text on dark backgrounds |

### Emotive Family — semantic, task difficulty
| Name | Hex | Use |
|---|---|---|
| Trivial Green | `#44ff88` | Difficulty: trivial |
| Easy Lime | `#88ff44` | Difficulty: easy |
| Medium Amber | `#ffaa44` | Difficulty: medium, warnings |
| Hard Coral | `#ff6644` | Difficulty: hard, errors |
| Legendary Magenta | `#ff44aa` | Difficulty: legendary |

### Rules
- **Never use pure white** (`#ffffff`) except for particle glows and active eye highlights.
- Body text always at **90% opacity** to soften it against the void.
- Borders always **transparent purple at 20-40% alpha**: `rgba(160,80,255,0.3)`

---

## 4. Typography

### Display — Cinzel Decorative
[Cinzel Decorative on Google Fonts](https://fonts.google.com/specimen/Cinzel+Decorative)

Used for: app title, world names, modal headers, scale badges.

```css
font-family: 'Cinzel Decorative', 'Cinzel', serif;
letter-spacing: 4-6px;
font-weight: 700 or 900;
```

### Body — Crimson Pro
[Crimson Pro on Google Fonts](https://fonts.google.com/specimen/Crimson+Pro)

Used for: everything else. Especially companion dialogue and narration (italic).

```css
font-family: 'Crimson Pro', 'Crimson Text', serif;
font-style: italic; /* for dialogue and narration */
```

### Type scale

| Token | Size | Use |
|---|---|---|
| `--display-xl` | 60px / 900 / +6 letterspacing | App title |
| `--display-lg` | 32px / 700 / +4 letterspacing | Section headers |
| `--display-sm` | 14px / 400 / +3 letterspacing | Small caps labels |
| `--body-xl` | 22px / 400 | Environment narration |
| `--body-lg` | 17px / italic | Companion dialogue |
| `--body-md` | 14px / 400 | UI labels |
| `--body-sm` | 11px / 400 / +2 letterspacing | Hints, metadata |

---

## 5. Iconography

Symbol set (use these glyphs consistently):

| Symbol | Meaning |
|---|---|
| `◈` | Menu, system action |
| `◉` | World scale (WORLD level) |
| `◎` | Default scale (HUMAN level) |
| `✦` | Cosmic scale |
| `·` | Micro scale |
| `∙` | Nano scale |
| `▪` | Activity indicator |
| `◐` `◑` `◒` `◓` | Loading states |
| `→` | Submit, advance |
| `✕` | Close, interrupt |

We prefer **Unicode geometric symbols over icon fonts**. Lighter weight, no extra dependency.

---

## 6. Motion

- **Default ease**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard)
- **Companion idle float**: 0.5-1.0Hz vertical sine wave, ±0.08 unit amplitude
- **Scale transitions**: 90 frames @ 30fps (3 seconds)
- **UI fades**: 200ms in, 150ms out

Reduce motion preference is honored — companion stops floating, transitions become instant cuts.

---

## 7. Tagline + Copy

**Official tagline:**
> Every word reshapes reality.

**Alternative taglines (sparingly):**
- "Speak. Listen. Drift."
- "A world that listens."
- "No story. No end. Just words."

**Project description (one-liner, for SEO):**
> An AI-driven voice-interactive 3D world engine where every conversation reshapes the reality you stand in.

**Project description (paragraph):**
> Infiniteworlds is an open-source voice game where you speak with an AI companion you've shaped yourself, inside a procedurally generated 3D world that morphs in response to your conversation. Scale from cosmic to subatomic. No fixed story. No end. Just a living reality.

---

## 8. Don'ts

- **Don't** add purple gradients on white backgrounds. The brand is dark-first.
- **Don't** use stock fantasy or sci-fi clipart with the logo.
- **Don't** translate the wordmark — it's a name, not a phrase.
- **Don't** describe Infiniteworlds as a "platform," "solution," or "AI tool." It is a **world engine**, an **infinite**, or a **voice game**.
- **Don't** use emojis in headings or marketing copy. The vibe is more "ancient grimoire" than "Slack channel."
