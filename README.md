# PARA AI

Existing production project: `Masek463636/para-ai` → Vercel `para-ai`.

## Run and verify

Node 20+ (production currently Node 24). No frontend build or dependencies.

- `npm test`: API contract, error handling, risk calibration, privacy, safe rendering and local fallback checks.
- `npx vercel dev`: full local app with a privately configured `GEMINI_API_KEY`.
- Static hosting alone can exercise the questionnaire and automatic fallback.

## Files

- `index.html`: existing questionnaire, state, analysis orchestration and result journey.
- `result.css`: mobile-first result, portraits, metric sheet, Council and paywall styles.
- `api/analyze.js`: server-side Gemini request, schema validation and index calculation.
- `vercel.json`: no-store API headers and 180-second maximum function duration.
- `tests/analyze.test.cjs`: dependency-free regression checks with mocked upstream responses.

## AI and privacy

The existing model remains `gemini-3.1-flash-lite`. `GEMINI_API_KEY` stays in Vercel environment variables and is sent upstream only in a server request header. Never put it in the client, repository or logs. Logs contain status and completion markers, not answers or upstream bodies.

The frontend sends the 15 question texts and both answer texts as Person A/B. It does not send name/date fields. Exact occurrences of entered names in free answers are replaced; arbitrary personal data typed into answers cannot be guaranteed anonymous. The form explains this. All AI output is escaped and Person A/B is replaced at rendering time with local names. Optional grammatical case markers such as `[Person A:gen]` are resolved locally for supported Russian name endings; unknown names are preserved.

Questionnaire content is untrusted data, never model instructions. Schema validation rejects incomplete outputs. Upstream failures and timeouts produce a safe 503 response; the client displays a clearly labelled fallback. Fallback uses only selected choices, gives no vulnerability score and does not compare free text by keyword similarity.

## Analysis contract

Generation uses one base request and two parallel requests for six metric narratives each, all with the same existing Gemini model and server-only key. A shared timeout and abort signal bound the three calls.

Version 6 includes two profiles with ten themes each; twelve metric narratives with seven sections each; couple story and highlights; semantic analysis of the three free-response pairs; eleven premium sections including a seven-day plan; six or seven Council lines. Council is a Gemini-generated scene with characters, not separate ChatGPT/Grok calls.

All metric scores represent compatibility, including the legacy `risk` key which means vulnerability compatibility. Scoring bands: 85–100 / 70–84 / 55–69 / 40–54 / 0–39. These are product indices, not validated psychometric measures.

Overall compatibility is a weighted average: future and vulnerability have weight 1.5, other metrics 1. The breakup index considers trust, honesty, communication, boundaries, future and vulnerability. Formula: 55% of the deficit in the weakest three critical zones + 25% of the deficit in all six + 20% semantic-text severity, plus a capped interaction penalty for multiple scores under 55. Final score is clamped to 0–100. Numerology and birthdays do not enter either formula. Freeform narratives are instructed not to invent index values.

## Premium

The $1.99 paywall is a UI preparation only. No payment service, checkout, charge, subscription or access entitlement exists. Its button explains availability. Gemini generates all premium fields, but they are not rendered as an unlocked product. The previous `?premium=1` shortcut is removed. Premium fields still travel in the API response: this is **not** a secure commercial paywall. Before taking payments, keep protected content server-side and verify an actual purchase entitlement.

## Release checks

Before pushing to main, run `npm test`, `node --check api/analyze.js`, syntax-check the inline client script, and inspect the result at phone widths, long names/text, dialog scrolling/focus, Council, fallback and paywall. After push, verify the Vercel production deployment SHA and READY status, complete a real synthetic questionnaire, and inspect that deployment's runtime logs for `PARA analysis complete` or failure markers.
