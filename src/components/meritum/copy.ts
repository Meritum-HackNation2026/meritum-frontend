import pl from "@/copy/pl.json"

/** UI strings from copy/pl.json; keys mirror the contract codes. */
export const t = pl

/** Fills `{name}` placeholders; an unknown name stays visible so a missing value shows up in review. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

const PLURAL = new Intl.PluralRules("pl-PL")

/** Picks the Polish plural form (`one`/`few`/`many`/`other` from copy) and fills `{count}`. */
export function plural(forms: Record<"one" | "few" | "many" | "other", string>, count: number): string {
  return fill(forms[PLURAL.select(count) as "one" | "few" | "many" | "other"], { count })
}

const DATE = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" })

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso))
}
