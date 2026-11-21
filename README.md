# meritum-frontend

Aplikacja webowa Meritum: React, TypeScript, Vite, Tailwind CSS v4, Biome, pnpm. W produkcji to statyczny build w kontenerze nginx, który przekazuje `/api` do [meritum-backend](https://github.com/Meritum-HackNation2026/meritum-backend) tego samego środowiska, więc front i API mają jeden adres i nie potrzebują CORS.

| Środowisko | Gałąź | Adres | Kontener | `/api` trafia do |
| --- | --- | --- | --- | --- |
| dev | `develop` | https://meritum-dev.gburek.app | `meritum-web-dev` | `meritum-api-dev:8000` |
| prd | `main` | https://meritum.gburek.app | `meritum-web-prd` | `meritum-api-prd:8000` |

Droga żądania: Cloudflare → tunel na dellpromaxgb10 → `meritum-gateway` (nginx platformy, `172.17.0.1:18095`) → `meritum-web-<env>:8080` → dla `/api/*` dalej do API.

## Praca lokalna

```bash
pnpm install
pnpm dev          # http://localhost:5173, /api idzie do backendu na :8000
pnpm check        # Biome
pnpm build        # tsc + vite build -> dist/
```

Obraz lokalnie: `docker build -t meritum-web .`, potem `docker run -p 8080:8080 -e API_UPSTREAM=host.docker.internal:8000 meritum-web` (nginx rozwiązuje nazwę przez DNS Dockera, więc poza siecią Dockera `/api` nie zadziała; do pracy nad UI wystarczy `pnpm dev`).

Konfiguracja nginx: `deploy/nginx.conf.template` (SPA z fallbackiem na `index.html`, długi cache dla `/assets/`, `/healthz`).

## CI/CD

`.github/workflows/ci.yml`: `verify` (Biome, typy, build) na runnerach GCP, `deploy` na `dellpromaxgb10` tylko z `develop` i `main`, po zielonym `verify`. `deploy/deploy.sh` buduje obraz na hoście, podmienia kontener i sprawdza stronę przez gateway. Krok „Public check” sprawdza adres publiczny i ostrzega, gdy trasy w Cloudflare jeszcze nie ma.

Zasady gałęzi: PR do `develop`, potem `develop` → `main`, bez bezpośrednich pushy (plan Free nie wymusza ochrony w repozytoriach prywatnych).
