import * as faceapi from "face-api.js";
import { supabase } from "../services/supabase";

// Euclidean distance between two face descriptors
export const getDistance = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
};

// Find closest matching employee by face descriptor
export const findEmployee = async (descriptor) => {
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
  } catch {
    return null;
  }
};

// Check if employee already has attendance record for today
export const checkTodayAttendance = async (employeeId) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("attendance_date", today)
      .maybeSingle();
    return error ? null : data;
  } catch {
    return null;
  }
};

// Capture photo from webcam and upload to Supabase storage
export const capturePhoto = async (webcamRef, employeeId, eventType) => {
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
  if (uploadError) {
    console.error("Upload error:", uploadError);
    return null;
  }
  const { data: { publicUrl } } = supabase.storage.from("employee-photos").getPublicUrl(filePath);
  return publicUrl;
};

// Load face-api models from CDN
export const loadFaceModels = async (setStatusCallback) => {
  try {
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    return true;
  } catch (err) {
    if (setStatusCallback) setStatusCallback({ type: "error", message: "Failed to load face detection models" });
    return false;
  }
};