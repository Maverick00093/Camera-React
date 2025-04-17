import React, { useState, useRef, useEffect } from 'react';

function Camera() {
  const [mode, setMode] = useState('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaItems, setMediaItems] = useState(() => {
    const savedItems = localStorage.getItem('cameraMediaItems');
    return savedItems ? JSON.parse(savedItems) : [];
  });
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

  useEffect(() => {
    localStorage.setItem('cameraMediaItems', JSON.stringify(mediaItems));
  }, [mediaItems]);

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
    const newMediaItem = {
      id: Date.now(),
      type: 'photo',
      url: imageUrl,
      timestamp: new Date().toLocaleString()
    };
    setMediaItems(prevItems => [...prevItems, newMediaItem]);
  };

  const startRecording = async () => {
    try {
      if (!videoRef.current || !videoRef.current.srcObject) {
        await startCamera();
      }

      const stream = videoRef.current.srcObject;
      if (!stream) {
        throw new Error('No media stream available');
      }

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const newMediaItem = {
          id: Date.now(),
          type: 'video',
          url: videoUrl,
          timestamp: new Date().toLocaleString(),
          blob: blob // Store the blob for later use
        };
        setMediaItems(prevItems => [...prevItems, newMediaItem]);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please make sure camera access is granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteItem = (index) => {
    setMediaItems(prevItems => {
      const newItems = [...prevItems];
      const deletedItem = newItems[index];
      
      // Revoke object URL for videos to prevent memory leaks
      if (deletedItem.type === 'video') {
        URL.revokeObjectURL(deletedItem.url);
      }
      
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const handleModeChange = async (newMode) => {
    setMode(newMode);
    // Restart camera with new audio settings when switching modes
    await stopCamera();
    await startCamera();
  };

  return (
    <div className="camera-container">
      <div className="camera-controls">
        <button 
          className={`mode-button ${mode === 'photo' ? 'active' : ''}`}
          onClick={() => handleModeChange('photo')}
        >
          📸 Photo Mode
        </button>
        <button 
          className={`mode-button ${mode === 'video' ? 'active' : ''}`}
          onClick={() => handleModeChange('video')}
        >
          🎥 Video Mode
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
                {isRecording ? '⏹️ Stop Recording' : '⏺️ Start Recording'}
              </button>
            )}
          </div>
        </div>

        <div className="gallery">
          <h2>📁 Gallery</h2>
          <div className="media-grid">
            {mediaItems.map((item, index) => (
              <div key={item.id} className="media-item" onClick={() => setSelectedItem(item)}>
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
                  }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="preview-modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {selectedItem.type === 'photo' ? (
              <img src={selectedItem.url} alt="Preview" />
            ) : (
              <video src={selectedItem.url} controls autoPlay />
            )}
            <button 
              className="close-button" 
              onClick={() => setSelectedItem(null)}
            >
              ✖️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Camera;
