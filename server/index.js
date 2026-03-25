const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
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

  socket.on('locationUpdate', (data) => {
    console.log('Location update received:', data);
    
    // Validate data briefly
    if (data.lat && data.lng) {
      currentWalks.push({
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp || Date.now()
      });

      // Save to file (in a real app, use a DB to avoid file locking issues on high concurrency)
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentWalks));

      // Broadcast to all other clients (e.g. Dashboard)
      socket.broadcast.emit('locationUpdate', data);
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
