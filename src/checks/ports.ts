import type { AnalysisStatus, CheckRequest } from '@/contracts/meritum'

/**
 * Why the API refused a check: the `errors` key of copy/pl.json to show under the field.
 *
 * @feature US-SPR-01, F-01
 */
type SendError = 'rate_limited' | 'busy' | 'offline'

/**
 * What the API said about a sent check: accepted with its id, or a refusal to show.
 *
 * @feature US-SPR-01, US-SPR-02, F-01, F-09
 */
export type SendOutcome = { checkId: string } | SendError

/**
 * Sends a validated check to the verification API.
 *
 * @feature US-SPR-01, F-01, F-21
 */
export interface CheckSender {
  /**
   * Sends one check; never throws, a failure is an outcome.
   *
   * @param request - The validated check request.
   * @returns The outcome to show next to the form.
   */
  send(request: CheckRequest): Promise<SendOutcome>
}

/**
 * Streams the progress of a running check (`AnalysisStatus` events) until it ends.
 *
 * @feature US-SPR-02, F-09
 */
export interface ProgressSource {
  /**
   * Starts listening to one check; never throws.
   *
   * @param checkId - The id from the accepted check.
   * @param onStatus - Called with every status, the last one carrying the result.
   * @param onClosed - Called once when the stream ends or the connection breaks.
   * @returns Stops listening and closes the connection.
   */
  watch(
    checkId: string,
    onStatus: (status: AnalysisStatus) => void,
    onClosed: () => void,
  ): () => void
}

/**
 * Deletes this tab's check records and notifications on the server („Usuń moje sprawdzenia”).
 *
 * @feature US-BEZ-05, F-20
 */
export interface SessionEraser {
  /**
   * Asks the API to delete the session's records; never throws.
   *
   * @returns True once the API accepted the deletion, false when it could not be reached or
   * refused.
   */
  erase(): Promise<boolean>
}

/**
 * What GET /api/v1/checks/{id} said: the check's steps (with `result` once it finished), an
 * unknown id, or the `errors` key of copy/pl.json for a failed request.
 *
 * @feature US-SPR-01, F-01, F-21
 */
export type ReadOutcome = { status: AnalysisStatus } | 'not_found' | 'busy' | 'offline'

/**
 * Reads the state of one check from the verification API.
 *
 * @feature US-SPR-01, F-01, F-21
 */
export interface ResultReader {
  /**
   * Reads one check; never throws, a failure is an outcome.
   *
   * @param checkId - The id the API gave the accepted check.
   * @returns The check's state or why it could not be read.
   */
  read(checkId: string): Promise<ReadOutcome>
}

/**
 * Why a recording was not taken: an `errors` key of copy/pl.json to show under the audio field,
 * or `unsupported_format` for a file that is not a recording we check (an out-of-scope result).
 *
 * @feature US-SPR-11, F-08
 */
type UploadRefusal =
  | 'audio_too_large'
  | 'audio_too_long'
  | 'unsupported_format'
  | 'rate_limited'
  | 'rate_limited_daily'
  | 'busy'
  | 'offline'

/**
 * What the API said about an uploaded recording: stored with its id, or a refusal to show.
 *
 * @feature US-SPR-11, F-08
 */
export type UploadOutcome = { audioId: string } | UploadRefusal

/**
 * Uploads a recording to the verification API, which stores it and returns the `audio_id` to
 * send in a `CheckRequest`.
 *
 * @feature US-SPR-11, F-08
 */
export interface AudioUploader {
  /**
   * Uploads one recording; never throws, a failure is an outcome.
   *
   * @param file - The recording the person chose.
   * @returns The stored recording's id or why it was refused.
   */
  upload(file: Blob): Promise<UploadOutcome>
}

/**
 * The signed-in citizen as the page shows them: the address of the account, when the provider
 * gave one.
 *
 * @feature US-SPR-10, F-31
 */
export type AccountSession = { email: string | null }

/**
 * One check of the account's server history: its id, when it was sent (ISO 8601) and the
 * question with personal data masked.
 *
 * @feature US-SPR-10, F-31
 */
export type AccountCheck = { checkId: string; at: string; question: string }

/**
 * The optional citizen account (Google or Microsoft sign-in): history across devices, sign-out
 * and deleting the history or the account. Never required: a check works without it.
 *
 * @feature US-SPR-10, US-BEZ-05, F-31
 */
export interface CitizenAccount {
  /**
   * Reads who is signed in; never throws.
   *
   * @returns The account, or null when nobody is signed in or the API cannot be reached.
   */
  session(): Promise<AccountSession | null>
  /**
   * Reads the account's checks, newest first; never throws.
   *
   * @returns The checks; empty when the API cannot be reached.
   */
  history(): Promise<AccountCheck[]>
  /**
   * The address that starts the sign-in with one provider and brings the citizen back.
   *
   * @param provider - The sign-in provider.
   * @param returnTo - The path on this site to open after sign-in.
   * @returns The login address on the API.
   */
  loginUrl(provider: 'google' | 'microsoft', returnTo: string): string
  /**
   * Ends the session; never throws.
   *
   * @returns True once the API ended it.
   */
  signOut(): Promise<boolean>
  /** „Usuń moją historię”: deletes the account's checks and notifications, the account stays. */
  historyEraser: SessionEraser
  /** „Usuń konto”: deletes the account's history, notifications and session. */
  accountEraser: SessionEraser

 * Why an image was not taken: an `errors` key of copy/pl.json to show under the image field.
 *
 * @feature US-SPR-08, F-33
 */
type ImageRefusal =
  | 'image_too_large'
  | 'image_format_unsupported'
  | 'rate_limited'
  | 'rate_limited_daily'
  | 'busy'
  | 'offline'

/**
 * What the API said about an uploaded image: stored with its id, or a refusal to show.
 *
 * @feature US-SPR-08, F-33
 */
export type ImageOutcome = { imageId: string } | ImageRefusal

/**
 * Uploads a screenshot or photo to the verification API, which stores it and returns the
 * `image_id` to send in a `CheckRequest`.
 *
 * @feature US-SPR-08, F-33
 */
export interface ImageUploader {
  /**
   * Uploads one image; never throws, a failure is an outcome.
   *
   * @param file - The image the person chose.
   * @returns The stored image's id or why it was refused.
   */
  upload(file: Blob): Promise<ImageOutcome>
}
