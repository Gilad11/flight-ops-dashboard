# Flight Ops Dashboard — Setup Guide

## Architecture

```
React Frontend (Vite)
       │
       │  HTTPS fetch
       ▼
Google Apps Script Web App   ←── free, serverless API layer
       │
       │  Sheets API
       ▼
Google Sheets (database)
```

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **blank spreadsheet**
2. Name it anything (e.g. `Flight Operations DB`)
3. Leave the first sheet blank — the script will populate headers automatically

---

## Step 2 — Deploy the Google Apps Script

1. Inside your spreadsheet, click **Extensions → Apps Script**
2. Delete all existing code in the editor
3. Open `google-apps-script/Code.gs` from this project and **paste the entire contents**
4. Click **Save** (Ctrl+S)

### Create the Web App deployment:

1. Click **Deploy → New deployment**
2. Click the ⚙️ gear icon → select **Web app**
3. Fill in:
   - Description: `Flight Ops API`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** → authorize when prompted (Google will ask for Sheets permissions)
5. **Copy the Web App URL** — looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> ⚠️ **Important**: Every time you edit `Code.gs`, you must create a **new deployment** (not update the existing one) for changes to take effect.

### Initialize the Sheet headers:

1. In the Apps Script editor, select `initSheet` from the function dropdown
2. Click ▶️ **Run**
3. You should see `✅ "Flights" sheet initialized successfully!`

---

## Step 3 — Configure the Frontend

In the project root, create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and paste your Web App URL:

```
VITE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

---

## Step 4 — Run the App

```bash
cd flight-ops-dashboard
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Step 5 — Deploy to Production (Optional)

### Option A: Vercel (recommended — free)
```bash
npm install -g vercel
vercel
```
Add `VITE_SCRIPT_URL` as an environment variable in the Vercel dashboard under
**Project Settings → Environment Variables**.

### Option B: Netlify
```bash
npm run build
```
Drag the `dist/` folder to [netlify.com/drop](https://netlify.com/drop).
Add `VITE_SCRIPT_URL` in **Site settings → Environment variables**.

---

## Google Sheets Column Reference

| Col | Field                  | Type    | Notes                              |
|-----|------------------------|---------|------------------------------------|
| A   | `id`                   | string  | Unix timestamp (auto)              |
| B   | `origin`               | string  | `UAE` or `ISRAEL`                  |
| C   | `destination`          | string  | Auto-set (opposite of origin)      |
| D   | `flight_type`          | string  | `UAE` or `IL` (auto)               |
| E   | `aircraft_type`        | string  | Free text                          |
| F   | `payload_type`         | string  | `CARGO` or `PASSENGERS`            |
| G   | `notes`                | string  | Free text                          |
| H   | `route`                | string  | `SAUDI` (5h) or `CYPRUS` (6h)      |
| I   | `departure_time_utc`   | ISO UTC | Stored in UTC                      |
| J   | `arrival_time_utc`     | ISO UTC | departure + duration (auto)        |
| K   | `return_flight`        | boolean | `true` or `false`                  |
| L   | `unload_time`          | string  | `1h` or `2h`                       |
| M   | `return_departure_utc` | ISO UTC | arrival + unload (auto)            |
| N   | `return_arrival_utc`   | ISO UTC | return_dep + duration (auto)       |
| O   | `passenger_list_link`  | URL     | External link only                 |
| P   | `timezone_origin`      | IANA    | e.g. `Asia/Dubai` (auto)           |
| Q   | `timezone_destination` | IANA    | e.g. `Asia/Jerusalem` (auto)       |
| R   | `created_at`           | ISO UTC | Record creation time               |

---

## Business Logic Summary

| Rule                  | Value                                          |
|-----------------------|------------------------------------------------|
| SAUDI route duration  | 5 hours                                        |
| CYPRUS route duration | 6 hours                                        |
| Arrival time          | `departure_utc + duration`                     |
| Return departure      | `arrival_utc + unload_time`                    |
| Return arrival        | `return_departure_utc + duration`              |
| UAE timezone          | `Asia/Dubai` (UTC+4, no DST)                   |
| Israel timezone       | `Asia/Jerusalem` (UTC+2 winter / UTC+3 summer) |

---

## Troubleshooting

### "Failed to load flights"
- Confirm `VITE_SCRIPT_URL` in `.env` is correct (no trailing spaces)
- Open the URL directly in your browser — you should see `{"success":true,"data":[]}`
- Make sure **"Who has access"** is set to **Anyone** in the deployment

### CORS errors in the browser console
- Create a **new** Apps Script deployment — do not reuse old ones
- Ensure you're using the `/exec` URL, not `/dev`

### Times display incorrectly
- All times are stored in UTC; display is handled by the browser's `Intl` API
- Israel DST is handled automatically via the `Asia/Jerusalem` IANA timezone
- Use the UAE/ISR toggle in the header to switch all displayed times

### "initSheet not working"
- Make sure you authorized the script (OAuth popup may have been blocked)
- Check **Executions** in Apps Script for error details
