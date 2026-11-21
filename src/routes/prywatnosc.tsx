import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * Privacy policy for end users, based on docs/prywatnosc.md in meritum-docs; the
 * OAuth consent screen of Google sign-in links here.
 *
 * @feature ADR-13, ADR-14, US-SPR-10
 */
export const Route = createFileRoute('/prywatnosc')({ component: Privacy })

const processors: [string, string, string][] = [
  [
    'Cloudflare',
    'USA',
    'całe żądania i odpowiedzi, w tym treść pytań i adresy IP, bo pośredniczy w połączeniu',
  ],
  [
    'Google Cloud, Vertex AI',
    'region UE',
    'pytanie z ukrytymi danymi osobowymi, fragmenty źródeł, odpowiedzi modelu',
  ],
  ['Google Sensitive Data Protection', 'UE', 'pytanie, zanim ukryjemy w nim dane osobowe'],
  [
    'Vertex AI Search',
    'lokalizacja globalna, poza UE',
    'zapytania zbudowane z twierdzeń bez danych osobowych',
  ],
  ['Google Fact Check Tools API', 'region nie jest podany', 'zapytania z twierdzeniami'],
  [
    'Google i Microsoft (logowanie)',
    'USA',
    'imię i nazwisko, adres e-mail i identyfikator konta, tylko gdy się logujesz',
  ],
  ['Discord', 'USA', 'nazwa i identyfikator użytkownika, wiadomości do bota i odpowiedzi'],
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-body font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-body">{children}</div>
    </section>
  )
}

function Privacy() {
  return (
    <article className="rounded-lg border bg-card p-6">
      <h1 className="text-title font-semibold">Polityka prywatności</h1>
      <p className="mt-2 text-body text-muted-foreground">
        Meritum zbiera jak najmniej danych osobowych. Tu piszemy, co przetwarzamy, po co, jak długo
        i gdzie.
      </p>

      <Section title="Kto przetwarza dane">
        <p>
          Meritum to projekt zespołu Meritum, zbudowany na hackathonie HackNation 2026. Pytania o
          dane i prośby o ich usunięcie przyjmujemy przez{' '}
          <a
            className="underline underline-offset-2"
            href="https://github.com/Meritum-HackNation2026"
          >
            organizację Meritum na GitHubie
          </a>
          .
        </p>
      </Section>

      <Section title="Co dzieje się z twoim pytaniem">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Konto nie jest potrzebne. Sesja ma losowy identyfikator zapisany w przeglądarce, a
            historia rozmowy zostaje w przeglądarce do zamknięcia karty.
          </li>
          <li>
            Oczywiste dane osobowe (numery telefonów, adresy e-mail, numery PESEL) ukrywamy, zanim
            zaczniemy analizę. Ani nasz zapis, ani dostawca modelu AI nie dostają ich w jawnej
            postaci. Tak samo traktujemy pobrane strony i odpowiedzi modelu. Ukrywanie nie złapie
            wszystkiego, więc nie wpisuj w pytaniu danych, których nie chcesz nam podać.
          </li>
          <li>
            Zapis sprawdzenia zawiera pytanie z ukrytymi danymi osobowymi, czas, kanał, źródła,
            ocenę, użyte modele, region przetwarzania i koszt.
          </li>
          <li>Zapisy sprawdzeń usuwamy po 30 dniach.</li>
          <li>
            Przycisk „Usuń moje sprawdzenia” od razu usuwa zapisy twojej sesji i wszystko, co z nimi
            powiązaliśmy.
          </li>
        </ul>
      </Section>

      <Section title="Logowanie kontem Google albo Microsoft">
        <p>
          Logowanie jest dobrowolne. Gdy logujesz się kontem Google albo Microsoft, prosimy tylko o
          podstawowe dane (zakresy openid, email i profile): imię i nazwisko, adres e-mail i
          identyfikator konta u dostawcy. Nie dostajemy hasła ani dostępu do poczty, plików czy
          kontaktów.
        </p>
        <p>
          Te dane służą tylko do utrzymania sesji logowania, do zapisania historii twoich sprawdzeń
          i do nadania ról członkom zespołu (na przykład moderatorom). Nie sprzedajemy ich, nie
          używamy do reklam i nie przekazujemy nikomu poza podmiotami z tabeli niżej.
        </p>
        <p>
          Trzymamy je, dopóki masz konto. „Usuń moją historię” usuwa historię sprawdzeń, a „Usuń
          konto” usuwa konto razem z historią. Dostęp aplikacji możesz też cofnąć w ustawieniach
          konta Google albo Microsoft.
        </p>
      </Section>

      <Section title="Discord i SMS">
        <p>
          Discord przekazuje nam nazwę i identyfikator użytkownika, a SMS numer telefonu. Używamy
          ich tylko, żeby odpowiedzieć i policzyć powtórzenia. Przechowujemy je jako skrót przez 30
          dni i nie pokazujemy moderatorom. Polecenie /usun-moje-dane na Discordzie albo SMS ze
          słowem USUN usuwa zapisy twoich sprawdzeń.
        </p>
      </Section>

      <Section title="Adresy IP i statystyki">
        <p>
          Adresy IP służą tylko do limitu zapytań i ochrony przed atakami. Statystyki użycia liczymy
          wyłącznie zbiorczo, bez śledzenia pojedynczych osób.
        </p>
      </Section>

      <Section title="Gdzie przetwarzamy dane">
        <p>
          Dziś serwis działa na serwerze zespołu. Docelowo przeniesiemy go do Google Cloud w
          Warszawie (europe-central2), a modele AI będą działać w regionie UE. Część usług działa
          poza UE:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-semibold">Podmiot</th>
                <th className="py-2 pr-3 font-semibold">Kraj lub region</th>
                <th className="py-2 font-semibold">Jakie dane</th>
              </tr>
            </thead>
            <tbody>
              {processors.map(([name, region, data]) => (
                <tr className="border-b align-top" key={name}>
                  <td className="py-2 pr-3">{name}</td>
                  <td className="py-2 pr-3">{region}</td>
                  <td className="py-2">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Twoje prawa">
        <p>
          Możesz poprosić o dostęp do swoich danych, ich poprawienie albo usunięcie i możesz
          sprzeciwić się ich przetwarzaniu. Masz też prawo złożyć skargę do Prezesa Urzędu Ochrony
          Danych Osobowych.
        </p>
      </Section>
    </article>
  )
}
