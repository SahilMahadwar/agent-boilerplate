-- Example: plan activities for Pune every morning. Paused so it spends no model
-- tokens until it is switched on from the Schedules page.
INSERT OR IGNORE INTO `app_schedules`
  (`id`, `name`, `target_type`, `target_id`, `cron`, `timezone`, `input_json`, `status`, `created_at`, `updated_at`)
VALUES
  ('weather-morning', 'Morning activities in Pune', 'workflow', 'weather-workflow', '0 8 * * *', 'Asia/Kolkata',
   '{"city":"Pune"}', 'paused', unixepoch() * 1000, unixepoch() * 1000);
