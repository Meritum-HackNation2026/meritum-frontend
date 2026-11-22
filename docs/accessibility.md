# Dostępność i zrozumiałość

Cel: WCAG 2.2 AA w trybie jasnym i ciemnym, od 320 px, oraz odpowiedzi zrozumiałe bez słownika
(meritum-frontend#34, US-DST-01, F-01).

## Co sprawdza automat

| Kontrola | Gdzie | Kiedy |
| --- | --- | --- |
| `pnpm a11y [adres]` | `scripts/a11y.ts`: axe (`@axe-core/playwright`) w Chromium headless, tagi `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, każda strona w trybie jasnym i ciemnym; strona wyniku dostaje sprawdzenie `c_01` z `src/contracts/examples.json` | lokalnie, nigdy w CI |
| `tests/design-tokens.test.ts` | odrzuca kolory hex i arbitralne wartości Tailwind w `src/` poza tokenami i kopiami z design systemu | `pnpm test`, w CI |
| testy komponentów | m.in. Esc w oknie „Usuń moje sprawdzenia” oddaje fokus, tytuł karty nazywa stronę | `pnpm test`, w CI |

Uruchomienie: `pnpm exec playwright install chromium` (raz), potem `pnpm dev` i `pnpm a11y`
albo `pnpm a11y https://meritum-dev.gburek.app`. Kod wyjścia 1 oznacza naruszenie.

## Audyt 2026-11-22

Środowisko dev (https://meritum-dev.gburek.app) i lokalny build z tej gałęzi, Chromium headless.

**axe:** 0 naruszeń A i AA na 10 stronach (`/`, `/jak-dziala`, `/sprawdzenie/c_01`, `/panel`,
`/panel/eval`, `/panel/administracja`, `/prywatnosc`, `/prywatnosc/sms`, `/prywatnosc/discord`,
`/prywatnosc/wtyczka`) w obu trybach. Panel sprawdzony tylko w stanie bez logowania.

**Przegląd ręczny (headless, 320 × 700, `prefers-reduced-motion: reduce`):**

- 320 px: brak poziomego przewijania na żadnej stronie.
- Język: `<html lang="pl">`.
- Klawiatura: kolejność Tab zgodna z wyglądem, każdy element ma widoczny pierścień fokusu;
  da się wysłać pytanie, przejść po wyniku i otworzyć źródło.
- Formularz: pole ma etykietę, błąd pustego pola trafia do `aria-describedby`,
  `aria-invalid="true"` i regionu `aria-live`.
- Powiadomienia: Esc zamyka i oddaje fokus przyciskowi.

**Usterki i poprawki:**

| Usterka | Kryterium | Stan |
| --- | --- | --- |
| Tytuł karty zawsze „Meritum” | 2.4.2 | poprawione: „<nagłówek h1> · Meritum” (`src/components/page-title.ts`) |
| Esc w oknie „Usuń moje sprawdzenia” gubił fokus (trafiał na `body`) | 2.4.3 | poprawione: fokus wraca do przycisku |
| Napisy w nagłówku wpisane w kodzie zamiast z `copy/pl.json` | meritum-ui 6 | poprawione (`brand.name`, `brand.subtitle`) |
| `grid-cols-[1fr_auto_auto]` w formularzu kont | meritum-ui 1 | poprawione |
| Brak linku „Przejdź do treści” | 2.4.1 | do decyzji: nagłówek ma 1-2 elementy i landmark `main`, więc kryterium jest spełnione; link wymaga nowego tekstu w `copy/pl.json` |
| Czytnik ekranu (NVDA/VoiceOver) | 4.1.2, 4.1.3 | nie zrobione: wymaga człowieka |

## Zrozumiałość odpowiedzi

Jasnopis działa jako usługa w przeglądarce, więc tę samą miarę liczymy lokalnie: FOG-PL
(wyrazy trudne to te z co najmniej 4 sylabami) i indeks Pisarka.

Próbka: 20 tekstów, które obywatel widzi w odpowiedzi: 12 wyjaśnień i ograniczeń z
`src/contracts/examples.json` oraz 8 podpowiedzi werdyktów i stanów z `copy/pl.json`
(`verdict_hint`, `status_hint`). Raport ewaluacji w meritum-worker
(`evals/reports/2026-11-22-modele.json`) nie zapisuje tekstu odpowiedzi, więc 20 odpowiedzi
modelu z ewaluacji trzeba dołożyć, gdy raport zacznie je zapisywać.

| Miara | Wynik | Odczyt |
| --- | --- | --- |
| Słowa / zdania | 200 / 30 | |
| Średnia długość zdania | 6,7 słowa | krótkie zdania |
| Wyrazy trudne | 15 % | „Konstytucja”, „publikacji”, „zatwierdzonych”, „przeszukaliśmy” |
| FOG-PL | 8,7 | lata nauki: poziom szkoły podstawowej i ponadpodstawowej |
| Pisarek | 8,2 | tekst łatwy (poniżej 10) |

Wniosek: zdania są krótkie, trudność pochodzi z kilku długich, ale potocznych słów. Nie
zmieniamy tekstów; próbkę z ewaluacji powtórzymy na prawdziwych odpowiedziach modelu.
