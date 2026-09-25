# Nineteenth — Golf Goods for the Unserious

A single-page, animation-heavy golf brand site built with plain **HTML, CSS and JavaScript** (no frameworks, no build step).

Open `index.html` in a browser, or serve the folder (`npx serve .`).

## Files
- `index.html` — markup and inline SVG illustrations
- `style.css` — layout, theme and CSS animations
- `script.js` — all interactions (vanilla JS, one `requestAnimationFrame` loop)

## Effects
- Preloader: golf ball rolls to the cup with a % counter, then a split-curtain reveal
- Custom cursor with contextual labels and magnetic buttons
- Wheel-driven smooth scrolling (sticky sections still work)
- Hero: layered SVG golf course with mouse and scroll parallax, character-by-character headline reveal, spinning badge
- Scroll-velocity reactive, skewing marquees
- Manifesto that fills in word-by-word as you scroll
- Pinned horizontal product carousel with 3D tilt cards, colour swatches, add-to-bag toast and confetti
- Collections list with a cursor-following image preview
- Count-up stats, stacked sticky "ritual" cards, clip-path image reveals with parallax
- A playable mini putting game on `<canvas>`
- Full-screen circular-reveal menu and an animated footer wordmark

Respects `prefers-reduced-motion`. Journal/collection photos come from Unsplash and fall back to illustrated gradients if they fail to load. Swap the `src` / `data-img` URLs for your own photography.
