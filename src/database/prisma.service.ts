import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './prisma-soft-delete.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Instância estendida que inclui Soft Delete e outras lógicas globais.
   * Usamos o padrão de "Extended Client" do Prisma 5+.
   */
  readonly extended = this.$extends(softDeleteExtension);

  constructor() {
    super({
      // Configuração de logs estruturados baseada em ambiente
      log: process.env.NODE_ENV === 'development' 
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
          ] 
        : [{ emit: 'stdout', level: 'error' }],
    });

    // Logging de queries em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      (this as any).$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query} | Params: ${e.params}`);
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('🔌 [Database] Connection established with Soft Delete Extension');
    } catch (error) {
      this.logger.error('❌ [Database] Connection failed', error);
      process.exit(1); 
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 [Database] Connection closed');
  }
}