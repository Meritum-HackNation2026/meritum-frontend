# Meritum components (React + shadcn/ui + Tailwind v4)

Components for the MSZ "Prawdowid" flow: a citizen pastes text or a link in the web form (or clicks "Sprawdź" under a post) and gets a per-claim verdict with verbatim citations. Visual spec: section 6 of `../../DESIGN_SYSTEM.md`. Props are the contract types, so the components render API responses as they come.

## Setup

1. Tokens: paste `../../tokens/meritum.css` into the app's global CSS after `@import "tailwindcss";`.
2. Fonts: Archivo (wdth 75..125, wght 400..800) and Azeret Mono (400..600); the frontend self-hosts them with Fontsource.
3. shadcn primitives (Radix flavour, `asChild` API): `npx shadcn@latest add button textarea tooltip`; `lucide-react` for the icons of the conversation view.
4. Copy this folder to `src/components/meritum/`, `../../contracts/meritum.ts` to `src/contracts/meritum.ts` and `../../copy/pl.json` to `src/copy/pl.json` (the components import `@/contracts/meritum` and `@/copy/pl.json`; turn on `resolveJsonModule`). Wrap the app in `<TooltipProvider>`.

## Components

| Component | Spec | Props |
|---|---|---|
| `CheckForm` | 6.1 | `onSubmit(CheckRequest)`, `pending`, `serverError` (an `errors` key), `retentionDays`, `onDeleteChecks`. Validates text (3 to 4000 characters) or a full http(s) link with `toRequest()`; keeps the text on an error. |
| `Composer`, `Question`, `Reply`, `Welcome`, `Attachment` | 6.8 | Conversation view of the web page. `Composer`: controlled `value`/`onValueChange`, `onSubmit(CheckRequest)` (same `toRequest()` rules as `CheckForm`), `pending`, `serverError`, `tools` (left of „Sprawdź”), `attachment` with `onSendAttachment`, `placeholder` (default `form.input_placeholder`; the app passes `conversation.next_placeholder` after the first check). `Question`: the citizen's words, `at`. `Reply`: signed answer, `at`, the steps or card as children. `Welcome`: `onPick(claim)` for `conversation.examples`, children slot for the AI notice. `Attachment`: `name`, `onRemove`, the recording's notes as children. Icons from `lucide-react`. |
| `CheckHistory` | 6.1 | `items: HistoryItem[]` (newest first), `account` (anonymous with `onSignIn`, signed in with sign-out and delete actions, or `false`/left out for no sign-in block), `onOpen(checkId)` |
| `CheckButton` | 6.2 | `state: "idle" \| "pending" \| "done"`, `onClick`. Takes the host's icon colour through `--host-icon`. |
| `AnalysisSteps` | 6.3 | `steps: AnalysisStep[]` from `AnalysisStatus`, `draft` while citations are not verified yet |
| `ResultCard` | 6.4 | `result: CheckResult`. One block per claim; non-verdict statuses get an icon and a sentence, never a badge. Conflicting sources are shown side by side with what differs. |
| `VerdictBadge` | 3, 6.4 | `verdict`, `size: "sm" \| "md"`. Red only for "false". |
| `CitationItem` | 6.4 | `citation: Citation`, `showDate` (default `true`): linked title, publisher and date, kind and tier, verbatim fragment; `showDate={false}` drops the date for the evidence timeline, which shows it itself |
| `StrengthMeter` | 6.4 | `strength: EvidenceStrength`, `claimDate`, `claimDateSource`: word and three bars in ink, premises in words |
| `ModerationQueue` | 6.5 | `cases: ModeratorCase[]`, `selectedId`, `onOpen(id)`. Question count is the sum of checks over a case's claims, the first question included; the line under it (`moderation.similar`, Polish plural forms) repeats that same number. |
| `MeritumMark`, `MeritumLabel` | 2 | Logo B; the label heads every card. |
| `t`, `fill`, `plural`, `formatDate` | | the `copy/pl.json` object, `{placeholder}` filling, Polish plural forms (`one`/`few`/`many`/`other`), Polish dates |

`Hint` and `InfoButton` hang tooltips off real buttons, so keyboard users reach every explanation.

In the extension, render inside a Shadow DOM root and inject the compiled CSS there; set `data-host="x|facebook|instagram|reddit|tiktok"` on the root for the platform skin and `class="dark"` when the host is dark. The framework-free twin of `ResultCard` and `AnalysisSteps` is `../../extension/reference/card.js`.

## Legacy

`../legacy/` keeps the components of the earlier scope (NASK fake ads and community notes): `ContextCard`, `QuickReportPopover`, `BotDefenseTelemetry`, `CampaignRotation`. They are not part of the MSZ product.

## Checked

Type-checked with `tsc` (strict, `noUncheckedIndexedAccess`) and linted with `biome lint` inside a copy of meritum-frontend, and rendered there on the contract examples (`contracts/examples.json`) in light and dark mode at 1280 px and 375 px.
