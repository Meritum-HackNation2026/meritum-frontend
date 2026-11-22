import { ALargeSmallIcon, ContrastIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import pl from '@/copy/pl.json'

// The keys and values are read again before the first paint by the script in index.html.
const themeKey = 'meritum-theme'
const textKey = 'meritum-text'
const themes = ['light', 'dark', 'contrast'] as const
const sizes = ['m', 'l', 'xl', 'xxl'] as const
const root = document.documentElement
const themeIcons = { light: SunIcon, dark: MoonIcon, contrast: ContrastIcon }

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

const trigger = 'rounded-pill text-muted-foreground'
const content = 'w-64 max-w-(--radix-dropdown-menu-content-available-width)'
const item = 'min-h-9 text-small'

/**
 * „Motyw” in the bar (DESIGN_SYSTEM.md 10): light, dark or dark high contrast as a radio group
 * that announces the current choice, stored in the browser. The button's icon is the current
 * theme (sun, moon, contrast); the three icons share one cell and src/index.css fades the new one
 * in.
 *
 * @returns The theme button with its menu.
 * @feature US-DST-01, F-01
 */
export function ThemeMenu() {
  const [theme, setTheme] = useState(currentTheme)
  const title = useId()
  // the system may have changed the theme since the last time the menu was open
  const refresh = useCallback((open: boolean) => open && setTheme(currentTheme()), [])
  const pick = useCallback((value: string) => {
    applyTheme(value)
    setTheme(value)
  }, [])
  return (
    <DropdownMenu onOpenChange={refresh}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={pl.display.theme_title} className={trigger}>
          <span className="grid *:col-start-1 *:row-start-1">
            {themes.map((id) => {
              const Icon = themeIcons[id]
              return (
                <Icon
                  key={id}
                  aria-hidden="true"
                  data-theme-icon=""
                  data-current={id === theme ? '' : undefined}
                />
              )
            })}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={content}>
        <DropdownMenuLabel id={title}>{pl.display.theme_title}</DropdownMenuLabel>
        <DropdownMenuRadioGroup aria-labelledby={title} value={theme} onValueChange={pick}>
          {themes.map((id) => (
            <DropdownMenuRadioItem key={id} value={id} className={item}>
              {pl.display.theme[id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * „Rozmiar tekstu” in the bar (DESIGN_SYSTEM.md 10): 100, 112.5, 125 or 150% as a radio group
 * that announces the current choice, stored in the browser; a pick leaves the menu open, so the
 * person sees the effect.
 *
 * @returns The text size button with its menu.
 * @feature US-DST-01, F-01
 */
export function TextSizeMenu() {
  const [size, setSize] = useState(() => root.dataset['text'] ?? 'm')
  const title = useId()
  const pick = useCallback((value: string) => {
    applyText(value)
    setSize(value)
  }, [])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={pl.display.text_title} className={trigger}>
          <ALargeSmallIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={content}>
        <DropdownMenuLabel id={title}>{pl.display.text_title}</DropdownMenuLabel>
        <DropdownMenuRadioGroup aria-labelledby={title} value={size} onValueChange={pick}>
          {sizes.map((id) => (
            <DropdownMenuRadioItem key={id} value={id} onSelect={keepOpen} className={item}>
              {pl.display.text[id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
