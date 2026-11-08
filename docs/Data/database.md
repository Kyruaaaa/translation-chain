# Database

```sql
-- Translation Chain database (MySQL 8)
-- All timestamps are UTC, on 15-minute steps.

CREATE DATABASE IF NOT EXISTS translation_chain;
USE translation_chain;

-- One row per rock. start_ts = when the rock went into the harness (UTC).
-- Every sensor reading is assigned to the latest rock whose start_ts is before it.
CREATE TABLE IF NOT EXISTS rocks (
  rock_id    VARCHAR(40)  PRIMARY KEY,          -- e.g. '2026-10-20_basalt'
  rock_type  VARCHAR(64),
  origin     VARCHAR(128),
  mohs       FLOAT,
  start_ts   DATETIME     NOT NULL,
  notes      TEXT,
  INDEX (start_ts)
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  ts              DATETIME PRIMARY KEY,          -- UTC slot, from the Arduino
  rock_id         VARCHAR(40),
  temp_c          FLOAT,
  humidity        FLOAT,
  dew_c           FLOAT,
  pressure_hpa    FLOAT,
  lux             FLOAT,
  uv_index        FLOAT,
  pm25            FLOAT,
  pm10            FLOAT,
  rock_surface_c  FLOAT,
  received_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (rock_id)
);

-- Hourly-only API variables (pressure, UV, cloud, surface temp, PM) are copied
-- onto all four 15-minute rows of their hour by the n8n workflow.
CREATE TABLE IF NOT EXISTS api_readings (
  ts                    DATETIME PRIMARY KEY,    -- UTC slot
  temperature_2m        FLOAT,
  relative_humidity_2m  FLOAT,
  dew_point_2m          FLOAT,
  gti_w_m2              FLOAT,                   -- global_tilted_irradiance, vertical, facing the window
  surface_pressure      FLOAT,
  uv_index              FLOAT,
  cloud_cover           FLOAT,
  soil_temperature_0cm  FLOAT,
  pm2_5                 FLOAT,
  pm10                  FLOAT,
  fetched_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Each 15-minute step side by side: sensor minus model, in real units.
-- TEMPORARY: while the BME280 is out, d_temp_c falls back to the probe (rock surface) temperature.
-- temp_source says which one each row used. Once the BME280 works, temp_c is filled and wins again.
CREATE OR REPLACE VIEW diff_15min AS
SELECT
  s.ts,
  CONVERT_TZ(s.ts, 'UTC', 'America/New_York') AS ts_local,   -- Rhode Island time, for reading
  s.rock_id,
  COALESCE(s.temp_c, s.rock_surface_c) - a.temperature_2m AS d_temp_c,
  IF(s.temp_c IS NULL, 'probe', 'air')     AS temp_source,
  s.humidity       - a.relative_humidity_2m  AS d_humidity,
  s.dew_c          - a.dew_point_2m          AS d_dew_c,
  s.pressure_hpa   - a.surface_pressure      AS d_pressure_hpa,
  s.uv_index       - a.uv_index              AS d_uv_index,
  s.pm25           - a.pm2_5                 AS d_pm25,
  s.pm10           - a.pm10                  AS d_pm10,
  s.rock_surface_c - a.soil_temperature_0cm  AS d_surface_c,
  s.lux,                                     -- light: different units, compare curve shapes
  a.gti_w_m2,
  a.cloud_cover
FROM sensor_readings s
JOIN api_readings a ON a.ts = s.ts;

-- The same tables with Rhode Island time first, for looking at the data.
-- Storage stays in UTC: it matches the Arduino and Open-Meteo, and UTC never repeats an hour
-- (on the night clocks go back, 1:00-2:00 am happens twice in local time).
CREATE OR REPLACE VIEW sensor_local AS
SELECT CONVERT_TZ(ts, 'UTC', 'America/New_York') AS ts_local, s.*
FROM sensor_readings s;

CREATE OR REPLACE VIEW api_local AS
SELECT CONVERT_TZ(ts, 'UTC', 'America/New_York') AS ts_local, a.*
FROM api_readings a;

-- One row per rock: the numbers the chisel rule can use.
CREATE OR REPLACE VIEW rock_day_summary AS
WITH d AS (
  SELECT *,
         LAG(d_temp_c) OVER (PARTITION BY rock_id ORDER BY ts) AS prev_d_temp
  FROM diff_15min
)
SELECT
  rock_id,
  MIN(ts)                         AS first_ts,
  MAX(ts)                         AS last_ts,
  COUNT(*)                        AS readings,           -- 96 = a full day
  ROUND(AVG(d_temp_c), 2)         AS avg_d_temp_c,
  ROUND(SUM(ABS(d_temp_c)) * 0.25, 2) AS temp_degree_hours, -- |difference| summed over the day
  ROUND(MAX(d_temp_c), 2)         AS max_d_temp_c,
  ROUND(MIN(d_temp_c), 2)         AS min_d_temp_c,
  SUM(CASE WHEN prev_d_temp IS NOT NULL
            AND SIGN(d_temp_c) <> SIGN(prev_d_temp) THEN 1 ELSE 0 END) AS warmer_colder_swaps,
  ROUND(AVG(d_humidity), 2)       AS avg_d_humidity,
  ROUND(AVG(d_dew_c), 2)          AS avg_d_dew_c,
  ROUND(AVG(d_pressure_hpa), 2)   AS avg_d_pressure_hpa,
  ROUND(AVG(d_uv_index), 2)       AS avg_d_uv_index,
  ROUND(AVG(d_pm25), 1)           AS avg_d_pm25
FROM d
GROUP BY rock_id;

-- How many minutes after the model's warmest moment the rock reached its own.
CREATE OR REPLACE VIEW rock_peak_lag AS
WITH s AS (
  SELECT rock_id, ts,
         ROW_NUMBER() OVER (PARTITION BY rock_id ORDER BY temp_c DESC) AS r
  FROM sensor_readings WHERE rock_id IS NOT NULL AND temp_c IS NOT NULL
),
m AS (
  SELECT sr.rock_id, a.ts,
         ROW_NUMBER() OVER (PARTITION BY sr.rock_id ORDER BY a.temperature_2m DESC) AS r
  FROM sensor_readings sr JOIN api_readings a ON a.ts = sr.ts
  WHERE sr.rock_id IS NOT NULL AND a.temperature_2m IS NOT NULL
)
SELECT s.rock_id,
       s.ts AS rock_peak_ts,
       m.ts AS model_peak_ts,
       TIMESTAMPDIFF(MINUTE, m.ts, s.ts) AS lag_minutes
FROM s JOIN m ON m.rock_id = s.rock_id AND m.r = 1
WHERE s.r = 1;

-- Each morning, when a new rock goes into the harness (time in UTC = New York + 4 h until Nov 1, + 5 h after):
-- INSERT INTO rocks (rock_id, rock_type, origin, mohs, start_ts)
-- VALUES ('2026-10-20_basalt', 'basalt', 'rock shop, Providence', 6, '2026-10-20 13:00:00');

-- The two queries the chart reads, once for each day ('2026-11-06' is an example day).
-- The forecast:
SELECT DATE_FORMAT(ts_local, '%H:%i'), temperature_2m, relative_humidity_2m, gti_w_m2, uv_index
FROM api_local WHERE DATE(ts_local) = '2026-11-06' ORDER BY ts;

-- The rock:
SELECT DATE_FORMAT(ts_local, '%H:%i'), temp_c, humidity, lux, uv_index
FROM sensor_local WHERE DATE(ts_local) = '2026-11-06' ORDER BY ts;
```
