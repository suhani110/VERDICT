import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});