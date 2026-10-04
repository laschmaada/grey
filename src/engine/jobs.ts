/**
 * Background jobs table — M3+. Stub.
 */

import type { Session } from './session.js';

export interface Job {
  id: number;
  name: string;
  startedAt: number;
}

export function listJobs(s: Session): ReadonlyArray<Job> {
  return s.jobs;
}

export function killJob(s: Session, id: number): boolean {
  const before = s.jobs.length;
  s.jobs = s.jobs.filter((j) => j.id !== id);
  return s.jobs.length < before;
}