import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema/index.js";

export async function createMemDb() {
  const client = new PGlite();
  
  // Create schema
  await client.exec(`
    CREATE TYPE user_role AS ENUM ('guest', 'member', 'moderator', 'admin');
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
    CREATE TYPE identity_provider AS ENUM ('anonymous', 'google', 'github', 'x');
    CREATE TYPE thread_status AS ENUM ('open', 'closed', 'locked');
    CREATE TYPE comment_status AS ENUM ('pending', 'published', 'spam', 'deleted');
    CREATE TYPE reaction_target_type AS ENUM ('comment', 'thread');

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role user_role NOT NULL DEFAULT 'guest',
      status user_status NOT NULL DEFAULT 'active',
      name TEXT,
      email TEXT,
      avatar_url TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE identities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider identity_provider NOT NULL,
      provider_user_id TEXT NOT NULL,
      profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_ref TEXT NOT NULL UNIQUE,
      title TEXT,
      url TEXT,
      status thread_status NOT NULL DEFAULT 'open',
      pre_moderation BOOLEAN NOT NULL DEFAULT true,
      comment_count INTEGER NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id UUID,
      body_md TEXT NOT NULL,
      body_html TEXT NOT NULL,
      status comment_status NOT NULL DEFAULT 'pending',
      depth INTEGER NOT NULL DEFAULT 0,
      path TEXT NOT NULL DEFAULT '',
      upvotes INTEGER NOT NULL DEFAULT 0,
      downvotes INTEGER NOT NULL DEFAULT 0,
      reaction_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      edited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK (value IN (1, -1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (comment_id, user_id)
    );

    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_type reaction_target_type NOT NULL,
      target_id UUID NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (target_type, target_id, user_id, emoji)
    );

    CREATE INDEX idx_reactions_target_id ON reactions (target_type, target_id);
    CREATE INDEX idx_reactions_user_id ON reactions (user_id);
  `);

  const db = drizzle(client, { schema });
  return { db, client };
}




