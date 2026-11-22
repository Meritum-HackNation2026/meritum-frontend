# meritum-frontend

Aplikacja webowa Meritum: React, TypeScript, Vite, TanStack Router i Query, shadcn/ui (Radix), Tailwind CSS v4, Biome, pnpm. Wygląd pochodzi z design systemu: tokeny `src/styles/meritum.css` to kopia `design-system/tokens/meritum.css` (tryb ciemny włącza klasa `dark` według ustawienia systemu), kroje Archivo i Azeret Mono są dołączone do builda (bez Google Fonts), a komponenty w `src/components/meritum/` to kopie z `design-system/components/meritum/` (zob. „Kopie z design systemu”). W produkcji to statyczny build w kontenerze nginx, który przekazuje `/api` do [meritum-backend](https://github.com/Meritum-HackNation2026/meritum-backend) tego samego środowiska, więc front i API mają jeden adres i nie potrzebują CORS.

| Środowisko | Gałąź     | Adres                          | Kontener          | `/api` trafia do       |
| ---------- | --------- | ------------------------------ | ----------------- | ---------------------- |
| dev        | `develop` | https://meritum-dev.gburek.app | `meritum-web-dev` | `meritum-api-dev:8000` |
| prd        | `main`    | https://meritum.gburek.app     | `meritum-web-prd` | `meritum-api-prd:8000` |

Droga żądania: Cloudflare → tunel na dellpromaxgb10 → `meritum-gateway` (nginx platformy, `172.17.0.1:18095`) → `meritum-web-<env>:8080` → dla `/api/*` dalej do API.

## Praca lokalna

```bash
pnpm install
pnpm dev          # http://localhost:5173, /api idzie do backendu na :8000
API_PROXY=https://meritum-dev.gburek.app pnpm dev   # to samo na żywym API dev, bez lokalnego backendu
pnpm check        # Biome
pnpm test && pnpm depcruise && pnpm knip   # architektura, granice importów, martwy kod
pnpm build        # tsc + vite build -> dist/
```

Zasady architektury i to, co je sprawdza: [docs/architecture.md](docs/architecture.md).

Obraz lokalnie: `docker build -t meritum-web .`, potem `docker run -p 8080:8080 -e API_UPSTREAM=host.docker.internal:8000 meritum-web` (nginx rozwiązuje nazwę przez DNS Dockera, więc poza siecią Dockera `/api` nie zadziała; do pracy nad UI wystarczy `pnpm dev`).

Trasy są w `src/routes/` (TanStack Router, trasy w plikach); `src/routeTree.gen.ts` generuje plugin Vite i jest commitowany. Komponenty shadcn dodaje się przez `pnpm dlx shadcn@latest add <nazwa>`, lista potrzebnych jest w `design-system/components/meritum/README.md`.

Konfiguracja nginx: `deploy/nginx.conf.template` (SPA z fallbackiem na `index.html`, długi cache dla `/assets/`, `/healthz`).

## Klient API

Typy API pochodzą ze schematu OpenAPI meritum-backend: `src/api/openapi.json` to kopia schematu z gałęzi `develop` backendu, a `src/api/_openapi.gen.ts` generuje z niej [openapi-typescript](https://openapi-ts.dev/). Schemat bierzemy z kodu backendu (`create_app().openapi()` przez `uv`), nie z działającego serwera.

```bash
pnpm openapi                 # schemat z develop backendu i nowe typy (potrzebne gh, git, uv)
pnpm openapi <ref>           # inna gałąź, tag albo commit backendu
pnpm openapi --types-only    # tylko typy z zapisanego schematu
```

`pnpm test` (`tests/api/openapi.test.ts`) generuje typy z zapisanego schematu i porównuje je z plikiem w repo, więc CI odrzuca ręczną zmianę typów albo schemat bez nowych typów, bez kontaktu z backendem. openapi-typescript potrzebuje API kompilatora TypeScript 5, którego TypeScript 7 jeszcze nie ma, dlatego `pnpm-workspace.yaml` daje mu własny TypeScript 5.9.3.

Adaptery w `src/api` wołają REST przez klienta [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) (`fetchClient`), więc ścieżki, parametry i ciała żądań sprawdza `tsc`. Ekrany, które czytają API wprost z komponentu (np. przyszły panel moderatora), używają hooków [openapi-react-query](https://openapi-ts.dev/openapi-react-query/) z `meritumQueries` (`useQuery`, `useMutation`, `queryOptions`); modele backendu są w typie `ApiSchemas`. Strumienie SSE (postęp sprawdzenia, powiadomienia) zostają na `EventSource`. Powiadomień i podsumowania ewaluacji nie ma jeszcze w schemacie `develop` backendu, więc te adaptery zostają na zwykłym `fetch`, dopóki ich trasy nie trafią do schematu.

Zapytanie z formularza sprawdza przed wysłaniem schemat [zod](https://zod.dev/) (`validateCheck` w `src/checks`), z tymi samymi limitami co kontrakt; odmowa to klucz `errors` z `copy/pl.json`. Stan po stronie klienta trzymamy w [zustand](https://zustand.docs.pmnd.rs/), tabele budujemy na [TanStack Table](https://tanstack.com/table) v9; przykład obu z hookiem `meritumQueries` jest w `tests/api/queries.test.tsx`, a pierwsze prawdziwe użycie będzie w panelu moderatora.

## Źródła komponentów

Komponentu szukamy w tej kolejności i bierzemy z pierwszego źródła, które go ma:

1. komponenty Meritum w `src/components/meritum/` (kopie z design systemu, np. `CheckForm`, `ResultCard`),
2. darmowe bloki [shadcnblocks](https://www.shadcnblocks.com) (`@shadcnblocks/<nazwa>`), nigdy bloki Pro ani klucz licencyjny (repozytorium jest publiczne),
3. [ReUI](https://reui.io) (`@reui/<nazwa>`),
4. [Origin UI](https://coss.com/origin) (`@originui/<nazwa>`),
5. zwykły [shadcn/ui](https://ui.shadcn.com) (`pnpm dlx shadcn@latest add <nazwa>`).

Rejestry są w `components.json` (`registries`), więc wystarczy `pnpm dlx shadcn@latest add @reui/<nazwa>`. Wygląd i teksty zawsze pochodzą z design systemu Meritum: blok po dodaniu przechodzi na tokeny, kroje i teksty z `copy/pl.json`. Blok z rejestru to kod z cudzego serwera: jego diff przeglądamy jak każdy inny kod.

## Testy komponentów

`pnpm test` to `node --test` na `tests/**/*.test.{ts,tsx}`. Pliki TSX ładuje `tsx` (ustawienia `jsx` i aliasu `@/` bierze z `tsconfig.test.json`), a `tests/setup-dom.ts` daje każdemu plikowi DOM z happy-dom i po każdym teście odmontowuje to, co test wyrenderował. `tsc -b` (w `pnpm build`) sprawdza typy testów TSX.

Test komponentu leży w `tests/` w tej samej ścieżce co komponent w `src/` (`tests/<domena>/<komponent>.test.tsx`, np. `tests/components/meritum/meritum-mark.test.tsx`), renderuje komponent przez `@testing-library/react` i szuka elementów tak jak czytelnik: po roli i po tekście z `src/copy/pl.json` (`import pl from '@/copy/pl.json'`).

```tsx
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen } from '@testing-library/react'
import { MeritumLabel } from '@/components/meritum/meritum-mark'
import { Button } from '@/components/ui/button'
import pl from '@/copy/pl.json'

test('the Meritum label shows its name as text and hides the mark from screen readers', () => {
  render(<MeritumLabel />)
  const mark = screen.getByText(pl.brand.name).querySelector('svg')
  assert.equal(mark?.getAttribute('aria-hidden'), 'true')
})

test('a button holding the Meritum label is named by the label text', () => {
  render(
    <Button>
      <MeritumLabel />
    </Button>,
  )
  assert.equal(screen.getAllByRole('button', { name: pl.brand.name }).length, 1)
})
```

W asercjach porównuj tekst, liczby albo wartości logiczne, nie elementy DOM: gdy `assert.equal(element, null)` nie przejdzie, Node próbuje wypisać cały obiekt happy-dom i test wisi zamiast się wywrócić. Kontrole architektury (JSDoc z `@feature`, stałe w `constants.ts`, 250 linii) obejmują też pliki w `tests/`. Skrypt ustawia zmienną `TSX_TSCONFIG_PATH` w składni powłoki POSIX (Linux, macOS). Testy e2e w przeglądarce nie trafiają do CI: uruchamia się je ręcznie albo lokalnym skryptem.

## Kopie z design systemu

Typy API, teksty, komponenty i tokeny bierzemy z [meritum-design-system](https://github.com/Meritum-HackNation2026/meritum-design-system), a kontrakty trafiają tam z meritum-core, jedynego źródła prawdy (ADR-02, ADR-33). Kopie w tym repo:

| Kopia                                                              | Źródło                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `src/contracts/meritum.ts`, `meritum.schema.json`, `examples.json` | `contracts/` design systemu                                     |
| `src/copy/pl.json`                                                 | `copy/pl.json`                                                  |
| `src/components/meritum/`                                          | `components/meritum/`                                           |
| `src/styles/meritum.css`                                           | `tokens/meritum.css`                                            |
| `src/contracts/catalog.json`                                       | `catalog/catalog.json` w meritum-core (eksport katalogu źródeł) |

Nie edytujemy ich tutaj: poprawki idą do design systemu (albo do core), potem:

```bash
pnpm sync                       # main design systemu i core
pnpm sync <ref> [<core-ref>]    # inna gałąź, tag albo commit
pnpm build                      # tsc pokaże miejsca do dostosowania po nowej wersji kontraktu
```

`scripts/sync.sh` potrzebuje `gh` z dostępem do obu repozytoriów. Najpierw pobiera wszystko do katalogu tymczasowego, więc nieudane wywołanie `gh` kończy skrypt błędem i zostawia kopie bez zmian. Zapisuje `SOURCE` (commity źródłowe) i `SHA256SUMS`. `pnpm test` (`tests/synced-copies.test.ts`) sprawdza sumy bez sieci, więc CI odrzuca ręczną zmianę albo usunięcie kopii i plik dodany do tych katalogów, podając jego nazwę; `tests/sync-script.test.ts` uruchamia skrypt na udawanym `gh`. Biome, knip i testy architektury pomijają kopie, a dependency-cruiser traktuje `src/contracts/` i `src/copy/` jak wspólne foldery, nie domeny. Dopóki meritum-core nie ma `catalog/catalog.json` (meritum-core#22), skrypt pomija ten plik z ostrzeżeniem.

## CI/CD

`.github/workflows/ci.yml`: `verify` (Biome, typy, build) na runnerach GCP, `deploy` na `dellpromaxgb10` tylko z `develop` i `main`, po zielonym `verify`. `deploy/deploy.sh` buduje obraz na hoście, podmienia kontener i sprawdza stronę przez gateway. Krok „Public check” sprawdza adres publiczny i ostrzega, gdy trasy w Cloudflare jeszcze nie ma.

Zasady gałęzi: PR do `develop`, potem `develop` → `main`, bez bezpośrednich pushy (plan Free nie wymusza ochrony w repozytoriach prywatnych).
