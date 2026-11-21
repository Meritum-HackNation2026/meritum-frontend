import pl from "@/copy/pl.json"

/** UI strings from copy/pl.json; keys mirror the contract codes. */
export const t = pl

/** Fills `{name}` placeholders; an unknown name stays visible so a missing value shows up in review. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

const DATE = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" })

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso))
}
