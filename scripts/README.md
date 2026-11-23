# Scripts

Standalone dev/test utilities for Lasform. Nothing here is part of the build — run them
directly with Node.

## `simulate-device.js`

Simulates a real device by POSTing events to Lasform's ingestion endpoint, `POST /api/v1/events`
(see `EventController`) — the same endpoint a real device calls. That endpoint is deliberately
left open (no auth), since devices don't go through the interactive login flow, so this script
needs nothing beyond a running backend.

Requires Node 18+ (uses the global `fetch`, plus the built-in `node:fs`/`node:crypto`) and no npm
dependencies.

### How it works

On each tick (every `--interval` seconds) the script:

1. Picks a compass bearing (0–360°). By default this is fully random each tick (a random walk).
   Pass `--max-heading-change <degrees>` to instead turn gradually — each new bearing stays
   within that many degrees of the previous one, which reads as a realistic, vehicle-like path
   instead of the default's sharp zig-zags.
2. Moves `--move-meters` from its current position in that direction, using a spherical-earth
   destination-point formula (start point + bearing + distance → new lat/lon) — not a route
   along real roads.
3. POSTs a single event for the new position, as a one-element array (the ingestion endpoint
   always takes a batch) — `payload` is only present when `--payload-template`/
   `--payload-template-file` is used (see [Payload templates](#payload-templates)):

   ```json
   [
     {
       "type": "LOCATION_RECEIVED",
       "source": "DEVICE",
       "deviceId": "sim-device-1",
       "point": { "type": "Point", "coordinates": [-74.006012, 40.712923] },
       "speed": 2,
       "heading": 137,
       "accuracy": 5,
       "occurredAt": "2026-08-27T18:04:11.234Z",
       "payload": { "temperature": 9.8 }
     }
   ]
   ```

4. Prints the result (`OK` or the HTTP failure) and sleeps until the next tick.

Repeats forever until you stop it with Ctrl+C, or until `--iterations` updates have been sent.

### Device types and movement

`--device-type` picks a movement profile, using the same vocabulary as the backend's own
`DeviceType` enum:

| `--device-type` | Movement |
| --- | --- |
| `GPS_TRACKER` (default) | moves every tick (the behavior above) |
| `VEHICLE_UNIT`, `MOBILE_PHONE`, `WEARABLE` | moves every tick — same math, just a label |
| `IOT_SENSOR`, `OTHER` | **stationary** — `--move-meters` defaults to `0` (point stays fixed at `--lat`/`--lon`; no `heading` is sent) and `--event-type` defaults to `OTHER` |

Device type only sets *defaults* — any flag you pass explicitly always wins, so e.g.
`--device-type IOT_SENSOR --move-meters 5` is a perfectly valid "sensor on a forklift".

### Payload templates

`--payload-template <json>` (or `--payload-template-file <path>`) attaches a custom JSON object
to every event's `payload` field — e.g. a temperature sensor's reading — using placeholder
strings for the parts that should vary each tick:

```bash
node scripts/simulate-device.js --device-id sensor-7 --device-type IOT_SENSOR \
  --payload-template '{"temperature":"<float:2-15:1>","humidity":"<float:30-90:0>"}'
```

Ready-made templates for several device kinds live in `scripts/payload-templates/` — see
[Sample templates](#sample-templates) below.

#### Placeholder syntax

A placeholder is `<type[:args]>`, written as a plain JSON string. The template is parsed and
compiled once at startup — an unknown type, a malformed range, an empty `enum`, etc. is reported
immediately (naming the exact JSON path) rather than only surfacing on the first failed request.

- If the **entire** string is one placeholder (e.g. `"<float:2-15>"`), it's replaced with a real
  JSON number/boolean/string — the field becomes that type, not a quoted placeholder.
- If the string **contains** a placeholder alongside other text (e.g. `"sensor-<int:1-999>"`),
  each match is stringified and spliced in; the result stays a string.
- Anything else is a literal, used as-is — write a fixed value as normal JSON, write a
  placeholder where you want it generated.

| Type | Args | Example | Produces |
| --- | --- | --- | --- |
| `int` | `min-max[:step]` | `<int:0-100>` | random integer, inclusive |
| `float` | `min-max[:decimals]` | `<float:2-15:1>` | random float, rounded to `decimals` (default `2`) |
| `bool` | `[pTrue]` | `<bool:0.3>` | random boolean (default `pTrue=0.5`) |
| `enum` (alias `choice`) | `opt1\|opt2\|...` | `<enum:OK\|WARN\|FAIL>` | random pick |
| `string` | `len[:charset]` | `<string:8>` | random string (`charset`: `alnum` default, `alpha`, `numeric`, `hex`) |
| `uuid` | — | `<uuid>` | a random UUID v4 |
| `timestamp` | `[offsetSeconds]` | `<timestamp>` | current ISO-8601 instant, optionally offset |
| `sequence` | `[start[:step]]` | `<sequence:1000:0.5>` | advances by `step` every tick (default `start=0`, `step=1`); ignores `--seed` — it's meant to be exactly predictable |
| `drift` | `min-max:maxStepPerTick[:decimals]` | `<drift:2-15:0.5>` | like `--max-heading-change` for a value: nudges by at most `maxStepPerTick` from its previous value each tick (clamped to the range), instead of an independent random draw — reads as gradual sensor drift instead of noise teleporting every tick |

Ranges use a single `-`, e.g. `2-15` or `-25--15` — unambiguous even with negative bounds, since
digits can't absorb a sign or the separator.

Numbers/booleans/`null` elsewhere in the JSON (and nested objects/arrays) are always literal;
only string leaves are scanned for placeholders, so arrays of templated objects work too:

```json
{ "channels": [{ "name": "ch1", "value": "<float:0-10>" }, { "name": "ch2", "value": "<float:0-10>" }] }
```

### Connecting it to a real device record

`deviceId` is matched against a `Device`'s **`deviceIdentifier`** field, not its database id —
and the match is best-effort (`EventIngestionService.syncDeviceState`): if no `Device` with that
identifier exists yet, the event is still stored (so it'll still show up in `/api/v1/events`
searches), it just won't update anything else. If a matching `Device` *does* exist, every
successful tick updates that device's `lastKnownPoint`, `lastSeenAt`, and (if you send one)
`batteryLevel` — which is exactly what makes the device marker move live on the map.

So to watch a simulated device move on the map:

1. Create a device via the Devices management page (or `POST /api/v1/devices`) with a
   `deviceIdentifier` — e.g. `truck-42`.
2. Run the script with that same id: `--device-id truck-42`.
3. Open the map — the device's marker updates on every tick.

### Options

| Flag | Description | Default |
| --- | --- | --- |
| `--base-url <url>` | Backend base URL | `http://localhost:8078` |
| `--device-id <id>` | Device identifier to report as (matches `Device.deviceIdentifier`) | `sim-device-1` |
| `--device-type <type>` | `GPS_TRACKER`, `MOBILE_PHONE`, `VEHICLE_UNIT`, `WEARABLE`, `IOT_SENSOR`, `OTHER` — see [Device types and movement](#device-types-and-movement) | `GPS_TRACKER` |
| `--interval <seconds>` | Seconds between updates | `5` |
| `--lat <degrees>` | Starting latitude | `40.7128` |
| `--lon <degrees>` | Starting longitude | `-74.0060` |
| `--move-meters <m>` | Distance moved each tick, in meters (`0` is valid — stationary) | `10`; `0` for `IOT_SENSOR`/`OTHER` |
| `--max-heading-change <deg>` | Max heading change between ticks, in degrees | unconstrained (fully random each tick) |
| `--accuracy <m>` | Reported GPS accuracy, in meters | `5` |
| `--iterations <n>` | Stop after `n` updates (`0` = forever) | `0` |
| `--event-type <type>` | Event type to submit (any `EventType` enum value) | `LOCATION_RECEIVED`; `OTHER` for `IOT_SENSOR`/`OTHER` |
| `--payload-template <json>` | Inline JSON payload template — see [Payload templates](#payload-templates) | none |
| `--payload-template-file <path>` | Path to a JSON file containing the payload template | none |
| `--seed <n>` | Seed the RNG for a reproducible run (affects movement *and* payload values) | random |
| `-h, --help` | Show usage and exit | |

Flags accept either `--flag value` or `--flag=value`.

### Examples

Run with all defaults — a device named `sim-device-1` wandering near lower Manhattan,
reporting every 5 seconds until you Ctrl+C it:

```bash
node scripts/simulate-device.js
```

Simulate a specific device, starting in London, moving faster and reporting more often:

```bash
node scripts/simulate-device.js --device-id 0273545f1e7d1e7245cfd5c2c2fc36c2 --lat 43.84350 --lon -79.41999 --interval 3 --move-meters 100
```

Send exactly 20 updates then stop — useful for a scripted demo or a quick smoke test:

```bash
node scripts/simulate-device.js --device-id truck-42 --iterations 20
```

Point at a non-default backend (staging, a different port, etc.):

```bash
node scripts/simulate-device.js --base-url http://localhost:9090 --device-id truck-42
```

Move like a vehicle instead of a random walk — each tick turns by at most 15°, so the path
curves smoothly instead of zig-zagging:

```bash
node scripts/simulate-device.js --device-id truck-42 --max-heading-change 15
```

Run two devices at once by starting two instances with different ids/positions in separate
terminals:

```bash
node scripts/simulate-device.js --device-id truck-1 --lat 43.8628 --lon -79.4308
node scripts/simulate-device.js --device-id truck-2 --lat 43.8700 --lon -79.4200
```

Simulate a stationary temperature/humidity sensor that doesn't move, using one of the shipped
templates:

```bash
node scripts/simulate-device.js --device-id sensor-7 --device-type IOT_SENSOR \
  --payload-template-file scripts/payload-templates/temperature-humidity.json
```

A fleet vehicle that both moves *and* carries a payload (fuel level, engine temp, odometer):

```bash
node scripts/simulate-device.js --device-id truck-42 --device-type VEHICLE_UNIT --max-heading-change 15 \
  --payload-template-file scripts/payload-templates/fleet-vehicle.json
```

A reproducible run for a demo or a test — the same `--seed` always produces the same positions
and payload values:

```bash
node scripts/simulate-device.js --device-id demo-1 --seed 42 --iterations 10 \
  --payload-template '{"temperature":"<float:2-15:1>"}'
```

### Sample templates

Ready-made payload templates for several IoT device kinds live in `scripts/payload-templates/`:

| File | Device kind | Suggested `--device-type` |
| --- | --- | --- |
| `temperature-humidity.json` | Temperature/humidity sensor | `IOT_SENSOR` |
| `parking-sensor.json` | Smart parking sensor | `IOT_SENSOR` |
| `fleet-vehicle.json` | Fleet vehicle / truck | `VEHICLE_UNIT` |
| `wearable.json` | Wearable health band | `WEARABLE` |
| `water-meter.json` | Smart water meter | `IOT_SENSOR` |
| `air-quality.json` | Air-quality monitor | `IOT_SENSOR` |
| `cold-chain-container.json` | Cold-chain shipping container | `VEHICLE_UNIT` |
| `soil-moisture.json` | Soil moisture / agriculture sensor | `IOT_SENSOR` |

Use any of them with `--payload-template-file scripts/payload-templates/<file>`, or copy one as a
starting point for your own device profile.

### Sample output

```
Simulating device "truck-42" against http://localhost:8078
Starting at (51.5072, -0.1276); moving ~15m every 3s for 20 update(s).

[14:32:01] #1 lat=51.507327 lon=-0.127462 heading=214° -> OK
[14:32:04] #2 lat=51.507212 lon=-0.127701 heading=198° -> OK
[14:32:07] #3 lat=51.507105 lon=-0.127389 heading=42°  -> OK
...
Done. Sent 20 update(s).
```

A failed request (backend down, wrong `--base-url`, etc.) doesn't stop the run — it logs
`FAILED: <reason>` for that tick and keeps going on the next interval.

With `--payload-template`/`--payload-template-file`, the startup banner also prints one rendered
sample (`Sample payload (re-rendered fresh every tick): ...`) before the loop starts, and every
successful tick's log line appends `payload={...}` with that tick's actual rendered values.
