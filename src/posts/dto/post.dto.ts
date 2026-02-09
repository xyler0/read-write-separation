export class CreatePostDto {
  title!: string;
  content!: string;
  authorId!: string;
}

export class UpdatePostDto {
  title?: string;
  content?: string;
  published?: boolean;
}

export class PostResponseDto {
  id!: string;
  title!: string;
  content!: string;
  authorId!: string;
  published!: boolean;
  viewCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
