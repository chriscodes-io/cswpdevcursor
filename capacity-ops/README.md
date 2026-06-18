# Capacity Ops

Chris Smith Technical SEO consulting site — static homepage + operator dashboard, with lead capture, WordPress health audits, PDF email delivery, and Supabase storage.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Static HTML (`public/index.html`, `public/dashboard.html`) |
| API | Node.js 18+ / Express |
| Database | Supabase PostgreSQL |
| Email | [Resend](https://resend.com) |
| PDF | Puppeteer (`puppeteer-core` + `@sparticuz/chromium` on Netlify) |
| Hosting | Netlify (static + serverless function) |

## Project layout

```
capacity-ops/
├── public/                 # Static site
│   ├── index.html          # Landing + wpaudit CTA
│   ├── dashboard.html      # Leads & audits dashboard
│   └── js/
├── backend/
│   ├── server.js           # Local dev entry
│   ├── app.js              # Express app
│   ├── routes/
│   ├── services/
│   └── templates/audit-report.html
├── netlify/functions/api.js
├── supabase/migrations/001_initial.sql
└── package.json
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/audit/submit` | Run audit, save lead, email PDF, return share link |
| `GET` | `/api/audit/:auditId` | Audit JSON (dashboard) |
| `GET` | `/api/audit/share/:shareToken` | Public HTML report |
| `GET` | `/api/leads` | List leads (requires `Authorization: Bearer DASHBOARD_API_KEY`) |
| `GET` | `/api/health` | Service status |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).
3. Copy **Project URL** and **service_role** key (Settings → API).

### 2. Resend

1. Create an account and verify your sending domain.
2. Create an API key and note the `reports@yourdomain.com` from-address.

### 3. Environment

```bash
cp backend/.env.example backend/.env
```

Fill in:

```env
PORT=3000
SITE_URL=http://localhost:3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=reports@yourdomain.com
DASHBOARD_API_KEY=your-long-random-secret
GOOGLE_PAGESPEED_API_KEY=   # optional, improves performance scores
```

### 4. Install & run locally

```bash
cd capacity-ops
npm install
npm run dev
```

- Homepage: http://localhost:3000/
- Dashboard: http://localhost:3000/dashboard.html (enter `DASHBOARD_API_KEY` when prompted)

## User flow

1. Visitor enters **URL + email** on the homepage and clicks **Run free audit**.
2. **wpaudit.pro** opens in a new tab (interactive audit UI).
3. Modal confirms; on **Send me the PDF report**, the backend:
   - Crawls the site and scores performance / SEO / security / technical / accessibility
   - Saves `audits` + `leads` in Supabase
   - Generates a branded PDF (when Chrome/Chromium is available)
   - Emails the PDF via Resend
   - Returns a public **share link** (`/audit/share/:token`)

## Deploy to Netlify

1. Push this folder to GitHub.
2. In Netlify: **Add new site** → import repo.
3. Build settings (from `netlify.toml`):
   - Publish: `public`
   - Functions: `netlify/functions`
4. Set environment variables (same as `.env`, plus `SITE_URL=https://your-site.netlify.app`).
5. Deploy.

API routes are proxied: `/api/*` → `/.netlify/functions/api/*`.

> **PDF on Netlify:** Uses `@sparticuz/chromium`. First cold start may be slow. If PDF generation fails, email still sends with the share link.

## wpaudit.pro integration

There is no documented public wpaudit.pro API. The frontend opens `https://wpaudit.pro/?url=…` for the visitor experience; audit data for PDF/email is produced by this backend’s analyser (HTML crawl + optional Google PageSpeed Insights).

Set `WPAUDIT_API_KEY` in `.env` if you add a private integration later.

## Checklist

- [ ] Supabase migration applied
- [ ] Resend domain verified
- [ ] `backend/.env` configured
- [ ] `npm run dev` — submit test audit from homepage
- [ ] Dashboard loads leads with API key
- [ ] Netlify env vars set
- [ ] Production end-to-end test (form → email → share link)
