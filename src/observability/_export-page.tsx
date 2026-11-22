import { useCallback, useId, useState } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { EXPORT_FORMATS, EXPORT_PERIODS } from './constants'
import type { ExportApi, ExportFormat } from './ports'

const copy = t.export

// Hands the file to the browser as a download, then frees the object URL.
function save(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}

function FormatChoice(props: {
  format: ExportFormat
  checked: boolean
  onPick: (format: ExportFormat) => void
}) {
  const { format, onPick } = props
  const pick = useCallback(() => onPick(format), [format, onPick])
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors has-checked:border-foreground has-focus-visible:outline-2 has-focus-visible:outline-ring">
      <input
        type="radio"
        name="export-format"
        className="mt-1 size-4 accent-foreground"
        checked={props.checked}
        onChange={pick}
      />
      <span className="grid gap-0.5">
        <span className="text-body font-semibold">{copy.formats[format]}</span>
        <span className="text-small text-muted-foreground">{copy.format_hints[format]}</span>
      </span>
    </label>
  )
}

/**
 * The export page (US-OBS-03): the analyst picks a period and a format (JSON, CSV or STIX 2.1)
 * and downloads the file; the page says the DISARM technique codes in it still need the
 * analyst's confirmation and that it holds no identifiers. The result is announced in a status.
 *
 * @param props.api - The export API.
 * @returns The export section.
 * @feature US-OBS-03, F-36
 */
export function ExportPage(props: { api: ExportApi }) {
  const { api } = props
  const [format, setFormat] = useState<ExportFormat>('json')
  const [days, setDays] = useState(EXPORT_PERIODS[0] ?? 7)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string>()
  const periodId = useId()
  const changePeriod = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => setDays(Number(event.currentTarget.value)),
    [],
  )
  const download = useCallback(async () => {
    setPending(true)
    setNotice(copy.preparing)
    const result = await api.download(format, days)
    if (result.kind === 'done') {
      save(result.file)
      setNotice(fill(copy.done, { file: result.file.name }))
    } else {
      setNotice(result.kind === 'expired' ? t.staff.sign_in.session_expired : copy.error)
    }
    setPending(false)
  }, [api, format, days])
  return (
    <section aria-labelledby="export-title" className="grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <h2 id="export-title" className="text-title font-bold">
          {copy.title}
        </h2>
        <p className="text-body text-pretty">{copy.lead}</p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={periodId} className="text-small font-semibold">
          {copy.period}
        </label>
        <NativeSelect
          id={periodId}
          value={days}
          onChange={changePeriod}
          className="[&_select]:h-11 [&_select]:rounded-md [&_select]:text-body"
        >
          {EXPORT_PERIODS.map((period) => (
            <NativeSelectOption key={period} value={period}>
              {copy.periods[String(period) as keyof typeof copy.periods]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-small font-semibold">{copy.format}</legend>
        {EXPORT_FORMATS.map((option) => (
          <FormatChoice
            key={option}
            format={option}
            checked={format === option}
            onPick={setFormat}
          />
        ))}
      </fieldset>
      <p className="text-small text-pretty">{copy.disarm_notice}</p>
      <p className="text-small text-muted-foreground text-pretty">{copy.privacy_note}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" className="h-11 rounded-pill px-5" disabled={pending} onClick={download}>
          {copy.download}
        </Button>
        <p role="status" className="text-small empty:sr-only">
          {notice}
        </p>
      </div>
    </section>
  )
}
