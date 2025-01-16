import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.query.token;
    try {
      const payload = this.jwtService.verify(token); // Verify JWT
      client.data.user = payload;
    } catch (err) {
      client.disconnect();
    }
  }
}
