# AGENTS.md

Rules for AI agents (and the people who run them) working on `meritum-frontend`, the Meritum
web app. Stack, scripts and the copies synced from the design system: `README.md`. What enforces
the architecture here: `docs/architecture.md`.

## Main rules: meritum-monorepo

`AGENTS.md` in [meritum-monorepo](https://github.com/Meritum-HackNation2026/meritum-monorepo)
and its `meritum-*` skills in `.claude/skills/` are the main rules. They win over this file and
over every other skill. Read the matching skill before the step:

| Skill                    | When                                            |
| ------------------------ | ----------------------------------------------- |
| `meritum-issue-claiming` | starting, blocking or stopping work on an issue |
| `meritum-pr-review-loop` | opening a PR and every review round             |
| `meritum-architecture`   | writing or reviewing any code                   |
| `meritum-ui`             | anything visual or any user-facing text         |

Integration branch: `develop`. Branch `<type>/<issue>-<slug>` from `origin/develop`, PR to
`develop`.

## UI tasks go to Claude

Claude does every task that changes what the user sees: components, routes, styles, copy,
motion. Other agents take tasks with no visible change (API client, config, CI, docs) and leave
UI issues to a Claude session.

## Components: shadcnblocks first

1. Look for a fitting block or layout on [shadcnblocks](https://www.shadcnblocks.com) and install
   it through the shadcn CLI registry: `pnpm dlx shadcn@latest add @shadcnblocks/<name>`.
2. Use plain shadcn/ui (`pnpm dlx shadcn@latest add <name>`) only when no block or layout fits.
3. Restyle what you installed with the Meritum design system (`meritum-ui`): tokens from
   `src/styles/meritum.css`, Archivo and Azeret Mono, components from `src/components/meritum/`,
   every text from `src/copy/pl.json`. The block keeps its structure unless it breaks accessibility or a Meritum component; its colours, fonts, images
   and sample copy go.

Kolejność źródeł komponentów (rejestry w `components.json`): najpierw komponenty Meritum z `src/components/meritum/`, potem darmowe bloki shadcnblocks (`@shadcnblocks/<nazwa>`, nigdy Pro ani klucz licencyjny), ReUI (`@reui/<nazwa>`), Origin UI (`@originui/<nazwa>`), na końcu zwykły shadcn/ui. Wygląd i teksty zawsze z design systemu Meritum.

The registry needs `"@shadcnblocks": "https://www.shadcnblocks.com/r/{style}/{name}"` under
`registries` in `components.json`; add it in the PR that installs the first block. Free blocks
need no key. Pro blocks need the object form with the header
`"Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}"` and the key in your local environment,
never in the repo.

A block lands outside `src/components/ui/`, so it is app code: it passes every check in
`docs/architecture.md` (JSDoc with `@feature`, constants in `constants.ts`, 250 lines, Biome).

## Mandatory design skills

Load these skills on every task in this repo. On a task that changes what the user sees, load
them after `meritum-ui`. Precedence: the user's instructions, then the Meritum design system,
then these skills.

| Skill                   | When                            | Install                                                    |
| ----------------------- | ------------------------------- | ---------------------------------------------------------- |
| `frontend-design`       | every task                      | `npx skills add anthropics/skills --skill frontend-design` |
| `design-taste-frontend` | every task                      | `npx skills add Leonxlnx/taste-skill`                      |
| `emil-design-eng`       | every task                      | `npx skills add emilkowalski/skills`                       |
| `animate`               | the task adds or changes motion | `npx skills add emilkowalski/skills`                       |
| `review-animations`     | the task adds or changes motion | `npx skills add emilkowalski/skills`                       |
| `impeccable`            | every task                      | `npx skills add pbakaus/impeccable`                        |

Install a missing skill with the command in its row before you start. List every mandatory
skill for the task in the PR description, under „Jak sprawdzone”, with one line on how you
applied it.
