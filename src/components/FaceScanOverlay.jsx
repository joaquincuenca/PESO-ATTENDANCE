import { useEffect, useRef, useState } from "react";
import React from "react";

const VERTS = [
    [0,-105,10], [-40,-88,18],[-20,-98,28],[20,-98,28],[40,-88,18],
    [-62,-60,8],[-48,-72,22],[-12,-80,38],[12,-80,38],[48,-72,22],[62,-60,8],
    [-70,-22,0],[-55,-42,20],[-28,-58,40],[0,-62,48],[28,-58,40],[55,-42,20],[70,-22,0],
    [-58,10,-2],[-42,0,22],[-18,-18,44],[0,-22,52],[18,-18,44],[42,0,22],[58,10,-2],
    [-55,32,-5],[-36,20,28],[-14,10,50],[0,6,58],[14,10,50],[36,20,28],[55,32,-5],
    [-48,55,-8],[-28,40,30],[-10,34,52],[0,32,60],[10,34,52],[28,40,30],[48,55,-8],
    [-38,78,-12],[-18,72,22],[0,76,30],[18,72,22],[38,78,-12],
    [0,95,8],[-75,-30,-20],[-78,10,-22],[75,-30,-20],[78,10,-22],
    [-85,125,-30],[-42,108,0],[0,112,10],[42,108,0],[85,125,-30],
    [-28,100,5],[28,100,5],
    ];

    const TRIS = [
    [0,1,2],[0,2,3],[0,3,4],
    [1,5,6],[1,6,2],[2,6,7],[2,7,8],[3,8,9],[3,9,10],[4,10,11],[4,5,1],
    [5,12,13],[5,13,6],[6,13,14],[7,14,15],[7,15,8],[8,15,16],[9,16,17],[10,17,18],[10,18,11],[11,18,19],[12,5,4],
    [12,20,21],[12,21,13],[13,21,22],[14,22,23],[14,23,15],[15,23,24],[16,24,25],[17,25,26],[18,26,27],[19,27,12],
    [20,28,29],[21,29,30],[21,30,22],[22,30,31],[23,31,32],[23,32,24],[24,32,33],[25,33,34],[26,34,27],
    [28,36,37],[29,37,38],[30,38,39],[31,39,40],[32,40,41],[33,41,34],
    [36,44,37],[37,44,45],[38,45,39],[39,45,46],[40,46,41],[41,46,45],
    [44,48,49],[45,49,50],[46,50,51],[44,47,48],[46,47,51],
    [48,52,49],[49,52,50],[50,52,51],
    [12,53,54],[19,55,56],
    [57,58,59],[59,60,61],[58,62,59],[63,60,58],
    [58,53,62],[59,64,60],[52,62,63],[52,57,62],
    ];

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
        matching:  "Matching database",
        verifying: "Identity verified",
    };

    const [pct, setPct] = useState(0);

    useEffect(() => {
        let raf;
        const tick = () => {
        setPct(prev => {
            const next = prev + (targetPct - prev) * 0.04;
            return Math.abs(next - targetPct) < 0.2 ? targetPct : next;
        });
        raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [targetPct]);

    useEffect(() => {
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

        // scan line
        scanYRef.current += scanDirRef.current * 1.8;
        if (scanYRef.current > H - 10) scanDirRef.current = -1;
        if (scanYRef.current < 10)     scanDirRef.current =  1;
        const scanGrad = ctx.createLinearGradient(0, scanYRef.current - 12, 0, scanYRef.current + 12);
        scanGrad.addColorStop(0,   "rgba(0,200,255,0)");
        scanGrad.addColorStop(0.5, isVerified ? "rgba(0,255,128,0.35)" : "rgba(0,200,255,0.35)");
        scanGrad.addColorStop(1,   "rgba(0,200,255,0)");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanYRef.current - 12, W, 24);

        const pts = VERTS.map(v => proj(v, rx, ry));
        TRIS.forEach(([a, b, c]) => {
            const pa = pts[a], pb = pts[b], pc = pts[c];
            if (!pa || !pb || !pc) return;
            const zAvg = (pa[2] + pb[2] + pc[2]) / 3;
            const alpha = Math.min(0.55, Math.max(0.04, (zAvg + 250) / 600));
            ctx.beginPath();
            ctx.moveTo(pa[0], pa[1]);
            ctx.lineTo(pb[0], pb[1]);
            ctx.lineTo(pc[0], pc[1]);
            ctx.closePath();
            ctx.strokeStyle = isVerified ? `rgba(0,255,128,${alpha})` : `rgba(0,200,255,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
            ctx.fillStyle = isVerified ? `rgba(0,255,100,${alpha * 0.12})` : `rgba(0,160,255,${alpha * 0.12})`;
            ctx.fill();
        });

        pts.forEach(p => {
            const alpha = Math.min(0.9, Math.max(0.1, (p[2] + 250) / 500));
            ctx.beginPath();
            ctx.arc(p[0], p[1], 1.2, 0, Math.PI * 2);
            ctx.fillStyle = isVerified ? `rgba(180,255,220,${alpha})` : `rgba(180,240,255,${alpha})`;
            ctx.fill();
        });

        rafRef.current = requestAnimationFrame(frame);
        };

        rafRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isVerified]);

    return (
        <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "rgba(0,10,30,0.55)",
        backdropFilter: "blur(1px)",
        zIndex: 10,
        }}>

        {[
            { top: 12, left: 12,  borderTop: `2px solid ${color}`, borderLeft:  `2px solid ${color}` },
            { top: 12, right: 12, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
            { bottom: 44, left: 12,  borderBottom: `2px solid ${color}`, borderLeft:  `2px solid ${color}` },
            { bottom: 44, right: 12, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
        ].map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
        ))}

        <canvas ref={canvasRef} width={280} height={260}
            style={{ display: "block", filter: `drop-shadow(0 0 6px ${color}44)` }} />

        <p style={{
            color, fontSize: 11, fontFamily: "monospace", letterSpacing: 1,
            textTransform: "uppercase", margin: "4px 0 4px",
            textShadow: `0 0 8px ${color}`,
        }}>
            {STEP_LABELS[step]}
        </p>

        <div style={{
            width: 200, height: 4, background: "rgba(255,255,255,0.1)",
            borderRadius: 2, overflow: "hidden", position: "relative", marginBottom: 6,
        }}>
            <div style={{
            width: `${pct}%`, height: "100%", borderRadius: 2,
            background: isVerified
                ? "linear-gradient(90deg,#006040,#00c870,#00ffaa)"
                : "linear-gradient(90deg,#004f9a,#0095e0,#00d4ff)",
            transition: "width 0.1s linear",
            boxShadow: `0 0 6px ${color}`,
            }} />
        </div>
        <span style={{ color, fontSize: 10, fontFamily: "monospace" }}>{Math.round(pct)}%</span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
            {["detecting","analyzing","matching","verifying"].map((s, i) => (
            <React.Fragment key={s}>
                {i > 0 && <div style={{ width: 16, height: 1, background: "rgba(0,160,200,0.4)" }} />}
                <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < stepIdx ? "#0090c8" : i === stepIdx ? color : "transparent",
                border: i >= stepIdx ? `1.5px solid rgba(0,140,200,0.5)` : "none",
                boxShadow: i === stepIdx ? `0 0 8px ${color}` : "none",
                }} />
            </React.Fragment>
            ))}
        </div>
        </div>
    );
}