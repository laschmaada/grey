# Safety — rules of engagement

GREY HERON is a **simulator**. It is not a tool, and it never runs against a real
network.

## Hard bans (enforced in code)
- **No working exploit code.** Every "exploit" is a state transition in the world model.
  No real shellcode, no real payload bytes, no real ROP gadgets.
- **No real scanning or network tooling.** No `nmap` against real hosts; no Metasploit
  modules that open sockets. All command output is computed locally from a seeded
  world fixture.
- **No outbound network requests from app code.** ESLint bans `fetch`, `XMLHttpRequest`,
  `WebSocket`, `EventSource`, `navigator.sendBeacon`. The build emits a CSP that rejects
  `connect-src` to anywhere.
- **No DOM injection.** `innerHTML`, `outerHTML`, `insertAdjacentHTML` are banned by
  ESLint. Output uses `textContent` and structured spans.
- **Reserved identifiers only.** Content uses IPs from `192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24` (documentation ranges) and RFC 1918 ranges for internal networks.
  Domains are under `.test`, `.example`, `.invalid`. Emails at those domains. No real
  companies, people, or credentials.

## Lab isolation
Field assignments (M4+) target a Kali + Metasploitable 2 setup on a **host-only**
virtual network. Do not connect the lab network to the internet. Snapshots are required
before any destructive operation. See [`docs/lab/BUILD.md`](BUILD.md).

## Originality
All prose, help text, and tool output are written for this project. We follow
publicly-documented tool output formats; wording is original. Man pages, vendor
trademarks, and copyrighted text are not copied.

## Reporting a concern
If you find a way to make the simulator actually do something against a real host, that
is a bug. File it with the exact input and the simulator version.