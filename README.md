# CompPilot

An AI-powered salary evaluation and negotiation copilot. It helps someone with a job offer understand it, see where it stands against an (illustrative) market, assess their negotiation leverage, decide what to ask for, get honest scripts, and practice the conversation.

**Offer → Understand → Benchmark → Evaluate → Leverage → Recommend → Negotiate → Practice**

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also serves /api)
npm run build      # typecheck + production build
npm test           # unit tests, then browser tests on the production build
```

To use Claude locally, copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. Without it, every AI feature uses built-in rules and templates.

There is also a **1-minute quick check** at `/quick`: job title, level, location and base salary give a below / within / above verdict, and either button carries those details into the full evaluation.

Click **“Or explore a sample offer”** on the landing page to see the full experience with the demo persona (Senior Product Designer, Seattle, $195K offer, $210K written competing offer).

## Offer letter upload

On the first two steps you can upload an offer letter (**PDF** or **Word .docx**, up to 10 MB) instead of typing everything:

1. The file is read **in the browser** (`src/services/documents/textExtraction.ts`, using pdf.js and mammoth, loaded on demand). Without the AI server nothing leaves the device; with it, only the extracted text, with personal details removed, is sent.
2. `extractOfferDetails()` (`src/services/ai/offerExtraction.ts`) returns structured fields. Each one has a confidence rating and the sentence it came from. With Claude on, a value is kept only if its quoted sentence really appears in the letter (`checkAIExtraction`); anything Claude missed is filled by the built-in reader. The built-in reader is a rule-based parser that handles annual, hourly, bi-weekly and monthly pay, "$195K" shorthand, equity value and vesting, PTO, start date, remote policy, location, company stage and benefits.
3. Values go straight into the form. Each filled field shows the sentence it came from, with **Looks right** and **Clear** buttons; editing the value also confirms it. Uncertain values (inferred or converted) are marked "double-check" with the reason.
4. A panel at the top of each page tracks progress ("3 of 13 confirmed"), offers **Confirm all on this page**, and lists anything the letter didn't state clearly. Continuing with unconfirmed fields shows a reminder. Uploading a different file replaces the earlier values.

**Privacy.** Uploading is optional: step 1 offers *Enter details* (default) or *Upload offer letter*. Before the first upload the user sees a short notice and ticks "I understand" (remembered in the browser); a "What happens to my file?" link explains each step. Files are read in the browser and never kept. Before anything is saved or sent to an AI service, personal details (recipient and signer names, email, phone, street address, ZIP, ID numbers) are removed (`src/services/documents/redact.ts`). City, company, role and pay stay, because the analysis needs them.

**US only for now.** Locations are US metros, Remote (US) and Other US; letters with £/€/₹, Indian or UK pay terms, or a non-US city get a clear "US offers only" message.

Not supported: old `.doc` files and scanned (image-only) PDFs. Both get a clear message suggesting what to do instead. Sample letters for testing are in `public/samples/`.

## Negotiation coach (agentic)

The **Coach** tab (`/results/coach`) has two modes: **Plan replies** (a chat for the live negotiation, below) and **Rehearse the call** (practice with a simulated recruiter, with feedback on each answer; `/practice` redirects here).

- **Counter-offers:** tell it what the company came back with (or use the *Log their response* form). It evaluates the new terms against your original offer, target, fallback and walk-away, suggests a next move (accept / one final ask / counter / pivot to other levers) and drafts a reply. Each response is added to a **negotiation timeline**.
- **What-ifs and "why":** "What if base goes to $215K?", "Why is my leverage 77?". What-ifs never change your saved offer.

How it works (`src/services/ai/agent/`):

- The model only chooses tools and explains. Every number comes from three tools backed by the deterministic engine (`src/engine/negotiation.ts`): `run_what_if`, `evaluate_counter_offer`, `log_counter_offer`. Tool results appear in the chat as **Calculated** cards.
- **Claude engine:** when the app is deployed with an API key, the coach talks to Claude through CompPilot's server (`serverRuntime.ts` → `/api/coach`). The server makes one model call at a time with a fixed system prompt and the three tool definitions; tool calls come back to the browser, run with CompPilot's calculations, and go back with the results. Inside a claude.ai artifact viewer, the runtime's `sample` capability is used instead. Instructions plus the user's full situation are sent each turn (`prompt.ts`).
- **Offline coach:** with no AI server (or if Claude is unavailable), a rule-based coach handles the common requests with the same tools.
- Replies are checked against product guardrails (`checkConversationalText`). The coach never sets the walk-away number, never suggests bluffing, and never tells the user they must accept or reject.
- "Use latest terms as my offer" (an explicit user action) re-runs the full evaluation on the newest terms.
- **One conversation per offer.** The chat and timeline are saved in the browser per offer (`src/state/coachHistory.ts`, last 8 offers). Uploading a letter, loading the sample, clearing data, or changing the company or role starts a new conversation; switching back restores it.
- **Suggestions fit the offer and the stage** (`suggestions.ts`): before the company responds they cover the opening ask, a competing offer, signing bonus, private equity and walk-away; after a response they cover accepting, replying, and countering. Follow-up suggestions appear after each reply and skip questions already asked.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 3 · React Router 6 · lucide-react · pdfjs-dist · mammoth · Anthropic TypeScript SDK (server only) · Vitest · Playwright. Inputs persist in `localStorage`; the optional server keeps no data.

## Architecture

```
src/
  types/            Domain types (UserProfile, Offer, Compensation, Benchmark, MarketRange,
                    NegotiationLeverage, Recommendation, NegotiationStrategy, NegotiationScript, PracticeSession…)
  data/             Illustrative benchmark model, form options, sample persona
  engine/           Deterministic scoring — no AI
    compensation.ts   calculateCompensation()
    benchmark.ts      buildBenchmark(), inferRoleFamily()
    scoring.ts        calculateMarketPosition(), calculateOfferScore(),
                      calculateNegotiationLeverage(), calculateConfidence()
    recommendation.ts calculateRecommendation(), buildStrategy()
    index.ts          analyzeOffer() pipeline + step validation
  services/ai/      AI layer — explains & personalizes engine output
    provider.ts       runTask(): LLM endpoint → validate → guardrails, or mock fallback
    prompts.ts        System prompts + JSON schemas per task
    guardrails.ts     Blocks guarantees, deception, coercion, "you must reject", etc.
    context.ts        Structured AIContext (user facts + engine results only)
    salaryAnalysis.ts / negotiationStrategy.ts / scriptGenerator.ts / roleplay.ts
  state/            EvaluationContext (inputs + memoized analysis), useAI (cached async hook)
  components/ui/    Button, Input, CurrencyInput, Select, Segmented, MultiSelect, ProgressStepper,
                    Tooltip, Modal, EmptyState, LoadingState, ErrorState, Badge, Card
  components/comp/  CompensationCard, ScoreCard, MarketRange, ConfidenceIndicator, LeverageFactors,
                    RecommendationCard, ScriptCard, NegotiationScenario, Disclaimer, SourceTag
  layouts/ pages/   Routes: / · /evaluate/{about-you,offer,priorities} · /results{,/market,/negotiation,/scripts}
                    · /practice · /settings
```

### Principles baked in

- **Math is deterministic.** Scores, percentiles, leverage, confidence, targets and fallback come from `engine/`. The AI never computes numbers.
- **Data vs. AI interpretation is always labeled** (`SourceTag`: *Illustrative benchmark*, *Calculated*, *AI interpretation*).
- **Uncertainty is visible.** Every result carries a confidence score with a factor breakdown; lower confidence widens the range. Confidence is capped below 90% because data is static.
- **Walk-away is user-defined.** It is never computed.
- **Honest negotiation.** Scripts only mention competing offers the user actually reported; role-play coaching flags ultimatums, coercion and references to offers that don't exist.

## AI server (Claude)

`server/handlers.ts` has three small endpoints, deployed as Vercel functions from `api/` and served by `npm run dev` too:

| Endpoint | What it does |
|---|---|
| `GET /api/health` | `{ ai: true }` when `ANTHROPIC_API_KEY` is set. The browser checks this once; AI turns on automatically. |
| `POST /api/task` | `{ task, input }` → `{ data }`. Summaries, strategy notes, scripts, pushback answers, rehearsal turns and letter reading. The system prompts live on the server (`src/services/ai/prompts.ts`). |
| `POST /api/coach` | One coach model call, streamed as newline-delimited JSON. Fixed system prompt and tools; the browser runs the tools. |

- **The key stays on the server.** The browser sends only data (task name and input, or the conversation). It can't choose the model, system prompt or tools.
- **Model:** `claude-opus-5-5` by default; set `CLAUDE_MODEL` (e.g. `claude-sonnet-5-5` or `claude-haiku-5-5`) to trade quality for cost. Refused requests are retried on a suitable model by the API (`fallbacks: "default"`).
- **Limits:** request size caps, a per-IP rate limit per server instance, and optional `ALLOWED_ORIGINS`. The rate limit is best effort on serverless, so **also set a monthly spend limit in the Anthropic Console**.
- **Safety net:** every reply is shape-checked and run through guardrails in the browser; anything invalid falls back to the built-in rules and templates.

### Deploy to Vercel

1. Import the GitHub repo in Vercel (framework: Vite; `vercel.json` sets the rest).
2. Add `ANTHROPIC_API_KEY` (and optionally `CLAUDE_MODEL`, `ALLOWED_ORIGINS`) under Project → Settings → Environment Variables.
3. Deploy. Settings → AI provider in the app shows "Claude on" when it works.

## Tests and CI

- `npm run test:unit` (Vitest, `tests/unit`): the scoring engine and its published sample numbers, negotiation moves, the letter reader on 8 fictional letters (`tests/fixtures/letters`), redaction, guardrails, the AI server with a stand-in Claude client, and the browser's coach tool loop.
- `npm run test:e2e` (Playwright, `tests/e2e`): runs on the **production build** — journeys, quick check, upload and privacy, coach and rehearse, a zero-size icon check, and phone layout. Browser tests never call Claude.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, type check, unit and browser tests on every push and pull request.

## Benchmark data disclaimer

`src/data/benchmarks.ts` is a hand-built illustrative model (role family × level × location × industry × company stage × experience). It is **not** sourced from any survey, vendor or private company data and is **not** real-time. Replace it with a licensed or crowdsourced dataset before treating outputs as market data.
