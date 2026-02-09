import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { AnalyticsRepository } from '../analytics/analytics.repository';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [PostController],
  providers: [PostService, PostRepository, AnalyticsRepository, DatabaseService],
  exports: [PostService],
})
export class PostModule {}
