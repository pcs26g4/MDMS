import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ComplaintPage.css";
import { uploadComplaints } from "../../services/api";

function ComplaintPage() {
  const navigate = useNavigate();

  const imageGalleryRef = useRef(null);
  const videoGalleryRef = useRef(null);

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    error: null,
  });

  /* ===================== LOCATION GET ===================== */
  // Disabled automatic geolocation to prevent "random" coordinates as per user request
  /*
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
        });
      },
      (err) => {
        setLocation({
          lat: null,
          lng: null,
          error: err.message || "Location unavailable",
        });
      },
      { enableHighAccuracy: true }
    );
  }, []);
  */

  /* =========================================================
      YOLO LIVE CAMERA 
  ========================================================= */

  const [liveYolo, setLiveYolo] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");

  const openCamera = () => {
    // Add timestamp to bypass browser image caching for the multipart stream
    setStreamUrl(`http://127.0.0.1:8000/api/yolo/live?t=${Date.now()}`);
    setLiveYolo(true);
  };

  /* ===================== LIVE LOGS ===================== */
  const [cameraLogs, setCameraLogs] = useState([]);

  useEffect(() => {
    let eventSource;
    if (liveYolo) {
      eventSource = new EventSource("http://127.0.0.1:8000/api/yolo/events");
      eventSource.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.heartbeat) return;
        console.log("Live Log Received:", data);
        setCameraLogs((prev) => [data, ...prev].slice(0, 50));

        // detect deviation and auto-stop
        if (data.capture_filename) {
          console.log("Deviation detected, capturing frame:", data.capture_filename);
          try {
            const res = await fetch(`http://127.0.0.1:8000/api/yolo/capture/${data.capture_filename}`);
            if (res.ok) {
              const blob = await res.blob();
              const file = new File([blob], data.capture_filename, { type: "image/jpeg" });
              setImages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  url: URL.createObjectURL(file),
                  file: file,
                  type: "image",
                  source: "camera", // Marked as camera source
                  lat: location.lat,
                  lng: location.lng,
                }
              ]);

              // Auto-stop the camera UI and release backend
              await closeCamera(false);
            }
          } catch (err) {
            console.error("Failed to capture live frame:", err);
          }
        }
      };
      eventSource.onerror = () => {
        console.error("SSE Connection failed");
        eventSource.close();
      };
    } else {
      setCameraLogs([]);
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [liveYolo]);

  const closeCamera = async (isManual = true) => {
    try {
      // stop backend camera
      await fetch("http://127.0.0.1:8000/api/yolo/stop");
    } catch (err) {
      console.warn("Backend camera stop failed:", err);
    }

    // Reset URL and logs
    setStreamUrl("");
    setLiveYolo(false);
    setCameraLogs([]);

    // If user manually closes the stream, we clear any live-captured images
    // as per user request "if i close camera not will be there"
    if (isManual) {
      setImages((prev) => prev.filter((img) => img.source !== "camera"));
    }
  };

  /* =========================================================
      IMAGE / VIDEO UPLOAD 
  ========================================================= */

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(f),
        file: f,
        type: "image",
        lat: location.lat,
        lng: location.lng,
      })),
    ]);
    e.target.value = "";
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    setVideos((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(f),
        file: f,
        type: "video",
        lat: location.lat,
        lng: location.lng,
      })),
    ]);
    e.target.value = "";
  };

  const resetFiles = () => {
    setImages([]);
    setVideos([]);
  };

  /* =========================================================
      ANALYZE & UPLOAD 
  ========================================================= */

  const handleAnalyze = async () => {
    if (images.length === 0 && videos.length === 0) {
      alert("Please upload at least one file.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const filesToUpload = [
        ...images.map((i) => i.file),
        ...videos.map((v) => v.file),
      ];

      // Pass manual coordinates to the upload function
      const response = await uploadComplaints(
        filesToUpload,
        location.lat,
        location.lng
      );

      navigate("/analyse", {
        state: {
          uploadedFiles: images.concat(videos),
          uploadResponse: response,
        },
      });
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  /* ========================================================= */

  return (
    <div className="complaint-container">

      {/* HEADER */}
      <div className="complaint-header">
        <h2>Municipal Deviation Registration</h2>
        <p>Submit visual evidence for civic issues.</p>
      </div>

      {/* UPLOAD SECTION */}
      <div className="card upload-card">
        <h3>Add Evidence</h3>
        <div className="upload-buttons">
          <button onClick={() => imageGalleryRef.current.click()}>
            📁 Upload Images
          </button>
          <button onClick={() => videoGalleryRef.current.click()}>
            🎥 Upload Videos
          </button>
          <button onClick={openCamera}>📷 Live Camera</button>
        </div>

        <input
          ref={imageGalleryRef}
          type="file"
          hidden
          accept="image/*"
          multiple
          onChange={handleImageUpload}
        />

        <input
          ref={videoGalleryRef}
          type="file"
          hidden
          accept="video/*"
          multiple
          onChange={handleVideoUpload}
        />
      </div>

      {/* ================== YOLO STREAM ================== */}
      {liveYolo && (
        <div className="card camera-section">
          <div className="camera-layout">
            <div className="camera-box">
              <img
                id="yolo-stream"
                src={streamUrl}
                alt="YOLO Live"
                className="yolo-video-feed"
              />
            </div>

            <div className="detection-log-panel">
              <h4>Live Detection Output</h4>
              <div className="log-container">
                {cameraLogs.length === 0 && <p className="no-logs">Initializing AI stream...</p>}
                {cameraLogs.map((log, idx) => (
                  <div key={idx} className="log-entry">
                    <span className="log-time">[{new Date(log.time * 1000).toLocaleTimeString()}]</span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="camera-actions">
            <button onClick={() => closeCamera(true)} className="close-btn">
              ❌ Close Live Stream
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW SECTION */}
      {(images.length > 0 || videos.length > 0) && (
        <div className="card preview">
          <h4>Review Evidence</h4>

          {images.length > 0 && (
            <>
              <p>Images</p>
              <div className="preview-grid">
                {images.map((img) => (
                  <div key={img.id} className="preview-item">
                    <img src={img.url} alt="preview" />
                    <button
                      onClick={() =>
                        setImages((prev) =>
                          prev.filter((i) => i.id !== img.id)
                        )
                      }
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {videos.length > 0 && (
            <>
              <p style={{ marginTop: "16px" }}>Videos</p>
              <div className="preview-grid">
                {videos.map((vid) => (
                  <div key={vid.id} className="preview-item">
                    <video src={vid.url} controls className="preview-video" />
                    <button
                      onClick={() =>
                        setVideos((prev) =>
                          prev.filter((v) => v.id !== vid.id)
                        )
                      }
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ACTION BUTTONS */}
      {(images.length > 0 || videos.length > 0) && (
        <div className="card">
          {uploadError && <div className="error-box">{uploadError}</div>}

          <div className="action-buttons">
            <button className="retry-btn" onClick={resetFiles}>
              Clear Evidence
            </button>
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Proceed to Analysis"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintPage;
