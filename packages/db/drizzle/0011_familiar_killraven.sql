CREATE TYPE "public"."network_block_source" AS ENUM('auto');--> statement-breakpoint
ALTER TYPE "public"."moderation_action_verb" ADD VALUE 'block';--> statement-breakpoint
CREATE TABLE "network_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"reason" text NOT NULL,
	"source" "network_block_source" DEFAULT 'auto' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "network_blocks" ADD CONSTRAINT "network_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_network_blocks_ip" ON "network_blocks" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "idx_network_blocks_expires_at" ON "network_blocks" USING btree ("expires_at");