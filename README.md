# Nomuworks

Single-page marketing site for Nomuworks — an agency building AI systems that handle
customer support, business automation, and growth pipelines.

## Stack

Plain HTML, CSS, and JavaScript. No build step, no framework, no dependencies to install.
The only runtime dependency is [Lenis](https://github.com/darkroomengineering/lenis),
loaded from a CDN for smooth scrolling.

```
index.html    markup for every section
style.css     design system + all styling
script.js     scroll, reveals, pinned panels, chat demo, form
```

## Running locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit http://localhost:4173

## Design

Obsidian and gold palette on an editorial layout — Instrument Serif display type,
JetBrains Mono labels, and Inter for body copy.

Notable interactions:

- Pinned horizontal scroll through the three core services (desktop only; stacks
  vertically below 900px)
- Sticky stacking cards in the "Friction" section
- A chapter rail that tracks scroll position
- An animated chat demo that plays out a booking conversation
- Custom cursor and magnetic buttons on pointer-precise devices

All motion is disabled under `prefers-reduced-motion`.

## Contact form

The form has no backend. On submit it builds a `mailto:` draft and surfaces a link
for the visitor to send from their own mail client. To capture submissions properly,
point it at a form service (Formspree, Basin) or your own endpoint.
