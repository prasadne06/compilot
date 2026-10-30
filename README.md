# CompPilot

An AI-powered salary evaluation and negotiation copilot. It helps someone with a job offer understand it, see where it stands against an (illustrative) market, assess their negotiation leverage, decide what to ask for, get honest scripts, and practice the conversation.

**Offer → Understand → Benchmark → Evaluate → Leverage → Recommend → Negotiate → Practice**

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

Click **“Or explore a sample offer”** on the landing page to see the full experience with the demo persona (Senior Product Designer, Seattle, $195K offer, $210K written competing offer).

## Offer letter upload

On the first two steps you can upload an offer letter (**PDF** or **Word .docx**, up to 10 MB) instead of typing everything:

1. The file is read **in the browser** (`src/services/documents/textExtraction.ts`, using pdf.js and mammoth, loaded on demand). In mock mode nothing leaves the device; with an AI endpoint configured, only the extracted text is sent.
2. `extractOfferDetails()` (`src/services/ai/offerExtraction.ts`) returns structured fields. Each one has a confidence rating and the sentence it came from. The mock is a rule-based parser that handles annual, hourly, bi-weekly and monthly pay, "$195K" shorthand, equity value and vesting, PTO, start date, remote policy, location, company stage and benefits.
3. A review screen shows every value next to its source sentence. The user edits or unticks values, then confirms.
4. Values the user didn't edit and that weren't high-confidence stay highlighted in the form ("From your letter · check this"). Continuing with unchecked fields asks the user to confirm them first.

Not supported: old `.doc` files and scanned (image-only) PDFs. Both get a clear message suggesting what to do instead. Sample letters for testing are in `public/samples/`.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 3 · React Router 6 · lucide-react · pdfjs-dist · mammoth. No backend; inputs persist in `localStorage`.

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

## Connecting a real LLM

Set `VITE_AI_ENDPOINT` (see `.env.example`) to a **server-side** proxy. Each AI call POSTs `{ task, system, input, response_format: "json" }`. Responses are shape-validated and run through guardrails; anything invalid falls back to the mock automatically.

## Benchmark data disclaimer

`src/data/benchmarks.ts` is a hand-built illustrative model (role family × level × location × industry × company stage × experience). It is **not** sourced from any survey, vendor or private company data and is **not** real-time. Replace it with a licensed or crowdsourced dataset before treating outputs as market data.
