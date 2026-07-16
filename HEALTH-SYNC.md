# Syncing Apple Health Steps into Daylign

## What this does

An iPhone Shortcut reads today's step count from Apple Health and writes it directly to the Daylign Firebase Realtime Database at `external/steps/<date>` (e.g. `external/steps/2026-07-16 = 8421`). The dashboard reads this node read-only: the Steps tile shows the count, and walking burn is folded into the Net Cals tile automatically once data exists. The app's own writes go to the `lifestack` node, so nothing under `external` is ever overwritten by the app.

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

Run it once manually. iOS will prompt for Health access on first run — tap **Allow**.

## Automation (runs nightly)

1. Shortcuts app → **Automation** tab → **+**
2. Choose **Time of Day** → **9:00 PM**, repeat **Daily**
3. Select **Run Immediately** (run without asking)
4. Pick **Sync Steps to Daylign**

You can also run the shortcut manually anytime. Re-runs are safe: PUT overwrites the same date key with the latest count.

## Verify it worked

1. Open this in any browser:
   `https://lifestack-d5300-default-rtdb.firebaseio.com/external/steps.json`
2. Check that today's date key appears with a bare number, e.g. `{"2026-07-16": 8421}`.
3. Refresh the Daylign dashboard — the Steps tile should populate and Net Cals should include walking burn.

## Troubleshooting

- **Number shows up quoted** (`"8421"` instead of `8421`): the request body must be the step count *variable*, not typed text or a quoted string. If the Steps tile shows nothing, open the `.json` URL above and confirm the value is a bare number.
- **Wrong or missing date key**: the custom date format must be exactly `yyyy-MM-dd` (lowercase `yyyy` and `dd`, uppercase `MM`).
- **Shortcut returns no steps**: on first run, iOS asks for Health permission — it must be allowed. Check Settings → Privacy & Security → Health → Shortcuts if you missed the prompt.
