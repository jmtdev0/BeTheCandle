import { Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { SocketServer as IOServer } from '@/lib/socket-server';

export interface SocketServer extends HTTPServer {
  io?: IOServer;
}

export interface SocketWithIO extends Socket {
  server: SocketServer;
}

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIO;
}
