CREATE TYPE "public"."reaction_target_type" AS ENUM('comment', 'thread');--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "reaction_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "reaction_totals" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reactions_target_user_emoji" ON "reactions" USING btree ("target_type","target_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "idx_reactions_target_id" ON "reactions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_user_id" ON "reactions" USING btree ("user_id");