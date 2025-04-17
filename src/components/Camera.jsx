import React, { useState, useRef, useEffect } from 'react';

function Camera() {
  const [mode, setMode] = useState('photo'); // 'photo' or 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: mode === 'video'
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg');
    setMediaItems([...mediaItems, {
      type: 'photo',
      url: imageUrl,
      timestamp: new Date().toLocaleString()
    }]);
  };

  const startRecording = () => {
    chunksRef.current = [];
    const stream = videoRef.current.srcObject;
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setMediaItems([...mediaItems, {
        type: 'video',
        url: videoUrl,
        timestamp: new Date().toLocaleString()
      }]);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const deleteItem = (index) => {
    const newMediaItems = [...mediaItems];
    newMediaItems.splice(index, 1);
    setMediaItems(newMediaItems);
  };

  return (
    <div className="camera-container">
      <div className="camera-controls">
        <button 
          className={`mode-button ${mode === 'photo' ? 'active' : ''}`}
          onClick={() => setMode('photo')}
        >
          Photo Mode
        </button>
        <button 
          className={`mode-button ${mode === 'video' ? 'active' : ''}`}
          onClick={() => setMode('video')}
        >
          Video Mode
        </button>
      </div>

      <div className="main-content">
        <div className="camera-view">
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
          />
          <div className="capture-controls">
            {mode === 'photo' ? (
              <button className="capture-button" onClick={capturePhoto}>
                📸 Capture
              </button>
            ) : (
              <button 
                className={`record-button ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? '⏹️ Stop' : '⏺️ Record'}
              </button>
            )}
          </div>
        </div>

        <div className="gallery">
          <h2>Gallery</h2>
          <div className="media-grid">
            {mediaItems.map((item, index) => (
              <div key={index} className="media-item" onClick={() => setSelectedItem(item)}>
                {item.type === 'photo' ? (
                  <img src={item.url} alt={`Captured ${item.timestamp}`} />
                ) : (
                  <video src={item.url} />
                )}
                <div className="media-overlay">
                  <span>{item.timestamp}</span>
                  <button className="delete-button" onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(index);
                  }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="preview-modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content">
            {selectedItem.type === 'photo' ? (
              <img src={selectedItem.url} alt="Preview" />
            ) : (
              <video src={selectedItem.url} controls autoPlay />
            )}
            <button className="close-button">✖️</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Camera;