import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    try {
        const client = context.switchToWs().getClient();
        const token = client.handshake.auth.token

        if(!token) {
            throw new WsException("No token provided")
        }

        const payload = this.jwtService.verify(token)
        context.switchToWs().getData().user = payload

        return true
    } catch (error) {
        throw new WsException("Invalid Token")
    }
  }
}