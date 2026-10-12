# Paper Plane

A physics game for iOS and Android, built with Expo and React Native. You throw a folded paper
plane across a back garden. **Hold** to lift the nose and climb. **Keep holding** and it loops
over the top and flies back the other way. **Pull down** to dive. **Let go** to glide. That is
the whole control scheme, and everything else is what you do with it: thread the hula hoops, pop
every balloon, and knock over the stacks of boxes, bottles, crates and bricks that people have
left lying around.

There is one seeded chain of yards per calendar day. Clear the first garden to keep your streak,
then walk into a harder yard without leaving the sitting. Miss a day and the streak goes back to
one. Rewards live fully on the device: no accounts, no backend, no ads, no purchases.

## Running it on your phone with Expo Go

Open this in **Expo Go** (SDK 57) on iPhone or Android:

`exp://u.expo.dev/7aa7ab65-6b7b-4365-b172-a7f58bef149f?runtime-version=exposdk:57.0.0&channel-name=production`

That loads the published update. Pull-to-refresh in Expo Go if you still see an older build.

To run it from this repo instead:

1. Install **Expo Go** from the App Store or Play Store.
2. On your computer:

```bash
npm install
npm start
```

3. Scan the QR code in the terminal — with the Camera app on iOS, or from inside Expo Go on
   Android.

Every library here ships inside Expo Go, so there is no development build, no Xcode, and no
Android Studio. `npm run doctor` confirms it: all 21 checks pass, including the native peer
dependency check.

If your phone and your computer are not on the same Wi-Fi:

```bash
npm run tunnel
```

To play in a browser instead:

```bash
npm run web
```

Other useful scripts:

| Command | What it does |
| --- | --- |
| `npm run doctor` | Checks the project against the installed Expo SDK |
| `npm run typecheck` | Type-checks the whole project with `tsc --noEmit` |
| `npm run sim` | Flies an autopilot through generated gardens headlessly and reports whether each one is clearable |
| `npm run probe` | Prints the flight envelope: glide range, dive slope, and how much height a dive buys back |
| `npm run android` | Opens on a connected Android device or emulator |
| `npm run update` | Publishes an EAS Update to the production channel for Expo Go |

The game asks for **landscape** at startup, which is what a long glide needs. If your device
refuses the lock — rotation switched off, or a browser window someone has made narrow — you get a
"turn sideways" prompt instead of a squashed garden. The HUD pads itself out of the way of the
notch and the home indicator, which in landscape sit on the same edges as the exit button and the
power dive meter.

## How to play

1. **Tap to throw.** The plane leaves your hand flat and fast. There is no aiming, no drag, no
   power bar — every plane starts identically, so a good result is a flying result.
2. **Hold to climb.** Pressing anywhere lifts the nose. You gain height and spend speed.
   **Keep holding** and the dart loops over the top and comes back the other way.
   **Pull down to dive** and the plane drops, trading height for speed. **Release to glide**
   and it flattens back out into a long, shallow run. Height is a bank account: climb to save
   it, dive to spend it, loop to reverse.
3. **Fly through the hula hoops.** They are staked in the grass at head height. A clean pass
   scores and charges the meter. Hoops are scored, not solid, so missing one costs you nothing
   but the line you took going for it.
4. **Pop the balloons.** They pop on contact — some drift free, some are wedged in a cavity
   inside a stack, and those you have to open up by wrecking the stack first.
5. **Wreck the stacks.** Cardboard caves in, glass shatters, wooden crates take a real hit and
   bricks need your full speed or something heavy landing on them. Damage scales with impact, so
   stacks topple and knock each other over.
6. **Power dive.** Every break and hoop charges the meter. Full meter, press again mid-flight,
   and the plane goes heavy and steep for a moment — this is how you get through brick.

Pop every balloon to clear a yard. A congratulations note offers the next, harder garden in the
same sitting. You get three to five planes per yard; unused planes are a completion bonus. Running
out of planes, or leaving, ends the sitting and opens the results for every yard you walked.

## Rewards

- **Coins** come from your score, hoop passes, and clears. They are the only currency.
- **Prize box.** Your first clear each day opens one. The tier scales with your streak — a paper
  bag at 1, a cardboard box at 3, a wooden crate at 7, a biscuit tin at 14 and up.
- **Stickers.** Twelve one-time achievements, each with a coin payout, kept in a sticker book.
- **Levels.** A persistent XP bar across every run, including failed ones. Levelling up opens the
  next shelf in the shop.
- **The Shed.** Named planes to fold, each with its own power, plus a **workshop** that puts three
  new folds on the shelf every time you level — the list does not run out. Streamers tape on the
  tail. Four upgrades equip one at a time: *Cardstock*, *Tissue Paper*, *Paperclip Nose*, and
  *Spare Sheet*.

Everything is stored on the device in a single versioned `AsyncStorage` record, so adding
rewards later will not wipe an existing profile.

## Project layout

```
App.tsx                     Screen state machine and profile wiring
src/game/rng.ts             Seeded PRNG, daily seed, calendar helpers
src/game/levelGen.ts        Seeded stacks, balloons and hoop placement, staged by yard
src/components/PaperGrain.tsx  Tiled linen speckle overlay
src/components/ui.tsx       Ink rules, panels, buttons, and shared type
src/game/physics.ts         matter-js world, glide model, impact damage, debris, frame buffer
src/game/constants.ts       World units, materials, flight tuning, palette
src/game/layout.ts          Virtual-world-to-screen scaling
src/game/catalog.ts         Paper, streamers, upgrades
src/game/rewards.ts         Coins, XP, levels, stickers, prize box rolls
src/storage/profile.ts      Versioned AsyncStorage profile and run application
src/components/             Stage, bodies, backdrop, HUD, shared UI
src/screens/                Game, Home, Results, Shed, Stickers
tools/simulate.js           Headless autopilot run over many seeded gardens
tools/probe.js              Headless flight envelope measurement
```

### How the flight model works

Rather than summing lift and drag forces on a wing, the plane steers its **flight path**: it
turns toward the angle you are asking for, but only as fast as its current speed allows, and
gravity along that path does the rest. A dive pays out speed, a climb spends it, and flying too
slow means the plane stops answering the controls. That gives you a real energy trade — dive to
build speed, then release and zoom back up — out of a model small enough to reason about.

Because a fast plane can cross a whole balloon between two physics steps, balloon hits are
resolved with a swept segment test against the path the plane actually travelled, not just its
position at the end of the step. Nothing tunnels.

### How the rendering works

The simulation runs in fixed world units and is scaled to whatever screen it lands on, so a
throw behaves identically on a phone and in a browser. Physics steps at a fixed 1/60s with an
accumulator, so behaviour does not change with frame rate.

Every body writes into one flat number array per frame, and that array is handed to a single
Reanimated shared value. Each body's `useAnimatedStyle` reads its own slice on the UI thread, so
sixty-plus moving pieces cost one JavaScript-to-UI write per frame and zero React re-renders.
Only HUD numbers live in React state, and they are throttled.

## Originality

This is an original game. It was written from scratch in this repository and it deliberately
shares no expression with any existing title:

- No third-party names or marks appear anywhere — not in the app name, bundle id, UI copy, code,
  or package metadata.
- No borrowed characters, and no characters at all. You fly a folded sheet of paper. There is no
  slingshot, no launcher, and no aiming step — you throw once and then fly continuously, which is
  a different genre of control from a projectile arc you can only watch.
- Every object in the garden is something you could actually pick up: boxes, bottles, crates,
  bricks, party balloons, hula hoops. No animals, no eggs, no pipes.
- All art is procedural. Every visual is composed from styled views and gradients generated by
  this code, and even the app icons are rasterised by `tools/makeIcons.js` at build time. Nothing
  is downloaded, traced, or lifted, so no asset here has unclear provenance.
- Every dependency is MIT licensed: Expo, React Native, Reanimated, and matter-js.

This is diligence, not legal advice.

## License

MIT. See [LICENSE](LICENSE).
