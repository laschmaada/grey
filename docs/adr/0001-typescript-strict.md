# ADR-0001 — TypeScript strict

**Decision:** TypeScript with `strict: true` plus `noUncheckedIndexedAccess`. ES modules.
Forbid `any` except in commented dislocations.

**Why:** Catch shape mismatches at compile time. The world model has many `T | undefined`
returns; unchecked access is the most common silent-failure source.

**Consequences:** More ceremony for array access (`arr[0]!` or guards). Worth it.