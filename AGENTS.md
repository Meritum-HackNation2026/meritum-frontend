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
   every text from `src/copy/pl.json`. The block keeps its structure; its colours, fonts, images
   and sample copy go.

The registry needs `"@shadcnblocks": "https://www.shadcnblocks.com/r/{style}/{name}"` under
`registries` in `components.json`; add it in the PR that installs the first block. Free blocks
need no key. Pro blocks need the object form with the header
`"Authorization": "Bearer ${SHADCNBLOCKS_API_KEY}"` and the key in your local environment,
never in the repo.

A block lands outside `src/components/ui/`, so it is app code: it passes every check in
`docs/architecture.md` (JSDoc with `@feature`, constants in `constants.ts`, 250 lines, Biome).

## Mandatory design skills

Every task in this repo loads these skills after `meritum-ui`. Precedence: the user's
instructions, then the Meritum design system, then the skills.

| Skill                   | Source               | When                            |
| ----------------------- | -------------------- | ------------------------------- |
| `frontend-design`       | anthropics/skills    | every task                      |
| `design-taste-frontend` | Leonxlnx/taste-skill | every task                      |
| `emil-design-eng`       | emilkowalski/skills  | every task                      |
| `animate`               | emilkowalski/skills  | the task adds or changes motion |
| `review-animations`     | emilkowalski/skills  | the task adds or changes motion |
| `impeccable`            | pbakaus/impeccable   | every task                      |

Name the skills you used in the PR description, under „Jak sprawdzone”.
