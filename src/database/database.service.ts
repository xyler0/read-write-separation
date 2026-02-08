import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly writeClient: PrismaClient;
  private readonly readClient: PrismaClient;
  private readonly replicaEnabled: boolean;
  private readonly fallbackToPrimary: boolean;

  constructor(private config: ConfigService) {
    const primaryUrl = this.config.get<string>('DATABASE_URL')!;
    const replicaUrl = this.config.get<string>('REPLICA_DATABASE_URL');
    this.replicaEnabled = this.config.get<boolean>('REPLICA_ENABLED', false);
    this.fallbackToPrimary = this.config.get<boolean>('REPLICA_FALLBACK_TO_PRIMARY', true);

    this.writeClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: primaryUrl }),
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
    });

    if (this.replicaEnabled && replicaUrl) {
      this.readClient = new PrismaClient({
        adapter: new PrismaPg({ connectionString: replicaUrl }),
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
      });
      this.logger.log('Read replica enabled');
    } else {
      this.readClient = this.writeClient;
      this.logger.log('Using primary for reads (replica disabled)');
    }
  }

  async onModuleInit() {
    await this.writeClient.$connect();
    this.logger.log('Connected to primary database');
    
    if (this.readClient !== this.writeClient) {
      await this.readClient.$connect();
      this.logger.log('Connected to read replica');
    }
  }

  async onModuleDestroy() {
    await this.writeClient.$disconnect();
    if (this.readClient !== this.writeClient) {
      await this.readClient.$disconnect();
    }
  }

  async executeWrite<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return operation(this.writeClient);
  }

  async executeRead<T>(operation: (client: PrismaClient) => Promise<T>, usePrimary = false): Promise<T> {
    if (usePrimary) {
      this.logger.debug('Using primary for read (consistency required)');
      return operation(this.writeClient);
    }

    try {
      return await operation(this.readClient);
    } catch (error) {
      if (this.fallbackToPrimary && this.readClient !== this.writeClient) {
        this.logger.warn('Replica read failed, falling back to primary');
        return operation(this.writeClient);
      }
      throw error;
    }
  }
}
