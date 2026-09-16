# Apartments Crawler App

This is a simple web crawler that automatically fetches all the apartments from search results on the olx website, stores them in a database and displays them in accesible way on a website.

I am still working on this project, so it is not finished yet.

Use `Zaakceptuj` (accept), `Może` (maybe), or `Odrzuć` (reject) while browsing to
save a decision and move to the next pending apartment. Decisions persist in SQLite
as `accepted`, `maybe`, and `rejected`.

The **Zapisane mieszkania** page at `/apartments` lists all reviewed apartments with
status filters and counts. Each row shows the first photo, title, surface area,
monthly total and price breakdown. Change a status directly in the row or expand
all details, photos, and the original OLX link. New imports capture surface area;
older listings use area mentioned in the title/description when available.
Missing area is shown as `brak danych`. Run `npm run db:setup` after updating to
apply the surface-area migration (which also renames legacy `approved` statuses).

Imports also save Otodom links found on OLX search pages, together with the card's
title, advertised price, area, location/date, other visible text and preview image.
The scraper never opens Otodom pages. These entries have `source=otodom` and
`loaded=false`; missing prices/charges stay null. The review page defaults to OLX;
choose **Otodom · podgląd z OLX** to open the original listing manually in a new tab
and save an accept/maybe/reject decision here. Saved apartments support source and
status filters. Run `npm run db:setup` to apply the Otodom migration, then restart
the server and import an OLX search again to collect previously skipped Otodom links.


Basically the app will allow the user to filter out the apartments that he is not interested in and keep the ones that he is interested in.

On OLX website this is more difficult to do, because the search results can be duplicated, loading of single apartment's page can be slow and the website can be unresponsive. This app will make this process easier and faster.

## Tech Stack
- Next.js - for the frontend and backend
- Prisma and SQLite - for the database
- Puppeteer - for web scraping
- Tailwind CSS - for styling

## Local setup

1. Run `npm ci`.
2. Copy `example.env` to `.env` and configure the OLX selectors.
3. Run `npm run db:setup` to generate Prisma Client and apply the committed migrations to `prisma/dev.db`.
4. Run `npm run dev`.

The schema and migrations belong in Git; SQLite databases and their journal files do not.
For an existing database that already matches `prisma/schema.prisma`, back it up and run
`npx prisma migrate resolve --applied 20260916000000_init` once before `npm run db:setup`.
Do not baseline an empty database or one with a different schema.

## Accounts, permissions and activity statistics

The default administrator signs in using `ADMIN_USERNAME` and `ADMIN_PASSWORD` from
`.env`. Its database identity is created automatically on the first successful login.
The administrator can create regular accounts at **Użytkownicy** (`/users`). Usernames
are case-sensitive (3–50 letters, digits, dots, underscores or hyphens); passwords must
contain 12–256 characters and are stored as salted scrypt hashes. There is no public
registration and account creation cannot grant administrator privileges.

All users can review apartments, update statuses and view **Statystyki** (`/stats`).
Account management, importing (including progress) and deleting apartments require
the administrator role. Pages and API handlers check access on the server; hidden
navigation links are not used as the security boundary.

Saved apartments show who last changed their status and when. Each actual status
transition is recorded atomically with the apartment update. Repeating an unchanged
status does not overwrite its author or add another history entry. The stacked bar
chart and summary table count **all recorded transitions** by user and destination
status, rather than only the current statuses. A paginated history table shows the
apartment, author, previous/new status and time (Europe/Warsaw). History survives
apartment deletion. Decisions made before this feature retain their statuses, show
an unknown author, and are excluded from user activity counts until a new change occurs.

Run `npm run db:setup` after updating, then restart the server. This migration preserves
existing apartments. Previous admin-only session cookies are invalidated; sign in again.

## Deployment and authentication

API requests use the app's current origin. Imports accept only HTTPS apartment-search URLs
on `olx.pl` or `www.olx.pl`. Scraped links and browser navigation are restricted to those hosts;
other browser requests are limited to HTTPS resources under `olx.pl` and `olxcdn.com`.

Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD` (12–256 characters), and
`ADMIN_SESSION_SECRET` (at least 32 characters) in `.env` or your server's environment.
Generate a random session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
Restart the server after changing these settings. The default admin password is the value
you set in `.env`; there is no hard-coded fallback. Access is denied until all three are
configured. Never expose them with `NEXT_PUBLIC_` or commit `.env`. When changing the
admin username, choose one not already assigned to a regular user.

Open `/login` to sign in as either an administrator or a regular user. All app pages and
APIs require a valid account session, apart from login and cookie-clearing logout.
The old `ADMIN_API_TOKEN` is no longer used. Sessions last
eight hours in signed HttpOnly, SameSite=Strict cookies, with Secure enabled in production.
Use HTTPS in production. Admin credential/secret changes invalidate all existing cookies.
Session signatures include the user's ID, and server handlers verify the current account
and role against the database. The logout
button clears the browser's session cookie. Mutating APIs also require a matching Origin
header; configure a reverse proxy to preserve the application's public origin.
Login attempts are limited to ten per minute across the single server process.

Run `npm run db:setup` during deployment before starting the server, and keep `prisma/dev.db`
on persistent writable storage. Puppeteer requires a supported Chromium runtime. Imports still
run in the server process after the response, so use a long-running Node server; durable jobs
and serverless import execution are not implemented.

The import page polls progress every two seconds and restores the current/latest job after
a page refresh. It shows discovery, search-page progress, apartment progress, retries,
saved/existing counts, skipped failures, and the final result. Only one import can run at a
time because the scraper shares a browser page; another request returns HTTP 409 with the
active job. Progress is kept in memory on a single Node server and is lost on server restart.

Run `npm test` for regression checks and `npx tsc --noEmit` for TypeScript validation.
