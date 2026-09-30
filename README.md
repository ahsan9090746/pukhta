# pukhta
this is fooware ecommerce web app

## WhatsApp order notifications (store owner)

Whenever a new order is placed (registered or guest checkout), the backend sends
a WhatsApp message to the store owner. It is fire-and-forget with an 8s timeout:
if sending fails, the order still succeeds and the error is logged.

### Activate CallMeBot (free, no extra dependencies)

1. Save the CallMeBot WhatsApp number `+34 644 10 55 84` in your phone contacts.
2. Send this message to it from the **owner's** WhatsApp number:
   `I allow callmebot to send me messages`
3. You will receive back an **API key**. (If you lose it, send the same message
   again to get it back.)
4. Put these in `backend/.env` (see `backend/.env.example`):
   `WHATSAPP_ENABLED=true`
   `WHATSAPP_PROVIDER=callmebot`
   `WHATSAPP_OWNER_PHONE=923001234567` (owner number, international format, no `+` or spaces)
   `CALLMEBOT_API_KEY=<the key from step 3>`
5. Restart the backend. On startup it logs one line confirming WhatsApp is
   enabled, or one warning if it is disabled/misconfigured.
   Set `WHATSAPP_ENABLED=false` (or remove the values) to silently skip sending.

### Change number / provider later

- Change the owner number: update `WHATSAPP_OWNER_PHONE` and restart.
- Change provider: set `WHATSAPP_PROVIDER`. Currently `callmebot` is supported;
  the code (`backend/src/services/whatsapp.service.ts`) uses a `WhatsAppProvider`
  interface, so a future `meta` (Meta Cloud API) provider can be added without
  touching the order flow.

