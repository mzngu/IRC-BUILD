
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { AuthService } from '../auth.service';



@Injectable()

export class LocalAuthGuard implements CanActivate {

  constructor(private authService: AuthService) {}



  async canActivate(context: ExecutionContext): Promise<boolean> {

    const request = context.switchToHttp().getRequest();

    const { username, password } = request.body;

    const user = await this.authService.validateUser(username, password);

    if (!user) {

      return false;

    }

    request.user = user;

    return true;

  }

}
