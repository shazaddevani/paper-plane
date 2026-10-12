# App Store listing — Paper Plane

Paste these into App Store Connect → ThePaperPlane → iOS App → Prepare for Submission.

## Name
Paper Plane

## Subtitle (30 characters max)
Hold to climb. Loop back.

## Promotional text (optional, 170 max)
Throw a folded dart across backyard yards. Hold to climb, hold longer to loop back, pull down to dive. Hoops, balloons, boxes. No ads.

## Description
Throw a folded paper plane across a chain of back gardens.

Tap to throw. Hold anywhere to lift the nose and climb. Keep holding and the dart loops over the top and flies the other way. Pull down to dive. Let go to glide. That is the whole control scheme.

Thread hula hoops, pop every balloon, and knock over the stacks people left lying around: cardboard, bottles, crates, bricks. Clear a yard to walk into a harder one without leaving the sitting.

There is one seeded chain of yards each day. Finish the first garden to keep your streak. Miss a day and it goes back to one. Coins, planes, and stickers stay on your phone.

Fold named planes in the Shed, each with its own power, plus a workshop that never runs out of scraps. No accounts, no ads, no in-app purchases.

## Keywords (100 characters max, commas, no spaces after commas is fine)
paper plane,flight,arcade,physics,dart,glide,casual,puzzle,balloons,backyard

## What's New
First release. Throw, climb, loop back, and clear the daily yards.

## Support URL
You need any https page you control. Fastest: create a public GitHub Gist with the support note below and paste that Gist URL here.

## Privacy Policy URL
https://gist.github.com/0c01a9f5e4690ed0f9ad36811a96f128

Paste that same URL in two places: the version page, and left sidebar **App Privacy**. Never use a `.git` suffix.

## Version
Use 1.7.0 to match the TestFlight build, or keep 1.0 and still select build 1.7.0 (1).

## Copyright
2026 Shazad Devani

## Age rating
Answer the questionnaire:

- Unrestricted web access: No
- Gambling: None
- Contests: No
- Cartoon or fantasy violence: None
- Realistic violence: None
- Prolonged graphic violence: No
- Horror/fear themes: None
- Mature/suggestive themes: None
- Medical/treatment information: None
- Alcohol, tobacco, or drug use: None
- Simulated gambling: None
- Sexual content or nudity: None
- Graphic sexual content: None
- Profanity or crude humor: None
- Mature/suggestive themes: None
- Guns or other weapons: None
- Advertising: No (no ads in the app)

This should rate 4+.

## Screenshots

Files live in `store-screenshots/`. Pull on the Mac:

```bash
cd ~/sky-fling && git pull origin main && open store-screenshots
```

Upload these four into each required slot (order: home, yard, flight, shed). Stickers is optional.

### 6.7" iPhone (2796 × 1290 landscape)
`01-home.png` `02-yard.png` `03-flight.png` `04-shed.png`

### 6.5" iPhone (2778 × 1284 landscape)
Same names with `-65`.

### 13-inch iPad (2752 × 2064 landscape) — required
`01-home-ipad13.png` `02-yard-ipad13.png` `03-flight-ipad13.png` `04-shed-ipad13.png`

In Connect, open the **13-inch iPad** screenshot well (not 12.9"). Drag the `-ipad13` files. Do not drop iPhone shots there; Apple rejects the size.

---

## Fix “Unable to Add for Review”

Work these in order. None of them need a new Xcode archive except Game Center, and Game Center should be **turned off**, not added.

### 1. 13-inch iPad screenshots
Media Manager → **13-inch iPad Displays** → upload the four `-ipad13` PNGs.

### 2. Game Center key — do not add it in Xcode
Paper Plane is not a Game Center game. The error means Game Center is switched **on** for this app record, but the uploaded binary has no `com.apple.developer.game-center` entitlement.

1. App Store Connect → ThePaperPlane → **Features** (left sidebar, above iOS App).
2. Open **Game Center**.
3. Turn Game Center **off** / remove this app from Game Center.
4. If the toggle is stuck, deselect the build on the version page, turn Game Center off, then select **1.7.0 (1)** again.

Do **not** add the entitlement and re-archive unless Apple still blocks you after it is off. Adding it would force a new build.

### 3. Primary category
This is **not** on the version/screenshots page. Left sidebar, under General:

**App Information** → scroll to **Category**.

- Primary: **Games**, then the second dropdown **Casual**
- Secondary (optional): Games → Action, or Puzzle

Top right → **Save**. Go back to the 1.7.0 version page. The category error only clears after Save.

### 4. Privacy Policy URL in App Privacy
The version-page URL is not enough. Apple wants it on the **App Privacy** screen too.

1. Left sidebar → **App Privacy** (under General, not under the 1.7.0 version).
2. Paste the same public gist URL (no `.git` suffix):

   https://gist.github.com/0c01a9f5e4690ed0f9ad36811a96f128

3. Complete the nutrition-label questionnaire if it is still empty:

   - Data collection: **No, we do not collect data from this app**
   - Confirm, publish / save

Also keep that URL on the version page under Privacy Policy URL.

### 5. Content Rights
Left sidebar → **App Information** (the app record, not the version).

Scroll to **Content Rights**.

- Does this app contain, display, or access third-party content? **No**
  (original game, no licensed movies/music/TV, no third-party catalogs)

Save.

### 6. Review contact on this page
Stay on the 1.7.0 **Prepare for Submission** page. Click **Show Details** on the pink box, or scroll past screenshots, description, and keywords to **App Review Information**.

Fill **Contact Information** (not shown on the store):

- First name: `Shazad`
- Last name: `Devani`
- Email: the Apple ID you use for App Store Connect
- Phone: your mobile with country code, digits only after the `+` is fine (`+1…`)

Sign-in required: **No** (no account in the game).

Paste the Guideline 2.1 notes from the section below into **Notes**. Do not leave Notes empty on this first submission.

Top right → **Save**, then **Add for Review**.

---

## After those six
On the version page, select build **1.7.0 (1)** if it is not already selected, then **Add for Review** → **Submit for Review**.

Advertising Identifier: **No**. Export compliance / encryption: already **No** (`ITSAppUsesNonExemptEncryption`).

---

## Guideline 2.1 — Resolution Center reply (first submission)

Apple asked for more context because this developer account is new. You do **not** need a new Xcode archive. Reply in **Resolution Center** and paste the same text into **App Review Information → Notes**.

Attach a screen recording from your **physical iPhone** (TestFlight or the submitted build). Simulator video is not enough.

### How to record on the iPhone

1. Settings → Control Center → add **Screen Recording** if it is missing.
2. Hold the phone **landscape**.
3. Open Control Center → start Screen Recording → wait 2 seconds.
4. Go to the Home Screen and **tap Paper Plane** so the recording starts with launch.
5. Play this path (about 60–90 seconds):
   - Home: title, daily yard card, coins, The Shed / Stickers
   - Tap **Go on then**
   - Tap to throw, **hold** to climb, keep holding until it **loops back**, pull down to dive
   - Fly through a hoop and pop a balloon if you can
   - Leave the yard
   - Open **The Shed** → Planes tab, then **Streamers** (Red Ribbon equipped)
   - Open **Stickers**
   - Return home
6. Stop recording. AirDrop the video to the Mac.
7. In App Store Connect, open the 2.1 message → **Reply** → paste the text below → attach the video → **Send**.

Sign-in required stays **No**. There is no demo account.

### Paste this (Reply + Notes)

```
Paper Plane is a single-player casual arcade game. You throw a folded paper dart across backyard yards. Tap to throw, hold anywhere to climb, keep holding to loop back and fly the other way, pull down to dive, release to glide. The goal is to thread hula hoops, pop every balloon, and knock over stacks of boxes, bottles, crates, and bricks. Clearing the first daily yard keeps a streak. Coins unlock extra paper folds, streamers, and stickers. Progress is stored only on the device (iOS on-device storage). There are no accounts, no login, no user-generated content, no ads, and no in-app purchases.

I have tested the submitted build 1.7.0 (1) on a physical iPhone via TestFlight. A screen recording of a typical session on that device is attached. The recording starts at app launch.

1. Screen recording
Attached. Captured on a physical iPhone running a current iOS version. It begins by launching Paper Plane from the Home Screen, then shows the home menu, a yard throw (climb / loop / dive), hoops and balloons, The Shed (planes and streamers), and Stickers. The app has:
- No account registration, login, or account deletion
- No user-generated content, so no report/block tools
- No paid content or In-App Purchases

2. Purpose and target audience
Purpose: a short, skill-based paper-plane flight game you can play in landscape in a few minutes. It solves “I want a simple flight toy with a daily backyard to clear,” without ads or a shop.
Target audience: anyone who likes casual / arcade games, including children. Age rating is 4+. There is no chat, no social graph, and no third-party media.

3. How to access main features
Install and open the app. No login, no demo account, no sample files, no VPN, no special hardware.
- Home: today’s yard on the yellow card. “Go on then” starts the daily sitting. “Just chucking it” is unranked practice.
- In a yard: tap to throw; hold to climb; hold longer to loop back; pull down to dive. Pop every balloon to clear the yard and continue to a harder one in the same sitting.
- The Shed: spend on-device coins on paper folds and streamers. Red Ribbon is equipped by default. Upgrades are optional.
- Stickers: collection unlocked by play. Saved on device only.

4. External services used for core functionality
- Expo EAS Update (https://u.expo.dev) may download a JavaScript game update at launch so bug fixes can ship without a new App Store binary. This is only for delivering the game client. It is not used for accounts, analytics profiles, ads, or payments.
- No authentication provider
- No payment processor
- No ads or attribution SDK
- No AI service
- No third-party game backend or user database

5. Regional differences
The app functions the same in all regions. Yards, shops, and stickers do not change by country.

6. Regulated industry / third-party material
Not applicable. This is an original game. It does not operate in a regulated industry and does not include licensed movies, music, TV, sports, or other protected third-party catalogs.

Contact for App Review: Shazad Devani, seller of Paper Plane on this account.
```

After Apple replies, you can **Submit for Review** again from the version page if they ask you to resubmit. Often the Resolution Center reply is enough.

