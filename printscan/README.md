# PrintScan

**Print price comparison tool for Express Print Services Ltd.**

Paste a customer's print quote request → AI parses the spec → automated browser comparison across 7 UK print suppliers → ranked price table.

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Install Playwright browser

```bash
npm run setup
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in:

```
ANTHROPIC_API_KEY=your_key_here
ENCRYPTION_KEY=any_32_char_random_string
```

### 4. Run (development)

```bash
# Terminal 1 — Backend
npm run dev

# Terminal 2 — Frontend
npm run client
```

Frontend: http://localhost:3000
Backend API: http://localhost:3001

### Production build

```bash
npm run build
npm start
```

---

## Suppliers

| Supplier | Auth | Notes |
|---|---|---|
| Solopress | No | solopress.com |
| WTTB | **Yes** | Trade account required — add credentials in Settings |
| Printed Easy | No | printedeasy.com |
| Instantprint | No | instantprint.co.uk |
| HelloPrint | No | helloprint.co.uk |
| Route1Print | No | route1print.co.uk |
| PrintUK | No | printuk.com |

---

## Architecture

```
printscan/
  client/          React frontend (Input → Review → Results)
  server/
    api/           Express routes (parse, search, settings)
    suppliers/     One folder per supplier (config.json + scraper.js)
    utils/         Shared: browser, database, encryption, logger
  data/            settings.json + history.json (local storage)
```

## Maintenance

When a supplier changes their site layout, update the selectors/URLs in:

```
server/suppliers/<supplier>/config.json
server/suppliers/<supplier>/scraper.js
```

Each supplier module is fully independent — editing one won't break others.

---

## Replit Deployment

1. Set `ANTHROPIC_API_KEY` and `ENCRYPTION_KEY` in Replit Secrets
2. Run `npm run setup` once to install Chromium
3. Click Run — the app builds and serves on port 80
