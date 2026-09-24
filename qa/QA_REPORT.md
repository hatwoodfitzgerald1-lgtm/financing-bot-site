# Financing Bot: direct-qa-loop report

Run: 2026-09-24, against the dev server at http://127.0.0.1:4321 (Astro 7, SSR catch all), driven with Playwright Chromium headless under swiftshader (software GL). Every timing and frame rate below is from that environment and is an upper bound, not a device number; fps in particular is indicative only. Source of truth: design/Financing_Bot_Website_Design.md and design/BUILD_DIRECTIVE.md. Registry for Gate 5: registry/registry_plus_concurrent.json (BioVirtua, Astroquanta, Smart Augment, Addabill).

Round scorecards are in qa/rounds/round1.json to round3.json (scored with the skill's qa_scorecard.py). Measured budgets are in qa/measurements.json, the scan in qa/scan.json, the screenshots in qa/screens/.

## Final verdict

| | |
|---|---|
| Final score | 95 / 100 (threshold 95) |
| Compliance (blocking) | PASS |
| Gate 5, Novelty vs. Registry (blocking) | PASS, check_novelty.py: ALL QUOTAS CLEAR against all four logged directions |
| Gate 6, Comprehension and trust (blocking) | PASS |
| Gate 1, Substance and correctness | 24 / 25 (min 23) |
| Gate 2, Distinctiveness and design | 28 / 30 (min 27) |
| Gate 3, Motion, interactivity and unique UI | 24 / 25 (min 22) |
| Gate 4, Performance, accessibility and technical | 19 / 20 (min 18) |
| Gates passed | 7 of 7 (three blocking gates plus four scored gates all at or above minimum) |
| Loop iterations | 3 rounds (cap 8): 89, 93, 95 |
| Media slots scored PENDING (not FAIL) | PH-01 to PH-11, hero clips V-01b to V-01d (V-01 provisional from clip 1) |

Would I enter this for Site of the Day: yes. The Overnight Queue wall, the Operations Ledger Grid, the Recalculation set piece and the condition drafter read as one authored thing in one voice, and the one visible gap is the pending photography. Awwwards weighted sub scores: design 8.2 of 10 (weight 40), usability 8.6 (30), creativity 8.4 (20), content 8.8 (10).

## Round log

### Round 1 (score 89, Gate 4 below minimum)
Observed on the live site, both widths, every route scrolled, every nav, footer, CTA and button clicked, the purchase flow and the pilot run, the drafter used, the SMS block submitted unchecked then checked, the aliases and 404 hit:
1. Every blog post overflowed horizontally at 1440 (scrollWidth 1555): the kit figure band (K-B1 to K-B4) was breaking out of column 2 with a 100vw width and a gutter margin.
2. The pricing ledger's rows faded in over 2.6 s after entering view (a 0.07 s per row stagger on 29 rows), so the storefront table sat empty while scrolling; the pack terms and blog index rows unmasked late for the same reason.
3. Inline text links (the SMS consent lines' Terms and Privacy Policy, mailto links, the agreement line, the skip link) and the drafter's range input had no hover, focus or press movement.
4. Pending photograph bands rendered the browser's broken image glyph and raw alt text at the top left; the empty state was not designed.
5. Mobile tap targets under 44 px: footer link columns (29 px), cart Remove (20 px), live status chips (20 px), the auto reorder switch (28 px), the hero's See how it works link (24 px).
6. The blog tape and product rail scenes read faint at 1440 (ash rows at 0.35 opacity).
7. The legal pages' footer row index repeated the last section's (0003, 0003).
8. The wall's dock settle scaled the WebGL canvas with a CSS transform.

Fixes made (one batched edit pass): kit figure breakout recomputed from the column position (margin-left of gutter plus one column, width 100vw); row level IntersectionObserver reveals for every draw-table row and every idx-row with a capped 0.05 s batch stagger (rows now land within 0.6 s of entering); underline motion (offset and thickness with Ratchet) on all inline links, a transition on the skip link, a scaling thumb on the range input; a designed pending media state (the band goes transparent so the page's own hairline grid shows through, ruled top and bottom, with "photograph pending" and the alt line in mono, added only on image error, so it vanishes when the files land); coarse pointer rules giving footer links, Remove, chips, the switch, the pilot link and the checkboxes 44 px targets without changing the drawn size; tape rows in paper and rail tabs at 0.5 to 1 opacity; legal footer index 0004; the dock settle moved to camera.zoom.

### Round 2 (score 93, every gate at or above minimum)
Re-verified: no horizontal overflow on any route at either width; the ledger's visible rows are opaque within 0.6 s; zero interactive elements without motion on every route (the seven hidden radio inputs inside the drafter's ledger tabs are the only ones flagged, and their labels carry the motion); a tap only purchase at 375 completes with no account, the sticky Total bar shows and expands; the mobile checkout's slab index was touching the intro paragraph (fixed with a 28 px margin at mobile widths); the H1's mask reveal only began after the loader had been removed, so the H1 became fully readable at about 2.2 s in the sandbox. Fixes: the loader now adds body.loaded at the split (the H1 lines rise as the plate splits) with a 0.07 s stagger, so the H1 is fully readable at about 1.8 s here and the audience line and button at the split (about 1.2 to 1.3 s).

### Round 3 (score 95, done)
Fixes: the sixty wall cursors merged into one BufferGeometry and one material (one draw call in place of sixty, halving the wall's draw calls); the Three.js load is now gated on document.fonts.ready plus two frames after the H1 paints (measure.py: three_start 330 ms after an LCP of 256 ms; before the gate it could start 57 ms ahead of the LCP paint); V-02 was recorded as a 16:9 frame with the 16:10 app window pillarboxed inside it, so the chapter media showed slate bars at the sides on desktop and mobile. It was re-encoded from the same recording, cropped to the window (crop 1600 by 1036 at 160,22) and delivered at 1920 by 1242, the exact 3200 by 2072 ratio of the product screens, with the 720 encode, the VP9 webm and both posters regenerated, the video element's intrinsic size and the .v02 box set to that ratio, and the manifest note updated. Verified: V-02 plays once when the chapter pins (currentTime advancing, ended at 7 s, the replay cell then shown) and fills its box edge to edge on the right.

## Gate by gate, with what was observed

### Compliance: PASS
- Real purchasable use case: three packs at visible prices with "Buy the 100 File Pack", "Buy the 500 File Pack", "Buy the Enterprise Block" (each adds to the cart and opens /cart); site wide "Buy a file pack | from $2,400" to /pricing#ledger on Home, /product, /about, every post, /drafter and the 404. No Learn More, Get in Touch, Get Started anywhere.
- Join Our SMS List block: word for word per design doc 6.4 on every page's footer, on Home as a section and on Contact; both boxes unchecked on every instance (34 route and width combinations checked); the consent text ends "Read our Terms and Privacy Policy." with Terms to /terms-of-service and Privacy Policy to /privacy-policy; submit with both unchecked returns the three GOV.UK messages ("Enter your phone number", "Tick the box to agree to the Terms & Privacy Policy", "Tick the box to agree to receive SMS marketing notifications from Financing Bot"); with both checked and a valid number the success state reads "You're on the list. A confirmation text is on its way to 404 555 0100. Reply STOP at any time to cancel."
- Terms and Privacy render section 8 verbatim (0 missing lines in the copy check), [INSERT SHORT CODE] and [EIN Address] present only there; /terms, /privacy, /terms/, /privacy/ all 301 to the canonical routes; an unknown path returns HTTP 404 with the designed page and the "No file at this address" title, noindex.
- Footer and Contact show [Physical Address], [PHONE NUMBER], support@financingbot.com and "[BUSINESS NAME], doing business as Financing Bot"; the EIN address is nowhere else (scan.json).
- The disclaimer is on /pricing, /product and /about; the package footer line is on every product screen; no testimonials, ratings, press, social links or badge wall; the card marks line is the only payment mark; nothing preselected, no urgency, no demo strings.
- Dash and banned word scan of the rendered HTML: PASS on every route.

### Gate 6, Comprehension and trust: PASS
- Five second test at 1440: H1 "Read, recalculated and cited. Your underwriter decides." at y 196 to 340, the audience line at y 364, the paper block button at y 512 with "See how it works" as a plain link beside it, the wall of sixty loan rows with "60 in queue" at the right. At 375: H1 at y 88, audience line ending y 324, button at y 364 to 412, link at 432, the pocket queue starting at 488, half visible above the 812 fold. What, for whom and what next all inside the top 480 px and above the fold.
- Motion clearance, measured in the sandbox with the loader active: the plate splits at about 1.2 s, the audience line and button are readable at the split, the H1 lines finish rising at about 1.8 s; hard cap 4 s with the Skip cell from the first frame. Under reduced motion the loader is a single fade.
- One primary action per view: the paper block button is the only filled block in every first viewport; the pilot appears only as the underlined text link below the ledger, in the footer and under the drafter's result.
- Heading stack (Home): H1, "Sixty files in the queue, each one returned with its pages named", "Income recalculated by its rule, the page beside each figure", "Conditions drafted in your wording, prior to doc and prior to close", "What the software prepares, and what it never decides", "Where the work happens", "Three prepaid packs, one rate each, nothing that renews on its own", "Founded in 2026, for the shop where the underwriter is the constraint", "Join Our SMS List". Reads as the story with no body copy.
- Trunk test on /pricing and /blog/large-deposit-letter cold: wordmark top left, the six nav cells name their destinations (How it works, Pricing, Condition drafter, About, Blog, Contact), the active cell carries its mono row index and paper rule, the cart cell top right.
- Guest checkout end to end on desktop: pricing to cart to checkout to /order-confirmation?order=10482 with no account, the cart cell rolling to 0, the method "card ending 4242"; the $0 pilot completes through the same cart and checkout with "No payment method is collected for a $0 order.", "Place $0 order" and the six pilot rows on the confirmation.
- Mobile purchase at 375 by tap only (Playwright tap, no mouse): completes to order 10482 with no horizontal scroll; the fixed "Total $2,400.00" bar sits above the Pay button and expands the summary on tap.
- Cost visibility: prices and per file rates on /pricing, "sales tax: calculated at checkout from the billing address" in the cart, the tax row printing $0.00 or the state figure ($150.00 for TX on $2,400.00), no shipping, the renewal statement beside the switch and under pack term 06.
- Form discipline: one column, top aligned labels, "(required)" and "(optional)" on every field, autocomplete tokens in the DOM (organization, given-name, family-name, email, tel, country, address-line1, address-line2, address-level2, address-level1, postal-code, cc-number, cc-name, cc-exp-month, cc-exp-year, cc-csc), the stated reason under the mobile number.
- Error standard: "not-an-email" on blur gives "Enter an email address in the correct format, like name@lender.com" beside the field; submitting empty gives ten errors in the "There is a problem" summary, each linked to its field, the "!" cell as the non colour marker, every typed value preserved; the decline message fires only for 4000 0000 0000 0002.
- No deceptive design, no ratings, one payment marks line, working browser back, no invented step.

### Gate 1, Substance: 24 / 25
- Copy: the About page, the four posts, the Terms and the Privacy Policy match the design doc verbatim (automated line by line check against the rendered routes: 0 missing lines on each); every marketing string on every route matched, including the drafter's rules table strings rendered from a live scenario; the worksheet arithmetic (84,600.00 through $8,412.50, +$843.75) is identical on Home 0003, the P-02 screen, the set piece's eleven lines, wall row 0012 and post 1.
- Purchase path: cart persists across two page loads; quantity up and down, quantity to zero, Remove, remove last, the empty state ("0 files in the cart", "Open the pricing ledger"), checkout with an empty cart ("The cart is empty. Add a pack from the pricing ledger to continue."), the pilot dialog ("Replace" and "Keep my cart") and the Enterprise stepper ("2,000 × 3", $108,000.00) all work.
- Product imagery: P-01, P-02, P-03a, P-03b placed side by side: one shell, one file, identical chrome and type, verdigris only at the worksheet foot, the footer line on each; V-02 now delivered at the screens' ratio.
- Drafter: the worked check yields "5 drafted: 3 PTD, 2 PTC"; FHA with every income type, a deposit, an open finding and no designation yields "10 drafted: 6 PTD, 4 PTC" with the routing note above the blocks; the pack that fits moves through the three monthly bands (400 the 100 File Pack, 1,200 the 500 File Pack, 2,500 the Enterprise Block) with the button to /pricing?pack=...#ledger.
- Deduction: the eleven photographs and the finished V-01 are pending (scored PENDING, not FAIL).

### Gate 2, Distinctiveness: 28 / 30
- Archetype: the visible 12 column hairline grid spans the viewport on every route; the mono row index numbers every section down the left margin; the ledger and the worksheet are tables; the wall stands in columns 7 to 12 to the right edge. Not a left text with product cluster hero, and unlike all four logged builds.
- Signature: the Overnight Queue wall is alive on load (one row clearing every 4 s, blinking cursors, the 1 degree pointer tilt, the 7 s idle drift), pinned for 1.5 viewport heights, the crane, the held beat with the caption typing in between 62 and 78 percent ("6 in queue" and 46 characters typed at 70 percent), the dolly back to the square frame and the dock into P-01 at 100 percent with "0 in queue".
- Identity: the palette hexes, Archivo at width 88 for headings and Fragment Mono for every figure, the tally motif (nav mark, section rules, loader stages, the 404's single stroke, the footer's tally wall, the SMS section), the square seal on About, the confirmation and the footer, the numeral treatment, the paper block button, the ruled cell nav.
- Governing idea, three expressions observed: the wall clearing under scroll on Home; the Recalculation on /product rolling through the eleven lines and taking verdigris only when it lands; the drafter's output tray printing each drafted row into the tray as the inputs change.
- Deduction: the pending bands are designed empty states rather than the photographs; registry hero screenshots were not on disk, so the screenshot test was judged against the logged descriptions (point cloud body, trial lattice, paper memo sheets, kitchen calendar), none of which a stranger would group with this hero.

### Gate 3, Motion: 24 / 25
Per route total motion checklist, observed live: a distinct scene on every route (wall, balance drums, index rail, floor plan, ledger tape, abacus, threshold plane, reconciling columns, audit spool, output tray, address plate, cart tray, checkout slabs, seal settle, the dim ruled field on both legal pages), one WebGL canvas per page (webgl canvas count 1 on every desktop route, 0 at 375 and under reduced motion), lazy after the H1, DPR capped at 1.5, paused offscreen, disposed on pagehide; a distinct text hover per route (carriage, tabulate, cite, tally, index card, ruled, tighten, boxed, counter, margin mark) mirrored on focus visible with a tap class on touch; distinct per section entrances (mask rows, split sticky counts, draw table, slide index, checker, card up, ticker drums, wipe, rule unmask, slab, lines, words, stagger rows, fold, drop, draw svg); after round 1 zero interactive elements without idle, hover or press motion; interactive touches beyond the hero on every route (live chips, row highlight across the ledger, the Enterprise stepper, the accordion swapping P-03a and P-03b, the Form 1084 to Form 91 switch, the plan station captions, the blog sort, the drafter, the pilot dialog, the cart steppers, the checkout toggles and switch, the confirmation's password panel). Reduced motion (emulated and via ?qa=rm): no WebGL anywhere, W-01 poster with the caption and the static table on Home, every scene on its poster, every reveal at its end state, the set piece as a table, the purchase still completes. Nav compresses to 48 px past the pin end.
- Deduction: the 55 fps bar could not be verified here (see Gate 4).

### Gate 4, Performance and accessibility: 19 / 20
Measured (qa/measurements.json, software GL sandbox):
- LCP: Home 256 ms (H1), /pricing 332 ms, /product 484 ms. CLS: 0, 0.0061, 0.0021.
- Initial JS on first paint: 59.6 KB gzipped (budget 350 KB); Three.js r128 148.7 KB gzipped, loaded after the H1 paints (three_start 330 ms after LCP 256 ms) and never under 900 px.
- Signature scroll: ?qa=arc start 64, end 1414 at a 900 px viewport, length 1.50 viewport heights (range 1.25 to 1.75).
- fps across the scrub: 23 to 25 under swiftshader, indicative only; not a device number and cannot pass or fail the 55 fps bar from this sandbox.
- INP: drafter 64 ms, checkout 72 ms.
- WebAIM six on every route: lang="en"; 0 images without alt; 0 unlabeled form controls; 0 empty links; 0 empty buttons (the auto reorder switch is named by aria-labelledby); contrast: paper on graphite 13.6:1, ash 6.2:1, verdigris 7.1:1 (the automated sampler's only flags were ink text on the paper filled hover and checkerboard cells, where the fill is a pseudo element it cannot see).
- Keyboard: 22 to 29 focusable controls reached by Tab on Home, Pricing, Checkout, Drafter and Product, every one with a visible focus state (outline, inset box shadow on nav cells, or the paper fill on the stepper); the mobile menu traps focus and closes on Escape.
- Mobile: no horizontal scroll on any route at 375; the pocket queue clears one row at idle after 4 s, ten rows on scroll, a tap expands a cleared row's arithmetic line; 44 px targets on the footer links, Remove, chips, the switch and the checkboxes.
- Head hygiene: unique title and description from 7.17 on every route, canonical, og:image B-01, twitter card, the favicon set, theme colour, the two font preloads; 404 with a real 404 status and noindex.
- Deduction: fps recorded from software GL only.

### FULL PAGE RULE (design doc 5.3), measured
| Width | Route | Outer gutter | Widest empty margin beside media or a section field |
|---|---|---|---|
| 1440 | / | 32 px | 0 px |
| 1440 | /product | 32 px | 0 px |
| 1440 | /pricing | 32 px | 0 px |
| 1920 | / | 48 px | 0 px |
| 1920 | /product | 48 px | 0 px |
| 1920 | /pricing | 48 px | 0 px |
| 2560 | / | 48 px | 0 px |
| 2560 | /product | 48 px | 0 px |
| 2560 | /pricing | 48 px | 0 px |

Every media element (the wall column, the queue media, the worksheet wrap, the checkerboard, the video and photograph bands, the ticker, the ledger wrap and table, the set piece, the pull quote field, the scene columns, the footer) touches at least one viewport edge; those that stop at one side stop against copy, not empty space. The grid lines span the viewport at every width and no element carries a fixed 1000 to 1300 px max width. Every other route was checked by eye at 1440 (viewport captures) and the posts' kit figure bands now run edge to edge.

## Prioritized punch list (what remains)

1. PENDING MEDIA (not a fail): drop PH-01 to PH-11 and clips 2 to 4 into assets/incoming/, run `bash scripts/ingest_media.sh`, rebuild, set exists true in MEDIA_MANIFEST.json and drop the PROVISIONAL note on V-01, then re-run screens.py and measure.py. Until then every band shows the ruled field with "photograph pending" and its alt line, and V-01 is clip 1 repeated.
2. Re-measure fps across the signature scrub on the live webflow.io site with a GPU (the requestAnimationFrame procedure in measure.py); the sandbox reads 23 to 25 under software rasterization, which is not a device number. Draw calls on the wall are 61 (sixty textured slabs and one merged cursor mesh).
3. Headless capture artifact, for awareness only: when the hero is pinned, Chromium under swiftshader leaves the bottom 64 px of the WebGL canvas uncomposited in screenshots (transparent pixels, seen at x 720 to 1440, y 770 to 836 at 1440 by 900). It is not on the page (the body is opaque graphite and elementsFromPoint reports the canvas), but confirm in a real browser that the wall paints to the bottom of its column during the pin.
4. Registry side by side: the archived hero screenshots for BioVirtua, Astroquanta, Smart Augment and Addabill were not on disk; the Gate 5 screenshot test was judged from the logged descriptions. Put the live hero (qa/screens/home-1440.png) beside them before the Step 8 registry write.
5. Step 7.5 human watch (checklist item 64) has not happened in this loop; the notes belong in this QA record before deploy.
6. Placeholders for the user before vetting, all present exactly as written: [BUSINESS NAME], [PHONE NUMBER], [EIN Address] (Terms and Privacy only), [Physical Address] (footer, Contact, About), [STATE], [INSERT SHORT CODE] (Terms); the Contact hours line "Monday to Friday, 8:00 to 18:00 Eastern" is flagged [CONFIRM HOURS]; the tax rate table in src/data/offering.json is proposed and must be replaced by the tax engine's rates.

## Files changed in this loop
- src/styles/site.css: row level reveal rules for draw-table and slide-index; inline link, skip link and range motion; the pending band state; coarse pointer target rules.
- src/scripts/main.js: row level IntersectionObserver for ledger rows and index rows; the pending media handler.
- src/scripts/loader.js: body.loaded at the split.
- src/scripts/pages/home.js: dock settle by camera zoom; the merged cursor mesh; the Three.js load gated on the H1 paint; H1 uncover stagger 0.07 s (Home.astro).
- src/scripts/scenes.js: tape rows in paper, rail tabs and tape rows at 0.5 to 1 opacity.
- src/components/Post.astro: the kit figure breakout computed from the column.
- src/components/Legal.astro: footer index 0004.
- src/routes/Checkout.astro: slab index spacing at mobile widths.
- src/routes/Product.astro: V-02 intrinsic size and box at the product screen ratio.
- public/assets/video/V-02*: re-encoded from the same recording, cropped to the window, with new posters; MEDIA_MANIFEST.json note updated.
- qa/rounds/round1.json to round3.json, qa/measurements.json, qa/scan.json, qa/screens/ refreshed.

The locked identity (archetype, signature world, fonts, palette, accent rule, loader, nav, buttons, voice) and the verbatim legal and SMS text were not changed.
