#!/usr/bin/env node
/**
 * Simulates a real GPS/tracker device by POSTing location events to Lasform's
 * anonymous ingestion endpoint (POST /api/v1/events — see EventController), the same
 * one a real device would call. No dependencies beyond Node's built-in `fetch`
 * (Node 18+), so it runs the same way on Windows, Linux, and macOS.
 *
 * Every `--interval` seconds it picks a random compass bearing and moves
 * `--move-meters` from its current position in that direction (a random walk),
 * then submits a LOCATION_RECEIVED event for the new position.
 *
 * Usage:
 *   node scripts/simulate-device.js [options]
 *
 * Options:
 *   --base-url <url>       Backend base URL                  (default: http://localhost:8078)
 *   --device-id <id>       Device identifier to report as     (default: sim-device-1)
 *   --interval <seconds>   Seconds between updates            (default: 5)
 *   --lat <degrees>        Starting latitude                  (default: 40.7128)
 *   --lon <degrees>        Starting longitude                 (default: -74.0060)
 *   --move-meters <m>      Distance moved each tick, in meters (default: 10)
 *   --accuracy <m>         Reported GPS accuracy, in meters    (default: 5)
 *   --iterations <n>       Stop after n updates (0 = forever)  (default: 0)
 *   --event-type <type>    Event type to submit                (default: LOCATION_RECEIVED)
 *   -h, --help             Show this help and exit
 *
 * Examples:
 *   node scripts/simulate-device.js
 *   node scripts/simulate-device.js --device-id truck-42 --lat 51.5072 --lon -0.1276 --interval 3 --move-meters 15
 *   node scripts/simulate-device.js --base-url http://localhost:8078 --iterations 20
 */

'use strict';

const DEFAULTS = {
  baseUrl: 'http://localhost:8078',
  deviceId: 'sim-device-1',
  intervalSeconds: 5,
  lat: 40.7128,
  lon: -74.006,
  moveMeters: 10,
  accuracyMeters: 5,
  iterations: 0,
  eventType: 'LOCATION_RECEIVED',
};

const EARTH_RADIUS_METERS = 6371000;

function printHelp() {
  const header = `Simulates a moving device by posting location events to /api/v1/events.\n\nOptions:\n`;
  const lines = [
    ['--base-url <url>', `Backend base URL (default: ${DEFAULTS.baseUrl})`],
    ['--device-id <id>', `Device identifier to report as (default: ${DEFAULTS.deviceId})`],
    ['--interval <seconds>', `Seconds between updates (default: ${DEFAULTS.intervalSeconds})`],
    ['--lat <degrees>', `Starting latitude (default: ${DEFAULTS.lat})`],
    ['--lon <degrees>', `Starting longitude (default: ${DEFAULTS.lon})`],
    ['--move-meters <m>', `Distance moved each tick, in meters (default: ${DEFAULTS.moveMeters})`],
    ['--accuracy <m>', `Reported GPS accuracy, in meters (default: ${DEFAULTS.accuracyMeters})`],
    ['--iterations <n>', `Stop after n updates, 0 = forever (default: ${DEFAULTS.iterations})`],
    ['--event-type <type>', `Event type to submit (default: ${DEFAULTS.eventType})`],
    ['-h, --help', 'Show this help and exit'],
  ];
  const width = Math.max(...lines.map(([flag]) => flag.length));
  process.stdout.write(header + lines.map(([flag, desc]) => `  ${flag.padEnd(width)}  ${desc}`).join('\n') + '\n');
}

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
    const [flag, inlineValue] = arg.startsWith('--') ? splitInline(arg) : [arg, undefined];
    const takeValue = () => (inlineValue !== undefined ? inlineValue : argv[++i]);

    switch (flag) {
      case '--base-url':
        config.baseUrl = takeValue().replace(/\/+$/, '');
        break;
      case '--device-id':
        config.deviceId = takeValue();
        break;
      case '--interval':
        config.intervalSeconds = requirePositiveNumber(takeValue(), '--interval');
        break;
      case '--lat':
        config.lat = requireNumber(takeValue(), '--lat');
        break;
      case '--lon':
        config.lon = requireNumber(takeValue(), '--lon');
        break;
      case '--move-meters':
        config.moveMeters = requirePositiveNumber(takeValue(), '--move-meters');
        break;
      case '--accuracy':
        config.accuracyMeters = requirePositiveNumber(takeValue(), '--accuracy');
        break;
      case '--iterations':
        config.iterations = requireNonNegativeInt(takeValue(), '--iterations');
        break;
      case '--event-type':
        config.eventType = takeValue();
        break;
      default:
        throw new Error(`Unknown option: ${arg} (use --help to see available options)`);
    }
  }
  return config;
}

function splitInline(arg) {
  const eq = arg.indexOf('=');
  return eq === -1 ? [arg, undefined] : [arg.slice(0, eq), arg.slice(eq + 1)];
}

function requireNumber(value, flag) {
  const n = Number(value);
  if (value === undefined || Number.isNaN(n)) {
    throw new Error(`${flag} requires a numeric value, got: ${value}`);
  }
  return n;
}

function requirePositiveNumber(value, flag) {
  const n = requireNumber(value, flag);
  if (n <= 0) {
    throw new Error(`${flag} must be greater than 0, got: ${n}`);
  }
  return n;
}

function requireNonNegativeInt(value, flag) {
  const n = requireNumber(value, flag);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${flag} must be a non-negative integer, got: ${value}`);
  }
  return n;
}

/** Destination point given a start (deg), bearing (deg), and distance (m) — spherical earth model. */
function movePoint(lat, lon, bearingDegrees, distanceMeters) {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(lat);
  const lon1 = toRadians(lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDegrees(lat2), lon: normalizeLongitude(toDegrees(lon2)) };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function normalizeLongitude(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

async function postEvent(config, position, bearing, speedMps) {
  const event = {
    type: config.eventType,
    source: 'DEVICE',
    deviceId: config.deviceId,
    point: { type: 'Point', coordinates: [position.lon, position.lat] },
    speed: speedMps,
    heading: bearing,
    accuracy: config.accuracyMeters,
    occurredAt: new Date().toISOString(),
  };

  const response = await fetch(`${config.baseUrl}/api/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([event]),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('This script requires Node 18 or newer (global fetch is not available).');
    process.exit(1);
  }

  let config;
  try {
    config = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  console.log(
    `Simulating device "${config.deviceId}" against ${config.baseUrl}\n` +
      `Starting at (${config.lat}, ${config.lon}); moving ~${config.moveMeters}m every ${config.intervalSeconds}s ` +
      `${config.iterations > 0 ? `for ${config.iterations} update(s)` : '(Ctrl+C to stop)'}.\n`,
  );

  let position = { lat: config.lat, lon: config.lon };
  const speedMps = config.moveMeters / config.intervalSeconds;
  let tick = 0;
  let running = true;

  process.on('SIGINT', () => {
    if (!running) {
      process.exit(1);
    }
    running = false;
    console.log('\nStopping (Ctrl+C received)...');
  });

  while (running && (config.iterations === 0 || tick < config.iterations)) {
    const bearing = Math.random() * 360;
    position = movePoint(position.lat, position.lon, bearing, config.moveMeters);
    tick++;

    const timestamp = new Date().toLocaleTimeString();
    try {
      await postEvent(config, position, bearing, speedMps);
      console.log(
        `[${timestamp}] #${tick} lat=${position.lat.toFixed(6)} lon=${position.lon.toFixed(6)} heading=${bearing.toFixed(0)}° -> OK`,
      );
    } catch (err) {
      console.error(`[${timestamp}] #${tick} lat=${position.lat.toFixed(6)} lon=${position.lon.toFixed(6)} -> FAILED: ${err.message}`);
    }

    if (running && (config.iterations === 0 || tick < config.iterations)) {
      await sleep(config.intervalSeconds * 1000);
    }
  }

  console.log(`\nDone. Sent ${tick} update(s).`);
}

main();
