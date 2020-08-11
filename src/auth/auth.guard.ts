import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { fromDynamicKey } from './auth.utils';
import { globalApikey, authMode, ipWhitelist } from '../.config';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  validateRequest(request: Request) {
    let valid = false;
    const { headers } = request;
    const ip = Object.keys(headers).includes('x-real-ip')
      ? headers['x-real-ip'].toString()
      : '0.0.0.0';
    const mode = ipWhitelist.includes(ip) ? 'skip' : authMode.toString();
    switch (mode) {
      case 'skip':
        valid = true;
        break;
      case 'dynamic':
      case 'strict':
        const result = this.matchDynamic(headers);
        if (result.valid) {
          valid = true;
        }
        break;
      default:
        valid = this.matchApiKey(headers);
        break;
    }
    return valid;
  }

  matchApiKey(headers) {
    let valid = false;
    if (headers instanceof Object) {
      const { apikey } = headers;
      valid = apikey === globalApikey;
    }
    return valid;
  }

  matchDynamic(headers) {
    const out = { valid: false, uid: '' };
    if (headers instanceof Object) {
      const { token } = headers;
      if (typeof token === 'string') {
        const { valid, uid } = fromDynamicKey(token);
        if (valid) {
          out.valid = valid;
        }
        if (uid) {
          out.uid = uid;
        }
      }
    }
    return out;
  }
}
