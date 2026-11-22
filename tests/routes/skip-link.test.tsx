/**
 * The „Przejdź do treści” link lets a keyboard user skip the header on every page (WCAG 2.4.1).
 *
 * @feature US-DST-01, F-01
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

const focusable = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex="0"]'].join(', ')

function quietApi(t: TestContext) {
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(Response.json({ detail: 'Not signed in' }, { status: 401 })),
  )
}

for (const path of ['/', '/jak-dziala', '/prywatnosc', '/panel']) {
  test(`on ${path} the first focusable element skips to the main content`, async (t) => {
    quietApi(t)
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
    })
    render(<RouterProvider router={router} />)
    await waitFor(() => assert.equal(router.state.status, 'idle'))
    const main = await screen.findByRole('main')
    const link = screen.getByRole('link', { name: pl.layout.skip_to_content })
    assert.equal(document.querySelector(focusable), link)
    assert.equal(link.getAttribute('href'), `#${main.id}`)
    assert.equal(main.getAttribute('tabindex'), '-1')
    main.focus()
    assert.equal(document.activeElement, main)
  })
}
