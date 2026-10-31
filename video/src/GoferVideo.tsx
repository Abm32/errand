import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  ShieldCheck,
  Sparkles,
  Wallet,
  Hand,
  Ban,
  Server,
  ArrowRight,
} from "lucide-react";

// ---- Brand tokens (match the Gofer app) ----
const INK = "#070810";
const BRAND = "#3b7dff";
const BRAND2 = "#6a5bff";
const BRAND_HI = "#8fb6ff";
const FG = "#eef1f7";
const MUTED = "#9aa4bd";
const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = '"SFMono-Regular", ui-monospace, Menlo, Consolas, monospace';

// ---- Scene timing (30fps) ----
const S = {
  title: { from: 0, dur: 90 },
  problem: { from: 90, dur: 135 },
  mandate: { from: 225, dur: 135 },
  demo: { from: 360, dur: 240 },
  proof: { from: 600, dur: 120 },
  approval: { from: 720, dur: 135 },
  denied: { from: 855, dur: 135 },
  arch: { from: 990, dur: 120 },
  outro: { from: 1110, dur: 120 },
};

// Smooth fade in/out envelope for each scene (local frame).
const envelope = (local: number, dur: number) =>
  interpolate(
    local,
    [0, 14, dur - 14, dur],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

// ---- Persistent animated aurora backdrop ----
const Aurora: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const blob = (
    x: number,
    y: number,
    c: string,
    phase: number,
    size: number
  ): React.CSSProperties => ({
    position: "absolute",
    width: size,
    height: size,
    left: `${x + Math.sin(t * 0.25 + phase) * 3}%`,
    top: `${y + Math.cos(t * 0.2 + phase) * 4}%`,
    background: c,
    borderRadius: "9999px",
    filter: "blur(130px)",
    opacity: 0.5,
  });
  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      <div style={blob(-5, -10, BRAND, 0, 720)} />
      <div style={blob(60, 5, BRAND2, 2, 680)} />
      <div style={blob(25, 55, "#2a4bd8", 4, 760)} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 40%, rgba(7,8,16,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ---- Logo mark (matches app/icon) ----
const LogoMark: React.FC<{ size?: number }> = ({ size = 92 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND2} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 20px 60px -15px ${BRAND}aa`,
    }}
  >
    <ArrowRight size={size * 0.52} color="#fff" strokeWidth={2.6} />
  </div>
);

// ---- Browser card wrapping a real screenshot ----
const BrowserCard: React.FC<{
  src: string;
  local: number;
  dur: number;
  focusY?: number; // 0..1 vertical focus for crop
}> = ({ src, local, dur, focusY = 0 }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: local, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [60, 0]);
  const scale = interpolate(local, [0, dur], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });
  const W = 1240;
  return (
    <div
      style={{
        width: W,
        borderRadius: 18,
        overflow: "hidden",
        transform: `translateY(${y}px)`,
        boxShadow:
          "0 50px 120px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)",
        background: "#0b0d18",
      }}
    >
      <div
        style={{
          height: 44,
          background: "#0e1120",
          display: "flex",
          alignItems: "center",
          gap: 9,
          paddingLeft: 20,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <div
            key={c}
            style={{ width: 13, height: 13, borderRadius: 99, background: c }}
          />
        ))}
        <div
          style={{
            marginLeft: 22,
            fontFamily: MONO,
            fontSize: 16,
            color: MUTED,
            background: "rgba(255,255,255,0.05)",
            padding: "5px 16px",
            borderRadius: 7,
          }}
        >
          gofer.app
        </div>
      </div>
      <div style={{ height: 620, overflow: "hidden" }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            display: "block",
            transform: `scale(${scale})`,
            transformOrigin: `50% ${focusY * 100}%`,
            marginTop: -focusY * 180,
          }}
        />
      </div>
    </div>
  );
};

// ---- Caption bar ----
const Caption: React.FC<{
  local: number;
  children: React.ReactNode;
  accent?: React.ReactNode;
}> = ({ local, children, accent }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - 8, fps, config: { damping: 200 } });
  const y = interpolate(s, [0, 1], [24, 0]);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: s,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(10,12,22,0.72)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          padding: "16px 30px",
          borderRadius: 999,
          maxWidth: 1300,
        }}
      >
        {accent}
        <span
          style={{
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 600,
            color: FG,
            letterSpacing: -0.3,
          }}
        >
          {children}
        </span>
      </div>
    </div>
  );
};

// Word-by-word rise for headline text scenes.
const Lines: React.FC<{
  local: number;
  lines: { text: string; color?: string; size?: number; weight?: number }[];
}> = ({ local, lines }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((ln, i) => {
        const s = spring({
          frame: local - i * 7,
          fps,
          config: { damping: 200 },
        });
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT,
              fontSize: ln.size ?? 70,
              fontWeight: ln.weight ?? 800,
              color: ln.color ?? FG,
              letterSpacing: -1.5,
              lineHeight: 1.08,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [34, 0])}px)`,
            }}
          >
            {ln.text}
          </div>
        );
      })}
    </div>
  );
};

const Pill: React.FC<{
  local: number;
  delay: number;
  icon: React.ReactNode;
  label: string;
}> = ({ local, delay, icon, label }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - delay, fps, config: { damping: 18, mass: 0.7 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "20px 30px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        opacity: interpolate(s, [0, 1], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
      }}
    >
      {icon}
      <span style={{ fontFamily: FONT, fontSize: 30, fontWeight: 600, color: FG }}>
        {label}
      </span>
    </div>
  );
};

const center: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  padding: "0 120px",
};

export const GoferVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Aurora />

      {/* S1 — TITLE */}
      <Sequence from={S.title.from} durationInFrames={S.title.dur}>
        <SceneTitle />
      </Sequence>

      {/* S2 — PROBLEM */}
      <Sequence from={S.problem.from} durationInFrames={S.problem.dur}>
        <SceneProblem />
      </Sequence>

      {/* S3 — MANDATE */}
      <Sequence from={S.mandate.from} durationInFrames={S.mandate.dur}>
        <SceneMandate />
      </Sequence>

      {/* S4 — DEMO HERO */}
      <Sequence from={S.demo.from} durationInFrames={S.demo.dur}>
        <SceneDemo />
      </Sequence>

      {/* S5 — PROOF */}
      <Sequence from={S.proof.from} durationInFrames={S.proof.dur}>
        <SceneProof />
      </Sequence>

      {/* S6 — APPROVAL */}
      <Sequence from={S.approval.from} durationInFrames={S.approval.dur}>
        <SceneShot
          src="shots/approval.jpg"
          dur={S.approval.dur}
          focusY={0.55}
          icon={<Hand size={28} color={"#f5b544"} />}
          caption={
            <>
              Above your limit? <b style={{ color: BRAND_HI }}>One human tap.</b> Then PayPal settles.
            </>
          }
        />
      </Sequence>

      {/* S7 — DENIED */}
      <Sequence from={S.denied.from} durationInFrames={S.denied.dur}>
        <SceneShot
          src="shots/denied.jpg"
          dur={S.denied.dur}
          focusY={0.6}
          icon={<Ban size={28} color={"#ff6b6b"} />}
          caption={
            <>
              Outside the rules? <b style={{ color: "#ff8f8f" }}>Denied</b> — with a plain reason.
            </>
          }
        />
      </Sequence>

      {/* S8 — ARCHITECTURE */}
      <Sequence from={S.arch.from} durationInFrames={S.arch.dur}>
        <SceneArch />
      </Sequence>

      {/* S9 — OUTRO */}
      <Sequence from={S.outro.from} durationInFrames={S.outro.dur}>
        <SceneOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------- Scenes ----------

const SceneTitle: React.FC = () => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = envelope(local, S.title.dur);
  const logoS = spring({ frame: local, fps, config: { damping: 14, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column", gap: 34 }}>
      <div style={{ transform: `scale(${logoS})` }}>
        <LogoMark size={110} />
      </div>
      <div style={{ textAlign: "center" }}>
        <Lines
          local={local - 6}
          lines={[
            { text: "Gofer", size: 100, color: FG },
          ]}
        />
        <div
          style={{
            marginTop: 18,
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -1,
            background: `linear-gradient(90deg, ${FG} 40%, ${BRAND_HI} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: interpolate(local, [14, 34], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          }}
        >
          An agent that shops for you — and can&rsquo;t overspend.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneProblem: React.FC = () => {
  const local = useCurrentFrame();
  const op = envelope(local, S.problem.dur);
  return (
    <AbsoluteFill style={{ ...center, opacity: op }}>
      <Lines
        local={local}
        lines={[
          { text: "Everyone's building agents", size: 64, weight: 800 },
          { text: "that spend money.", size: 64, weight: 800 },
          { text: "Nobody's answering:", size: 40, weight: 600, color: MUTED },
          { text: "how do you let one spend it safely?", size: 58, weight: 800, color: BRAND_HI },
        ]}
      />
    </AbsoluteFill>
  );
};

const SceneMandate: React.FC = () => {
  const local = useCurrentFrame();
  const op = envelope(local, S.mandate.dur);
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column", gap: 46 }}>
      <div style={{ textAlign: "center" }}>
        <Lines
          local={local}
          lines={[
            { text: "Gofer wraps the agent in a Mandate", size: 56, weight: 800 },
            { text: "a server-enforced spend limit.", size: 34, weight: 600, color: MUTED },
          ]}
        />
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <Pill local={local} delay={18} icon={<Wallet size={34} color={BRAND_HI} />} label="Budget" />
        <Pill local={local} delay={26} icon={<ShieldCheck size={34} color={BRAND_HI} />} label="Per-item cap" />
        <Pill local={local} delay={34} icon={<Sparkles size={34} color={BRAND_HI} />} label="Auto-approve threshold" />
      </div>
    </AbsoluteFill>
  );
};

const SceneDemo: React.FC = () => {
  const local = useCurrentFrame();
  const op = envelope(local, S.demo.dur);
  // 3 sub-shots: hero (0-80) -> thinking (80-160) -> settled (160-240)
  let src = "shots/hero.jpg";
  let sub = local;
  let cap: React.ReactNode = (
    <>Give it a plain-English goal.</>
  );
  let icon = <Sparkles size={28} color={BRAND_HI} />;
  let focusY = 0;
  if (local >= 80 && local < 160) {
    src = "shots/thinking.jpg";
    sub = local - 80;
    focusY = 0.7;
    cap = (
      <>
        It reasons with <b style={{ color: BRAND_HI }}>Meta Muse</b> — then screens the Mandate.
      </>
    );
  } else if (local >= 160) {
    src = "shots/settled.jpg";
    sub = local - 160;
    focusY = 0.1;
    icon = <Wallet size={28} color={"#34d399"} />;
    cap = (
      <>
        Settles through <b style={{ color: "#6ee7b7" }}>real PayPal — hands-free. Zero taps.</b>
      </>
    );
  }
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column" }}>
      <BrowserCard src={src} local={sub} dur={80} focusY={focusY} />
      <Caption local={sub} accent={icon}>
        {cap}
      </Caption>
    </AbsoluteFill>
  );
};

const SceneProof: React.FC = () => {
  const local = useCurrentFrame();
  const op = envelope(local, S.proof.dur);
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column" }}>
      <BrowserCard src="shots/settled.jpg" local={local} dur={S.proof.dur} focusY={0.72} />
      <Caption local={local} accent={<ShieldCheck size={28} color={"#34d399"} />}>
        Not a mockup — a real PayPal capture, written to the audit ledger.
      </Caption>
    </AbsoluteFill>
  );
};

const SceneShot: React.FC<{
  src: string;
  dur: number;
  focusY: number;
  icon: React.ReactNode;
  caption: React.ReactNode;
}> = ({ src, dur, focusY, icon, caption }) => {
  const local = useCurrentFrame();
  const op = envelope(local, dur);
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column" }}>
      <BrowserCard src={src} local={local} dur={dur} focusY={focusY} />
      <Caption local={local} accent={icon}>
        {caption}
      </Caption>
    </AbsoluteFill>
  );
};

const SceneArch: React.FC = () => {
  const local = useCurrentFrame();
  const op = envelope(local, S.arch.dur);
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - 10, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column", gap: 40 }}>
      <div style={{ transform: `scale(${s})`, opacity: s }}>
        <Server size={80} color={BRAND_HI} />
      </div>
      <div style={{ textAlign: "center" }}>
        <Lines
          local={local}
          lines={[
            { text: "Limits + spend live on the server.", size: 56, weight: 800 },
            { text: "The browser holds only an id — it can't lift its own cap.", size: 32, weight: 600, color: MUTED },
          ]}
        />
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 26,
          color: BRAND_HI,
          opacity: interpolate(local, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          border: "1px solid rgba(143,182,255,0.3)",
          padding: "12px 24px",
          borderRadius: 10,
          background: "rgba(59,125,255,0.08)",
        }}
      >
        maps onto PayPal&rsquo;s AP2 mandate standard
      </div>
    </AbsoluteFill>
  );
};

const SceneOutro: React.FC = () => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = envelope(local, S.outro.dur);
  const logoS = spring({ frame: local, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ ...center, opacity: op, flexDirection: "column", gap: 28 }}>
      <div style={{ transform: `scale(${logoS})` }}>
        <LogoMark size={96} />
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: -2,
          color: FG,
          opacity: interpolate(local, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Gofer
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 36,
          fontWeight: 600,
          color: BRAND_HI,
          opacity: interpolate(local, [16, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Agentic commerce, on a leash you hold.
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: MONO,
          fontSize: 26,
          color: MUTED,
          opacity: interpolate(local, [26, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        errand-xl2n.onrender.com
      </div>
    </AbsoluteFill>
  );
};
