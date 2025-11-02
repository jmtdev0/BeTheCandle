/**
 * Legacy Socket.IO helper retained for reference.
 *
 * Supabase Realtime now manages orbit presence, so this file intentionally
 * exports no runtime functionality. Keeping the placeholder avoids re-imports
 * elsewhere from breaking while the migration stabilises.
 */

export type SocketServer = never;

export function initSocketServer(): never {
  throw new Error('Socket server deprecated: use Supabase Realtime instead.');
}
