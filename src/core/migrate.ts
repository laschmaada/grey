/**
 * Save migration shims — placeholder for M1-T08.
 *
 * The migration registry is wired in `save.ts`. This module exists for the
 * test that imports `migrate` from a single import path.
 */
export { migrate } from './save.js';