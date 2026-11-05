# Innovexa Solutions — Booking, Payments & Projects Backend

A Node.js + Express backend for the Innovexa Solutions website that:
- Saves bookings from the "Book a Service" form into a real database
- Lets you **approve or reject** each booking from an admin dashboard
- Once approved, generates a secure **payment link** for the client with
  JazzCash, EasyPaisa, Bank Transfer and (optionally) PayPal options —
  payment is not available to the client until you approve
- Lets you **add portfolio projects** from the admin panel, which appear
  automatically in the "Our Work" section on the live website
- Emails you a notification for every new booking

## Quickest way to start (recommended)

**Windows:** double-click `start.bat`
**Mac/Linux:** open Terminal in this folder and run `bash start.sh`

## What's inside

```
backend/
├── server.js         # Express server + all API routes
├── db.js             # Bookings storage (bookings.json) + approval/payment logic
├── projects.js        # Portfolio projects storage (projects.json)
├── mailer.js         # Sends email notifications
├── package.json
├── .env.example       # Copy to .env and fill in your values
└── public/
    ├── admin.html     # Password-protected dashboard: bookings + projects
    └── payment.html   # Client-facing payment page (JazzCash/EasyPaisa/Bank/PayPal)
```

## 1–4. Install & run

Same as before: install Node.js 18+, run `npm install` inside `backend`,
copy `.env.example` to `.env` and set `ADMIN_KEY`, then `npm start`.

## 5. How the approval + payment flow works

1. Client submits a booking on the website → status `pending`.
2. You open `http://localhost:5000/admin.html`, go to the **Bookings** tab.
3. Click **Approve** — you'll be asked for the agreed price in PKR (you can
   leave it blank and set it later by re-approving... actually to change the
   amount afterwards, just click Approve again with the new value).
4. Once approved, a **payment link** becomes active for that booking. Click
   **Copy pay link** and send it to the client (WhatsApp, email, etc).
5. The client opens the link (`payment.html?id=...&token=...`), picks a
   payment method:
   - **JazzCash / EasyPaisa** — shows your account number, client enters
     their transaction ID after sending money.
   - **Bank Transfer** — shows your bank details, same flow.
   - **PayPal** — only works if you paste a PayPal Client ID into
     `public/payment.html` (see the `PAYPAL_CLIENT_ID` constant near the
     top of the `<script>`). Leave it blank to hide/disable PayPal.
6. Once the client submits payment details, the booking's payment status
   becomes `submitted`. You'll see it in the dashboard.
7. You verify the money actually arrived (check your JazzCash/bank app),
   then click **Confirm payment** in the dashboard. Status becomes `paid`.
8. Optionally click **Mark completed** once the work is delivered.

**Important:** update the placeholder account details in
`public/payment.html` (search for `PAYMENT_ACCOUNTS`) with your real
JazzCash, EasyPaisa and bank account numbers before going live.

## 6. Adding projects to "Our Work"

In the admin dashboard, go to the **Projects** tab. Fill in a title,
category, short description, an image URL (upload your project screenshot
somewhere like imgur.com or your own hosting and paste the link), and an
optional project link. Click **Add project** — it appears instantly on the
live website's "Our Work" section (as long as "Show on website immediately"
was checked). Use Unpublish/Publish to hide a project without deleting it.

## 7. Connect the website to this backend

Both `script.js` (bookings) and the "Our Work" section already point to
`http://localhost:5000` for local testing. Once you deploy the backend
online, update these two constants:
- In `script.js`: `BOOKING_API_URL` and `PROJECTS_API_URL`
- In `public/payment.html`: nothing to change, it uses its own origin
  automatically.

## 8. Deploying online (so it works for real visitors)

Same as before — Render.com, Railway, or a VPS with `pm2`. Set `ADMIN_KEY`,
`EMAIL_USER`, `EMAIL_PASS`, `ADMIN_EMAIL` as environment variables on the
host, never commit your real `.env`.

## Notes on security

- Change `ADMIN_KEY` to something long and random before going live.
- Tighten `cors()` in `server.js` to your real domain once live:
  ```javascript
  app.use(cors({ origin: 'https://innovexasolutions.pk' }));
  ```
- `bookings.json` and `projects.json` are plain files — back them up
  periodically.
- The payment page never reveals amounts or lets anyone pay until you've
  approved the booking (enforced server-side via the random payment token,
  not just hidden in the UI).

