# Pending media (the orchestrator fills these before QA)

Every path below is already referenced by the built pages with its final name. Drop the source files into /home/claude/financing-bot/assets/incoming/ and run `bash scripts/ingest_media.sh` (or `npm run ingest`) from /home/claude/financing-bot/site; the script writes the exact paths listed here. Until then a photograph band renders as the graphite field with the image's alt text, never a placeholder graphic, and V-01 plays a provisional loop built from clip 1 alone.

## V-01, the overnight shift hero loop (provisional now)

Present today: a provisional V-01 built from clip1.mp4 repeated four times (12 s, h264 yuv420p 1080p, 720p encode, webm, poster). Waiting on clip2.mp4, clip3.mp4 and clip4.mp4 (V-01b the printer tray, V-01c the queue on one monitor, V-01d the stapler on the package). When all four sit in assets/incoming/ the script rebuilds:

* /public/assets/video/V-01-overnight-shift.mp4 (12 s: four 3 s trims, hard cuts, the loop point is the cut from clip 4 back to clip 1)
* /public/assets/video/V-01-overnight-shift-720.mp4
* /public/assets/video/V-01-overnight-shift.webm
* /public/assets/video/V-01-poster.webp and V-01-poster.jpg

Used on Home section 0006 (Where the work happens) and the /about band, both under the full grade.

## Photographs PH-01 to PH-11 (all pending)

Source masters at 3:2 (3000 by 2000) from the photo requests in assets/photo_requests.jsonl. The script centre crops each to its slot ratio and writes PH-NN.webp (2560 wide), PH-NN-1280.webp and PH-NN.jpg.

| slot | page and band | crop | grade | path |
| --- | --- | --- | --- | --- |
| PH-01 | Home, About teaser band (section 0008) | 21:9, 2560 by 1097 | full | /public/assets/photo/PH-01.webp |
| PH-02 | Pricing, between the pilot row and the pack terms | 21:9 | light | /public/assets/photo/PH-02.webp |
| PH-03 | Product, chapter 0007 button band | 21:9 | light | /public/assets/photo/PH-03.webp |
| PH-04 | About, between the spreads and the manifesto wall | 21:9 | full | /public/assets/photo/PH-04.webp |
| PH-05 | Blog index, under the ruler rail | 21:9 | full | /public/assets/photo/PH-05.webp |
| PH-06 | Post 1 hero band | 2:1, 2560 by 1280 | light | /public/assets/photo/PH-06.webp |
| PH-07 | Post 2 hero band | 2:1 | light | /public/assets/photo/PH-07.webp |
| PH-08 | Post 3 hero band | 2:1 | light | /public/assets/photo/PH-08.webp |
| PH-09 | Post 4 hero band | 2:1 | light | /public/assets/photo/PH-09.webp |
| PH-10 | Drafter, between the result and The pack that fits | 21:9 | light | /public/assets/photo/PH-10.webp |
| PH-11 | Contact, behind the address plate | 21:9 | full | /public/assets/photo/PH-11.webp |

Each slot also needs PH-NN-1280.webp (the under 900px source) and PH-NN.jpg (the fallback), which the script writes in the same pass.

## After the files land

1. `bash scripts/ingest_media.sh`
2. `npm run build`
3. Set `exists` to true for the new files in MEDIA_MANIFEST.json (or regenerate it) and remove the PROVISIONAL note on V-01.
4. Re-run `python3 scripts/qa/screens.py` and `python3 scripts/qa/measure.py` so the FULL PAGE RULE screenshots show the bands with their photographs.
