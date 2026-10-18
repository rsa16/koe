import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema/index.js";

export async function createMemDb() {
  const client = new PGlite();
  
  // Create schema
  await client.exec(`
    CREATE TYPE user_role AS ENUM ('guest', 'member', 'moderator', 'admin');
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
    CREATE TYPE identity_provider AS ENUM ('anonymous', 'google', 'discord', 'github', 'x');
    CREATE TYPE thread_status AS ENUM ('open', 'closed', 'locked');
    CREATE TYPE comment_status AS ENUM ('pending', 'published', 'spam', 'deleted');
    CREATE TYPE reaction_target_type AS ENUM ('comment', 'thread');
    CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');
    CREATE TYPE moderation_action_verb AS ENUM ('approve', 'reject', 'delete', 'spam', 'ban', 'suspend', 'block');
    CREATE TYPE moderation_target_type AS ENUM ('comment', 'user', 'thread');
    CREATE TYPE network_block_source AS ENUM ('auto');

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role user_role NOT NULL DEFAULT 'guest',
      status user_status NOT NULL DEFAULT 'active',
      name TEXT,
      email TEXT,
      avatar_url TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      displayed_flair_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
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

    CREATE TABLE user_network_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip TEXT NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, ip)
    );

    CREATE INDEX idx_user_network_addresses_last_seen ON user_network_addresses (last_seen_at);

    CREATE TABLE threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_ref TEXT NOT NULL UNIQUE,
      title TEXT,
      url TEXT,
      status thread_status NOT NULL DEFAULT 'open',
      pre_moderation BOOLEAN NOT NULL DEFAULT true,
      comment_count INTEGER NOT NULL DEFAULT 0,
      reaction_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
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
      pinned_at TIMESTAMPTZ,
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
      previous_refresh_token_hash TEXT,
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

    CREATE TABLE reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status report_status NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_reports_comment_id ON reports (comment_id);
    CREATE INDEX idx_reports_status ON reports (status);
    CREATE INDEX idx_reports_reporter_id ON reports (reporter_id);

    CREATE TABLE moderation_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action moderation_action_verb NOT NULL,
      target_type moderation_target_type NOT NULL,
      target_id UUID NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_moderation_actions_target ON moderation_actions (target_type, target_id);
    CREATE INDEX idx_moderation_actions_actor_id ON moderation_actions (actor_id);

    CREATE TABLE network_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ip TEXT NOT NULL,
      reason TEXT NOT NULL,
      source network_block_source NOT NULL DEFAULT 'auto',
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      UNIQUE (ip)
    );

    CREATE INDEX idx_network_blocks_expires_at ON network_blocks (expires_at);

    CREATE TABLE flairs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      colour TEXT NOT NULL,
      rank INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_flairs_rank ON flairs (rank);

    CREATE TABLE user_flairs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flair_id UUID NOT NULL REFERENCES flairs(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, flair_id)
    );

    CREATE INDEX idx_user_flairs_flair_id ON user_flairs (flair_id);
    CREATE INDEX idx_user_flairs_user_id ON user_flairs (user_id);
  `);

  const db = drizzle(client, { schema });
  return { db, client };
}




