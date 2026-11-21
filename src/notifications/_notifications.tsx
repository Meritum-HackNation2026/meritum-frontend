import { useRouter } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from 'react'
import { Toaster, toast } from 'sonner'
import { fill, formatDate, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Notification } from '@/contracts/meritum'
import type { Inbox } from './_inbox'
import { notificationText } from './_parse'
import { NOTIFICATION_RETENTION_DAYS } from './constants'

const copy = t.notifications
const toastOptions = { style: { transitionTimingFunction: 'var(--ease-out-meritum)' } }

const progressToastId = ({ kind, check_id: checkId }: Notification) =>
  kind === 'check_progress' && checkId ? `check_progress:${checkId}` : null
const linkStyle =
  'rounded-md underline-offset-3 hover:underline focus-visible:outline-2 focus-visible:outline-ring'

/** The notification's text as a link into the app; opening it marks it as read. */
function NotificationLink({
  notification,
  inbox,
  onOpened,
}: {
  notification: Notification
  inbox: Inbox
  onOpened: () => void
}) {
  const router = useRouter()
  const { id, link } = notification
  const open = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      inbox.markRead(id)
      onOpened()
      const opensElsewhere = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey
      if (!opensElsewhere) {
        event.preventDefault()
        router.navigate({ href: link })
      }
    },
    [inbox, id, link, onOpened, router],
  )
  return (
    <a href={link} onClick={open} className={linkStyle}>
      {notificationText(notification)}
    </a>
  )
}

/** The toast of one new notification; following its link closes it. */
function NotificationToast({
  toastId,
  notification,
  inbox,
}: {
  toastId: string | number
  notification: Notification
  inbox: Inbox
}) {
  const dismiss = useCallback(() => toast.dismiss(toastId), [toastId])
  return (
    <div className="w-full rounded-xl border bg-popover p-3 text-body text-popover-foreground shadow-float">
      <NotificationLink notification={notification} inbox={inbox} onOpened={dismiss} />
    </div>
  )
}

/** One inbox row: the link, its status as a word, the date and „Oznacz jako przeczytane”. */
function InboxItem({
  notification,
  inbox,
  onOpened,
}: {
  notification: Notification
  inbox: Inbox
  onOpened: () => void
}) {
  const isUnread = notification.status !== 'read'
  const markRead = useCallback(() => inbox.markRead(notification.id), [inbox, notification.id])
  return (
    <li className="grid gap-1 border-b py-2.5 last:border-b-0">
      <span className={isUnread ? 'font-semibold' : undefined}>
        <NotificationLink notification={notification} inbox={inbox} onOpened={onOpened} />
      </span>
      <span className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
        <span>{isUnread ? copy.status.unread : copy.status.read}</span>
        <time className="font-mono" dateTime={notification.created_at}>
          {formatDate(notification.created_at)}
        </time>
        {isUnread && (
          <Button size="xs" variant="ghost" className="rounded-pill" onClick={markRead}>
            {copy.mark_read}
          </Button>
        )}
      </span>
    </li>
  )
}

/**
 * Notifications of the web app and the moderator panel (DESIGN_SYSTEM.md 6.6): each new one
 * shows at once as a Sonner toast in the corner, without red; one nobody acted on stays unread
 * in the inbox under the bell, which counts the unread ones and states the retention.
 *
 * @param props.inbox - The session's inbox (`createInbox` over the API adapter).
 * @returns The bell with the inbox popover and the toaster.
 * @feature US-POW-01, US-POW-04, F-26
 */
export function Notifications({ inbox }: { inbox: Inbox }) {
  const items = useSyncExternalStore(inbox.subscribe, inbox.items)
  const unread = inbox.unread()
  const [isOpen, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const titleId = useId()
  const unreadText = fill(copy.unread, { count: unread })

  useEffect(() => {
    const showToast = (notification: Notification) =>
      toast.custom(
        (id) => <NotificationToast toastId={id} notification={notification} inbox={inbox} />,
        // Progress of one check updates a single toast instead of stacking a new one per step.
        { id: progressToastId(notification) ?? notification.id },
      )
    return inbox.connect(showToast).close
  }, [inbox])

  return (
    <>
      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative ml-auto rounded-pill">
            <Bell aria-hidden="true" />
            <span className="sr-only">{copy.title}</span>
            <span className="sr-only">{unreadText}</span>
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 min-w-5 rounded-pill bg-foreground px-1 font-mono text-meta text-background"
              >
                {unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" aria-labelledby={titleId} className="rounded-xl shadow-float">
          <h2 id={titleId} className="text-body font-semibold">
            {copy.title}
          </h2>
          <p className="text-small text-muted-foreground">{unreadText}</p>
          {items.length === 0 ? (
            <p className="text-small">{copy.empty}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto text-body">
              {items.map((item) => (
                <InboxItem key={item.id} notification={item} inbox={inbox} onOpened={close} />
              ))}
            </ul>
          )}
          <p className="text-small text-muted-foreground">
            {fill(copy.retention, { days: NOTIFICATION_RETENTION_DAYS })}
          </p>
        </PopoverContent>
      </Popover>
      <Toaster theme="system" containerAriaLabel={copy.title} toastOptions={toastOptions} />
    </>
  )
}
