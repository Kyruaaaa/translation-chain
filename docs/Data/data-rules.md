# Data rules

## What is compared

| Measurement | At the rock | From the forecast | Drives |
|---|---|---|---|
| Temperature | Air temperature | Air temperature | Water |
| Humidity | Humidity | Humidity | Sandpaper |
| Light | Lux | Sun on an east-facing wall | Chisel |
| UV | UV reading | UV index | Hammer |
| Pressure | Air pressure | Air pressure | Nothing yet |
| Surface temperature | Probe on the rock | Ground surface temperature | Nothing yet |

## The rules

1. **A day runs from 12 am to 11 pm, Rhode Island time.** One reading every 15 minutes makes 92 readings.
2. **The gap is always rock minus forecast.** Above zero means the rock is higher.
3. **Light is compared as a share.** Lux and watts can't be subtracted, so each is divided by the day's brightest moment, and the two shares are compared.
4. **UV starts at its dark reading.** The sensor reads about 0.10 in the dark, so the night-time reading is subtracted first.
5. **Each hour uses its average.** Four readings become one gap for the choreography.
6. **A missing reading stays missing.** It's never filled in. In the choreography it's a pause.
7. **The data is never cleaned to look better.** A strange day is still that day.

## The last hour

11 pm to midnight isn't recorded. It's the hour for checking:

1. Take the SD card out.
2. Import the day's readings into the database.
3. Check that the day is complete and the numbers look right.
4. Check the sensors.
5. Put the card back before midnight.

If anything was recorded in this hour, it isn't used.

## To decide

- Which temperature counts for the choreography: air, or the probe on the rock?
- Does pressure get a role?
