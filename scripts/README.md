# Scripts

Standalone dev/test utilities for Lasform. Nothing here is part of the build — run them
directly with Node.

## `simulate-device.js`

Simulates a real GPS/tracker device by POSTing location events to Lasform's ingestion
endpoint, `POST /api/v1/events` (see `EventController`) — the same endpoint a real device
calls. That endpoint is deliberately left open (no auth), since devices don't go through the
interactive login flow, so this script needs nothing beyond a running backend.

Requires Node 18+ (uses the global `fetch`) and no npm dependencies.

### How it works

On each tick (every `--interval` seconds) the script:

1. Picks a compass bearing (0–360°). By default this is fully random each tick (a random walk).
   Pass `--max-heading-change <degrees>` to instead turn gradually — each new bearing stays
   within that many degrees of the previous one, which reads as a realistic, vehicle-like path
   instead of the default's sharp zig-zags.
2. Moves `--move-meters` from its current position in that direction, using a spherical-earth
   destination-point formula (start point + bearing + distance → new lat/lon) — not a route
   along real roads.
3. POSTs a single `LOCATION_RECEIVED` event for the new position, as a one-element array (the
   ingestion endpoint always takes a batch):

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
       "occurredAt": "2026-08-27T18:04:11.234Z"
     }
   ]
   ```

4. Prints the result (`OK` or the HTTP failure) and sleeps until the next tick.

Repeats forever until you stop it with Ctrl+C, or until `--iterations` updates have been sent.

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
| `--interval <seconds>` | Seconds between updates | `5` |
| `--lat <degrees>` | Starting latitude | `40.7128` |
| `--lon <degrees>` | Starting longitude | `-74.0060` |
| `--move-meters <m>` | Distance moved each tick, in meters | `10` |
| `--max-heading-change <deg>` | Max heading change between ticks, in degrees | unconstrained (fully random each tick) |
| `--accuracy <m>` | Reported GPS accuracy, in meters | `5` |
| `--iterations <n>` | Stop after `n` updates (`0` = forever) | `0` |
| `--event-type <type>` | Event type to submit (any `EventType` enum value) | `LOCATION_RECEIVED` |
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
