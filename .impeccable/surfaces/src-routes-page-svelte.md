---
version: 1
slug: "src-routes-page-svelte"
primary_target: "src/routes/+page.svelte"
related_targets: ["src/routes/decrypt/+page.svelte","src/routes/keys/+page.svelte","src/routes/+layout.svelte"]
---

# lockbox app surface (Encrypt, Decrypt, Keys)

Mode: Operate. Audience and job: see PRODUCT.md (a stranger protecting a real file; resume reviewers second).

Chosen direction: Tamper-Evident Seal, fused with the user's pinned structure: a centred title, an Encrypt | Decrypt toggle, and a vertical three-step stepper. Field by field, the pin wins on layout and calm grey ground; the seal world supplies palette accent, type and the signature move. The roll's "tape blue owns the whole shell band" raise is translated to blue owning the active stepper and seals, because a full blue band contradicts the pinned look.

Memorable moment: the logo lid closes and a numbered seal strip lays across the finished file.

## Direction contract

THESIS: lockbox is a guided, three-step sealing desk: a file goes in, a numbered seal comes out. It refuses the dashboard-style form with everything visible at once; one step is open at a time.

OWN-WORLD: Cool pale grey ground, white working card, near-black ink, one security-tape blue for active step, primary action and seals; seal red only for torn/altered. Archivo for UI, Martian Mono for seal numbers, keys and file sizes. Seal strips: blue tape with white mono serial and a perforated dashed edge.

STORY: Visitor understands nothing is uploaded, picks files, chooses password or key, encrypts, and sees each file sealed with a number and saved. Decrypt mirrors it; a tampered file shows a torn seal. Keys generates a pair with clear "share" vs "never share" halves.

FIRST VIEWPORT: Slim header: chest logo + lowercase lockbox left; Keys link, theme toggle, GitHub right. Centered title "Encrypt files" with one-line promise. Segmented Encrypt | Decrypt toggle, 560px wide. Below, a vertical stepper in a white card: 1 Choose files (dashed drop zone, Next), 2 Password or Key, 3 Encrypt and download. Primary action is the step's blue Next/Encrypt button.

FORM: Tamper-Evident Seal, grounded list position 5. seed:84dd79c58a9cc081

Signature interaction: on success, the logo's lid closes once and each output row gets a seal strip whose serial comes from the file's header bytes; dashed while working, solid when sealed, torn when altered. Reduced motion: no lid animation, seal appears without travel.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
