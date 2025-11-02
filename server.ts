import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, Planet } from './src/types/socket.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active planets in memory
const activePlanets = new Map<string, Planet>();

// Mock planets (4 initial planets with random colors)
const MOCK_PLANETS: Planet[] = [
  {
    id: 'mock-1',
    userId: 'mock-1',
    color: '#FF6B6B',
    position: [0, 0, 0],
    orbitRadius: 8,
    orbitSpeed: 0.3,
    size: 0.8,
    isUser: false,
  },
  {
    id: 'mock-2',
    userId: 'mock-2',
    color: '#4ECDC4',
    position: [0, 0, 0],
    orbitRadius: 12,
    orbitSpeed: 0.2,
    size: 1.0,
    isUser: false,
  },
  {
    id: 'mock-3',
    userId: 'mock-3',
    color: '#95E1D3',
    position: [0, 0, 0],
    orbitRadius: 16,
    orbitSpeed: 0.15,
    size: 0.9,
    isUser: false,
  },
  {
    id: 'mock-4',
    userId: 'mock-4',
    color: '#F38181',
    position: [0, 0, 0],
    orbitRadius: 20,
    orbitSpeed: 0.12,
    size: 1.1,
    isUser: false,
  },
];

// Initialize mock planets
MOCK_PLANETS.forEach(planet => {
  activePlanets.set(planet.userId, planet);
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🌍 Cliente conectado:', socket.id);

    // Send current planets to new user
    socket.emit('planets:update', Array.from(activePlanets.values()));

    // Handle planet join
    socket.on('planet:join', ({ color, userName }) => {
      const userId = socket.id;
      
      // Find next available orbit radius
      const usedRadii = Array.from(activePlanets.values())
        .filter(p => p.isUser)
        .map(p => p.orbitRadius);
      
      let orbitRadius = 24;
      while (usedRadii.includes(orbitRadius)) {
        orbitRadius += 4;
      }

      const newPlanet: Planet = {
        id: userId,
        userId,
        color,
        position: [0, 0, 0],
        orbitRadius,
        orbitSpeed: 0.1 + Math.random() * 0.1,
        size: 0.8 + Math.random() * 0.4,
        isUser: true,
        userName,
      };

      activePlanets.set(userId, newPlanet);
      
      // Notify all clients
      io.emit('planet:added', newPlanet);
      console.log('🪐 Nuevo planeta añadido:', userId, color);
    });

    // Handle color update
    socket.on('planet:updateColor', (color) => {
      const userId = socket.id;
      const planet = activePlanets.get(userId);
      
      if (planet) {
        planet.color = color;
        activePlanets.set(userId, planet);
        io.emit('planet:colorChanged', userId, color);
        console.log('🎨 Color actualizado:', userId, color);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userId = socket.id;
      const planet = activePlanets.get(userId);
      
      if (planet && planet.isUser) {
        activePlanets.delete(userId);
        io.emit('planet:removed', userId);
        console.log('🚀 Planeta eliminado:', userId);
      }
    });
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('> Socket.IO server running');
    });
});
