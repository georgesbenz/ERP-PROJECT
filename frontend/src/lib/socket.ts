import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(tenantId: string): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/events`, {
      auth: { tenantId },
      autoConnect: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinUserRoom(userId: string) {
  if (socket?.connected) {
    socket.emit('join-user', { userId });
  }
}
