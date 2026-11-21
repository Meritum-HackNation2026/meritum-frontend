/**
 * The notifications API of meritum-backend (backend#27): a server-sent event stream for this
 * session, the saved inbox, marking as read and deleting. Adapters never throw.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
export interface NotificationsApi {
  /**
   * Opens the stream of this session's notifications.
   *
   * @param onEvent - Gets each event's parsed JSON, still unvalidated.
   * @returns Closes the stream.
   */
  subscribe(onEvent: (value: unknown) => void): () => void
  /**
   * Reads the saved inbox of this session.
   *
   * @returns Unvalidated notifications; empty when the API cannot be reached.
   */
  list(): Promise<unknown[]>
  /**
   * Marks one notification as read on the server.
   *
   * @param id - The notification id.
   */
  markRead(id: string): Promise<void>
  /** Deletes every notification of this session (with „Usuń moje sprawdzenia”). */
  clear(): Promise<void>
}
