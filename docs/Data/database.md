# Database

The readings live in a MySQL database. Two automated workflows in n8n fill it.

| Workflow | Runs | Does |
|---|---|---|
| Rock sensor | When the Arduino sends a reading | Saves the reading |
| Open-Meteo | Every hour | Saves the forecast, and refills the past 7 days |

## Tables

| Table | One row per | Holds |
|---|---|---|
| `rocks` | Rock | ID, type, origin, hardness, start time |
| `sensor_readings` | 15 minutes | What the sensors read |
| `api_readings` | 15 minutes | What the forecast said |

## Views

| View | Shows |
|---|---|
| `diff_15min` | Rock minus forecast, for each 15 minutes |
| `sensor_local` | Sensor readings in Rhode Island time |
| `api_local` | The forecast in Rhode Island time |
| `rock_day_summary` | The totals for each rock's day |
| `rock_peak_lag` | How long after the forecast's warmest moment the rock reached its own |

## Rules

1. Times are stored in **UTC**. UTC never repeats an hour, and local time does on the night the clocks go back.
2. Times are read in **Rhode Island time**, using the views.
3. A row is matched to the forecast by its exact 15-minute time.
4. A reading belongs to the latest rock whose start time is before it.
5. Test readings never go in the database.
6. A day is imported from its SD card at 11 pm. Readings after 11 pm aren't used.
