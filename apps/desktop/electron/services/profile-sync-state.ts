/**
 * Tracks whether the local profile (cv.md / config/profile.yml) is stale relative
 * to the server, so agent runs only pay the `get-profile` sync when it's actually
 * needed instead of on every turn.
 *
 * - Starts DIRTY so the first agent run of a session always syncs.
 * - Any profile-affecting mutation (profile/skills/experience/… edits) marks it
 *   dirty again → the next agent run re-syncs.
 * - A successful agent run that included get-profile marks it clean.
 */
let dirty = true;

export const profileSync = {
  markDirty(): void {
    dirty = true;
  },
  markSynced(): void {
    dirty = false;
  },
  isDirty(): boolean {
    return dirty;
  },
};
