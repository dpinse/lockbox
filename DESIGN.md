---
name: lockbox
description: Encrypt and decrypt files in the browser; every finished file carries a numbered seal.
colors:
  tape-blue: "#1e4ed8"
  tape-blue-hover: "#1a43bb"
  tape-blue-text: "#1e4ed8"
  tape-blue-wash: "#e9eefc"
  seal: "#1e4ed8"
  on-blue: "#ffffff"
  seal-red: "#b4231a"
  seal-red-wash: "#fbeae8"
  desk-grey: "#f2f3f5"
  card-white: "#ffffff"
  field-white: "#ffffff"
  ink: "#15181d"
  ink-2: "#545b66"
  ink-3: "#6b727d"
  line: "#e1e4e8"
  line-strong: "#c3c8d0"
  quiet: "#e7e9ed"
  seg-on: "#ffffff"
  tape-blue-dark: "#3563e9"
  tape-blue-hover-dark: "#4a74ee"
  tape-blue-text-dark: "#8fb0ff"
  tape-blue-wash-dark: "#1b2440"
  seal-dark: "#2f5be0"
  seal-red-dark: "#ff8a80"
  seal-red-wash-dark: "#3a1d1b"
  desk-grey-dark: "#111316"
  card-dark: "#191c20"
  field-dark: "#14171a"
  ink-dark: "#e8eaed"
  ink-2-dark: "#a7aeb8"
  ink-3-dark: "#8c939d"
  line-dark: "#2a2e34"
  line-strong-dark: "#41464e"
  quiet-dark: "#23272c"
  seg-on-dark: "#3a4048"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(28px, 5vw, 36px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  button:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
  seal-kind:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
  data:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0"
    fontFeature: "tnum"
rounded:
  inner: "5px"
  sm: "7px"
  md: "10px"
  card: "14px"
  pill: "999px"
  marker: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.tape-blue}"
    textColor: "{colors.on-blue}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.tape-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "44px"
  button-disabled:
    backgroundColor: "{colors.quiet}"
    textColor: "{colors.ink-3}"
  button-link:
    textColor: "{colors.tape-blue-text}"
    padding: "0"
  icon-button:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    size: "36px"
  field:
    backgroundColor: "{colors.field-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "28px"
  page-nav:
    backgroundColor: "{colors.quiet}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "4px"
  page-nav-active:
    backgroundColor: "{colors.seg-on}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  segmented:
    backgroundColor: "{colors.quiet}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "3px"
  segmented-on:
    backgroundColor: "{colors.seg-on}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inner}"
  step-marker:
    backgroundColor: "{colors.quiet}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.marker}"
    size: "28px"
  step-marker-active:
    backgroundColor: "{colors.tape-blue}"
    textColor: "{colors.on-blue}"
  seal-strip:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.on-blue}"
    typography: "{typography.data}"
    padding: "0 14px"
    width: "156px"
  seal-strip-torn:
    backgroundColor: "{colors.seal-red}"
    textColor: "{colors.card-white}"
  notice:
    backgroundColor: "{colors.tape-blue-wash}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  notice-danger:
    backgroundColor: "{colors.seal-red-wash}"
  tag-share:
    backgroundColor: "{colors.tape-blue-wash}"
    textColor: "{colors.tape-blue-text}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  tag-never:
    backgroundColor: "{colors.seal-red-wash}"
    textColor: "{colors.seal-red}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
---

# Design System: lockbox

## Overview

**Creative North Star: "The Tamper-Evident Seal"**

lockbox is a calm sealing desk. A file goes in, a numbered seal comes out. The ground is a cool pale grey, the work happens on a single white card, and everything is near-black ink except one colour: security-tape blue, the blue of the tape that goes across a parcel to prove nobody opened it. That blue marks the step you are on, the button that moves you forward, and the seal strip laid across each finished file. Red appears only when a seal is broken or something has gone wrong.

The structure is a guided stepper: a centred title with a one-line promise, an Encrypt | Decrypt toggle, and a vertical three-step stepper with one step open at a time. The density is low and the copy is short. Personality lives in two places only: the treasure-box logo, whose lid closes once when a file is encrypted, and the seal strip with its white mono serial and perforated edge. The rest of the interface stays quiet so those two moments read.

Light and dark themes are full peers. Both follow the system setting and can be forced with the header toggle; every colour token has a dark counterpart.

**Key Characteristics:**
- One accent (tape blue), spent only on the active step, the primary action and seals.
- Red is a signal for broken seals, errors and irreversible loss, never decoration.
- Archivo for every word of interface; Martian Mono only for data.
- A single white card on a grey desk, with one soft ambient shadow.
- Gently rounded corners (7px controls, 14px card), 1px hairlines, dashed edges for "not yet sealed".

## Colors

A cool neutral ground with one security-tape blue and one seal red, each given a narrow job.

### Primary
- **Security-Tape Blue** (tape-blue; dark: tape-blue-dark): fills the primary button, the current and completed step markers, the progress bar, the strong segment of the password meter, the caret, text selection and native checkbox accent. Hover deepens to **Tape Blue Pressed** (tape-blue-hover) in light and lifts to a brighter blue in dark.
- **Seal Tape** (seal; dark: seal-dark): the fill of a finished seal strip. Same hue as tape blue; kept as its own token so the seal can be tuned independently of buttons.
- **Tape Blue Text** (tape-blue-text; dark: tape-blue-text-dark): links, text buttons, "Sealed" status text and notice icons. In dark it shifts to a pale periwinkle so it stays legible on the dark card.
- **Tape Wash** (tape-blue-wash): the background of informational notices, the "share" tag, and a drop zone while a file is dragged over it.

### Secondary
- **Seal Red** (seal-red; dark: seal-red-dark): a torn seal strip, error text, an invalid field border, the weak segment of the password meter, and the "never share" tag. **Red Wash** (seal-red-wash) backs danger notices and that tag.

### Neutral
- **Desk Grey** (desk-grey): the page background; the calm grey ground.
- **Card White** (card-white) and **Field White** (field-white): the working card, and inputs, drop zones and key blocks on it. In dark, the field sits slightly darker than the card (field-dark below card-dark) so inputs read as recessed.
- **Ink** (ink): headings, body text, file names.
- **Ink 2** (ink-2): secondary copy: the promise line under the title, hints, step summaries, footer.
- **Ink 3** (ink-3): placeholders, upcoming step titles, disabled button text.
- **Hairline** (line) and **Strong Hairline** (line-strong): card borders and dividers; control borders, the step connector and dashed drop-zone edges.
- **Quiet** (quiet): track of the segmented controls and page nav, idle step markers, icon-button hover, disabled button fill.
- **Segment On** (seg-on): the raised selected segment; white in light, a lifted grey in dark.

### Named Rules
**The Tape Rule.** Tape blue fills only three things: the active or completed step marker, the step's primary button, and the seal strip. Everything else that needs blue (links, status, notices) uses the text or wash variant, never a solid fill.

**The Broken Seal Rule.** Red means "this is broken, failed, or cannot be undone". A torn seal, an error, an invalid field, a weak password, a Private key that must never be shared. It never appears as a brand colour or for emphasis.

## Typography

**Display Font:** Archivo (with system-ui, sans-serif), self-hosted variable, weights 400 to 700
**Body Font:** Archivo
**Label/Mono Font:** Martian Mono (with ui-monospace, monospace), self-hosted variable, weights 400 to 600

**Character:** Archivo is a sturdy grotesque that stays plain at text sizes and tightens into a confident title at 700. Martian Mono is wide and mechanical, like a serial number stamped on tape, which is exactly the job it is given.

### Hierarchy
- **Display** (700, clamp(28px, 5vw, 36px), 1.15, -0.025em): the one centred page title ("Encrypt files", "Decrypt files", "Keys"), balanced wrapping.
- **Headline** (600, 18px): section heads inside the card, such as the two halves of a Key pair.
- **Title** (600, 16px, 1.4): step titles in the stepper. An upcoming step drops to 500 in ink 3.
- **Body** (400, 16px, 1.5): running copy and the promise line. Inputs use 15px.
- **Body Small** (400, 14px): hints, errors, notices, step summaries, file status messages, footer.
- **Label** (600, 14px): field labels above inputs.
- **Button** (600, 15px, 1): every button label. Text buttons use 600 at 14px.
- **Seal Kind** (600, 10px, 0.12em, uppercase): the "SEAL Nº" / "BROKEN" legend printed on the seal strip, and nowhere else.
- **Data** (Martian Mono 400, 13px, tabular figures): seal serials (at 600), keys, file sizes, generated passwords.

### Named Rules
**The Data Face Rule.** Martian Mono is for values a person might compare, copy or read aloud: seal numbers, keys, sizes, passwords. Labels, headings, buttons and prose are always Archivo.

## Layout

A single centred column. The header spans up to 1120px (logo and lowercase "lockbox" left; Keys, theme toggle and GitHub right) with 18px by 24px padding. The main column is capped at 640px with 20px side padding, so the working card is about 600px wide. Below the title sits the Encrypt | Decrypt page nav at full column width, then the card 16px under it. The footer is centred small text with the source link.

Inside the card, the stepper is a two-column grid: a 28px marker column and the content, 14px apart, with 22px between steps and a 1px connector line between markers. Only the open step shows its body. Action rows sit 20px below content with 10px gaps; the primary button takes the remaining width.

Spacing steps that recur: 4, 8, 14, 20 and 28px (with 10px and 16px for gaps and inner padding). At 520px and below the card padding drops to 20px by 16px, the main column to 16px gutters, action buttons wrap and share the row, and seal rows stack their status under the file name.

## Elevation & Depth

Nearly flat. Depth comes from the grey desk against the white card, plus one soft ambient shadow on that card. Everything inside the card is flat and separated by hairlines. Selected segments get a 1px lift so the toggle reads as a physical switch.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(21 24 29 / 0.05), 0 8px 24px rgb(21 24 29 / 0.06)`; dark: `0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.25)`): the working card only.
- **Segment lift** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.1)`): the selected segment in the page nav and segmented control.
- **Focus ring** (`box-shadow: 0 0 0 3px rgb(30 78 216 / 0.35)`; dark: `rgb(143 176 255 / 0.45)`): every focusable element, paired with a transparent 2px outline so forced-colours mode still shows a ring.

### Named Rules
**The One Card Rule.** A page has one raised surface: the white card. Nothing inside it casts a shadow; inner groups use hairlines or a wash.

## Shapes

Gently rounded and rectangular. Controls, fields, notices and seal rows use a 7px radius; the drop zone and page-nav track use 10px; the card uses 14px; segments inside a track use 5px. Step markers are circles; tags are pills. Borders are 1px hairlines. A dashed edge means "open" or "not yet sealed": the empty drop zone (1.5px dashed, solid once filled), a seal strip that is waiting or working, and the perforated 2px dashed tear line on the right of every seal strip. A torn seal shows a jagged cut-out instead.

## Components

### Buttons
Solid, compact and plain.
- **Shape:** gently rounded (7px), 44px tall, 18px side padding; block buttons are 48px and full width.
- **Primary:** tape blue fill, white label. One per step.
- **Hover / Focus:** primary deepens to tape-blue-hover; secondary's border darkens to ink 3. Focus shows the blue ring. Transitions are 150ms on colour only.
- **Secondary:** white fill, strong hairline border, ink label, often with a 16px leading icon ("Copy password").
- **Disabled:** quiet grey fill and border, ink 3 label.
- **Text button:** tape-blue-text, 600 14px, underline on hover; used for "Change" in step heads.
- **Icon button:** 36px square, no border, ink 2 icon; quiet fill on hover.

### Inputs / Fields
- **Style:** field-white background, strong hairline border, 7px radius, 48px minimum height, 12px by 14px text padding. Inline icon buttons (show, generate, copy) sit at the right edge.
- **Focus:** border turns tape blue and the focus ring appears.
- **Error:** border turns seal red, error text below in red at 14px. Hints sit below in ink 2.
- **Data inputs:** keys and passwords switch to Martian Mono at 13px.
- **Password meter:** four 4px bars under the field; red when weak, ink 2 when fair, tape blue when strong.

### Navigation
- **Header:** brand left (chest logo plus "lockbox", 700 21px); 36px tall links in ink 2 that gain a quiet fill and ink colour on hover or when current.
- **Page nav (Encrypt | Decrypt):** a full-width two-column track in quiet grey with 4px padding; the current page is a white raised segment at 600, the other is ink 2 at 500. It is a pair of links, not tabs.
- **Segmented control (Password | Key):** the same idea, inline and smaller: 3px track padding, 7px by 16px segments, 15px labels.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card white on desk grey.
- **Shadow Strategy:** the Card shadow; see Elevation & Depth.
- **Border:** 1px hairline.
- **Internal Padding:** 28px (20px by 16px on phones).

### Notices and Tags
- **Notice:** tape wash background, ink text at 14px, a 16px icon in tape-blue-text, 7px radius. The danger variant uses red wash with a red icon, for things like losing a Private key or deleting an incomplete download.
- **Tag:** a 12px 600 pill beside a section head. "Share" in tape wash and blue text; "Never share" in red wash and red text.

### Stepper
The spine of every task. Each step is a 28px numbered circle, a title and, when collapsed, a short ink 2 summary of the choice made ("2 files", "Password") with a "Change" text button. Idle markers are quiet grey; the current step and completed steps fill with tape blue, completed ones showing a check. Upcoming titles dim to ink 3 at 500.

### Drop Zone
A 10px dashed box on the field background with a blue upload icon, a line of prompt copy and a small secondary "Browse" button. Dragging over turns the edge blue and the fill to tape wash. Once files are chosen it becomes a solid-bordered list: file name in ink, size in Martian Mono, hairline dividers, scrolling past 220px.

### Seal Row (signature)
Every output file gets a row: a 156px seal strip on the left, the file name and status message in the middle, a status label on the right.
- **Sealed / intact:** the strip is solid seal tape with "SEAL Nº" in the seal-kind face and the serial (from the file's header bytes) in Martian Mono 600, white. A 2px dashed white perforation runs down its right edge. Status reads "Sealed" or "Seal intact" in tape-blue-text with a check.
- **Waiting / working:** the strip is drawn but not applied: transparent with an inset wash outline, blue placeholder serial, grey dashed edge. A 3px tape-blue progress bar grows along the bottom of the row; status shows the percentage.
- **Torn:** the strip turns seal red, the legend reads "BROKEN", and a jagged cut-out replaces the perforation. Status and message go red with an alert icon.
- **Failed:** an unapplied strip in ink 3, red message and status ("Not saved").
- **Motion:** on sealing, the strip lays across from its left edge (clip-path reveal, 520ms, ease-out `cubic-bezier(0.16, 1, 0.3, 1)`). On success the logo lid lifts and drops shut once (760ms). With reduced motion the lid does not move and the seal appears without travel.

## Do's and Don'ts

### Do:
- **Do** spend solid tape blue only on the current or completed step marker, the step's primary button and the seal strip (The Tape Rule).
- **Do** keep one primary button per step, taking the remaining width of its action row.
- **Do** set seal numbers, keys, file sizes and passwords in Martian Mono at 13px with tabular figures, and everything else in Archivo.
- **Do** use a dashed edge for anything still open or unsealed, and turn it solid once complete.
- **Do** give every colour a dark-theme counterpart and check both themes; dark uses the lighter tape-blue-text for blue text.
- **Do** keep the page to one centred title, one promise line and one white card.
- **Do** show focus with the 3px blue ring plus a transparent outline.

### Don't:
- **Don't** use red for anything that is not broken, failed, invalid or irreversible.
- **Don't** fill a whole header band, page background or large area with tape blue; the calm grey ground is part of the look.
- **Don't** put Martian Mono on labels, headings or buttons.
- **Don't** add shadows inside the card or raise a second surface on the page (The One Card Rule).
- **Don't** spread the treasure box beyond the logo and its single lid-closing animation.
- **Don't** reuse the seal-kind legend style (10px tracked capitals) outside the seal strip; it is the tape's printing, not a heading style.
