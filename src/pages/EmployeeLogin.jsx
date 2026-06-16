import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { supabase } from "../services/supabase";
import { Link } from "react-router-dom";
import React from "react";
import {
  User, Clock, CheckCircle, LogOut, ArrowLeft,
  Loader2, Camera, Circle, Sun, Check,
} from "lucide-react";

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

function FaceScanOverlay({ step }) {
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

  // ── progress bar easing ──
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

  // ── low-poly 3-D canvas animation ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;
    const FL = 320; // focal length

    const proj = (v, rx, ry) => {
      // rotate Y
      let x = v[0] * Math.cos(ry) - v[2] * Math.sin(ry);
      let z = v[0] * Math.sin(ry) + v[2] * Math.cos(ry);
      let y = v[1];
      // rotate X
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

      // project all verts
      const pts = VERTS.map(v => proj(v, rx, ry));

      // draw triangles
      TRIS.forEach(([a, b, c]) => {
        const pa = pts[a], pb = pts[b], pc = pts[c];
        if (!pa || !pb || !pc) return;
        // backface cull by z-average
        const zAvg = (pa[2] + pb[2] + pc[2]) / 3;
        const alpha = Math.min(0.55, Math.max(0.04, (zAvg + 250) / 600));
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.lineTo(pc[0], pc[1]);
        ctx.closePath();
        ctx.strokeStyle = isVerified
          ? `rgba(0,255,128,${alpha})`
          : `rgba(0,200,255,${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.fillStyle = isVerified
          ? `rgba(0,255,100,${alpha * 0.12})`
          : `rgba(0,160,255,${alpha * 0.12})`;
        ctx.fill();
      });

      // draw vertices as dots
      pts.forEach(p => {
        const alpha = Math.min(0.9, Math.max(0.1, (p[2] + 250) / 500));
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.2, 0, Math.PI * 2);
        ctx.fillStyle = isVerified
          ? `rgba(180,255,220,${alpha})`
          : `rgba(180,240,255,${alpha})`;
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
      {/* corner brackets */}
      {[
        { top: 12, left: 12,  borderTop: `2px solid ${color}`, borderLeft:  `2px solid ${color}` },
        { top: 12, right: 12, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
        { bottom: 44, left: 12,  borderBottom: `2px solid ${color}`, borderLeft:  `2px solid ${color}` },
        { bottom: 44, right: 12, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
      ))}

      <canvas ref={canvasRef} width={280} height={260}
        style={{ display: "block", filter: "drop-shadow(0 0 6px " + color + "44)" }} />

      {/* status text */}
      <p style={{
        color, fontSize: 11, fontFamily: "monospace", letterSpacing: 1,
        textTransform: "uppercase", margin: "4px 0 4px",
        textShadow: `0 0 8px ${color}`,
      }}>
        {STEP_LABELS[step]}
      </p>

      {/* progress bar */}
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

      {/* step dots */}
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

export default function EmployeeLogin() {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded]     = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [currentEmployee, setCurrentEmployee]   = useState(null);
  const [currentTime, setCurrentTime]       = useState(new Date());
  const [verifyingStep, setVerifyingStep]   = useState(null);
  const [cameraReady, setCameraReady]       = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    } catch {
      setAttendanceStatus({ type: "error", message: "Failed to load face detection models" });
    }
  };
  useEffect(() => { loadModels(); }, []);

  const formatTime    = d => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const formatSeconds = d => d.getSeconds().toString().padStart(2, "0");
  const formatDate    = d => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const getDistance = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  };

  const findEmployee = async (descriptor) => {
    try {
      const { data: employees, error } = await supabase
        .from("employees").select("*").not("face_descriptor", "is", null);
      if (error || !employees?.length) return null;
      let matched = null, minDist = 0.5;
      for (const emp of employees) {
        if (!emp.face_descriptor) continue;
        const d = getDistance(descriptor, emp.face_descriptor);
        if (d < minDist) { minDist = d; matched = emp; }
      }
      return matched;
    } catch { return null; }
  };

  const checkTodayAttendance = async (employeeId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("attendance").select("*")
        .eq("employee_id", employeeId).eq("attendance_date", today).maybeSingle();
      return error ? null : data;
    } catch { return null; }
  };

  const capturePhoto = async (employeeId, eventType) => {
    const video = webcamRef.current?.video;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.7));
    const filePath = `attendance_photos/${employeeId}_${eventType}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("employee-photos").upload(filePath, blob, { contentType: "image/jpeg" });
    if (uploadError) { console.error("Upload error:", uploadError); return null; }
    const { data: { publicUrl } } = supabase.storage.from("employee-photos").getPublicUrl(filePath);
    return publicUrl;
  };

  const processAttendance = async (action) => {
    const video = webcamRef.current?.video;
    if (!video || !modelsLoaded) {
      setAttendanceStatus({ type: "error", message: "Camera or models not ready." });
      return;
    }
    setIsProcessing(true);
    setAttendanceStatus(null);
    try {
      setVerifyingStep("detecting");
      await new Promise(r => setTimeout(r, 700));
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        setVerifyingStep(null);
        setAttendanceStatus({ type: "error", message: "No face detected. Please look at the camera." });
        setIsProcessing(false);
        return;
      }
      setVerifyingStep("analyzing");
      await new Promise(r => setTimeout(r, 700));
      const descriptor = Array.from(detection.descriptor);
      setVerifyingStep("matching");
      await new Promise(r => setTimeout(r, 700));
      const employee = await findEmployee(descriptor);
      if (!employee) {
        setVerifyingStep(null);
        setAttendanceStatus({ type: "error", message: "Face not recognized. Please register first." });
        setIsProcessing(false);
        return;
      }
      setVerifyingStep("verifying");
      await new Promise(r => setTimeout(r, 600));
      setCurrentEmployee(employee);
      const today = new Date().toISOString().split("T")[0];
      const now   = new Date().toISOString();
      const existing = await checkTodayAttendance(employee.id);
      if (action === "TIME_IN") {
        const photoUrl = await capturePhoto(employee.id, "in");
        if (existing?.time_in) {
          setAttendanceStatus({ type: "warning", message: `${employee.fullname}, already timed in at ${new Date(existing.time_in).toLocaleTimeString()}` });
        } else if (existing) {
          const { error } = await supabase.from("attendance").update({ time_in: now, time_in_photo_url: photoUrl }).eq("id", existing.id);
          setAttendanceStatus(error ? { type: "error", message: `Failed: ${error.message}` } : { type: "success", message: `${employee.fullname}, Time In recorded` });
        } else {
          const { error } = await supabase.from("attendance").insert([{ employee_id: employee.id, attendance_date: today, time_in: now, time_in_photo_url: photoUrl }]);
          setAttendanceStatus(error ? { type: "error", message: `Failed: ${error.message}` } : { type: "success", message: `${employee.fullname}, Time In recorded` });
        }
      } else {
        if (!existing?.time_in) {
          setAttendanceStatus({ type: "warning", message: `${employee.fullname}, you haven't timed in yet.` });
        } else if (existing.time_out) {
          setAttendanceStatus({ type: "warning", message: `${employee.fullname}, already timed out at ${new Date(existing.time_out).toLocaleTimeString()}` });
        } else {
          const photoUrl = await capturePhoto(employee.id, "out");
          const { error } = await supabase.from("attendance").update({ time_out: now, time_out_photo_url: photoUrl }).eq("id", existing.id);
          setAttendanceStatus(error ? { type: "error", message: `Failed: ${error.message}` } : { type: "success", message: `${employee.fullname}, Time Out recorded` });
        }
      }
    } catch (error) {
      setAttendanceStatus({ type: "error", message: `An error occurred: ${error.message}` });
    } finally {
      setVerifyingStep(null);
      setIsProcessing(false);
      setTimeout(() => setCurrentEmployee(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-6xl">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 sm:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-2xl font-bold text-white leading-tight truncate">
                    Employee Attendance
                  </h1>
                  <p className="text-purple-200 text-xs hidden sm:block">Face Recognition System</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl sm:text-3xl font-bold text-white font-mono">{formatTime(currentTime)}</span>
                  <span className="text-sm sm:text-xl text-purple-200 font-mono">{formatSeconds(currentTime)}</span>
                </div>
                <p className="text-purple-200 text-xs hidden sm:block">{formatDate(currentTime)}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col lg:flex-row p-3 sm:p-6 gap-4 sm:gap-6">

            {/* Camera */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-30" />
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] lg:aspect-video">
                  <Webcam
                    ref={webcamRef}
                    mirrored
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      facingMode: "user",
                      width:  { ideal: 640, max: 1280 },
                      height: { ideal: 480, max: 720 },
                    }}
                    onUserMedia={() => setCameraReady(true)}
                    onUserMediaError={() => setCameraReady(false)}
                  />
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
                    <Circle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-red-500 fill-red-500 animate-pulse" />
                    <span className="text-white text-xs font-medium">LIVE</span>
                  </div>
                  <div className="absolute inset-0 border-2 border-cyan-500/40 rounded-2xl pointer-events-none" />
                  {verifyingStep && <FaceScanOverlay step={verifyingStep} />}
                </div>
              </div>
              {!modelsLoaded && (
                <div className="mt-3 sm:mt-4 bg-white/10 backdrop-blur-sm text-cyan-200 p-3 rounded-xl text-center border border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                    <span className="text-sm">Loading face recognition models...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="w-full lg:w-80 space-y-3 sm:space-y-4">
              {currentEmployee && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 sm:p-4 rounded-xl text-center shadow-lg"
                     style={{ animation: "slideDown 0.3s ease-out" }}>
                  <div className="flex items-center justify-center space-x-2">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <div>
                      <p className="text-xs opacity-90">Welcome</p>
                      <p className="font-semibold text-sm sm:text-base">{currentEmployee.fullname}</p>
                    </div>
                  </div>
                </div>
              )}
              {attendanceStatus && (
                <div className={`p-3 rounded-xl text-center text-sm ${
                  attendanceStatus.type === "success" ? "bg-green-500/20 text-green-200 border border-green-500/50" :
                  attendanceStatus.type === "error"   ? "bg-red-500/20 text-red-200 border border-red-500/50" :
                                                        "bg-yellow-500/20 text-yellow-200 border border-yellow-500/50"
                }`}>
                  {attendanceStatus.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <button
                  onClick={() => processAttendance("TIME_IN")}
                  disabled={!modelsLoaded || isProcessing}
                  className={`w-full py-4 rounded-xl text-white font-bold transition-all duration-300 transform text-sm sm:text-base ${
                    !modelsLoaded || isProcessing
                      ? "bg-gray-600/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 hover:shadow-xl active:scale-95"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <CheckCircle className="w-5 h-5" /><span>TIME IN</span>
                    </span>
                  )}
                </button>
                <button
                  onClick={() => processAttendance("TIME_OUT")}
                  disabled={!modelsLoaded || isProcessing}
                  className={`w-full py-4 rounded-xl text-white font-bold transition-all duration-300 transform text-sm sm:text-base ${
                    !modelsLoaded || isProcessing
                      ? "bg-gray-600/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-500 to-pink-600 hover:scale-105 hover:shadow-xl active:scale-95"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <LogOut className="w-5 h-5" /><span>TIME OUT</span>
                    </span>
                  )}
                </button>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-cyan-300 text-xs mb-1">Status</p>
                    <p className="text-white font-semibold text-sm flex items-center justify-center">
                      {modelsLoaded
                        ? <><Check className="w-3 h-3 mr-1 text-green-400" />Ready</>
                        : <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading</>}
                    </p>
                  </div>
                  <div>
                    <p className="text-cyan-300 text-xs mb-1">Camera</p>
                    <p className="text-white font-semibold text-sm flex items-center justify-center">
                      {cameraReady
                        ? <><Camera className="w-3 h-3 mr-1 text-green-400" />Active</>
                        : <><Clock className="w-3 h-3 mr-1 text-yellow-400" />Waiting</>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-1">
                <Link to="/" className="text-cyan-300 hover:text-white text-sm transition-colors duration-200 inline-flex items-center space-x-1">
                  <ArrowLeft className="w-4 h-4" /><span>Back to Admin Login</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white/5 backdrop-blur-sm px-4 sm:px-6 py-3 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-cyan-300">
              <div className="flex items-center space-x-1"><Camera className="w-3 h-3" /><span>Look directly at camera</span></div>
              <div className="flex items-center space-x-1"><Sun className="w-3 h-3" /><span>Ensure good lighting</span></div>
              <div className="flex items-center space-x-1"><CheckCircle className="w-3 h-3 text-green-400" /><span>TIME IN = Arrival</span></div>
              <div className="flex items-center space-x-1"><LogOut className="w-3 h-3 text-red-400" /><span>TIME OUT = Departure</span></div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}