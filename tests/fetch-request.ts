/**
 * Reads what an adapter passed to a mocked `fetch`: a path string (plain `fetch` calls) or the
 * `Request` built by openapi-fetch.
 *
 * @feature none (infrastructure)
 */

/**
 * The path and query of a `fetch` call's first argument, as the API sees it.
 *
 * @param input - The first argument of the mocked `fetch` call.
 * @returns The path with its query string, e.g. `/api/v1/checks/c_01`.
 * @feature none (infrastructure)
 */
export function requestPath(input: unknown): string {
  if (input instanceof Request) {
    const url = new URL(input.url)
    return `${url.pathname}${url.search}`
  }
  return String(input)
}

/**
 * The `Request` openapi-fetch handed to the mocked `fetch`.
 *
 * @param input - The first argument of the mocked `fetch` call.
 * @returns That argument as a `Request`.
 * @throws {TypeError} When the call was not made with a `Request`.
 * @feature none (infrastructure)
 */
export function sentRequest(input: unknown): Request {
  if (!(input instanceof Request)) {
    throw new TypeError(`expected a Request, got ${String(input)}`)
  }
  return input
}
