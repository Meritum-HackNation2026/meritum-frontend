const leadingHash = /^#/

/**
 * The case number as it stands in a panel address: `#S-4` is `/panel/sprawy/S-4`, because a `#`
 * in a path would start the fragment.
 *
 * @param caseId - The case id, e.g. `#S-4`.
 * @returns The path segment, e.g. `S-4`.
 * @feature US-MOD-01, F-25
 */
export function caseParam(caseId: string): string {
  return caseId.replace(leadingHash, '')
}

/**
 * The case id a panel address names: `S-4` from `/panel/sprawy/S-4` is `#S-4`.
 *
 * @param param - The path segment.
 * @returns The case id.
 * @feature US-MOD-01, F-25
 */
export function caseIdOf(param: string): string {
  return `#${caseParam(param)}`
}
