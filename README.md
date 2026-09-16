# PARA AI · v7

Existing repository `Masek463636/para-ai` and Vercel project `para-ai`. Production: https://para-ai-bay.vercel.app/

## Structure

- `index.html`, `result.css`, `app.js`: existing app, questionnaire handoff, result journey, Coach and session persistence.
- `questionnaire.js`: shared canonical 18-question schema, multi-signal scoring and duration calculation.
- `lib/analysis.js`: preserved Gemini model, deep response schema, prompt and validation.
- `api/analyze.js`: three passes (base + two parallel six-metric passes). With `stream:true`, NDJSON emits `base` before details, then `complete` or `partial`. Without it, JSON compatibility remains for v7 callers.
- `api/coach.js`, `lib/access.js`: one free contextual response, signed report binding, bounded in-memory request and replay controls.
- `docs/questionnaire-audit.md`: decision for every previous question.

## Analysis and access

Model remains `gemini-3.1-flash-lite`. `GEMINI_API_KEY` stays in Vercel, sent in the upstream header only. No client keys. Logs contain stage/status markers, never answers, generated reports or upstream bodies. Payloads accept only canonical questions, validated numeric selections, 3 bounded free texts and relationship duration in months. Names and birthdates stay in browser. Exact names and supported Russian case variants are redacted from free text and Coach questions. Arbitrary identifiers typed by users cannot be guaranteed anonymous.

Each of 12 metrics receives 3+ scenario signals. Local fallback is deterministic and never word-scores free answers. Gemini receives that baseline and interprets texts semantically. The existing risk index still combines six critical dimensions, text severity and a penalty for several weak zones. Numerology remains separate entertainment.

Response v7 adds archetype (five original metaphor families), superpower, riskZone, five-step possible cycle with two exit actions and structured two-way misunderstandings. It preserves detailed portraits, twelve metric narratives, premium, textSignals and Council. Council is a generated scene, not separate calls to ChatGPT or Grok.

Free: compatibility, archetype, superpower, green flag, portrait introductions and love needs, twelve indices, previews of misunderstandings/cycle/metrics, breakup index, entertainment and one Coach answer. Closed: deep portraits, full cycle and misunderstandings, metric narratives, risk explanations, individual unspoken expectations/fears, distance scenario, conversation and seven-day plan. Blur contains actual Gemini text, marked inert/aria-hidden to avoid reading locked prose through screen readers.

## Coach, limits and payments

A signed 24-hour capability binds canonical answers, duration and the entire report. Modified reports, fabricated grants and altered limits are rejected. Same-question retries return cached output; another question is blocked. Failed generations release the slot. Model data cannot set roles or inject system messages; all user content is explicitly untrusted. Coach is instructed to acknowledge insufficient evidence and never infer infidelity, diagnoses or hidden events.

**Current limitation:** counters and idempotency cache live in the warm function instance. They mitigate accidental repeat calls and simple abuse but do not enforce a global quota across cold starts/regions. Before paid launch, replace the ledger with an atomic persistent database and verify purchase entitlements. Planned product quota is 1 free + 8 paid messages per report, but no paid entitlement can currently be issued through this app.

**No payment processing.** The paywall is a prototype: full generated content still reaches the browser. CSS blur is not secure access control. Do not accept money before moving protected content and entitlements server-side. The UI honestly says purchases are unavailable.

## Saving and failure modes

Report, canonical questionnaire inputs, local names/dates, anonymous analysis and Coach response are saved in `sessionStorage` in the current tab, expiring after 24 hours. Refresh restores them; no email/account is required. Closing the tab normally removes session data (browser session restoration can retain it). Delete/restart clears the saved report. If storage is denied the UI says so. If a refresh interrupts details, the saved base remains with an explicit retry option; no paid content is fabricated. Failed Coach requests keep the free attempt available.

## Verification

`npm test` tests signal coverage, stability, cross-loading, complementary support, duration, canonical payloads, three-pass streaming, fallback, missing/upstream keys, structural contracts, risk response, signed Coach context/replay/failure recovery, personalization/redaction, safe HTML, real blur content and storage deletion.

`node --check app.js`, `node --check api/analyze.js`, `node --check api/coach.js`.

`/tests/viewport.html` is a noindex manual QA harness displaying the real app in an iframe at 375/390/430 CSS pixels. It does not inject results, access state or mock APIs. This tests responsive viewport rules; it is not iOS/Android emulation. Use real phones to verify OS keyboards and browser-specific behavior.

Release: match production deployment SHA/READY, complete synthetic questionnaire, verify base arrives before complete, read metric previews and real Coach answer, refresh, inspect runtime logs for `PARA analysis complete` / `PARA coach complete` and check runtime errors.
