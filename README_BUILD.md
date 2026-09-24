# Financing Bot site, build notes

Built at finalshot Step 7 from /home/claude/financing-bot/design/Financing_Bot_Website_Design.md (the single source of truth) and BUILD_DIRECTIVE.md. Astro 7, output "server", one server rendered catch all, packaged for Webflow Cloud.

## Structure

```
astro.config.mjs            output server, the Cloudflare adapter Webflow Cloud installs, no base (Webflow sets it from the mount path)
webflow.json                { cloud: { framework: "astro" } }
package.json                astro, @astrojs/cloudflare, gsap, lenis (three@0.128.0 is a dev dependency only to vendor the r128 file)
MEDIA_MANIFEST.json         every shipped asset: filename, source, license, usage, and whether the file exists yet
src/pages/[...slug].astro   the catch all: resolves the route list, 301 for /terms and /privacy, the designed 404 with a real 404 status
src/pages/404.astro         the same not found page for the literal /404 path
src/layouts/Ledger.astro    head (titles, descriptions, canonical, og, favicons, font preloads), the 12 column hairline grid, the ruled cell nav, the footer with the SMS block, the loader mount, the pilot dialog
src/routes/*.astro          one component per route (Home, Pricing, Product, About, Blog, the four posts, Drafter, Contact, Cart, Checkout, OrderConfirmation, Terms, Privacy, NotFound)
src/components/             Nav, Footer, SmsBlock, Row (a ledger row with its mono index), PaperButton, Tally, Seal, Kit (inlines a kit SVG), Loader, Post (the post template), Legal (the legal template)
src/content/legal.json      the Terms and the Privacy Policy, extracted verbatim from design doc section 8
src/data/offering.json      the three packs, the pilot, the inclusions, the pack terms, the disclaimer, the proposed tax table
src/data/drafterRules.json  the drafter rules table and its strings (design doc 7.7)
src/data/queueRows.json     the sixty queue rows extracted from product-screens/queue.html
src/data/wallRows.js        the same rows with each row's cleared income cell, shared by the wall, the pocket queue and the poster
src/data/seo.json           the titles and descriptions of 7.17
src/styles/site.css         tokens (palette, OKLCH elevation ramp, the two easings, durations, gutters), the grid, type, nav, buttons, forms, chips, the numeral treatment, drums, media bands and the grade, reveals, the per page hover treatments
src/scripts/main.js         the runtime on every page: Lenis rail, nav, cart cell, reveals, drums, generative canvases (tally wall, page count ruler), forms, video gating, scene mode, then the page module and the scene module
src/scripts/loader.js       the rolling drum counter into rule split (Home)
src/scripts/pages/home.js   the Overnight Queue wall (Three.js r128), the pocket queue, the poster mode, the live chips
src/scripts/scenes.js       the fourteen lighter scenes (balance drums, index rail, floor plan, ledger tape, abacus, threshold plane, reconciling columns, audit spool, output tray, address plate, cart tray, checkout slabs, seal settle, ruled field)
src/scripts/pages/*.js      pricing, product (pinned chapter, The Recalculation, the form toggle, the accordion), about, blog, drafter, cartPage, checkout, confirmation
src/scripts/cart.js         the cart store (localStorage fb_cart_v1 with an in memory fallback)
src/scripts/forms.js        GOV.UK style validation, the SMS block handler, the contact form
src/scripts/three-loader.js Three.js r128 from cdnjs with the vendored fallback
product-screens/            queue.html, worksheet.html, conditions.html from shell.css and header.html (the sources of P-01 to P-03b)
public/assets/              fonts, kit, brand, product, video, photo, posters, vendor (grouped as design doc 5.4 names them)
public/robots.txt, sitemap.xml, favicon set
scripts/ingest_media.sh     the media ingest (below)
scripts/qa/                 screens.py, flow.py, measure.py, scan.py, posters.py
qa/                         screens/, measurements.json, scan.json, PENDING_MEDIA.md
```

## How the routes are served

Every request reaches src/pages/[...slug].astro (prerender false, so nothing is a static directory page and Webflow Cloud's trailing slash redirect loop never starts). The frontmatter normalises the path, sends `Astro.redirect('/terms-of-service', 301)` and `Astro.redirect('/privacy-policy', 301)` for the two aliases, looks the path up in the route map (design doc 6.1) and renders that route component inside the Ledger layout. An unknown path sets `Astro.response.status = 404` and renders NotFound, so the designed page ships with a real 404 status. Static files under /public (assets, favicons, robots.txt, sitemap.xml) are served as files.

Each route component passes its canonical path, page key, hover treatment, footer row index and scene key to the layout; the layout writes the unique title and description from seo.json, the canonical, og and twitter tags, the favicon set, theme color and the two font preloads.

Webflow Cloud: the current documentation says the platform reads the Astro version, installs the matching Cloudflare adapter and sets base and assetsPrefix from the mount path at build time, overwriting committed values. The config therefore sets `output: 'server'` with the same adapter (so `npm run build` validates the worker locally) and no base. `security.checkOrigin` is off as the documentation advises for form posts.

## The cart and the checkout

The cart lives in localStorage under `fb_cart_v1` as `{ lines: [{ sku, name, files, unitPrice, qty }], updated }`, with an in memory copy when storage throws, and it dispatches `cart:change` so the header cart cell rolls its drum on every page. `[data-add="sku"]` buttons (the three ledger buttons, the post 4 Enterprise button) add a line or increment it, the Enterprise button reading its block count from the stepper, then navigate to /cart. `[data-pilot]` links add the Pilot Order alone; if the cart holds paid packs a ruled dialog asks "The pilot is its own $0 order. Replace the cart with the Pilot Order?" (Replace or Keep my cart). /cart?pilot=1 does the same without JavaScript on the link.

/cart renders one row per line (pack, files, valid, a 1 to 10 stepper, line total, Remove), the subtotal on a drum, the tax note and the renewal note, the "Continue to checkout" paper block button, and the empty state (one tally stroke, "0 files in the cart", the link to the ledger). Quantity to zero slides the row out and removes it; removing the last row returns the empty state; checkout with an empty cart is refused with the line "Add a pack from the pricing ledger to continue".

/checkout is one page in four numbered sections (01 Account, 02 Billing, 03 Payment, 04 Review), guest only, with the optional sign in panel that gates nothing. Every field has its label, its required or optional marker, its autocomplete token, its help text and its GOV.UK message; validation runs on blur after 400ms and on submit, values are never cleared, each error sits beside its field and repeats in the "There is a problem" summary linked to the field. The card panel formats the number in groups of four and checks Luhn, length, expiry and the security code (4 digits on American Express); the ACH panel checks the 9 digit routing number, the 4 to 17 digit account number and the account type. Sales tax comes from the proposed rate table in offering.json (marked to be replaced by the tax engine) and prints as its own row, $0.00 where no tax applies. The Pay button label is the live total, or "Place $0 order" for the pilot, where section 03 shows only "No payment method is collected for a $0 order." and the auto reorder switch is hidden. On submit the build validates, rolls the label to "Authorizing" for 0.8s, declines only the test number 4000 0000 0000 0002, then writes `fb_last_order` (order number from `fb_order_seq` starting at 10482, lines, subtotal, tax, total, method as "card ending 4242" or "ACH debit" or "none, $0 order", email, lender, NMLS ID, PO number, auto reorder flag, validity date), appends the NMLS ID to `fb_pilot_ids` on a pilot, clears the cart and navigates to /order-confirmation?order=N. Card numbers, CVV, routing and account numbers are never written anywhere; the non payment fields are kept in sessionStorage `fb_checkout_draft` so returning from the cart keeps the form.

/order-confirmation reads the order from the query and `fb_last_order`, rolls the number on drums, prints the paid or pilot "what happens next" rows (row 6 only for an Enterprise order), the order table, the seal and, last, the optional "Set the account password now" link that opens the ruled panel. With no matching record it shows "No order on this device. The pricing ledger is at /pricing." and never invents an order.

## The Condition Drafter

/drafter reads the six inputs on every change, applies the rules in drafterRules.json in the order of design doc 7.7, prints PTD rows then PTC rows with their indices, cites and the chip "drafted", the routing note above the blocks when FHA or VA has no designation entered, the count line "{n} drafted: {p} PTD, {c} PTC", and the pack that fits by monthly band (under 500 the 100 File Pack, 500 to 2,000 the 500 File Pack, above 2,000 the Enterprise Block) with the paper block button to /pricing?pack=...#ledger, which highlights that column and pulses its chip. The worked check (Conv, self employed, deposit, one finding open) yields "5 drafted: 3 PTD, 2 PTC". The 3D output tray mirrors the DOM list through the `drafter:rows` event.

## Motion and the scenes

Every module is gated: `prefers-reduced-motion` (or `?qa=rm`) shows posters, static tables and instant end states; under 900px or on a coarse pointer no WebGL loads and the 2D fallbacks and the pocket queue ship. Three.js r128 comes from cdnjs in production with the vendored copy as the fallback (and first on localhost, where cdnjs is unreachable); it loads only after the H1 paints, one canvas per page, pixel ratio capped at 1.5, paused offscreen and on hidden tabs, disposed on pagehide. `?qa=arc` logs the signature timeline's start and end scroll positions to the console and to `window.__fbArc`. `?qa=poster` holds each scene at its end state for the poster capture.

## Running the media ingest

Drop the four hero loop clips and the eleven photographs into /home/claude/financing-bot/assets/incoming/ (accepted names are listed at the top of the script), then from this folder:

```
bash scripts/ingest_media.sh            # or: npm run ingest
bash scripts/ingest_media.sh --provisional   # builds a temporary V-01 from clip 1 alone while clips 2 to 4 are pending
```

It transcodes the clips to the 12 second h264 yuv420p 1080p loop (3 s per clip, hard cuts, the loop point at the cut from clip 4 back to clip 1), the 720p mobile encode, the VP9 webm and the poster frame, and converts each photograph to WebP at 2560 and 1280 widths with the slot's crop (21:9 for the bands, 2:1 for the post heroes) plus a JPEG fallback, into the exact paths under public/assets the pages reference. See qa/PENDING_MEDIA.md for the list.

## Build, preview and QA

```
npm install && npm run build           # emits dist/server (the worker) and dist/client
npx astro dev --host 127.0.0.1 --port 4321    # the sandbox preview the QA scripts use
python3 scripts/qa/screens.py          # every route at 1440 and 375 into qa/screens/ (stitched viewport tiles)
python3 scripts/qa/flow.py             # pricing to cart to checkout to confirmation, the pilot, the drafter, the SMS block
python3 scripts/qa/measure.py          # JS weight, LCP, CLS, fps, the pinned length, INP, the FULL PAGE RULE margins into qa/measurements.json
python3 scripts/qa/scan.py             # dashes, the banned adjectives, placeholders, the disclaimer, the SMS block, head hygiene
python3 scripts/qa/posters.py          # regenerates W-01 to W-15 from the built scenes
```

## Placeholders for the user

[BUSINESS NAME], [PHONE NUMBER], [EIN Address] (legal pages only), [Physical Address] (footer, Contact, About), [STATE], [INSERT SHORT CODE] (Terms). The Contact hours line "Monday to Friday, 8:00 to 18:00 Eastern" is flagged [CONFIRM HOURS]. The tax rate table in src/data/offering.json is proposed and must be replaced by the tax engine's rates before launch.
