# PARA AI · v8

Existing 18-question relationship app, deployed with Vercel Node Functions and a static mobile-first frontend. This upgrade keeps the Gemini model, questionnaire, scoring and result journey.

## Commercial core

- Turso/libSQL schema and migrations: `db/schema.sql`, `lib/db.js`.
- Encrypted anonymous reports; free responses use an explicit allow-list. `/api/premium` requires server entitlement and the same anonymous session cookie.
- One free + eight premium Coach messages, transactional reservations, retry cache and failure recovery.
- Stripe hosted Checkout adapter, verified raw-body webhooks, idempotency, report binding, refund/dispute revocation. `PAYMENT_PROVIDER=demo` never pretends to take money or grant Premium.
- Minimal analytics and secret-protected `/admin`.
- Gemini unavailable: local questionnaire fallback. Database unconfigured: free analysis only; Coach/purchases explicitly unavailable.

`npm ci`, `npm test`, `npm run check`, `npm run build`.

The repository contains no personal service credentials. A real remote database and the buyer's own payment credentials must be configured before accepting payments. Local database tests and signed webhook fixtures are not evidence of a live merchant integration.
