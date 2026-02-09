import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Analytics } from '../../generated/prisma/client';

export interface CreateAnalyticsData {
  postId: string;
  eventType: string;
  metadata?: string;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private db: DatabaseService) {}

  async create(data: CreateAnalyticsData): Promise<Analytics> {
    return this.db.executeWrite(client => 
      client.analytics.create({ data })
    );
  }

  async findByPost(postId: string): Promise<Analytics[]> {
    return this.db.executeRead(client => 
      client.analytics.findMany({
        where: { postId },
        orderBy: { createdAt: 'desc' },
      })
    );
  }

  async countByPostAndType(postId: string, eventType: string): Promise<number> {
    return this.db.executeRead(client => 
      client.analytics.count({
        where: { postId, eventType },
      })
    );
  }

  async findRecent(limit = 100): Promise<Analytics[]> {
    return this.db.executeRead(client => 
      client.analytics.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    );
  }
}
