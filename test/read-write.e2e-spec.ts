import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

describe('Read-Write Separation (e2e)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    db = moduleFixture.get<DatabaseService>(DatabaseService);

    await app.init();
  });

  afterAll(async () => {
    await db.executeWrite(client => client.post.deleteMany({}));
    await db.executeWrite(client => client.analytics.deleteMany({}));
    await app.close();
  });

  beforeEach(async () => {
    await db.executeWrite(client => client.post.deleteMany({}));
    await db.executeWrite(client => client.analytics.deleteMany({}));
  });

  describe('Write Operations', () => {
    it('should create post on primary', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Test Post',
          content: 'Test content',
          authorId: 'author-123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test Post');
    });

    it('should update post on primary', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Original',
          content: 'Content',
          authorId: 'author-123',
        });

      const postId = createRes.body.id;

      const updateRes = await request(app.getHttpServer())
        .put(`/posts/${postId}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(updateRes.body.title).toBe('Updated');
    });

    it('should increment view count on primary', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Test',
          content: 'Content',
          authorId: 'author-123',
        });

      const postId = createRes.body.id;

      const viewRes = await request(app.getHttpServer())
        .post(`/posts/${postId}/view`)
        .expect(201);

      expect(viewRes.body.viewCount).toBe(1);
    });
  });

  describe('Read Operations', () => {
    it('should read from replica by default', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Test',
          content: 'Content',
          authorId: 'author-123',
        });

      const postId = createRes.body.id;

      const getRes = await request(app.getHttpServer())
        .get(`/posts/${postId}`)
        .expect(200);

      expect(getRes.body.id).toBe(postId);
    });

    it('should read from primary when consistent=true', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Test',
          content: 'Content',
          authorId: 'author-123',
        });

      const postId = createRes.body.id;

      const getRes = await request(app.getHttpServer())
        .get(`/posts/${postId}?consistent=true`)
        .expect(200);

      expect(getRes.body.id).toBe(postId);
    });

    it('should list published posts from replica', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Published',
          content: 'Content',
          authorId: 'author-123',
        });

      const updateRes = await request(app.getHttpServer())
        .get('/posts?published=true')
        .expect(200);

      expect(Array.isArray(updateRes.body)).toBe(true);
    });
  });

  describe('Analytics', () => {
    it('should track post creation', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Test',
          content: 'Content',
          authorId: 'author-123',
        });

      const postId = createRes.body.id;

      const analytics = await db.executeRead(client =>
        client.analytics.findMany({
          where: { postId, eventType: 'post_created' },
        })
      );

      expect(analytics.length).toBeGreaterThan(0);
    });

    it('should track post views', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Test',
          content: 'Content',
          authorId: 'author-123',
        });

      const postId = createRes.body.id;

      await request(app.getHttpServer())
        .post(`/posts/${postId}/view`)
        .expect(201);

      const analytics = await db.executeRead(client =>
        client.analytics.findMany({
          where: { postId, eventType: 'post_viewed' },
        })
      );

      expect(analytics.length).toBeGreaterThan(0);
    });
  });
});
