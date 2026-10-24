# NPL Cricket Broadcast Graphics V6

1920×1080 HTML/CSS/JS NPL broadcast graphics package. V6 changes the control architecture so data updates cannot continuously retrigger on-air graphics.

## Run

```bash
python3 -m http.server 8080
```

Open:

- Operator / preview: `http://localhost:8080/?preview=1`
- Clean transparent output: `http://localhost:8080/`

Use the same hostname for both windows.

## V6 control model — refresh-based data + manual cues

V6 intentionally does **not** live-sync score/team/player data to the clean output. This prevents the output from rerendering or replaying a graphic every time the operator changes a field.

- Operator edits are stored in `localStorage`.
- The clean output reads the latest stored data when the clean-output page is refreshed.
- There is no `storage` event listener and no full-state `BroadcastChannel` message.
- `BroadcastChannel` is used only for explicit operator cues: SHOW graphic, CLEAR / STOP, scorebar visibility, and event stingers.
- Full-screen graphics are never persisted. Refreshing the output starts with no full-screen card on air.

### Recommended workflow

1. Edit teams / score / player data in `?preview=1`.
2. Press **SAVE DATA FOR NEXT REFRESH** (edits are also draft-saved while typing).
3. Refresh `http://localhost:8080/` when you want the clean output to load the new values.
4. Use GRAPHICS / EVENTS buttons to cue animations on air. These are one-shot manual cues and do not resend the whole data state.
5. **CLEAR / STOP ALL GRAPHICS** immediately cancels demo playback, stinger timelines, active card animation and hides all transient graphics while leaving the scorebar mode alone.

## Demo safety fix

`DEMO ALL GRAPHICS` is now cancel-safe. **STOP + CLEAR DEMO** invalidates the demo run, clears its interval, cancels active transient animation, and sends one stop cue to the clean output. A stopped demo cannot repopulate the next card.

## NPL teams

- Kathmandu Gurkhas (KAG)
- Janakpur Bolts (JAB)
- Chitwan Rhinos (CHR)
- Karnali Yaks (KAY)
- Lumbini Lions (LUL)
- Pokhara Avengers (POA)
- Biratnagar Kings (BIK)
- Sudurpaschim Royals (SPR)

Team presets drive each graphic's primary/secondary colour system.

## Graphics included

Full scorebar, compact bug, lower third, matchup, toss, Playing XI, batter profile, bowler profile, head-to-head, partnership, chase equation, over summary, fall of wickets, innings summary, points table, result, Player of the Match, DRS/review, powerplay, bowling card, projected score, and FOUR/SIX/WICKET/FIFTY/CENTURY/FREE HIT/REVIEW/OUT stingers.

## Motion

GSAP is used for reveals, springs, number changes and stingers; Anime.js is used for character waves and ambient artwork motion. Rendering is requestAnimationFrame-driven. A 120 Hz browser/display/capture chain can render close to 120 fps; a 60 Hz output remains limited to about 60 fps.

## Keyboard

- `4` — FOUR stinger
- `6` — SIX stinger
- `W` — WICKET stinger
- `S` — full scorebar
- `C` — stop demo + clear all transient graphics
- `D` — demo all graphics
- `O` — hide operator panel

## External API

```js
NPLGFX.setTeams('KAG', 'JAB');       // saves data; refresh output to load it
NPLGFX.setScore({ runs: 150 });      // saves data; refresh output to load it
NPLGFX.show('pointsTable');          // manual on-air cue
NPLGFX.stinger('six');               // manual on-air cue
NPLGFX.clear();                       // stop + clear all transient graphics
NPLGFX.demo();
NPLGFX.stopDemo();
NPLGFX.save();
```

## Player photos

Generic local SVG artwork is included. Replace with licensed transparent PNG/WebP player cutouts, or use `NPLGFX.setPlayerPhoto(...)`.
