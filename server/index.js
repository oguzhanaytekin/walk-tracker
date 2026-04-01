const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json()); // Required for parsing application/json

const authRouter = require('./auth');
app.use('/api/auth', authRouter);

const db = require('./db');

// Haversine formula for anti-cheat
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

const userLastLocations = {}; // Track user coords in memory

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});


const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data.json if it doesn't exist
let currentWalks = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE);
    currentWalks = JSON.parse(rawData);
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
} catch (error) {
  console.error('Error reading/writing data.json:', error);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send the existing path to the newly connected user (e.g., Dashboard)
  socket.emit('initialData', currentWalks);

  socket.on('locationUpdate', async (data) => {
    // Validate data briefly
    if (data.lat && data.lng && data.userId) {
      const userId = data.userId;
      const teamColor = data.teamColor || 'GRAY';
      const currentTime = Date.now();
      let speedKmh = 0;
      let isValid = true;

      // 1. Anti-Cheat: Speed Check
      if (userLastLocations[userId]) {
        const lastLoc = userLastLocations[userId];
        const dist = getDistanceFromLatLonInKm(lastLoc.lat, lastLoc.lng, data.lat, data.lng);
        const timeDiffHours = (currentTime - lastLoc.timestamp) / (1000 * 60 * 60);
        
        if (timeDiffHours > 0) speedKmh = dist / timeDiffHours;

        if (speedKmh > 20) { // Limit: 20 km/h
          isValid = false;
          socket.emit('cheatWarning', { message: 'Aşırı hız tespit edildi (Araç). Skorlama durduruldu!' });
        }
      }

      userLastLocations[userId] = { lat: data.lat, lng: data.lng, timestamp: currentTime };

      // Push real-time dot info
      currentWalks.push({
        lat: data.lat,
        lng: data.lng,
        timestamp: currentTime,
        userId: userId,
        teamColor: teamColor,
        isValid: isValid
      });

      // Save to file (in a real app, use a DB to avoid file locking issues on high concurrency)
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentWalks));

      // Broadcast to all other clients (e.g. Dashboard)
      socket.broadcast.emit('locationUpdate', { ...data, isValid });

      // 2. Point-in-Polygon Check (Gamification)
      if (isValid) {
        try {
          // Find neighborhood: PostGIS ST_Contains (geom, Point(lon, lat))
          const nQuery = `
            SELECT id, name, district, score_red, score_blue, score_green, owner_team 
            FROM neighborhoods 
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
            LIMIT 1
          `;
          const res = await db.query(nQuery, [data.lng, data.lat]);

          if (res.rows.length > 0) {
            const n = res.rows[0];
            let updateColumn = null;
            if (teamColor === 'RED') updateColumn = 'score_red';
            else if (teamColor === 'BLUE') updateColumn = 'score_blue';
            else if (teamColor === 'GREEN') updateColumn = 'score_green';

            if (updateColumn) {
              const newScore = n[updateColumn] + 1;
              let newOwner = n.owner_team;
              
              const scores = {
                  RED: updateColumn === 'score_red' ? newScore : n.score_red,
                  BLUE: updateColumn === 'score_blue' ? newScore : n.score_blue,
                  GREEN: updateColumn === 'score_green' ? newScore : n.score_green
              };
              
              const highestScore = Math.max(scores.RED, scores.BLUE, scores.GREEN);
              if (highestScore > 0) {
                  if (scores.RED === highestScore) newOwner = 'RED';
                  if (scores.BLUE === highestScore) newOwner = 'BLUE';
                  if (scores.GREEN === highestScore) newOwner = 'GREEN';
              }

              await db.query(`
                UPDATE neighborhoods 
                SET ${updateColumn} = ${updateColumn} + 1, owner_team = $1
                WHERE id = $2
              `, [newOwner, n.id]);

              // Broadcast territory capture update
              io.emit('neighborhoodUpdate', {
                 id: n.id,
                 name: n.name,
                 owner_team: newOwner,
                 scores: scores
              });
            }
          }
        } catch (err) {
          console.error("Game DB Logic Error:", err.message);
        }
      }
    }
  });

  socket.on('clearWalk', () => {
    console.log('Clearing walk data');
    currentWalks = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    io.emit('walkCleared');
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../dist')));

app.get('/api/walks', (req, res) => {
  res.json(currentWalks);
});

app.get('/api/neighborhoods', async (req, res) => {
  try {
    const nQuery = `SELECT id, name, district, owner_team, score_red, score_blue, score_green, ST_AsGeoJSON(geom) as geom FROM neighborhoods`;
    const result = await db.query(nQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// React app routes (Explicitly defined for Express 5 stability)
const serveIndex = (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
};

app.get('/', serveIndex);
app.get('/tracker', serveIndex);
app.get('/dashboard', serveIndex);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
