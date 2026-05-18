import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getLiveSocket(): Socket {
  if (!socket || !socket.connected) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    socket = io(`${wsUrl}/live`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectLiveSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
