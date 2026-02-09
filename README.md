# Read Write Separation

Explicit database read/write routing for horizontal scaling preparation.

## Setup

```bash
docker-compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

## Why Read/Write Split

Single database hits limits:
- Write contention
- Read queries compete with writes
- Vertical scaling expensive
- No geographic distribution

Read replicas solve this:
- Horizontal read scaling
- Write isolation on primary
- Cheaper replica instances
- Global distribution possible

## Architecture

```
Write → Primary DB
Read (default) → Replica
Read (consistent=true) → Primary
```

## Consistency Tradeoffs

### Eventual Consistency (Replica)
```typescript
// Acceptable staleness
const posts = await postRepo.findPublished();
```

Use for:
- List operations
- Analytics
- Non-critical reads
- Search results

### Strong Consistency (Primary)
```typescript
// Read after write
const post = await postRepo.findById(id, true);
```

Use for:
- Read after write
- Financial data
- Critical transactions
- Sequential operations

## Replication Lag

Writes to primary take time to replicate.

**Milliseconds to seconds** depending on:
- Network latency
- Write volume
- Replica hardware
- Geographic distance

## API Endpoints

**Create Post** (writes to primary)
```bash
POST /posts
{
  "title": "Post Title",
  "content": "Content",
  "authorId": "author-123"
}
```

**Get Post** (eventual)
```bash
GET /posts/:id
```

**Get Post** (consistent)
```bash
GET /posts/:id?consistent=true
```

**View Post** (write + consistent read)
```bash
POST /posts/:id/view
```

**List Published** (eventual)
```bash
GET /posts?published=true
```

## Configuration

```env
DATABASE_URL="primary-url"
REPLICA_DATABASE_URL="replica-url"
REPLICA_ENABLED=false
REPLICA_FALLBACK_TO_PRIMARY=true
```

Local development uses single database with routing pattern enforced.

## Testing

```bash
npm test
```

Verifies:
- Writes route to primary
- Reads route to replica
- Consistent flag works
- Fallback on replica failure

## Production Setup

1. Configure streaming replication
2. Point REPLICA_DATABASE_URL to replica
3. Set REPLICA_ENABLED=true
4. Monitor replication lag
5. Alert on lag > 5 seconds

## When to Use Primary for Reads

- User just created resource
- Financial calculations
- Race condition prevention
- Dependent operations

## When to Use Replica for Reads

- Public feeds
- Search results
- Analytics reports
- Historical data
