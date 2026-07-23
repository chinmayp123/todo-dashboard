# Syncing Apple Health (Steps + Apple Watch) into Daylign

## What this does

An iPhone Shortcut reads today's health data from Apple Health and writes it directly to the Daylign Firebase Realtime Database under the `external` node (e.g. `external/steps/2026-07-16 = 8421`). The dashboard reads this node read-only. The app's own writes go to the `lifestack` node, so nothing under `external` is ever overwritten by the app.

Supported metrics and where they show up:

| Firebase path | Health sample | Used for |
|---|---|---|
| `external/steps/<date>` | Steps (Sum) | Steps tile; walking burn in Net Cals |
| `external/activeEnergy/<date>` | Active Energy (Sum) | Replaces the MET burn estimate everywhere — Net Cals tile, Gym "Active Burn" target, Diet net line |
| `external/exerciseMinutes/<date>` | Apple Exercise Time (Sum) | Exercise tile on the dashboard (default goal 30 min) |
| `external/restingHR/<date>` | Resting Heart Rate (Average) | Resting HR row in the Weekly Report |
| `external/sleep/<date>` | Sleep, Value is Asleep (Sum, in hr) | Sleep tile on the dashboard (goal 8h) + Weekly Report row. Keyed by wake-up date; values >24 are treated as minutes and normalized |
| `external/runDistance/<date>` | Walking + Running Distance (Sum, in mi) | Cross-check chip in the Cardio view |
| `external/cycleDistance/<date>` | Cycling Distance (Sum, in mi) | Cross-check chip in the Cardio view |
| `external/swimDistance/<date>` | Swimming Distance (Sum, in yd) | Cross-check chip in the Cardio view |

**The three distance metrics never create sessions by themselves.** They show up as a "⌚ Watch recorded 5.2 mi" chip with a *use this* button that pre-fills the distance box. That is deliberate: if the app auto-imported them, a run you logged by hand and the same run recorded by the watch would both count toward your weekly mileage. Note that Apple's `Walking + Running Distance` includes ordinary walking, so it will usually read higher than your actual run.

Steps work from the iPhone alone. The other three need an Apple Watch (that's what measures active energy, exercise minutes, and resting HR). When `activeEnergy` exists for a date, the app trusts it outright and stops adding its own workout estimate + walking burn — the watch number already includes both.

## If you are not Chinmay: use your own paths

Daylign now has one profile per person (see "Who's using this device" in Settings). The paths in the table above belong to the original profile, which was set up before profiles existed. **Everyone else adds `u/<your-profile-id>` after `external`:**

| Your profile | Path to use |
|---|---|
| Chinmay | `external/steps/<date>` |
| Anyone else, e.g. profile id `arjun` | `external/u/arjun/steps/<date>` |

Your profile id is your first name, lowercased, with spaces and punctuation turned into hyphens — "Arjun K" becomes `arjun-k`. Settings shows the name you picked.

So wherever this guide says:

`https://lifestack-d5300-default-rtdb.firebaseio.com/external/steps/[Current Date].json`

you would use:

`https://lifestack-d5300-default-rtdb.firebaseio.com/external/u/arjun/steps/[Current Date].json`

Everything else — the Health sample types, the date format, the Automation — is identical. The app reads only your own subtree, so your metrics never mix with anyone else's.

## Shortcut setup

Open the **Shortcuts** app on your iPhone and create a new shortcut named **Sync Steps to Daylign**, with these three actions in order:

1. **Find Health Samples**
   - Type: **Steps**
   - Add filter: **Start Date** is **Today at 00:00**
   - Group By: **Day**
   - Calculate: **Sum**
   - Output: today's total step count.

2. **Format Date**
   - Date: **Current Date**
   - Format: **Custom**
   - Custom format string: `yyyy-MM-dd`

3. **Get Contents of URL**
   - URL:
     `https://lifestack-d5300-default-rtdb.firebaseio.com/external/steps/[Formatted Date].json`
     (insert the **Formatted Date** variable from step 2 where shown)
   - Tap **Show More**:
     - Method: **PUT**
     - Request Body: **File** (or Text) = the **Health Samples** result from step 1 — the raw number, no quotes. Firebase stores it as a JSON number.

## Adding Apple Watch metrics (same shortcut)

Append these actions to the same shortcut, after the three above. Each pair follows the exact same pattern as steps — a **Find Health Samples** action, then a **Get Contents of URL** PUT. Reuse the **Formatted Date** variable from step 2 in every URL.

4. **Find Health Samples** — Type: **Active Energy**, filter Start Date is **Today at 00:00**, Group By **Day**, Calculate **Sum**.
5. **Get Contents of URL** — URL:
   `https://lifestack-d5300-default-rtdb.firebaseio.com/external/activeEnergy/[Formatted Date].json`
   Method **PUT**, Request Body = the **Health Samples** result from action 4.

6. **Find Health Samples** — Type: **Apple Exercise Time**, filter Start Date is **Today at 00:00**, Group By **Day**, Calculate **Sum**.
7. **Get Contents of URL** — URL:
   `.../external/exerciseMinutes/[Formatted Date].json`
   Method **PUT**, Request Body = the result from action 6.

8. **Find Health Samples** — Type: **Resting Heart Rate**, filter Start Date is **Today at 00:00**, Calculate **Average**.
9. **Get Contents of URL** — URL:
   `.../external/restingHR/[Formatted Date].json`
   Method **PUT**, Request Body = the result from action 8.

10. **Find Health Samples** — Type: **Sleep** · **Add Filter: Value is Asleep** (excludes In Bed time) · Start Date **is in the last 1 day** (NOT "is today" — last night's sleep started yesterday evening) · Unit **hr** · Group By **None**.
11. **Calculate Statistics** — Operation: **Sum**, input: the Sleep samples from action 10 (needed because sleep can't Group By cleanly across midnight).
12. **Get Contents of URL** — URL:
    `.../external/sleep/[Formatted Date].json`
    Method **PUT**, Request Body = the **Calculated Statistics** result from action 11.

Careful when inserting each Request Body: Shortcuts offers every prior action's output — pick the **matching** Find Health Samples result (tap the variable, check its source action), not the first one. If two variables look identical, insert one, tap it → **Reveal Action** — it highlights the card it comes from.

Run it once manually. iOS will prompt for Health access on first run — tap **Allow** for all requested categories.

## Automation (runs nightly)

1. Shortcuts app → **Automation** tab → **+**
2. Choose **Time of Day** → **9:00 PM**, repeat **Daily**
3. Select **Run Immediately** (run without asking)
4. Pick **Sync Steps to Daylign**

You can also run the shortcut manually anytime. Re-runs are safe: PUT overwrites the same date key with the latest count.

## Verify it worked

1. Open this in any browser:
   `https://lifestack-d5300-default-rtdb.firebaseio.com/external.json`
2. Check that each metric has today's date key with a bare number, e.g. `{"steps": {"2026-07-16": 8421}, "activeEnergy": {"2026-07-16": 512}, ...}`.
3. Refresh the Daylign dashboard — the Steps and Exercise tiles should populate, Net Cals shows the ⌚ marker, and the Gym card's burn target switches from "Est. Burn" to "Active Burn / measured by your Apple Watch".

## Troubleshooting

- **Number shows up quoted** (`"8421"` instead of `8421`): the request body must be the step count *variable*, not typed text or a quoted string. If the Steps tile shows nothing, open the `.json` URL above and confirm the value is a bare number.
- **Wrong or missing date key**: the custom date format must be exactly `yyyy-MM-dd` (lowercase `yyyy` and `dd`, uppercase `MM`).
- **Shortcut returns no steps**: on first run, iOS asks for Health permission — it must be allowed. Check Settings → Privacy & Security → Health → Shortcuts if you missed the prompt.
