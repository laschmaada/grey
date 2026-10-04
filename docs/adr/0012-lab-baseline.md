# ADR-0012 — Lab baseline: Kali + Metasploitable 2

**Decision:** Field assignments target a Kali attacker + Metasploitable 2 target on a
host-only interface, snapshotted before the field lab.

**Why:** The whole "sim teaches, lab proves" pillar. The same operations you ran in the
sim run against a real vulnerable VM and you keep the artifact.

**Consequences:** `docs/lab/BUILD.md` is the install guide; `docs/lab/CAPTURE_GOLDEN.md`
tells you how to capture real outputs for golden fixtures later.