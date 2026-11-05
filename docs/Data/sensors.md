# Sensors

An Arduino UNO R4 WiFi reads every sensor every 15 minutes, on the clock (:00, :15, :30, :45).

| Measures | Part | Connection |
|---|---|---|
| Air temperature, humidity, pressure | BME280 | Qwiic, address 0x76 |
| Light | AP3216 | Qwiic, address 0x1E |
| UV | GUVA | Analog pin A0 |
| Rock surface temperature | DS18B20 probe | Digital pin D2 |
| Time | DS3231 clock | Qwiic, address 0x68 |
| Storage | SD card | Chip select pin 10 |

## Rules

1. Each reading is written to the SD card first. The card is the record.
2. Then the reading is sent over WiFi to the database.
3. If sending fails, up to 32 readings (8 hours) wait in memory and are sent later.
4. Anything missing from the database can be imported from the card.
5. The day's card is taken out at 11 pm and goes back in before midnight (see Data rules).
6. The SD card must be FAT32, 32 GB or smaller. One year of readings is about 3.5 MB.
7. All times from the Arduino are in UTC.

## Dew point

Dew point isn't measured. The Arduino works it out from temperature and humidity.

## Before each rock

- Check that light reads above 0 in daylight.
- Check that UV rises above its dark reading in sun.
