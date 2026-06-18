import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Link } from "react-router-dom";
import {
  User, Clock, CheckCircle, LogOut, ArrowLeft,
  Loader2, Camera, Circle, Sun, Check,
} from "lucide-react";

import FaceScanOverlay from "../components/FaceScanOverlay";
import {
  findEmployee,
  checkTodayAttendance,
  capturePhoto,
  loadFaceModels,
} from "../utils/faceAttendance";
import { supabase } from "../services/supabase";

export default function EmployeeLogin() {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [verifyingStep, setVerifyingStep] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Time display updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load face-api models on mount
  useEffect(() => {
    loadFaceModels(setAttendanceStatus).then(success => {
      if (success) setModelsLoaded(true);
    });
  }, []);

  const formatTime = d => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const formatSeconds = d => d.getSeconds().toString().padStart(2, "0");
  const formatDate = d => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

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
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setVerifyingStep(null);
        setAttendanceStatus({ type: "error", message: "No face detected. Please look at the camera." });
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
        return;
      }

      setVerifyingStep("verifying");
      await new Promise(r => setTimeout(r, 600));
      setCurrentEmployee(employee);

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();
      const existing = await checkTodayAttendance(employee.id);

      if (action === "TIME_IN") {
        const photoUrl = await capturePhoto(webcamRef, employee.id, "in");
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
        // TIME_OUT
        if (!existing?.time_in) {
          setAttendanceStatus({ type: "warning", message: `${employee.fullname}, you haven't timed in yet.` });
        } else if (existing.time_out) {
          setAttendanceStatus({ type: "warning", message: `${employee.fullname}, already timed out at ${new Date(existing.time_out).toLocaleTimeString()}` });
        } else {
          const photoUrl = await capturePhoto(webcamRef, employee.id, "out");
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
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] md:aspect-[4/3] lg:aspect-video">
                  <Webcam
                    ref={webcamRef}
                    mirrored
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      facingMode: "user",
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                      aspectRatio: 1.777777778, // 16:9
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