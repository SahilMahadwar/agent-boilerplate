CREATE TABLE `app_schedule_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`output_json` text,
	`error` text,
	FOREIGN KEY (`schedule_id`) REFERENCES `app_schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `app_schedule_runs_by_schedule` ON `app_schedule_runs` (`schedule_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `app_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`cron` text NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`input_json` text,
	`status` text DEFAULT 'active' NOT NULL,
	`next_fire_at` integer,
	`last_fire_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_schedules_due` ON `app_schedules` (`status`,`next_fire_at`);