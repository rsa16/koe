CREATE TABLE "user_network_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ip" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_network_addresses" ADD CONSTRAINT "user_network_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_network_addresses_user_ip" ON "user_network_addresses" USING btree ("user_id","ip");--> statement-breakpoint
CREATE INDEX "idx_user_network_addresses_last_seen" ON "user_network_addresses" USING btree ("last_seen_at");