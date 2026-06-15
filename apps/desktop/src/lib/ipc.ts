import type { CompassApi } from "@compass/ipc-contract";

/**
 * The renderer's ONLY entry point to the main process (AGENTS §4). Typed via the
 * shared contract. Features import `auth` / `api` from here — never window.compass.
 */
declare global {
  interface Window {
    compass: CompassApi;
  }
}

export const api: CompassApi = window.compass;
export const auth = window.compass.auth;
