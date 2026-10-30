# Brand — Gofer

_Status: active (inline tokens; not a shadcn theme)_

Dark, calm, trustworthy fintech. The product handles money, so the UI reads as
precise and in-control, not playful.

## Logo
- Rounded-square gradient tile (blue→indigo) with a white "go" glyph — a node (the
  origin) + a forward arrow. Reads as *go / fetch / dispatch*. Lives at
  `app/icon.svg` (favicon) and as `LogoMark` in the header; the header orb wraps it
  with a soft brand glow and a rotating conic halo while the agent is working.
- Wordmark: lowercase **gofer**, tracking `-0.03em`, white.

## Palette
- **Primary gradient:** `#4d8bff` → `#6a5bff` (blue → indigo) — logo, CTAs, meter, focus.
- **Brand solid / ring:** `#3b7dff`. **Highlight:** `#8fb6ff` (links, capture IDs).
- **Surfaces (glass):** page `#070810` with two radial glows (blue top-right, indigo
  bottom-left) + a 3.5%-opacity film grain; cards `bg-white/[0.03]` on `white/[0.06]`
  hairline borders, `backdrop-blur`; inset insets `bg-black/25–30`.
- **Verdict semantics:** auto-approve = emerald, needs-approval = amber, denied = rose.
- **Text:** `slate-100` primary, `slate-400` secondary, `slate-500/600` tertiary.
- Premium tells: film grain, hairline borders, brand-tinted glows/shadows, mono tabular figures.

## Type
- UI: Geist Sans (via `next/font`). Numbers/money/IDs: `font-mono tabular-nums` so figures line up.

## Motion
- framer-motion, spring-first (`snappy` 400/30, `smooth` 300/30, `bouncy` 280/26, `stiff` 350/28).
- Respects `prefers-reduced-motion` via `<MotionConfig reducedMotion="user">`.
- Signature: the **"Agent at work"** staged sequence (search → reason on Meta Muse → screen)
  makes real agent latency feel intentional. Orb pulses while thinking; ledger entries
  slide in; budget meter springs via `scaleX`.

## Voice
Plain, active, confident. "Run errand", "Approve & pay with PayPal", "Blocked by mandate".
Never hedge about money — state what happened and show the IDs.
