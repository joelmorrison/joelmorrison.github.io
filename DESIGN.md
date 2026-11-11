---
name: Joel Morrison · Portfolio
description: A jacquard loom in imperial violet. A punched card of instructions weaves real work into cloth.
colors:
  imperial-night: "#0e0819"
  imperial-night-raised: "#1a1030"
  court-lilac: "#cbb8ff"
  regent-violet: "#9b7bff"
  crown-pearl: "#ffffff"
  vellum-lilac: "#ece5f8"
  ermine: "#f8f4ff"
  faded-lavender: "#c9bfdc"
  warp-faint: "rgba(203, 184, 255, .10)"
  hairline: "rgba(203, 184, 255, .18)"
  hairline-strong: "rgba(203, 184, 255, .35)"
typography:
  display:
    fontFamily: "Cinzel, Times New Roman, serif"
    fontSize: "clamp(3.25rem, 2rem + 5.4vw, 6rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: ".03em"
  headline:
    fontFamily: "Cinzel, Times New Roman, serif"
    fontSize: "clamp(2.25rem, 1.6rem + 3vw, 4rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: ".03em"
  title:
    fontFamily: "Cinzel, Times New Roman, serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.5vw, 2.625rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: ".03em"
  title-plain:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
  lede:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + .6vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: ".9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: ".75rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: ".03em"
rounded:
  none: "0px"
  hole: "50%"
spacing:
  s-1: "8px"
  s-2: "16px"
  s-3: "24px"
  s-4: "32px"
  s-5: "48px"
  s-6: "72px"
  s-7: "112px"
components:
  button-primary:
    backgroundColor: "{colors.court-lilac}"
    textColor: "{colors.imperial-night}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ermine}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  header-cv:
    backgroundColor: "transparent"
    textColor: "{colors.ermine}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "44px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.faded-lavender}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 10px"
  punch-card-marker:
    backgroundColor: "{colors.vellum-lilac}"
    rounded: "{rounded.none}"
    padding: "3px 5px"
  punch-hole:
    backgroundColor: "{colors.imperial-night}"
    rounded: "{rounded.hole}"
    size: "6px"
  disclosure-summary:
    textColor: "{colors.court-lilac}"
    height: "44px"
---

# Design System: Joel Morrison · Portfolio

## Overview

**Creative North Star: "The Imperial Loom"**

The site is a jacquard loom. Binary instructions weave Joel's work into cloth: the hero's neural network is woven from the real trained weights of the Crash Course all-rounder, and the Crash Course circuit is woven from its real control points. Instructions become a result in plain sight, which is the whole argument of the portfolio. It deliberately refuses the dark developer template of a big name over a grid of project cards.

The mood is night silk, lit by thread. The ground is a near-black violet; light comes from the threads themselves (pearl for the strongest, lilac for the body of the weave, violet for shade and halftone), and on a fine pointer a soft pearl sheen follows the cursor as if the silk were tilting. Everything else stays quiet: Cinzel capitals carry the royal register, Hanken Grotesk does the reading, Azeret Mono appears only where something is data. Structure comes from hairline rules and ledger rows, never from boxed cards.

The page reads as a book in chapters: the hero is Chapter 00 · Index, and each section after it is a numbered chapter (01 About to 06 Contact) whose label sits above its headline in Azeret Mono. Density is generous between chapters and tight within them. Motion has two authored moments: the weave-in on load, then the live network, which replays the all-rounder's real lap through its real weights so the threads carrying signal light up. Around them sit four supporting motions: the staggered menu, a scroll reveal for anything that starts below the fold, the lead claim lighting word by word as it reaches reading height, and click sparks on fine pointers. Everything else is reserved for small state changes. Reduced motion gets the finished cloth with one still frame of that lap; touch gets the cloth without the sheen, hover or linen tester.

**Key Characteristics:**
- Cloth as the only illustration: weft floats (short horizontal bars), halftone dots for tone, a faint warp dot grid, always rendered from real data.
- Imperial violet palette at high contrast; light comes from thread, not from glows or gradients.
- Cinzel capitals for display, Hanken Grotesk for reading, Azeret Mono for data and captions only.
- Sharp corners everywhere except punched holes; hairlines instead of containers.
- Every section is a numbered chapter; the menu lists the same numbers, so the page and its index agree.

## Colors

A high-contrast imperial palette: one near-black violet ground, one lilac accent family, and pearl reserved for the brightest thread.

### Primary
- **Court Lilac** (`court-lilac`): the thread colour and the single accent. Primary buttons, links on hover, the lede, sub-headings inside projects (Works / Didn't work yet / Learned), meta labels, focus rings, text selection. 11.1:1 on the ground.

### Secondary
- **Regent Violet** (`regent-violet`): shade and halftone in the weave, the read line on the punch card, the scrollbar thumb, weft-float list markers. 6.2:1 on the ground, so it can carry large text but is used for marks, not body copy.

### Tertiary
- **Crown Pearl** (`crown-pearl`): the brightest threads (the strongest fifth of network connections), display type, big numbers in the results table, the cursor sheen. Never a surface fill except the copied-email confirmation.
- **Vellum Lilac** (`vellum-lilac`): punch-card stock. The staggered menu's panel and the small evidence markers on skill receipts. Holes are punched in Imperial Night.

### Neutral
- **Imperial Night** (`imperial-night`): the page ground, punched holes, text on lilac buttons, the theme colour.
- **Raised Night** (`imperial-night-raised`): the rare raised surface: the linen tester lens and the video letterbox.
- **Ermine** (`ermine`): primary text. 18.2:1 on the ground.
- **Faded Lavender** (`faded-lavender`): secondary text, descriptions, captions, Works / Didn't work yet / Learned body. 11.2:1 on the ground.
- **Hairline** (`hairline`) and **Strong Hairline** (`hairline-strong`): rules between rows and sections, tag borders, ghost-button and header-control borders. Lilac at 18% and 35%, never grey.
- **Faint Warp** (`warp-faint`): the warp dot grid under the cloth.

### Named Rules
**The Thread Light Rule.** Light on this site comes from thread. Brightness is earned by data (stronger weight, stronger thread), never added as glow, gradient text or blur.

**The One Accent Rule.** Court Lilac is the only accent. Regent Violet shades it; nothing introduces a second hue.

## Typography

**Display Font:** Cinzel (with Times New Roman, serif)
**Body Font:** Hanken Grotesk (with system-ui, sans-serif)
**Label/Mono Font:** Azeret Mono (with ui-monospace, monospace)

**Character:** Cinzel's inscriptional capitals give the royal register without ornament; Hanken Grotesk is warm, open and plain, so the reading feels human rather than corporate. All three are self-hosted variable WOFF2 files with `font-display: swap`; Cinzel and Hanken are preloaded.

### Hierarchy
- **Display** (`display`): the hero name (a slightly tighter clamp, 3rem to 6rem at line-height .98) and the contact headline. Pearl, capitals.
- **Headline** (`headline`): section headlines and the lead project name. Each two-beat headline breaks onto two lines, one beat per line.
- **Title** (`title`): secondary project names in the hackathon list.
- **Plain Title** (`title-plain`): role and degree names in Education and Experience, with the organisation in Faded Lavender at weight 400.
- **Lede** (`lede`): the hero lede (in Court Lilac), the opening About paragraph, the Crash Course claim.
- **Body** (`body`): all reading text, held to 62ch (section intros to 56ch).
- **Small Body** (`body-sm`): supporting copy inside projects: contribution lines, notes, Works / Didn't work yet / Learned, disclosure summaries, nav links.
- **Label** (`label`): meta lines, tags, figure captions, table headers, network labels, receipt-type labels (down to .6875rem). Sentence case, tracked +.03em.

### Named Rules
**The Data Voice Rule.** Azeret Mono is only for data, measurements, captions and labels. It never sets a sentence the visitor is meant to read as prose.

**The Quiet Minor Sections Rule.** Education and Experience use the title step (`min(step-2, (100vw − 2 × gutter) / 11)`) for their headlines; only Work, Skills, About and Contact speak at headline scale.

**The Two Beats Rule.** Section headlines are two short sentences on two lines (`h2 .line` blocks), and each beat stays on one line at every width. Section headlines size to `min(step-3, (100vw − 2 × gutter) / 12.6)` and the contact headline to `min(step-4, (100vw − 2 × gutter) / 9.1)`, because the widest beats measure 12.3em and 8.8em in Cinzel. Re-measure if a headline changes.

## Layout

A single scrolling page in a centred column of `min(1200px, 100% − 2 × gutter)`, with the gutter at `clamp(1.25rem, 4vw, 3.5rem)` and section padding at `clamp(6rem, 12vh, 10.5rem)`. Spacing follows an 8px base (`s-1` to `s-7`), with 112px reserved for major breaks such as the gap before the hackathon list and the footer.

The hero (Chapter 00) is one full-height stage, and the network is the first thing anyone sees: the only object, centred on what you see (its three columns of neurons plus their output labels), as large as the screen allows (up to 74% of the width and 76% of the height) and stopping 28px above the name. The name sits smaller than the network (up to 3.5rem), on one line along the bottom left with the lede beneath it and the goal line (DCU, summer 2027 internship) under that in Faded Lavender, so a recruiter who only sees the first screen still leaves with the goal; the chapter label and the live caption sit bottom right. There are no buttons in the hero: the Menu and the page itself do that work. Below the hero, content is a set of **ledger rows**: hairline-topped grid rows in asymmetric fractions (Works / Didn't work yet / Learned 9rem / 1fr; Education and Experience 3fr / 8fr; About facts 7.5rem / 1fr; receipts in two columns with an 8.5rem label). The About headline is centred, as the statement of the page. The lead project opens with its meta line and its claim at display size, then a 6fr / 6fr split of the woven circuit and the results table, then the demo, then the description beside its links. Below it, **All work** is an index of numbered rows (number, name, kind, date, icon in 3.5rem / 5fr / 4fr / 2fr / 1.5rem) that takes three to eight projects; the hackathon rows open in place. Below 520px section padding tightens to `clamp(4rem, 9vh, 5.5rem)`.

Breakpoints: at **900px** every split becomes one column and index rows stack their kind and date under the name; at **860px** the hero becomes a single column at least `min(88svh, 740px)` tall: a network sized from the width (at most 34% of the viewport height, never wider than about 1.6:1, and narrow enough that the longest live label, "steering straight", fits) under the header, then the chapter label and caption, then the name and lede at the bottom of the first screen; at **600px** the menu panel goes full width; at **520px** receipts and tables tighten. Nothing scrolls sideways at 360px.

## Elevation & Depth

Flat by default. Depth comes from light in the cloth (the pearl sheen and the brightness of threads) and from scrims: over the hero the fixed header is clear; once the name has scrolled beneath it, the header turns solid Imperial Night with a Hairline under it, so no text shows through. The open menu lays a 60% Imperial Night scrim over the page. The cloth behind the hero's name fades out from the bottom so the name and caption sit on quiet ground. There are only two real shadows, both soft and offset.

### Shadow Vocabulary
- **Lifted action** (`box-shadow: 0 8px 20px rgba(0,0,0,.35)`, hover `0 12px 26px rgba(0,0,0,.45)` with a 2px rise): primary buttons only.
- **Lens** (canvas shadow, 30px blur, 12px offset, black at 50%): the linen tester, the one object that floats above the cloth.

### Named Rules
**The Ledger Not Cards Rule.** Content is separated by hairlines and whitespace, never by boxes, panels or shadowed cards. If a group needs a boundary, it gets a 1px Hairline rule on top.

## Shapes

Sharp corners everywhere (`rounded.none`): buttons, tags, the CV control, the video frame, the punch card. The only round forms are punched holes (`rounded.hole`): the evidence markers on receipts, the status dot in Contact, and the halftone and warp dots in the cloth. Focus rings carry a 2px radius purely so the outline reads cleanly. Lines are 1px hairlines, with 2px reserved for the read line and weft-float list markers (10 × 2px bars).

## Components

### Buttons
Flat lilac blocks with a quiet lift.
- **Shape:** square corners (0px), 48px tall, 24px horizontal padding, Hanken Grotesk 600 at .9375rem.
- **Primary:** Court Lilac fill, Imperial Night text, Lifted action shadow. Hover rises 2px and deepens the shadow; active settles back.
- **Ghost:** transparent with Ermine text and a Strong Hairline border; hover turns the border Court Lilac. No shadow.
- **Pairing:** each decision point offers one Primary and at most one Ghost (Contact: email / Download my CV; the hero has none). Further options drop to a row of quiet text links (Copy email, GitHub, LinkedIn).
- **Copied state:** the Copy email link turns Court Lilac and reads "Copied" briefly, then resets.

### Header controls
The CV link and the Menu button: 44px tall, Strong Hairline border, square corners, Court Lilac border on hover.

### Tags and study chips
- **Style:** Azeret Mono labels (tags) or .875rem Hanken (study chips) inside a 1px Hairline border, Faded Lavender text, square corners, no fill.
- **State:** static; they are labels, not filters.

### Navigation: the staggered menu
Fixed header with the JM. monogram in Cinzel 600 on the left and two header controls on the right: CV and Menu (two hairlines that cross into an X). At every width the Menu opens the staggered menu: a Regent Violet layer, then a Court Lilac layer, then the Vellum Lilac panel sweep in from the right (`min(560px, 100%)`, 70ms apart), and the six chapter names rise one by one out of a clip in Cinzel at up to 3.9rem, 60ms apart, each with its chapter number in Azeret Mono. Closing runs the layers back in reverse. On the panel, type and controls are Imperial Night; the current chapter carries a short Imperial Night weft float before its number; hovered names step 8px right. The panel foot holds the internship status and Email, GitHub, LinkedIn and CV. While open, the page is `inert` and locked (padded by the scrollbar width so nothing shifts), focus moves to the first chapter, Escape or the scrim closes it and returns focus to Menu.

### Scroll reveal
Anything that starts below the fold rises 22px and fades in over 760ms on the house ease as it enters, headlines line by line and lists item by item, 70ms apart (capped at eight steps). Anything already on screen at load never moves. The pre-state is set by the script, so without it everything is simply visible; reduced motion skips it.

### The lit claim
The lead project's claim is split into words for the eye only (screen readers get the sentence once, whole). Unlit words sit at 28% and light in reading order as the claim rises from 90% to 50% of the viewport height, so it is fully lit where it is read. Reduced motion shows it fully lit.

### Work index and preview
Each row is a hairline-topped grid; on hover a 5% Court Lilac wash fills it (14px past each edge, so columns never move) and the name steps 8px right in Court Lilac. Hackathon rows are native disclosures whose height animates open and closed; Crash Course's row jumps back to the lead project. On fine pointers, hovering Crash Course's row weaves a 240px copy of the technical circuit in a Raised Night frame that glides above and right of the pointer. Only rows with a real picture get a preview; the others never get a placeholder.

### Click sparks
On fine pointers, a click throws eight short 2px threads outward from the pointer over 480ms, alternating Court Lilac and Crown Pearl (Imperial Night on the menu panel). The two cloths don't spark, because press-and-hold there is the linen tester. Touch and reduced motion get none.

### Punch-card evidence marker (signature)
A small Vellum Lilac strip with three 6px holes beside each skill receipt. Holes punched through in Imperial Night mean public work; open (16% tint) holes mean the evidence is weaker. Three punched holes for a public project, two for a hackathon prototype, one for current coursework.

### The loom (signature)
Canvas cloth rendered from a source picture on a 7px weave cell: cells above .62 tone become weft floats, weaker cells become halftone dots sized by tone, and a faint warp grid sits underneath. On load it weaves row by row (12ms per row) while threads fly in from alternating sides, or in any order a cloth gives it (see The entry). On fine pointers a pearl sheen follows the cursor (peak .36 opacity, no hard core), and press-and-hold raises the linen tester: a square Raised Night lens with a ruler edge at 2.6× zoom. It pauses off-screen, and off-screen cloths are only built once they come within a screen of view, in idle time. The warp grid is stamped from a single dot tile and the woven layer is painted in thread colours directly, keeping the load under Lighthouse's blocking budget. Reduced motion and touch get the finished cloth.

### The entry
The hero network arrives before anything else: it develops out of scattered dots, from the middle of the network outwards, over two seconds (each cell takes its moment from its distance to the network's centre plus a stable random offset, on an ease-out curve). Each newly woven cell is Crown Pearl for 520ms before it cools to lilac. The name and lede rise in halfway through, and the output labels fade in once the network is whole. It runs on touch too; reduced motion gets the finished cloth with everything in place.

### The field (signature)
One halftone light lies behind the whole page instead of a separate one per chapter. Its warp dots sit on the same 6px grid as the hero and scroll with the page; the light glides across them, holding through each chapter and easing to the next chapter's spot over the last half of the one before, always kept out of the reading column. It rises from the bottom right as the hero leaves. While you scroll fast the lit dots draw out into short weft floats and settle back into dots when you stop; on fine pointers the dots lift near the cursor on the lit side of the page. Chapters are no longer divided by hairlines: a short Regent Violet float before each chapter label marks the change instead. Reduced motion gets the same light, placed without easing, floats or lift.

### The live network (signature)
After the entry finishes, the hero network replays one real lap of the all-rounder on the technical track (`ALL_ROUNDER.lap`: 11 recorded sensor inputs and the 3 outputs, sampled at 15 Hz from the game). Each frame runs the inputs through the real weights and biases (tanh, 11 → 8 → 3), so nothing is invented: brightness is the signal a connection is actually carrying (The Thread Light Rule).
- **Neurons** fill with halftone dots on the weave grid, sized by activation: Crown Pearl when positive, Regent Violet when negative.
- **Threads:** the 26 connections carrying the most signal each carry two weft-float comets (a bright head and two fading cells) from source to target, faster when the signal is stronger (50 to 120px a second). A connection joining or leaving that set fades over about a quarter of a second, and neuron fills are smoothed over 70ms, so nothing pops.
- **Output labels** read the live decision in Azeret Mono: `steering ← 0.42` (← is the car's left), `accelerator on`, `brake off`. The caption carries a lap clock (`12.4 s of 29.3 s`).
- **Hover** (fine pointers): within 22px of a neuron, the rest of the cloth eases down to 38% over about a tenth of a second, a ring of 20 pearl dots settles around the neuron, and its connections draw outwards from it as threads of floats over 460ms before carrying their comets; leaving reverses it just as gently. A Raised Night tip fades and rises 6px into place and names it (for example "Ray 30° left · 62% of its range clear", "Hidden neuron 3 of 8 · −0.49", "Steering · left 0.42"). Pressing and holding still raises the linen tester, and the live layer steps aside for it.
- It pauses off-screen and in hidden tabs. Reduced motion draws one still frame from mid-hairpin.

### Results table
Hairline-ruled, left-aligned, tabular numerals. Headers in Azeret Mono; the key figures in Cinzel at 1.75rem in Crown Pearl with the share of laps beneath in Azeret Mono. The winning row's figure is Court Lilac and its name carries a text label ("Best transfer"), never colour alone.

### Works / Didn't work yet / Learned
On the lead project, three ledger rows (Court Lilac sub-head on the left, text on the right) behind a native disclosure that is open on desktop and closed on phones. The training demo is never folded: its poster sits openly after the results, because it is the proof a non-technical visitor understands fastest. The project's links sit beside its tags, with the repository as the one Ghost button and the rest as text links. Every disclosure on the site shares one style: a 44px Court Lilac underlined summary with a turning chevron. On hackathon rows it folds behind a native disclosure (a 44px Court Lilac underlined summary with a chevron that turns on open), each list item marked with a Regent Violet weft float.

## Do's and Don'ts

### Do:
- **Do** keep every corner square except punched holes and halftone dots.
- **Do** separate content with 1px Hairline rules and whitespace (The Ledger Not Cards Rule).
- **Do** render cloth only from real data: trained weights, track control points, real figures.
- **Do** keep Court Lilac the single accent and Crown Pearl for the brightest thread and display type.
- **Do** use Azeret Mono only for data, captions and labels (The Data Voice Rule).
- **Do** give every interactive element a 2px Court Lilac focus ring at 4px offset and a 44px minimum target. Links inside running prose are the one exception; standalone links (receipts, footer, Verify) reach 44px, and a receipt's whole row is its target.
- **Do** ship the finished, still cloth for reduced motion and touch, and limit the sheen, linen tester, row preview and click sparks to fine pointers.
- **Do** reveal only what starts below the fold; never hide content behind a style that only the script removes.
- **Do** theme browser surfaces from the palette: selection in Court Lilac, caret Court Lilac, scrollbar Regent Violet on Imperial Night.

### Don't:
- **Don't** box content in cards, panels or shadowed containers.
- **Don't** add a second accent hue, gradient text, glows or decorative blur (The Thread Light Rule).
- **Don't** use rounded corners or pill shapes on buttons, tags or containers.
- **Don't** set prose in monospace or body text in Cinzel.
- **Don't** add shadows beyond Lifted action and the Lens.
- **Don't** weave decorative or invented pictures into the cloth.
