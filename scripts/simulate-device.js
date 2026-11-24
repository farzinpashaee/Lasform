#!/usr/bin/env node
/**
 * Simulates a real device by POSTing events to Lasform's anonymous ingestion endpoint
 * (POST /api/v1/events — see EventController), the same one a real device would call. No
 * dependencies beyond Node's built-ins (`fetch`, `node:fs`, `node:crypto` — Node 18+), so it
 * runs the same way on Windows, Linux, and macOS.
 *
 * Every `--interval` seconds it picks a compass bearing and moves `--move-meters` from its
 * current position in that direction, then submits an event for the new position. By default
 * each tick's bearing is fully random (a random walk); pass `--max-heading-change` to instead
 * turn gradually — each new bearing is within that many degrees of the previous one, which
 * reads as a much more realistic, vehicle-like path than the default's sharp direction changes.
 *
 * `--device-type` picks a movement profile: GPS_TRACKER/VEHICLE_UNIT/MOBILE_PHONE/WEARABLE move
 * every tick (the above); IOT_SENSOR/OTHER default to stationary (`--move-meters 0`) — a fixed
 * sensor that hasn't changed location, matching the backend's own DeviceType enum.
 *
 * `--payload-template` (or `--payload-template-file`) attaches a custom JSON payload to every
 * event — e.g. `{"temperature":"<float:2-15:1>"}` — using a small placeholder DSL; see
 * scripts/README.md for the full type reference and scripts/payload-templates/*.json for
 * ready-made examples (temperature/humidity, parking, fleet vehicle, wearable, water meter,
 * air quality, cold chain, soil moisture).
 *
 * Usage:
 *   node scripts/simulate-device.js [options]
 *
 * Options:
 *   --base-url <url>            Backend base URL                    (default: http://localhost:8078)
 *   --device-id <id>            Device identifier to report as       (default: sim-device-1)
 *   --device-type <type>        GPS_TRACKER, MOBILE_PHONE, VEHICLE_UNIT, WEARABLE, IOT_SENSOR, OTHER (default: GPS_TRACKER)
 *   --interval <seconds>        Seconds between updates              (default: 5)
 *   --lat <degrees>             Starting latitude                    (default: 40.7128)
 *   --lon <degrees>             Starting longitude                   (default: -74.0060)
 *   --move-meters <m>           Distance moved each tick, in meters   (default: 10; 0 for stationary device types)
 *   --max-heading-change <deg>  Max heading change between ticks, in degrees (default: unconstrained — a fully random new bearing each tick)
 *   --accuracy <m>              Reported GPS accuracy, in meters      (default: 5)
 *   --iterations <n>            Stop after n updates (0 = forever)    (default: 0)
 *   --event-type <type>         Event type to submit                  (default: LOCATION_RECEIVED; OTHER for stationary device types)
 *   --payload-template <json>   Inline JSON payload template with <type:args> placeholders
 *   --payload-template-file <path>  Path to a JSON file containing the payload template
 *   --seed <n>                  Seed the RNG for a reproducible run   (default: random)
 *   -h, --help                  Show this help and exit
 *
 * Examples:
 *   node scripts/simulate-device.js
 *   node scripts/simulate-device.js --device-id truck-42 --lat 51.5072 --lon -0.1276 --interval 3 --move-meters 15
 *   node scripts/simulate-device.js --base-url http://localhost:8078 --iterations 20
 *   node scripts/simulate-device.js --device-id truck-42 --max-heading-change 20
 *   node scripts/simulate-device.js --device-id sensor-7 --device-type IOT_SENSOR \
 *     --payload-template-file scripts/payload-templates/temperature-humidity.json
 */

'use strict';

const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

const DEFAULTS = {
  baseUrl: 'http://localhost:8078',
  deviceId: 'sim-device-1',
  deviceType: 'GPS_TRACKER',
  intervalSeconds: 5,
  lat: 40.7128,
  lon: -74.006,
  moveMeters: 10,
  // null = unconstrained: each tick picks a fully random new bearing (the original behavior).
  maxHeadingChangeDegrees: null,
  accuracyMeters: 5,
  iterations: 0,
  eventType: 'LOCATION_RECEIVED',
  payloadTemplate: null,
  payloadTemplateFile: null,
  seed: null,
};

const EARTH_RADIUS_METERS = 6371000;

// Mirrors the backend's DeviceType enum (see core/.../model/entity/enums/DeviceType.java) so
// this flag's vocabulary matches the real Device records these simulated events are meant to
// update. STATIONARY_DEVICE_TYPES are the ones that, per their nature, don't move on their own —
// a fixed sensor rather than something carried or driven — so they default --move-meters to 0
// and --event-type to OTHER (see parseArgs) unless the user overrides either explicitly.
const DEVICE_TYPES = ['GPS_TRACKER', 'MOBILE_PHONE', 'VEHICLE_UNIT', 'WEARABLE', 'IOT_SENSOR', 'OTHER'];
const STATIONARY_DEVICE_TYPES = new Set(['IOT_SENSOR', 'OTHER']);

function printHelp() {
  const header = `Simulates a moving device by posting location events to /api/v1/events.\n\nOptions:\n`;
  const lines = [
    ['--base-url <url>', `Backend base URL (default: ${DEFAULTS.baseUrl})`],
    ['--device-id <id>', `Device identifier to report as (default: ${DEFAULTS.deviceId})`],
    ['--device-type <type>', `${DEVICE_TYPES.join(', ')} (default: ${DEFAULTS.deviceType}; IOT_SENSOR/OTHER default to stationary)`],
    ['--interval <seconds>', `Seconds between updates (default: ${DEFAULTS.intervalSeconds})`],
    ['--lat <degrees>', `Starting latitude (default: ${DEFAULTS.lat})`],
    ['--lon <degrees>', `Starting longitude (default: ${DEFAULTS.lon})`],
    ['--move-meters <m>', `Distance moved each tick, in meters (default: ${DEFAULTS.moveMeters}; 0 for stationary device types)`],
    ['--max-heading-change <deg>', 'Max heading change between ticks, in degrees (default: unconstrained — fully random each tick)'],
    ['--accuracy <m>', `Reported GPS accuracy, in meters (default: ${DEFAULTS.accuracyMeters})`],
    ['--iterations <n>', `Stop after n updates, 0 = forever (default: ${DEFAULTS.iterations})`],
    ['--event-type <type>', `Event type to submit (default: ${DEFAULTS.eventType}; OTHER for stationary device types)`],
    ['--payload-template <json>', 'Inline JSON payload template with <type:args> placeholders — see scripts/README.md'],
    ['--payload-template-file <path>', 'Path to a JSON file containing the payload template'],
    ['--seed <n>', 'Seed the RNG for a reproducible run (default: random)'],
    ['-h, --help', 'Show this help and exit'],
  ];
  const width = Math.max(...lines.map(([flag]) => flag.length));
  process.stdout.write(header + lines.map(([flag, desc]) => `  ${flag.padEnd(width)}  ${desc}`).join('\n') + '\n');
}

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  // Tracks whether the user explicitly passed these two — device-type only supplies a *default*
  // for them (see below), so an explicit flag must always win over that default.
  let moveMetersProvided = false;
  let eventTypeProvided = false;

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
      case '--device-type': {
        const value = takeValue().toUpperCase();
        if (!DEVICE_TYPES.includes(value)) {
          throw new Error(`--device-type must be one of ${DEVICE_TYPES.join(', ')}, got: ${value}`);
        }
        config.deviceType = value;
        break;
      }
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
        // Non-negative (not strictly positive): 0 is how a stationary device type reports no
        // movement, and is also a legitimate explicit choice for any device type (e.g. a parked
        // vehicle) — see movePoint, which is a no-op at distance 0.
        config.moveMeters = requireNonNegativeNumber(takeValue(), '--move-meters');
        moveMetersProvided = true;
        break;
      case '--max-heading-change':
        config.maxHeadingChangeDegrees = requireNonNegativeNumber(takeValue(), '--max-heading-change');
        break;
      case '--accuracy':
        config.accuracyMeters = requirePositiveNumber(takeValue(), '--accuracy');
        break;
      case '--iterations':
        config.iterations = requireNonNegativeInt(takeValue(), '--iterations');
        break;
      case '--event-type':
        config.eventType = takeValue();
        eventTypeProvided = true;
        break;
      case '--payload-template':
        config.payloadTemplate = takeValue();
        break;
      case '--payload-template-file':
        config.payloadTemplateFile = takeValue();
        break;
      case '--seed':
        config.seed = requireNumber(takeValue(), '--seed');
        break;
      default:
        throw new Error(`Unknown option: ${arg} (use --help to see available options)`);
    }
  }

  if (config.payloadTemplate && config.payloadTemplateFile) {
    throw new Error('--payload-template and --payload-template-file are mutually exclusive — pass only one');
  }

  if (STATIONARY_DEVICE_TYPES.has(config.deviceType)) {
    if (!moveMetersProvided) {
      config.moveMeters = 0;
    }
    if (!eventTypeProvided) {
      config.eventType = 'OTHER';
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

function requireNonNegativeNumber(value, flag) {
  const n = requireNumber(value, flag);
  if (n < 0) {
    throw new Error(`${flag} must not be negative, got: ${n}`);
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

function normalizeBearing(bearing) {
  return ((bearing % 360) + 360) % 360;
}

/**
 * Picks the next tick's bearing. With no constraint, it's fully random (the original random-walk
 * behavior). With maxChangeDegrees set, it's the previous bearing plus a random offset in
 * [-maxChangeDegrees, +maxChangeDegrees] — turning gradually instead of jumping to an unrelated
 * direction every tick.
 */
function nextBearing(previousBearing, maxChangeDegrees, rng) {
  if (maxChangeDegrees == null) {
    return rng() * 360;
  }
  const delta = (rng() * 2 - 1) * maxChangeDegrees;
  return normalizeBearing(previousBearing + delta);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * A small seedable PRNG (mulberry32) so --seed can make a whole run — movement *and* payload
 * values — reproducible, without pulling in a dependency for it. Returns a function with the
 * same shape as Math.random (no args, returns a float in [0, 1)); every place in this file that
 * needs randomness takes an `rng` of that shape instead of calling Math.random() directly, so it
 * can be swapped in uniformly.
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * ---------------------------------------------------------------------------------------------
 * Payload template engine
 * ---------------------------------------------------------------------------------------------
 * Lets --payload-template / --payload-template-file describe a device's non-location telemetry
 * (temperature, battery level, fuel level, ...) as plain JSON with placeholder strings for the
 * parts that should vary tick to tick, e.g. {"temperature": "<float:2-15:1>"}.
 *
 * A placeholder is `<type[:args]>`. Compiling a template (compileValue, below) walks the parsed
 * JSON once and, for every string leaf, decides which of three things it is:
 *   - the *entire* string is one placeholder (e.g. "<float:2-15>")      -> becomes a real
 *     JSON number/boolean/string in the rendered output, not a quoted placeholder
 *   - the string *contains* one or more placeholders alongside literal
 *     text (e.g. "sensor-<int:1-1000>")                                 -> each match is
 *     stringified and spliced in, result stays a string
 *   - no placeholder syntax at all                                      -> left untouched
 * Non-string JSON (numbers, booleans, null, nested objects/arrays) is always literal — write a
 * fixed value as normal JSON, write a placeholder string where you want it generated.
 *
 * Compiling happens once at startup (see main()), not on every tick: it parses each placeholder's
 * arguments up front and fails fast — with the exact JSON path — on an unknown type, a malformed
 * range, an empty enum, etc., rather than only surfacing a bug on the first HTTP call. Rendering
 * (renderNode) re-walks that compiled tree every tick to produce a fresh plain JS value; stateful
 * generators (sequence, drift) keep their running value in a small per-placeholder state object
 * that lives for the whole run, keyed by nothing more than being its own object instance.
 */

// alnum is the default charset for <string:len> — the other three are opt-in via a second arg.
const STRING_CHARSETS = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  hex: '0123456789abcdef',
};

function splitArgs(argsStr) {
  return argsStr === undefined ? [] : argsStr.split(':');
}

function parseNumberArg(value, path, label) {
  const n = Number(value);
  if (value === undefined || Number.isNaN(n)) {
    throw new Error(`${path}: ${label} must be a number, got "${value}"`);
  }
  return n;
}

function parsePositiveNumberArg(value, path, label) {
  const n = parseNumberArg(value, path, label);
  if (n <= 0) {
    throw new Error(`${path}: ${label} must be greater than 0, got ${n}`);
  }
  return n;
}

function parseNonNegativeIntArg(value, path, label) {
  const n = parseNumberArg(value, path, label);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${path}: ${label} must be a non-negative integer, got "${value}"`);
  }
  return n;
}

function parsePositiveIntArg(value, path, label) {
  const n = parseNonNegativeIntArg(value, path, label);
  if (n <= 0) {
    throw new Error(`${path}: ${label} must be a positive integer, got "${value}"`);
  }
  return n;
}

/**
 * Parses a "min-max" range, e.g. "2-15" or "-25--15". A single `-` is unambiguous even with
 * negative bounds: `\d+` can't consume a sign or the separator itself, so the regex always finds
 * exactly one valid split (verified against "-5-10", "5--10", "-5--10", etc.) — no need for an
 * alternate separator for the negative case.
 */
function parseRange(rangeStr, path) {
  if (!rangeStr) {
    throw new Error(`${path}: expected a "min-max" range, e.g. "2-15"`);
  }
  const match = /^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/.exec(rangeStr.trim());
  if (!match) {
    throw new Error(`${path}: invalid range "${rangeStr}", expected "min-max" (e.g. "2-15" or "-25--15")`);
  }
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (min > max) {
    throw new Error(`${path}: range min (${min}) must be <= max (${max})`);
  }
  return { min, max };
}

/**
 * The placeholder-type registry: name -> { parse, generate }. `parse(argsStr, path)` runs once
 * at compile time and either returns validated args or throws (with `path` naming exactly where
 * in the template the bad placeholder is). `generate(parsedArgs, state, context)` runs once per
 * tick; `state` is a plain object private to that one placeholder instance (stateful generators
 * stash their running value on it — see sequence/drift); `context` carries `{ rng, tick }`.
 * Adding a new placeholder type later is one entry here, nothing else to touch.
 */
const GENERATORS = {
  int: {
    parse(argsStr, path) {
      const [rangePart, stepPart] = splitArgs(argsStr);
      const { min, max } = parseRange(rangePart, path);
      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        throw new Error(`${path}: int range bounds must be whole numbers, got "${rangePart}"`);
      }
      const step = stepPart !== undefined ? parsePositiveIntArg(stepPart, path, 'step') : 1;
      return { min, max, step };
    },
    generate({ min, max, step }, state, context) {
      const count = Math.floor((max - min) / step) + 1;
      return min + step * Math.floor(context.rng() * count);
    },
  },
  float: {
    parse(argsStr, path) {
      const [rangePart, decimalsPart] = splitArgs(argsStr);
      const { min, max } = parseRange(rangePart, path);
      const decimals = decimalsPart !== undefined ? parseNonNegativeIntArg(decimalsPart, path, 'decimals') : 2;
      return { min, max, decimals };
    },
    generate({ min, max, decimals }, state, context) {
      return Number((min + context.rng() * (max - min)).toFixed(decimals));
    },
  },
  bool: {
    parse(argsStr, path) {
      if (argsStr === undefined) {
        return { pTrue: 0.5 };
      }
      const p = Number(argsStr);
      if (Number.isNaN(p) || p < 0 || p > 1) {
        throw new Error(`${path}: bool probability must be between 0 and 1, got "${argsStr}"`);
      }
      return { pTrue: p };
    },
    generate({ pTrue }, state, context) {
      return context.rng() < pTrue;
    },
  },
  enum: {
    parse(argsStr, path) {
      if (!argsStr) {
        throw new Error(`${path}: enum requires at least one option, e.g. <enum:A|B|C>`);
      }
      const options = argsStr
        .split('|')
        .map((option) => option.trim())
        .filter((option) => option.length > 0);
      if (options.length === 0) {
        throw new Error(`${path}: enum requires at least one non-empty option`);
      }
      return { options };
    },
    generate({ options }, state, context) {
      return options[Math.floor(context.rng() * options.length)];
    },
  },
  string: {
    parse(argsStr, path) {
      const [lengthPart, charsetPart] = splitArgs(argsStr);
      const length = parsePositiveIntArg(lengthPart, path, 'length');
      const charsetName = charsetPart ?? 'alnum';
      const alphabet = STRING_CHARSETS[charsetName];
      if (!alphabet) {
        throw new Error(`${path}: unknown string charset "${charsetName}" (use alnum, alpha, numeric, or hex)`);
      }
      return { length, alphabet };
    },
    generate({ length, alphabet }, state, context) {
      let out = '';
      for (let i = 0; i < length; i++) {
        out += alphabet[Math.floor(context.rng() * alphabet.length)];
      }
      return out;
    },
  },
  uuid: {
    parse() {
      return {};
    },
    generate() {
      return randomUUID();
    },
  },
  timestamp: {
    parse(argsStr, path) {
      const offsetSeconds = argsStr !== undefined ? parseNumberArg(argsStr, path, 'offsetSeconds') : 0;
      return { offsetSeconds };
    },
    generate({ offsetSeconds }) {
      return new Date(Date.now() + offsetSeconds * 1000).toISOString();
    },
  },
  sequence: {
    parse(argsStr, path) {
      const [startPart, stepPart] = splitArgs(argsStr);
      const start = startPart !== undefined ? parseNumberArg(startPart, path, 'start') : 0;
      const step = stepPart !== undefined ? parseNumberArg(stepPart, path, 'step') : 1;
      return { start, step };
    },
    // Ignores context.rng deliberately — a sequence is meant to be exactly predictable, not
    // affected by --seed.
    generate({ start, step }, state) {
      state.value = state.value === undefined ? start : state.value + step;
      return state.value;
    },
  },
  /**
   * Like --max-heading-change for a sensor value: instead of an independent random draw every
   * tick, nudges by at most maxStepPerTick from the previous value (clamped to the range) — reads
   * as a real sensor's gradual drift instead of noise teleporting every tick.
   */
  drift: {
    parse(argsStr, path) {
      const [rangePart, maxStepPart, decimalsPart] = splitArgs(argsStr);
      const { min, max } = parseRange(rangePart, path);
      const maxStep = parsePositiveNumberArg(maxStepPart, path, 'maxStepPerTick');
      const decimals = decimalsPart !== undefined ? parseNonNegativeIntArg(decimalsPart, path, 'decimals') : 2;
      return { min, max, maxStep, decimals };
    },
    generate({ min, max, maxStep, decimals }, state, context) {
      if (state.value === undefined) {
        state.value = min + context.rng() * (max - min);
      } else {
        const delta = (context.rng() * 2 - 1) * maxStep;
        state.value = clamp(state.value + delta, min, max);
      }
      return Number(state.value.toFixed(decimals));
    },
  },
};
// Alias: same generator, friendlier name for readers who'd reach for "choice" first.
GENERATORS.choice = GENERATORS.enum;

// Non-global: safe to reuse as a shared constant (no lastIndex state to worry about).
const WHOLE_PLACEHOLDER_RE = /^<([a-zA-Z_]+)(?::([^<>]*))?>$/;
const PLACEHOLDER_PRESENCE_RE = /<[a-zA-Z_]+(?::[^<>]*)?>/;

function compilePlaceholder(type, argsStr, path) {
  const def = GENERATORS[type];
  if (!def) {
    const known = Object.keys(GENERATORS).sort().join(', ');
    throw new Error(`${path || '(root)'}: unknown placeholder type "<${type}>" (known types: ${known})`);
  }
  const parsedArgs = def.parse(argsStr, path || '(root)');
  return { generate: def.generate, parsedArgs, state: {} };
}

function compileStringNode(str, path) {
  const whole = WHOLE_PLACEHOLDER_RE.exec(str);
  if (whole) {
    return { kind: 'whole', placeholder: compilePlaceholder(whole[1], whole[2], path) };
  }
  if (!PLACEHOLDER_PRESENCE_RE.test(str)) {
    return { kind: 'literal', value: str };
  }

  // A fresh regex instance per call (rather than a shared module-level `g`-flagged one) sidesteps
  // any lastIndex state bugs if this ever runs re-entrantly.
  const findPlaceholders = /<([a-zA-Z_]+)(?::([^<>]*))?>/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = findPlaceholders.exec(str)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ literal: str.slice(lastIndex, match.index) });
    }
    segments.push({ placeholder: compilePlaceholder(match[1], match[2], path) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < str.length) {
    segments.push({ literal: str.slice(lastIndex) });
  }
  return { kind: 'interpolated', segments };
}

/** Recursively compiles a parsed-JSON value (from JSON.parse) into a renderable node tree. */
function compileValue(value, path) {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'literal', value };
  }
  if (typeof value === 'string') {
    return compileStringNode(value, path);
  }
  if (Array.isArray(value)) {
    return { kind: 'array', items: value.map((item, index) => compileValue(item, `${path}[${index}]`)) };
  }
  if (typeof value === 'object') {
    return {
      kind: 'object',
      entries: Object.entries(value).map(([key, val]) => [key, compileValue(val, path ? `${path}.${key}` : key)]),
    };
  }
  throw new Error(`${path || '(root)'}: unsupported value type`);
}

function renderNode(node, context) {
  switch (node.kind) {
    case 'literal':
      return node.value;
    case 'whole':
      return node.placeholder.generate(node.placeholder.parsedArgs, node.placeholder.state, context);
    case 'interpolated':
      return node.segments
        .map((segment) =>
          segment.literal !== undefined
            ? segment.literal
            : String(segment.placeholder.generate(segment.placeholder.parsedArgs, segment.placeholder.state, context)),
        )
        .join('');
    case 'object': {
      const out = {};
      for (const [key, childNode] of node.entries) {
        out[key] = renderNode(childNode, context);
      }
      return out;
    }
    case 'array':
      return node.items.map((item) => renderNode(item, context));
    default:
      throw new Error(`Unknown compiled node kind: ${node.kind}`);
  }
}

async function postEvent(config, position, bearing, speedMps, payload) {
  const event = {
    type: config.eventType,
    source: 'DEVICE',
    deviceId: config.deviceId,
    point: { type: 'Point', coordinates: [position.lon, position.lat] },
    speed: speedMps,
    // A stationary device type reporting a compass heading doesn't mean anything — only send one
    // when this tick's move actually had a direction (config.moveMeters > 0).
    heading: config.moveMeters > 0 ? bearing : null,
    accuracy: config.accuracyMeters,
    occurredAt: new Date().toISOString(),
  };
  if (payload !== undefined) {
    event.payload = payload;
  }

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

  // Every place in this file that needs randomness goes through config.rng instead of calling
  // Math.random() directly, so --seed makes the *whole* run — movement and payload values alike —
  // reproducible.
  config.rng = config.seed != null ? mulberry32(config.seed) : Math.random;

  let compiledPayload = null;
  let previewPayload = null;
  const payloadTemplateSource = config.payloadTemplateFile
    ? { kind: 'file', value: config.payloadTemplateFile }
    : config.payloadTemplate
      ? { kind: 'inline', value: config.payloadTemplate }
      : null;

  if (payloadTemplateSource) {
    let templateJsonText;
    if (payloadTemplateSource.kind === 'file') {
      try {
        templateJsonText = fs.readFileSync(payloadTemplateSource.value, 'utf8');
      } catch (err) {
        console.error(`Error: could not read --payload-template-file "${payloadTemplateSource.value}": ${err.message}`);
        process.exit(1);
      }
    } else {
      templateJsonText = payloadTemplateSource.value;
    }

    let templateValue;
    try {
      templateValue = JSON.parse(templateJsonText);
    } catch (err) {
      console.error(`Error: payload template is not valid JSON: ${err.message}`);
      process.exit(1);
    }

    try {
      // Compiled twice on purpose: one tree is the real one the tick loop renders from, the other
      // is only ever rendered once below for the startup preview. Stateful generators (sequence,
      // drift) advance their state every time they're rendered — sharing one compiled tree between
      // the preview and tick #1 would make tick #1 silently start from its *second* value instead
      // of its first.
      compiledPayload = compileValue(templateValue, '');
      const previewOnlyCompiled = compileValue(templateValue, '');
      previewPayload = renderNode(previewOnlyCompiled, { rng: config.rng, tick: 0 });
    } catch (err) {
      console.error(`Error: invalid payload template: ${err.message}`);
      process.exit(1);
    }
  }

  const headingNote =
    config.maxHeadingChangeDegrees == null ? '' : `, turning at most ${config.maxHeadingChangeDegrees}°/tick`;
  const deviceTypeNote = config.deviceType === DEFAULTS.deviceType ? '' : ` as a ${config.deviceType}`;
  const seedNote = config.seed != null ? `, seeded with ${config.seed} (reproducible run)` : '';
  console.log(
    `Simulating device "${config.deviceId}"${deviceTypeNote} against ${config.baseUrl}\n` +
      `Starting at (${config.lat}, ${config.lon}); moving ~${config.moveMeters}m every ${config.intervalSeconds}s${headingNote}${seedNote} ` +
      `${config.iterations > 0 ? `for ${config.iterations} update(s)` : '(Ctrl+C to stop)'}.\n`,
  );
  if (previewPayload) {
    console.log(`Sample payload (re-rendered fresh every tick): ${JSON.stringify(previewPayload)}\n`);
  }

  let position = { lat: config.lat, lon: config.lon };
  const speedMps = config.moveMeters / config.intervalSeconds;
  let tick = 0;
  let running = true;
  let bearing = config.rng() * 360;

  process.on('SIGINT', () => {
    if (!running) {
      process.exit(1);
    }
    running = false;
    console.log('\nStopping (Ctrl+C received)...');
  });

  while (running && (config.iterations === 0 || tick < config.iterations)) {
    bearing = nextBearing(bearing, config.maxHeadingChangeDegrees, config.rng);
    position = movePoint(position.lat, position.lon, bearing, config.moveMeters);
    tick++;

    const payload = compiledPayload ? renderNode(compiledPayload, { rng: config.rng, tick }) : undefined;

    const timestamp = new Date().toLocaleTimeString();
    try {
      await postEvent(config, position, bearing, speedMps, payload);
      // Mirror exactly what postEvent sent: no heading was reported for a stationary device
      // (config.moveMeters === 0), so don't print one as if it had been.
      const headingPart = config.moveMeters > 0 ? ` heading=${bearing.toFixed(0)}°` : '';
      const payloadNote = payload ? ` payload=${JSON.stringify(payload)}` : '';
      console.log(
        `[${timestamp}] #${tick} lat=${position.lat.toFixed(6)} lon=${position.lon.toFixed(6)}${headingPart}${payloadNote} -> OK`,
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
