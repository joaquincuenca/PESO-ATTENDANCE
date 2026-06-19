// components/FaceScanOverlay.jsx
import { useEffect, useRef, useState } from "react";
import React from "react";

const VERTS = [ /* ... your VERTS array ... */ ];
const TRIS = [ /* ... your TRIS array ... */ ];

export default function FaceScanOverlay({ step }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);
  const scanYRef = useRef(0);
  const scanDirRef = useRef(1);

  const STEPS = ["detecting", "analyzing", "matching", "verifying"];
  const stepIdx = STEPS.indexOf(step);
  const TARGET_PCT = [25, 55, 80, 100];
  const targetPct = TARGET_PCT[stepIdx] ?? 25;
  const isVerified = stepIdx >= 3;
  const color = isVerified ? "#00ff80" : "#00c8ff";

  const STEP_LABELS = {
    detecting: "Scanning in process",
    analyzing: "Analyzing facial features",
    matching: "Matching database",
    verifying: "Identity verified",
  };

  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);

  // Smooth progress
  useEffect(() => {
    let raf;
    const tick = () => {
      setPct((prev) => {
        const next = prev + (targetPct - prev) * 0.085; // faster smoothing
        return Math.abs(next - targetPct) < 0.5 ? targetPct : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [targetPct]);

  // Canvas Animation
  useEffect(() => {
    if (!step) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;
    const FL = 320;

    const proj = (v, rx, ry) => {
      let x = v[0] * Math.cos(ry) - v[2] * Math.sin(ry);
      let z = v[0] * Math.sin(ry) + v[2] * Math.cos(ry);
      let y = v[1];
      const y2 = y * Math.cos(rx) - z * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z * Math.cos(rx);
      const scale = FL / (FL + z2 + 200);
      return [CX + x * scale, CY + y2 * scale, z2];
    };

    const frame = () => {
      tRef.current += 0.012;
      const t = tRef.current;
      const rx = Math.sin(t * 0.4) * 0.25;
      const ry = t * 0.5;

      ctx.clearRect(0, 0, W, H);

      // Scanning Line
      scanYRef.current += scanDirRef.current * 2.2;
      if (scanYRef.current > H - 15) scanDirRef.current = -1;
      if (scanYRef.current < 15) scanDirRef.current = 1;

      const scanGrad = ctx.createLinearGradient(0, scanYRef.current - 15, 0, scanYRef.current + 15);
      scanGrad.addColorStop(0, "rgba(0,200,255,0)");
      scanGrad.addColorStop(0.5, isVerified ? "rgba(0,255,140,0.45)" : "rgba(0,200,255,0.45)");
      scanGrad.addColorStop(1, "rgba(0,200,255,0)");

      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanYRef.current - 15, W, 30);

      // 3D Face
      const pts = VERTS.map(v => proj(v, rx, ry));
      TRIS.forEach(([a, b, c]) => {
        const pa = pts[a], pb = pts[b], pc = pts[c];
        if (!pa || !pb || !pc) return;

        const zAvg = (pa[2] + pb[2] + pc[2]) / 3;
        const alpha = Math.min(0.6, Math.max(0.05, (zAvg + 250) / 600));

        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.lineTo(pc[0], pc[1]);
        ctx.closePath();

        ctx.strokeStyle = isVerified ? `rgba(0,255,140,${alpha})` : `rgba(0,200,255,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = isVerified ? `rgba(0,255,120,${alpha * 0.1})` : `rgba(0,170,255,${alpha * 0.1})`;
        ctx.fill();
      });

      // Vertices dots
      pts.forEach(p => {
        const alpha = Math.min(0.95, Math.max(0.15, (p[2] + 250) / 500));
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.4, 0, Math.PI * 2);
        ctx.fillStyle = isVerified ? `rgba(200,255,230,${alpha})` : `rgba(180,240,255,${alpha})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step, isVerified]);

  // Fade out when step becomes null
  useEffect(() => {
    if (!step) {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
      style={{
        background: "rgba(0, 10, 30, 0.6)",
        backdropFilter: "blur(2px)",
        opacity: step ? 1 : 0,
      }}
    >
      {/* Corner Brackets */}
      {[
        { top: 12, left: 12, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
        { top: 12, right: 12, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
        { bottom: 44, left: 12, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
        { bottom: 44, right: 12, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 28, height: 28, ...s }} />
      ))}

      <canvas
        ref={canvasRef}
        width={280}
        height={260}
        style={{ display: "block", filter: `drop-shadow(0 0 12px ${color}55)` }}
      />

      <p
        style={{
          color,
          fontSize: "13px",
          fontFamily: "monospace",
          letterSpacing: "2px",
          textTransform: "uppercase",
          margin: "8px 0 6px",
          textShadow: `0 0 10px ${color}`,
        }}
      >
        {STEP_LABELS[step] || "Processing..."}
      </p>

      {/* Progress Bar */}
      <div
        style={{
          width: 220,
          height: 5,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: isVerified
              ? "linear-gradient(90deg, #006040, #00ff88)"
              : "linear-gradient(90deg, #004f9a, #00d4ff)",
            transition: "width 0.08s linear",
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>

      <span style={{ color, fontSize: "11px", fontFamily: "monospace", marginTop: 4 }}>
        {Math.round(pct)}%
      </span>

      {/* Step Indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <div style={{ width: 18, height: 1, background: "rgba(0,160,200,0.3)" }} />}
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: i < stepIdx ? "#00a0ff" : i === stepIdx ? color : "transparent",
                border: i >= stepIdx ? `2px solid rgba(0,180,255,0.4)` : "none",
                boxShadow: i === stepIdx ? `0 0 10px ${color}` : "none",
              }}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}