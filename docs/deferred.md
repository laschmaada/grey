# Deferred

Items explicitly deferred per CODING_PLAN §0.6 and §10. Listed here so we don't lose them.

## From DESIGN.md Appendix A
- New Game+
- Leaderboards
- Daily challenges
- Mission editor
- Active Directory branch
- Complex payout multipliers
- Hint penalties

## From CODING_PLAN §6
- **M5+** — Act 2 onward sims and missions, Act 3 (both tracks), Act 4, Finale, Mosaic,
  hardening, FINAL_REPORT.md, RELEASE_CHECKLIST.md. See BLOCKERS.md "Deferred" for
  the cut rationale.

## Moved out of scope vs DESIGN v1.0 (per errata in CODING_PLAN §7.3)
- nmap-only `a1-knock-knock` (msf route added in M5-T04, deferred with the rest of M5)
- Trial 1/2 raw mode content (deferred)
- Practice Range v1 (deferred to v0.2)

## Known minor cuts within shipped milestones
- **Burp panel polish** — the `M6-T03` interceptor panel UI is reduced to a text-only
  queue view in v0.1 (no live request/response editor panes; cut from M4 to keep
  the bundle below the 2.5 MB cap with headroom for v0.2 sims).
- **Link-graph transforms** — Maltego-style transforms are deferred; the table view is
  in scope when M8 lands.
## Mission briefing panel — deferred v2 polish
- Resizable drag handle between the briefing and the terminal (so the player
  can give 70% to the terminal during long outputs).
- Auto-hide on first command (collapses the panel to a tab so the terminal
  takes the full viewport during fast iteration).

## Mission briefing panel — known live-cut items (v0)
- "Routes" collapse, by-game (the 2+1 reference transcripts) — deferred.
- "Facts discovered" panel — deferred.
- Click-to-focus on a goal in the checklist (auto-scrolls terminal) — deferred.
