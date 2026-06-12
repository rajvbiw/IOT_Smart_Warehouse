import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

class SocketService {
  private io: SocketIOServer | null = null;

  public init(httpServer: HTTPServer, corsOrigin: string = '*'): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io',
    });

    this.io.on('connection', (socket) => {
      console.log(`Socket client connected: ${socket.id}`);

      // Client joins a room for a specific warehouse
      socket.on('join_warehouse', (warehouseId: string | number) => {
        const roomName = `warehouse_${warehouseId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
      });

      socket.on('leave_warehouse', (warehouseId: string | number) => {
        const roomName = `warehouse_${warehouseId}`;
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left room: ${roomName}`);
      });

      socket.on('disconnect', () => {
        console.log(`Socket client disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io server not initialized. Call init() first.');
    }
    return this.io;
  }

  /**
   * Emit a real-time event to a specific warehouse room
   */
  public emitToWarehouse(warehouseId: number | string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(`warehouse_${warehouseId}`).emit(event, payload);
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  public broadcast(event: string, payload: any): void {
    if (this.io) {
      this.io.emit(event, payload);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
