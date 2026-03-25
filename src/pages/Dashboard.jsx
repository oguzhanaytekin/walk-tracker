import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const socket = io(window.location.origin, {
  transports: ['websocket'],
  upgrade: false
});


// Component to handle auto-centering the map
const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

const Dashboard = () => {
  const [path, setPath] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [stats, setStats] = useState({ distance: 0, duration: 0 });

  useEffect(() => {
    socket.on('initialData', (data) => {
      if (data && data.length > 0) {
        const coords = data.map(p => [p.lat, p.lng]);
        setPath(coords);
        setCurrentPos(coords[coords.length - 1]);
      }
    });

    socket.on('locationUpdate', (data) => {
      const newCoord = [data.lat, data.lng];
      setPath(prev => [...prev, newCoord]);
      setCurrentPos(newCoord);
    });

    socket.on('walkCleared', () => {
      setPath([]);
      setCurrentPos(null);
    });

    return () => {
      socket.off('initialData');
      socket.off('locationUpdate');
      socket.off('walkCleared');
    };
  }, []);

  // Simple distance calculation (Haversine simplified)
  useEffect(() => {
    if (path.length < 2) return;
    
    let totalDist = 0;
    for (let i = 1; i < path.length; i++) {
        const p1 = L.latLng(path[i-1][0], path[i-1][1]);
        const p2 = L.latLng(path[i][0], path[i][1]);
        totalDist += p1.distanceTo(p2);
    }
    setStats(prev => ({ ...prev, distance: (totalDist / 1000).toFixed(2) }));
  }, [path]);

  return (
    <div className="relative w-full h-screen bg-slate-900">
      {/* Overlay Stats */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-xl">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Canlı Yürüyüş Verisi</h2>
          <div className="flex gap-12">
            <div>
              <span className="block text-3xl font-black text-white">{stats.distance} <span className="text-sm font-normal text-slate-500">km</span></span>
              <span className="text-xs text-blue-400 font-medium">Toplam Mesafe</span>
            </div>
            <div className="border-l border-slate-700 pl-12">
              <span className="block text-3xl font-black text-white">{path.length}</span>
              <span className="text-xs text-emerald-400 font-medium">Veri Noktası</span>
            </div>
          </div>
        </div>
      </div>

      <MapContainer 
        center={[39.9334, 32.8597]} // Default Ankara
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {path.length > 0 && (
          <>
            <Polyline 
              positions={path} 
              color="#3b82f6" 
              weight={5} 
              opacity={0.8}
              lineCap="round"
            />
            {currentPos && (
               <Marker position={currentPos}>
                 <RecenterMap position={currentPos} />
               </Marker>
            )}
          </>
        )}
      </MapContainer>

      {/* Connection Toast */}
      <div className="absolute bottom-6 right-6 z-[1000]">
         <div className={`px-4 py-2 rounded-full text-xs font-mono border transition-all ${socket.connected ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-red-900/40 border-red-500 text-red-300 animate-pulse'}`}>
            {socket.connected ? 'SERVER CONNECTED' : 'SERVER DISCONNECTED'}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
