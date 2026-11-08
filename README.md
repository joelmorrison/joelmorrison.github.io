# joelmorrison.github.io

My portfolio: [joelmorrison.github.io](https://joelmorrison.github.io/)

Hand-built HTML, CSS and JavaScript, with no framework and no build step. The network in the hero is woven from the real trained weights of [Crash Course](https://github.com/joelmorrison/crash-course)'s all-rounder, and it replays a real lap that driver recorded on the technical track.

- `assets/js/loom.js` renders the woven cloth (weft floats, halftone dots, the press-and-hold linen tester).
- `assets/js/live-net.js` runs the recorded sensor readings through the network's weights (tanh, 11 → 8 → 3) every frame.
- `assets/data/all-rounder.js` holds those weights and the recorded lap.
- `DESIGN.md` is the design system.

Run it locally with `python3 -m http.server` in this folder, then open http://localhost:8000.
