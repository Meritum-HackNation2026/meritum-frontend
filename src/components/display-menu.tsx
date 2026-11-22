import { ALargeSmallIcon } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import pl from '@/copy/pl.json'

// The keys and values are read again before the first paint by the script in index.html.
const themeKey = 'meritum-theme'
const textKey = 'meritum-text'
const themes = ['light', 'dark', 'contrast'] as const
const sizes = ['m', 'l', 'xl', 'xxl'] as const
const root = document.documentElement

/** The theme <html> shows now: a stored choice, or the system's, as the head script set it. */
function currentTheme(): string {
  if (!root.classList.contains('dark')) {
    return 'light'
  }
  const contrast = root.dataset['contrast']
  const more = contrast ? contrast === 'more' : matchMedia('(prefers-contrast: more)').matches
  return more ? 'contrast' : 'dark'
}

/** Stores a choice; a private window or blocked storage keeps it for this page only. */
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // the choice still applies to this page
  }
}

/** Sets the theme on <html>; data-contrast marks it as chosen, so the system no longer wins. */
function applyTheme(theme: string) {
  root.classList.toggle('dark', theme !== 'light')
  root.dataset['contrast'] = theme === 'contrast' ? 'more' : 'normal'
  save(themeKey, theme)
}

/** Sets the text size on <html> (tokens/display.css); the default size has no attribute. */
function applyText(size: string) {
  if (size === 'm') {
    root.removeAttribute('data-text')
  } else {
    root.dataset['text'] = size
  }
  save(textKey, size)
}

/** Keeps the menu open after a size pick, so the person sees the effect. */
function keepOpen(event: Event) {
  event.preventDefault()
}

/**
 * „Wygląd” in the bar (DESIGN_SYSTEM.md 10): the theme (light, dark, dark high contrast) and the
 * text size (100, 112.5, 125, 150%) as two radio groups that announce the current choice. Both
 * are stored in the browser; picking a size leaves the menu open, so the person sees the effect.
 *
 * @returns The menu button with its menu.
 * @feature US-DST-01, F-01
 */
export function DisplayMenu() {
  const [theme, setTheme] = useState(currentTheme)
  const [size, setSize] = useState(() => root.dataset['text'] ?? 'm')
  const themeTitle = useId()
  const textTitle = useId()
  // the system may have changed the theme since the last time the menu was open
  const refresh = useCallback((open: boolean) => open && setTheme(currentTheme()), [])
  const pickTheme = useCallback((value: string) => {
    applyTheme(value)
    setTheme(value)
  }, [])
  const pickSize = useCallback((value: string) => {
    applyText(value)
    setSize(value)
  }, [])
  return (
    <DropdownMenu onOpenChange={refresh}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={pl.display.label}
          className="rounded-pill text-muted-foreground"
        >
          <ALargeSmallIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-w-(--radix-dropdown-menu-content-available-width)"
      >
        <DropdownMenuLabel id={themeTitle}>{pl.display.theme_title}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-labelledby={themeTitle}
          value={theme}
          onValueChange={pickTheme}
        >
          {themes.map((id) => (
            <DropdownMenuRadioItem key={id} value={id} className="min-h-9 text-small">
              {pl.display.theme[id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel id={textTitle}>{pl.display.text_title}</DropdownMenuLabel>
        <DropdownMenuRadioGroup aria-labelledby={textTitle} value={size} onValueChange={pickSize}>
          {sizes.map((id) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              onSelect={keepOpen}
              className="min-h-9 text-small"
            >
              {pl.display.text[id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
