# pukhta
this is fooware ecommerce web app

## Email order notifications (store owner + customer)

Whenever a new order is placed (registered or guest checkout), the backend sends
an email via SMTP. It is fire-and-forget: if sending fails, the order still
succeeds and the error is logged.

- **Owner alert** -> `OWNER_EMAIL` (falls back to `ADMIN_EMAIL`, then `SMTP_USER`).
  Full order details (customer, items, totals, payment) + admin link.
- **Customer copy** -> registered user email or `guestEmail` (order confirmation).

### Setup (Gmail example)

1. In `backend/.env` set:
   `SMTP_HOST=smtp.gmail.com`
   `SMTP_PORT=587`
   `SMTP_USER=your-email@gmail.com`
   `SMTP_PASS=<Gmail App Password, not your login password>`
   `SMTP_FROM=noreply@footware2.com`
   `OWNER_EMAIL=owner@footware2.com` (where order alerts go)
   `EMAIL_ENABLED=true`
2. For Gmail you must create an **App Password**:
   Google Account -> Security -> 2-Step Verification ON -> App passwords ->
   create one for "Mail" and paste it as `SMTP_PASS`.
3. Restart the backend. On startup it logs one line confirming email is
   enabled, or one warning if it is disabled/misconfigured.
   Set `EMAIL_ENABLED=false` (or remove the values) to silently skip sending.
