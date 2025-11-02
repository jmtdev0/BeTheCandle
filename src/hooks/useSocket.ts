'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, Planet } from '@/types/socket';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [myPlanetId, setMyPlanetId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
  const initSocket = async (): Promise<ClientSocket> => {
      const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
      const path = process.env.NEXT_PUBLIC_SOCKET_PATH?.trim() || '/socket.io';

      const socketInstance: ClientSocket = io(url || undefined, {
        path,
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('✅ Conectado al servidor Socket.IO');
        setIsConnected(true);
        setMyPlanetId(socketInstance.id || null);
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Desconectado del servidor Socket.IO');
        setIsConnected(false);
      });

      socketInstance.on('planets:update', (updatedPlanets) => {
        setPlanets(updatedPlanets);
      });

      socketInstance.on('planet:added', (planet) => {
        setPlanets((prev) => {
          // Avoid duplicates
          if (prev.some(p => p.id === planet.id)) return prev;
          return [...prev, planet];
        });
      });

      socketInstance.on('planet:removed', (userId) => {
        setPlanets((prev) => prev.filter(p => p.userId !== userId));
      });

      socketInstance.on('planet:colorChanged', (userId, color) => {
        setPlanets((prev) =>
          prev.map(p => p.userId === userId ? { ...p, color } : p)
        );
      });

      setSocket(socketInstance);
      return socketInstance;
    };

    let currentSocket: ClientSocket | null = null;
    initSocket().then((instance) => {
      currentSocket = instance;
    });

    return () => {
      if (currentSocket) {
        currentSocket.disconnect();
      }
    };
  }, []);

  const joinAsPlanet = useCallback((color: string, userName?: string) => {
    if (socket) {
      socket.emit('planet:join', { color, userName });
    }
  }, [socket]);

  const updateColor = useCallback((color: string) => {
    if (socket) {
      socket.emit('planet:updateColor', color);
    }
  }, [socket]);

  const leavePlanet = useCallback(() => {
    if (socket) {
      socket.emit('planet:leave');
    }
  }, [socket]);

  return {
    socket,
    planets,
    myPlanetId,
    isConnected,
    joinAsPlanet,
    updateColor,
    leavePlanet,
  };
}
