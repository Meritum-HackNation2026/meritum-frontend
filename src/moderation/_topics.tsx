import { type ChangeEvent, type FormEvent, useCallback, useId, useState } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminSection, Field, type Notice, refusalText, tableClass } from './_admin-parts'
import { MAX_TOPIC_CHARS } from './constants'
import type { AdminApi, RiskTopic } from './ports'

const copy = t.staff.admin.topics
const byName = (a: RiskTopic, b: RiskTopic) => a.name.localeCompare(b.name)

// The keywords typed in one field: split at commas, trimmed, blanks dropped.
const keywordsOf = (text: string) =>
  text
    .split(',')
    .map((word) => word.trim())
    .filter((word) => word !== '')

function TopicRow({ name, keywords, onRemove }: RiskTopic & { onRemove: (n: string) => void }) {
  const remove = useCallback(() => onRemove(name), [onRemove, name])
  const nameId = useId()
  return (
    <tr className={tableClass.row}>
      <td id={nameId} className={`${tableClass.td} font-semibold`}>
        {name}
      </td>
      <td className={`${tableClass.td} text-pretty`}>{keywords.join(', ')}</td>
      <td className="py-1 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-pill"
          aria-describedby={nameId}
          onClick={remove}
        >
          {copy.remove}
        </Button>
      </td>
    </tr>
  )
}

function TopicList(props: { topics: RiskTopic[]; onRemove: (name: string) => void }) {
  if (props.topics.length === 0) {
    return <p className={tableClass.empty}>{copy.empty}</p>
  }
  return (
    <div className={tableClass.wrap}>
      <table className={tableClass.table}>
        <thead>
          <tr className={tableClass.head}>
            <th scope="col" className={tableClass.th}>
              {copy.name}
            </th>
            <th scope="col" className={tableClass.th}>
              {copy.keywords}
            </th>
          </tr>
        </thead>
        <tbody>
          {props.topics.map((topic) => (
            <TopicRow key={topic.name} {...topic} onRemove={props.onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// The add form: a name and comma-separated keywords; clears itself once onAdd saved the topic.
function TopicForm({ onAdd }: { onAdd: (topic: RiskTopic) => Promise<boolean> }) {
  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState('')
  const nameId = useId()
  const keywordsId = useId()
  const hintId = useId()
  const editName = useCallback((e: ChangeEvent<HTMLInputElement>) => setName(e.target.value), [])
  const editKeywords = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setKeywords(e.target.value),
    [],
  )
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (await onAdd({ name: name.trim(), keywords: keywordsOf(keywords) })) {
        setName('')
        setKeywords('')
      }
    },
    [onAdd, name, keywords],
  )
  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      <Field id={nameId} label={copy.name}>
        <Input
          id={nameId}
          maxLength={MAX_TOPIC_CHARS}
          value={name}
          onChange={editName}
          className={tableClass.input}
        />
      </Field>
      <Field id={keywordsId} label={copy.keywords} hint={copy.keywords_hint} hintId={hintId}>
        <Input
          id={keywordsId}
          aria-describedby={hintId}
          value={keywords}
          onChange={editKeywords}
          className={tableClass.input}
        />
      </Field>
      <Button type="submit" size="lg" className="h-11 justify-self-start rounded-pill">
        {copy.add}
      </Button>
    </form>
  )
}

/**
 * „Tematy wysokiego ryzyka”: the administrator's topic list with its fallback keywords
 * (ADR-35), a remove button per topic and a form that adds one; a topic with the name of a
 * listed one replaces it, as the API does.
 *
 * @param props.api - The administration API.
 * @param props.initial - The topics from the loader; null when the API did not give them.
 * @returns The section.
 * @feature US-MOD-05, F-20, F-25
 */
export function TopicsSection({ api, initial }: { api: AdminApi; initial: RiskTopic[] | null }) {
  const [topics, setTopics] = useState(initial)
  const [notice, setNotice] = useState<Notice>(null)
  const add = useCallback(
    async (topic: RiskTopic) => {
      const isComplete = topic.name !== '' && topic.keywords.length > 0
      const outcome = isComplete ? await api.saveTopic(topic) : 'invalid'
      if (outcome !== 'saved') {
        setNotice({ kind: 'error', text: refusalText(outcome, copy.keywords_hint) })
        return false
      }
      setTopics((list) =>
        [...(list ?? []).filter((x) => x.name !== topic.name), topic].sort(byName),
      )
      setNotice({ kind: 'done', text: fill(copy.added, { topic: topic.name }) })
      return true
    },
    [api],
  )
  const remove = useCallback(
    async (removed: string) => {
      const outcome = await api.deleteTopic(removed)
      if (outcome !== 'saved') {
        return setNotice({ kind: 'error', text: refusalText(outcome, t.errors.offline) })
      }
      setTopics((list) => (list ?? []).filter((x) => x.name !== removed))
      setNotice({ kind: 'done', text: fill(copy.removed, { topic: removed }) })
    },
    [api],
  )
  return (
    <AdminSection title={copy.title} lead={copy.lead} notice={notice}>
      {topics === null ? (
        <p className="text-body">{t.errors.offline}</p>
      ) : (
        <>
          <TopicList topics={topics} onRemove={remove} />
          <TopicForm onAdd={add} />
        </>
      )}
    </AdminSection>
  )
}
