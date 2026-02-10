import { Injectable, NotFoundException } from '@nestjs/common';
import { PostRepository, CreatePostData, UpdatePostData } from './post.repository';
import { AnalyticsRepository } from '../analytics/analytics.repository';
import { Post } from '../../generated/prisma/client';

@Injectable()
export class PostService {
  constructor(
    private postRepo: PostRepository,
    private analyticsRepo: AnalyticsRepository,
  ) {}

  async createPost(data: CreatePostData): Promise<Post> {
    const post = await this.postRepo.create(data);
    
    await this.analyticsRepo.create({
      postId: post.id,
      eventType: 'post_created',
      metadata: JSON.stringify({ authorId: data.authorId }),
    });

    return post;
  }

  async updatePost(id: string, data: UpdatePostData): Promise<Post> {
    return this.postRepo.update(id, data);
  }

  async deletePost(id: string): Promise<void> {
    await this.postRepo.delete(id);
  }

  async getPost(id: string): Promise<Post> {
    const post = await this.postRepo.findById(id, false);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async getPostConsistent(id: string): Promise<Post> {
    const post = await this.postRepo.findById(id, true);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async viewPost(id: string): Promise<Post> {
  await this.postRepo.incrementViewCount(id);

  await this.analyticsRepo.create({
    postId: id,
    eventType: 'post_viewed',
  });

  const post = await this.postRepo.findById(id, true);
  if (!post) throw new NotFoundException('Post not found');

  return post;
}


  async listPublishedPosts(): Promise<Post[]> {
    return this.postRepo.findPublished();
  }

  async listPostsByAuthor(authorId: string): Promise<Post[]> {
    return this.postRepo.findByAuthor(authorId);
  }

  async listAllPosts(): Promise<Post[]> {
    return this.postRepo.findAll();
  }
}