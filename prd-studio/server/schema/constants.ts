/**
 * Plain runtime constants with no zod dependency, kept separate from common.ts so the browser
 * (PRD Studio's web app) can import them without pulling the zod validation runtime into the
 * bundle — the web app only ever needs the shapes, not the validators; validation stays server-side.
 */

/** The optional @flusys/* package pairs from the bootstrap PRD's Package Selection table. */
export const PACKAGE_KEYS = [
  "iam",
  "storage",
  "email",
  "notification",
  "event-manager",
  "form-builder",
  "task-manager",
  "localization",
  "ai-assistant",
] as const;

export type PackageKey = (typeof PACKAGE_KEYS)[number];
