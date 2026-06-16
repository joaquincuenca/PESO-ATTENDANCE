// LiveFacialLandmarks.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

const LiveFacialLandmarks = ({ videoRef, onLandmarksDetected }) => {
  const canvasRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [isLandmarkerReady, setIsLandmarkerReady] = useState(false);
  const requestRef = useRef(null);
  const lastVideoTime = useRef(-1);

  // 1. Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    const initializeLandmarker = async () => {
      try {
        // Create the FilesetResolver to load the WASM files
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // Create and configure the FaceLandmarker
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU" // Use GPU for better performance
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        setFaceLandmarker(landmarker);
        setIsLandmarkerReady(true);
      } catch (error) {
        console.error("Failed to initialize FaceLandmarker:", error);
      }
    };

    initializeLandmarker();

    // Cleanup: Close the landmarker when the component unmounts
    return () => {
      if (faceLandmarker) {
        faceLandmarker.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // 2. Draw landmarks on canvas
  const drawLandmarks = useCallback((landmarks, canvasCtx, canvasElement, videoElement) => {
    if (!canvasCtx || !landmarks) return;
    
    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Set canvas dimensions to match the video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Use DrawingUtils for standard connections and rendering
    const drawingUtils = new DrawingUtils(canvasCtx);
    
    // Loop through detected faces (we've set numFaces: 1)
    for (const landmarksData of landmarks) {
      // Draw the connecting lines (mesh)
      drawingUtils.drawConnectors(landmarksData, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#00E5FF', lineWidth: 1 });
      // Draw the landmark points
      drawingUtils.drawLandmarks(landmarksData, { color: '#FFD700', radius: 1.5, lineWidth: 0.5 });
      
      // Optional: Add glowing effect on key points (eyes, nose, mouth corners)
      const keyPointsIndices = [33, 133, 362, 263, 1, 61, 291, 17];
      canvasCtx.save();
      canvasCtx.shadowBlur = 6;
      canvasCtx.shadowColor = '#00FFFF';
      keyPointsIndices.forEach(index => {
        const point = landmarksData[index];
        if (point) {
          canvasCtx.beginPath();
          canvasCtx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 3, 0, 2 * Math.PI);
          canvasCtx.fillStyle = '#00FFFF';
          canvasCtx.fill();
        }
      });
      canvasCtx.restore();
    }

    // Callback to parent component with landmark data (optional)
    if (onLandmarksDetected && landmarks && landmarks.length > 0) {
      onLandmarksDetected(landmarks[0]);
    }
  }, [onLandmarksDetected]);

  // 3. Main detection loop
  useEffect(() => {
    const video = videoRef?.current?.video;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !faceLandmarker || !isLandmarkerReady) {
      return;
    }

    const canvasCtx = canvas.getContext("2d");
    
    const detectAndDraw = async () => {
      if (!video || video.readyState !== 4 || !faceLandmarker) {
        requestRef.current = requestAnimationFrame(detectAndDraw);
        return;
      }

      const startTimeMs = performance.now();
      
      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        
        // Detect landmarks for the current video frame
        const result = faceLandmarker.detectForVideo(video, startTimeMs);
        
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          drawLandmarks(result.faceLandmarks, canvasCtx, canvas, video);
        } else {
          // Clear canvas if no face is detected
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          if (onLandmarksDetected) onLandmarksDetected(null);
        }
      }
      
      requestRef.current = requestAnimationFrame(detectAndDraw);
    };
    
    requestRef.current = requestAnimationFrame(detectAndDraw);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [faceLandmarker, isLandmarkerReady, videoRef, drawLandmarks, onLandmarksDetected]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

export default LiveFacialLandmarks;