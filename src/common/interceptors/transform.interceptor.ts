import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  
  export interface Response<T> {
    data: T;
    meta: {
      timestamp: string;
      path: string;
    };
  }
  
  @Injectable()
  export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>>
  {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<Response<T>> {
      const request = context.switchToHttp().getRequest();
  
      return next.handle().pipe(
        map((data) => {
          // Ignora se for stream ou se o controller retornou null (ex: 204 No Content)
          if (data && data.stream) return data;
          
          return {
            data: data || null, // Garante que data nunca seja undefined
            meta: {
              timestamp: new Date().toISOString(),
              path: request.url,
            },
          };
        }),
      );
    }
  }