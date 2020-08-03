import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { globalApikey } from '../.config';

const validateRequest = request => {
  let valid = false;
  if (request.headers instanceof Object) {
    const { apikey } = request.headers;
    valid = apikey === globalApikey;
  }
  return valid;
};

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}
