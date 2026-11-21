# Architektura i jej strażnicy

Zasady są w skillu `meritum-architecture` w monorepo (`.claude/skills/meritum-architecture/SKILL.md`). Tu jest tylko to, co je egzekwuje w tym repo. Wszystko działa lokalnie i w CI (`.github/workflows/ci.yml`, job `verify`).

| Zasada                              | Kontrola                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| wycinki domenowe, prywatne `_pliki` | `.dependency-cruiser.cjs` (`pnpm depcruise`): `no-deep-domain-import` (inna domena tylko przez jej `index.ts`), `no-private-import` (`_plik.ts` tylko z własnego folderu), `no-circular`                                                                                             |
| heksagonalna                        | `.dependency-cruiser.cjs`: `domain-without-frameworks` (kod domeny nie importuje Reacta, TanStack ani Radix), `adapters-only-from-factory`; co jest okablowaniem, mówi `repo.wiring`                                                                                                 |
| lintery na pełną moc                | Biome: `recommended` plus wszystkie reguły `complexity`, `performance` i `security`, `noNestedTernary` i kilka innych z `style`/`suspicious`; `tsc` z `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature` |
| JSDoc z funkcjami produktu          | `tests/architecture/jsdoc.test.ts` (`pnpm test`): każdy `export` w `src/` i `tests/` ma JSDoc z `@feature US-XXX-00` (albo `F-00`, `ADR-00`, `none (infrastructure)`), a funkcja `@param`, `@returns` (chyba że zwraca `void`) i `@throws`, gdy rzuca                                |
| najwyżej 250 linii na plik          | `tests/architecture/file-length.test.ts` (`.ts`, `.tsx`, `.js`, `.css` w całym repo)                                                                                                                                                                                                 |
| stałe                               | `tests/architecture/constants.test.ts`: `const UPPER_CASE` tylko w `constants.ts`, każda z JSDoc                                                                                                                                                                                     |
| typy                                | `tsc` strict, Biome `noExplicitAny`                                                                                                                                                                                                                                                  |
| złożoność                           | Biome `noExcessiveCognitiveComplexity` (15) i reszta grupy `complexity`; `noNestedTernary` wymusza nazwane warunki                                                                                                                                                                   |
| martwy kod                          | `knip` (`knip.jsonc`)                                                                                                                                                                                                                                                                |
| bezpieczeństwo                      | Biome, grupa `security` (w tym `noSecrets`)                                                                                                                                                                                                                                          |

Testy architektury czytają kod liniami, nie parserem (TypeScript 7.0 nie ma jeszcze stabilnego API kompilatora), więc polegają na formatowaniu Biome: deklaracje najwyższego poziomu zaczynają się w kolumnie 0. Ustawienia repo (foldery, wykluczenia) są w `tests/architecture/settings.ts`; reszta plików w `tests/architecture/` jest taka sama w meritum-frontend, meritum-extension i meritum-mocks.

`complexity/useLiteralKeys` jest wyłączone, bo kłóci się z `noPropertyAccessFromIndexSignature` w `tsc` (`process.env['X']`). dependency-cruiser czyta TypeScript przez `@swc/core` (`parser: 'swc'`), bo nie obsługuje TypeScriptu 7.0.

## Wyjątki

Wąsko i z powodem: `// biome-ignore lint/<grupa>/<reguła>: <powód>` w linii, wpis w `excluded` w `tests/architecture/settings.ts` albo w `knip.jsonc` / `.dependency-cruiser.cjs` z komentarzem.

Obecne wyjątki:

- `src/routeTree.gen.ts` (generowany), `src/components/ui/` (shadcn), `src/styles/meritum.css`, `src/components/meritum/`, `src/contracts/` i `src/copy/` (kopie z `pnpm sync`: JSDoc z `@feature` trzeba dodać w design systemie) są poza testami architektury, Biome i knipem (`src/copy/` to sam JSON, knip go nie czyta); dependency-cruiser traktuje `src/contracts/` i `src/copy/` jak wspólne foldery (`notDomains`), nie domeny;
- `src/api/` to klient HTTP backendu, czyli adapter: może używać TanStack Query;
- widoki domeny w React (`src/checks/_*.tsx`: formularz `_check-page.tsx` i pasek postępu `_check-progress.tsx`) to okablowanie UI: mogą importować Reacta; pliki `.ts` w `src/checks/` dalej nie mogą;
- `performance/noBarrelFile` jest wyłączone dla `src/lib/utils.ts` (alias `cn` z shadcn) i `src/*/index.ts` (publiczne API domeny);
- knip pomija zależności komponentów shadcn (`class-variance-authority`, `lucide-react`, `radix-ui`) i `@swc/core` (parser dependency-cruisera); `pnpm-workspace.yaml` nie pozwala `@swc/core` ani `esbuild` (używa go `tsx` w `pnpm test`) uruchamiać skryptu instalacyjnego (binarki przychodzą z pakietów platformy).

Testy architektury to `node --test` (Node 26 uruchamia TypeScript bez kompilacji, bez nowego frameworka testowego). Testy komponentów w TSX ładuje `tsx` z DOM-em z happy-dom (`tests/setup-dom.ts`, opis w README).
