import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, GeoJSON } from 'react-leaflet';
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

const SOCKET_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : '/';
const socket = io(SOCKET_URL, {
  path: '/socket.io',
  transports: ['polling', 'websocket']
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
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const nUrl = import.meta.env.MODE === 'development' ? 'http://localhost:3001/api/neighborhoods' : '/api/neighborhoods';
    fetch(nUrl).then(res => res.json())
      .then(data => setNeighborhoods(data))
      .catch(console.error);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    const onInitialData = (data) => {
      if (data && data.length > 0) {
        const coords = data.map(p => [p.lat, p.lng]);
        setPath(coords);
        setCurrentPos(coords[coords.length - 1]);
      }
    };

    const onLocationUpdate = (data) => {
      const newCoord = [data.lat, data.lng];
      setPath(prev => [...prev, newCoord]);
      setCurrentPos(newCoord);
    };

    const onWalkCleared = () => {
      setPath([]);
      setCurrentPos(null);
    };

    const onNeighborhoodUpdate = (data) => {
      setNeighborhoods(prev => prev.map(n => n.id === data.id ? { ...n, owner_team: data.owner_team, score_red: data.scores.RED, score_blue: data.scores.BLUE, score_green: data.scores.GREEN } : n));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('initialData', onInitialData);
    socket.on('locationUpdate', onLocationUpdate);
    socket.on('walkCleared', onWalkCleared);
    socket.on('neighborhoodUpdate', onNeighborhoodUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('initialData', onInitialData);
      socket.off('locationUpdate', onLocationUpdate);
      socket.off('walkCleared', onWalkCleared);
      socket.off('neighborhoodUpdate', onNeighborhoodUpdate);
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
        center={[39.920770, 32.854110]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {neighborhoods && neighborhoods.length > 0 && neighborhoods.map(n => {
           let color = '#64748b';
           if (n.owner_team === 'RED') color = '#ef4444';
           else if (n.owner_team === 'BLUE') color = '#3b82f6';
           else if (n.owner_team === 'GREEN') color = '#10b981';

           return (n.geom && (
             <GeoJSON 
               key={n.id + '_' + n.owner_team}
               data={JSON.parse(n.geom)} 
               style={{
                 color: color,
                 weight: 2,
                 opacity: 0.8,
                 fillColor: color,
                 fillOpacity: 0.25
               }}
             />
           ));
        })}

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
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-max">
         <div className={`px-6 py-2 rounded-full text-[10px] font-mono border backdrop-blur-md transition-all shadow-lg ${socket.connected ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300' : 'bg-red-900/60 border-red-500 text-red-300 animate-pulse'}`}>
            {socket.connected ? '● SERVER CONNECTED' : '○ SERVER DISCONNECTED'}
         </div>
      </div>

    </div>
  );
};

export default Dashboard;
