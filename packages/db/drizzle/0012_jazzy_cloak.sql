CREATE TABLE "flairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"colour" text NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flairs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_flairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"flair_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_flairs" ADD CONSTRAINT "user_flairs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_flairs" ADD CONSTRAINT "user_flairs_flair_id_flairs_id_fk" FOREIGN KEY ("flair_id") REFERENCES "public"."flairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_flairs_rank" ON "flairs" USING btree ("rank");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_flairs_user_flair" ON "user_flairs" USING btree ("user_id","flair_id");--> statement-breakpoint
CREATE INDEX "idx_user_flairs_flair_id" ON "user_flairs" USING btree ("flair_id");--> statement-breakpoint
CREATE INDEX "idx_user_flairs_user_id" ON "user_flairs" USING btree ("user_id");