# meritum-frontend

Aplikacja webowa Meritum: React, TypeScript, Vite, TanStack Router i Query, shadcn/ui (Radix), Tailwind CSS v4, Biome, pnpm. Wygląd pochodzi z design systemu: tokeny `src/styles/meritum.css` to kopia `design-system/tokens/meritum.css` (tryb ciemny włącza klasa `dark` według ustawienia systemu), kroje Archivo i Azeret Mono są dołączone do builda (bez Google Fonts), a znak w `src/components/meritum/` to kopia komponentu z `design-system/components/meritum/`. W produkcji to statyczny build w kontenerze nginx, który przekazuje `/api` do [meritum-backend](https://github.com/Meritum-HackNation2026/meritum-backend) tego samego środowiska, więc front i API mają jeden adres i nie potrzebują CORS.

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
pnpm build        # tsc + vite build -> dist/
```

Obraz lokalnie: `docker build -t meritum-web .`, potem `docker run -p 8080:8080 -e API_UPSTREAM=host.docker.internal:8000 meritum-web` (nginx rozwiązuje nazwę przez DNS Dockera, więc poza siecią Dockera `/api` nie zadziała; do pracy nad UI wystarczy `pnpm dev`).

Trasy są w `src/routes/` (TanStack Router, trasy w plikach); `src/routeTree.gen.ts` generuje plugin Vite i jest commitowany. Komponenty shadcn dodaje się przez `pnpm dlx shadcn@latest add <nazwa>`, lista potrzebnych jest w `design-system/components/meritum/README.md`.

Konfiguracja nginx: `deploy/nginx.conf.template` (SPA z fallbackiem na `index.html`, długi cache dla `/assets/`, `/healthz`).

## CI/CD

`.github/workflows/ci.yml`: `verify` (Biome, typy, build) na runnerach GCP, `deploy` na `dellpromaxgb10` tylko z `develop` i `main`, po zielonym `verify`. `deploy/deploy.sh` buduje obraz na hoście, podmienia kontener i sprawdza stronę przez gateway. Krok „Public check” sprawdza adres publiczny i ostrzega, gdy trasy w Cloudflare jeszcze nie ma.

Zasady gałęzi: PR do `develop`, potem `develop` → `main`, bez bezpośrednich pushy (plan Free nie wymusza ochrony w repozytoriach prywatnych).
