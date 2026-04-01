import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : '/';
const socket = io(SOCKET_URL, {
  path: '/socket.io',
  transports: ['polling', 'websocket']
});


const Tracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }

    setIsTracking(true);
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        const newLocation = { 
          lat: latitude, 
          lng: longitude, 
          timestamp: Date.now(),
          userId: user?.id,
          username: user?.username,
          teamColor: user?.teamColor || 'GRAY'
        };
        
        setLocation(newLocation);
        socket.emit('locationUpdate', newLocation);
      },
      (err) => {
        setError("Konum alınamadı: " + err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const clearHistory = () => {
    if (window.confirm("Tüm yürüyüş verilerini temizlemek istediğinize emin misiniz?")) {
      socket.emit('clearWalk');
    }
  };

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 w-full text-center">
      <div className="mb-8 p-6 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Walk Tracker
        </h1>
        <p className="text-slate-400 mb-6 italic">Yürüyüşünü kaydet ve paylaş</p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="py-5 px-8 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="w-4 h-4 bg-white rounded-full animate-pulse"></span>
              Yürüyüşü Başlat
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="py-5 px-8 bg-red-600 hover:bg-red-500 rounded-2xl text-xl font-bold transition-all shadow-lg shadow-red-900/20 active:scale-95"
            >
              Yürüyüşü Durdur
            </button>
          )}

          {location && (
            <div className="mt-4 p-4 bg-slate-700/50 rounded-xl text-left">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Anlık Veri</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Enlem</span>
                  <span className="font-mono text-sm">{location.lat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Boylam</span>
                  <span className="font-mono text-sm">{location.lng.toFixed(6)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={clearHistory}
        className="text-slate-500 text-xs underline hover:text-slate-300 transition-colors"
      >
        Geçmişi Temizle (Sıfırla)
      </button>
      
      <div className="mt-12 text-slate-600 text-[10px] font-mono">
        Status: {socket.connected ? 'Bağlı' : 'Bağlanıyor...'}
      </div>
    </div>
  );
};

export default Tracker;
