# Brand — Gofer

_Status: active (inline tokens; not a shadcn theme)_

Dark, calm, trustworthy fintech. The product handles money, so the UI reads as
precise and in-control, not playful.

## Palette
- **Primary / PayPal blue:** `#0070E0` (gradient top `#1a86ff`) — CTAs, accents, meter.
- **Accent blue (text/links):** `#4da3ff`.
- **Surfaces:** page `#070b16`; cards `slate-900/50` on `slate-800` borders; inputs `slate-950/70`.
- **Verdict semantics:** auto-approve = emerald, needs-approval = amber, denied = rose.
- **Text:** `slate-100` primary, `slate-400` secondary, `slate-500/600` tertiary.
- Ambient radial blue glow top-right for depth.

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
