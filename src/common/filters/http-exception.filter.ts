import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { HttpAdapterHost } from '@nestjs/core';
  import { Prisma } from '@prisma/client';
  
  @Catch()
  export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);
  
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  
    catch(exception: unknown, host: ArgumentsHost): void {
      const { httpAdapter } = this.httpAdapterHost;
      const ctx = host.switchToHttp();
  
      let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      let message: string | string[] = 'Internal server error';
      let error = 'Internal Server Error';
  
      // 1. Erros HTTP conhecidos (NestJS)
      if (exception instanceof HttpException) {
        httpStatus = exception.getStatus();
        const responseBody = exception.getResponse();
        
        if (typeof responseBody === 'string') {
          message = responseBody;
        } else if (typeof responseBody === 'object' && responseBody !== null) {
          // Captura mensagens de validação (class-validator retorna array)
          message = (responseBody as any).message || message;
          error = (responseBody as any).error || error;
        }
      } 
      // 2. Erros do Prisma (Banco de Dados)
      else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
        // Mapeamento de códigos de erro do Prisma para HTTP
        switch (exception.code) {
          case 'P2002': // Unique constraint failed
            httpStatus = HttpStatus.CONFLICT;
            message = 'Este registro já existe (dado duplicado).';
            error = 'Conflict';
            break;
          case 'P2025': // Record not found
            httpStatus = HttpStatus.NOT_FOUND;
            message = 'Registro não encontrado.';
            error = 'Not Found';
            break;
          default:
            // Loga o erro original para o dev, mas não expõe para o usuário
            this.logger.error(`Prisma Error: ${exception.code}`, exception);
            message = 'Erro na operação com o banco de dados.';
        }
      }
      // 3. Erros Genéricos
      else {
        this.logger.error('Unhandled Exception:', exception);
      }
  
      const responseBody = {
        statusCode: httpStatus,
        // Se for array (erros de validação), mantém array. Se string, mantém string.
        message, 
        error,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
      };
  
      httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
  }