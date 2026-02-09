import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto, PostResponseDto } from './dto/post.dto';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Post()
  async create(@Body() dto: CreatePostDto): Promise<PostResponseDto> {
    return this.postService.createPost(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto): Promise<PostResponseDto> {
    return this.postService.updatePost(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.postService.deletePost(id);
    return { message: 'Post deleted' };
  }

  @Get(':id')
  async getPost(@Param('id') id: string, @Query('consistent') consistent?: string): Promise<PostResponseDto> {
    if (consistent === 'true') {
      return this.postService.getPostConsistent(id);
    }
    return this.postService.getPost(id);
  }

  @Post(':id/view')
  async viewPost(@Param('id') id: string): Promise<PostResponseDto> {
    return this.postService.viewPost(id);
  }

  @Get()
  async listPosts(
    @Query('authorId') authorId?: string,
    @Query('published') published?: string,
  ): Promise<PostResponseDto[]> {
    if (authorId) {
      return this.postService.listPostsByAuthor(authorId);
    }
    if (published === 'true') {
      return this.postService.listPublishedPosts();
    }
    return this.postService.listAllPosts();
  }
}
