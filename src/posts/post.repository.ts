import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Post } from '../../generated/prisma/client';

export interface CreatePostData {
  title: string;
  content: string;
  authorId: string;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  published?: boolean;
}

@Injectable()
export class PostRepository {
  constructor(private db: DatabaseService) {}

  async create(data: CreatePostData): Promise<Post> {
    return this.db.executeWrite(client => 
      client.post.create({ data })
    );
  }

  async update(id: string, data: UpdatePostData): Promise<Post> {
    return this.db.executeWrite(client => 
      client.post.update({ where: { id }, data })
    );
  }

  async delete(id: string): Promise<Post> {
    return this.db.executeWrite(client => 
      client.post.delete({ where: { id } })
    );
  }

  async incrementViewCount(id: string): Promise<Post> {
    return this.db.executeWrite(client => 
      client.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
    );
  }

  async findById(id: string, usePrimary = false): Promise<Post | null> {
    return this.db.executeRead(
      client => client.post.findUnique({ where: { id } }),
      usePrimary
    );
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.db.executeRead(client => 
      client.post.findMany({
        where: { authorId },
        orderBy: { createdAt: 'desc' },
      })
    );
  }

  async findPublished(limit = 50): Promise<Post[]> {
    return this.db.executeRead(client => 
      client.post.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    );
  }

  async findAll(limit = 100): Promise<Post[]> {
    return this.db.executeRead(client => 
      client.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    );
  }
}
