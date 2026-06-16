import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import Layout from "../components/Layout";
import { supabase } from "../services/supabase";
import { useSearchParams, Link } from "react-router-dom";
import { 
  User, 
  Camera, 
  Circle, 
  Loader2, 
  CheckCircle, 
  ArrowLeft,
  ScanFace,
  Sun
} from "lucide-react";

export default function RegisterFace() {
  const webcamRef = useRef(null);
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("id");
  
  const [employee, setEmployee] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // LOAD MODELS - Using CDN
  const loadModels = async () => {
    try {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      console.log("Models loaded!");
    } catch (error) {
      console.error("Error loading models:", error);
      alert("Failed to load face detection. Check your internet connection.");
    }
  };

  const loadEmployee = async () => {
    if (!employeeId) return;
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();
    if (data) setEmployee(data);
  };

  useEffect(() => {
    loadModels();
    loadEmployee();
  }, [employeeId]);

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatSeconds = (date) => {
    return date.getSeconds().toString().padStart(2, '0');
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const registerFace = async () => {
    if (!employee) {
      alert("Employee not found");
      return;
    }

    const video = webcamRef.current?.video;
    
    if (!video || !modelsLoaded) {
      alert("Please wait, camera or models are still loading...");
      return;
    }

    setIsRegistering(true);

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert("No face detected. Please look at the camera.");
        setIsRegistering(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      
      const { error } = await supabase
        .from("employees")
        .update({ face_descriptor: descriptor })
        .eq("id", employee.id);

      if (!error) {
        alert(`Face registered for ${employee.fullname}`);
        window.location.href = "/employees";
      } else {
        alert("Failed to save. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Error occurred. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (!employee) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading employee data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          {/* Main Container */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <ScanFace className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Face Registration</h1>
                    <p className="text-purple-200 text-sm">Register employee face for recognition</p>
                  </div>
                </div>
                
                {/* Real-time Clock */}
                <div className="text-right">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-white font-mono">{formatTime(currentTime)}</span>
                    <span className="text-xl text-purple-200 font-mono">{formatSeconds(currentTime)}</span>
                  </div>
                  <p className="text-purple-200 text-xs">{formatDate(currentTime)}</p>
                </div>
              </div>
            </div>

            {/* Main Content - Landscape Layout */}
            <div className="flex flex-col lg:flex-row p-6 gap-6">
              
              {/* Left Side - Camera */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30"></div>
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                    <Webcam
                      ref={webcamRef}
                      className="w-full h-full object-cover"
                      mirrored
                      videoConstraints={{
                        width: 640,
                        height: 480,
                        facingMode: "user"
                      }}
                    />
                    {/* Live indicator */}
                    <div className="absolute top-3 right-3 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <Circle className="w-2.5 h-2.5 text-red-500 fill-red-500 animate-pulse" />
                      <span className="text-white text-xs font-medium">LIVE</span>
                    </div>
                    {/* Face detection overlay */}
                    <div className="absolute inset-0 border-2 border-purple-500/50 rounded-2xl pointer-events-none"></div>
                  </div>
                </div>

                {/* Loading Status */}
                {!modelsLoaded && (
                  <div className="mt-4 bg-white/10 backdrop-blur-sm text-purple-200 p-3 rounded-xl text-center border border-white/10">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                      <span className="text-sm">Loading face detection models...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Employee Info & Controls */}
              <div className="w-full lg:w-80 space-y-4">
                
                {/* Employee Information Card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">{employee.fullname}</h3>
                    <p className="text-purple-300 text-sm">{employee.position || "Employee"}</p>
                    {employee.department && (
                      <p className="text-purple-300 text-xs mt-1">{employee.department}</p>
                    )}
                  </div>
                  
                  <div className="border-t border-white/10 pt-3 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-300">Employee ID:</span>
                      <span className="text-white font-mono">{employee.employee_id}</span>
                    </div>
                  </div>
                </div>

                {/* Status Message */}
                {!modelsLoaded && (
                  <div className="bg-yellow-500/20 text-yellow-200 p-3 rounded-xl text-center border border-yellow-500/50">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Models loading...</span>
                    </div>
                  </div>
                )}

                {/* Register Button */}
                <button
                  onClick={registerFace}
                  disabled={!modelsLoaded || isRegistering}
                  className={`w-full py-4 rounded-xl text-white font-bold transition-all duration-300 transform ${
                    !modelsLoaded || isRegistering
                      ? "bg-gray-600/50 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 hover:shadow-xl active:scale-95"
                  }`}
                >
                  {isRegistering ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Registering...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <Camera className="w-5 h-5" />
                      <span>Register Face</span>
                    </span>
                  )}
                </button>

                {/* Quick Stats */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-purple-300 text-xs">Status</p>
                      <p className="text-white font-semibold text-sm flex items-center justify-center">
                        {modelsLoaded ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
                            Ready
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Loading
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-300 text-xs">Camera</p>
                      <p className="text-white font-semibold text-sm flex items-center justify-center">
                        {webcamRef.current?.video ? (
                          <>
                            <Camera className="w-3 h-3 mr-1 text-green-400" />
                            Active
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Waiting
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Back Link */}
                <div className="text-center pt-2">
                  <Link to="/employees" className="text-purple-300 hover:text-white text-sm transition-colors duration-200 inline-flex items-center space-x-1">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Employees</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer Instructions */}
            <div className="bg-white/5 backdrop-blur-sm px-6 py-3 border-t border-white/10">
              <div className="flex items-center justify-center space-x-6 text-xs text-purple-300">
                <div className="flex items-center space-x-1">
                  <Camera className="w-3 h-3" />
                  <span>Look directly at camera</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Sun className="w-3 h-3" />
                  <span>Ensure good lighting</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Circle className="w-3 h-3 text-green-400" />
                  <span>Center your face</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-blue-400" />
                  <span>Keep steady</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}