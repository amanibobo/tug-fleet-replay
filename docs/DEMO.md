# Demo video, about 75 seconds

## Setup, once

- Record at 1440x900 or 1920x1080 in a fresh browser window with no bookmarks bar and no
  extensions. A separate Chrome profile is the easiest way. Zoom 100%.
- Light theme. Open https://tugboard.vercel.app/app once before recording so the data and the
  map tiles are cached, dismiss the getting-started card, and open one Rerun inspector so the
  50 MB viewer is already downloaded.
- Scrub the week to Mon, Dec 2 at about 15:00 UTC: that is early morning in Los Angeles and the
  first ship moves of the day start. The console opens at midnight, when little moves.
- Good tugs to click: Barbara J Mulholland (assists alongside ships) or Darell Hiatt (two clean
  jobs on Dec 2 and a charging stop). Avoid Baltimore or Delta Audrey, they sit still.
- Mac: QuickTime (File, New Screen Recording) is enough. Screen Studio adds cursor smoothing and
  zooms if you want polish. Mute the mic unless you plan to narrate; captions carry the story.

## Shot list

| Time | On screen | Caption |
| --- | --- | --- |
| 0 to 8 s | Landing page. Let the dithered tug breathe for two seconds, then click "Open the console". | "Tugboard. Real Port of Los Angeles tug traffic, replayed on batteries." |
| 8 to 22 s | Console mid-replay at 120x. Boats moving in the main channel. Hover one or two markers. | "22 tugs, one real week, every minute. Each boat carries a simulated battery." |
| 22 to 40 s | Click Barbara J Mulholland in the fleet. The row expands. Click "Open day". Hover the timeline across an assist and the charging stop. | "One tug, one day: jobs, state of charge, charging at the dock." |
| 40 to 50 s | Click "Open in Rerun inspector". Press play in the viewer for a few seconds, then close. | "Every tug-day is also a Rerun recording you can scrub." |
| 50 to 65 s | Back to the console. Drag the battery slider from 6,000 down to 3,000 and back up. Watch the tile. | "At 6,000 kWh, the pack size announced for this harbor, 71% of tug-days never start the generator." |
| 65 to 75 s | Open /docs. Scroll slowly past two hand-drawn figures to the architecture drawing. | "How I built it, from the research to the stack." |

## After recording

- Trim to 75 s, export 1080p H.264.
- Upload to YouTube as unlisted, copy the video ID (the part after `v=`), and set `YOUTUBE_ID`
  in `dashboard/src/components/paper/DemoModal.tsx`. The landing's "Demo video" link and the
  tug on the landing both open it in the modal.
- Rebuild and deploy: `npx vercel deploy --prod --yes` from `dashboard/`.
- Optional: export the frame at 12 s as a new `public/poster.png`.
