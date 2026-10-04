# ADR-0004 — Custom DOM terminal

**Decision:** Custom DOM terminal with a native `<input>` prompt; text rendered via
`textContent` only. `innerHTML` / `outerHTML` / `insertAdjacentHTML` banned
(ESLint rule + boundaries.ts).

**Why:** A simulated terminal that handles real tool syntax. Native `<input>` gives us
free IME, accessibility (a real `<input>` is focusable and labelled) and clipboard. The
output side uses typed spans (`{ text: T, pinnable: bool }`).

**Consequences:** We have to reimplement line wrap and history navigation, but those are
small. The D14 ban means we cannot use any framework that injects HTML by attribute
binding.