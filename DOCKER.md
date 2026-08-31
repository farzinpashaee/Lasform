# Running Lasform with Docker

A single image serves both the API and the web UI on one port — `core/pom.xml`'s `with-frontend`
Maven profile builds the Angular app and bundles it into the Spring Boot jar's `static/` folder, so
there's no separate nginx/frontend container to run or keep in sync.

## Quick start

```bash
cp .env.example .env
```

Edit `.env` and set at least `LASFORM_JWT_SECRET` (generate one with `openssl rand -base64 48`).
Everything else has a working default or is optional.

```bash
docker compose up -d
```

Visit `http://localhost:8078`. On a fresh install (empty database) with no `LASFORM_ADMIN_EMAIL`/
`LASFORM_ADMIN_PASSWORD` set, you'll land on `/setup` automatically — a short wizard that creates the
initial SUPER_ADMIN account, then lets you optionally configure the map provider, feature flags, and
Google Sign-In before dropping you into the management console. If you'd rather skip the wizard
entirely, set `LASFORM_ADMIN_EMAIL`/`LASFORM_ADMIN_PASSWORD` in `.env` before the first `docker
compose up` — the admin account is created automatically on that first boot instead (`mustResetPassword`
is `true` for that path, so you'll be prompted to set a real password on first login).

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `LASFORM_JWT_SECRET` | **Yes** | *(none — compose refuses to start without it)* | HMAC-SHA256 signing key, 32+ chars. Maps to `lasform.jwt.secret`. |
| `LASFORM_ORG_NAME` | No | `Lasform` | Name of the single organization created on first run. |
| `LASFORM_ADMIN_EMAIL` / `LASFORM_ADMIN_PASSWORD` | No | *(blank)* | Initial SUPER_ADMIN, created once on first run **if both are set**. Leave blank to use the `/setup` wizard instead. |
| `GOOGLE_MAPS_API_KEY` | No | *(blank)* | One-time seed for the Google Maps API key config entry. Leave blank and set it later via Settings → Map Provider (or the setup wizard) — nothing at startup needs it. |
| `GOOGLE_SSO_CLIENT_ID` | No | *(blank)* | One-time seed for the Google OAuth Client ID. Same "leave blank, set later" story as above. |
| `APP_PORT` | No | `8078` | Host port the app is published on. |
| `JAVA_OPTS` | No | `-Xms256m -Xmx768m` | JVM flags — see Resource footprint below before changing. |

Every var above is read directly by the app itself (see `core/README.md`'s Config section and
`application.yml`) — `docker-compose.yml` just forwards them into the `app` container's environment.
Never commit a real `.env` — `.env.example` ships with every value blank on purpose.

## Data & backups

Two named volumes:

- `mongo-data` — the database. Losing this loses everything (users, locations, devices, config).
- `lasform-images` — uploaded Location/Device photos (`LASFORM_STORAGE_IMAGES_BASE_PATH`). Losing
  this loses uploaded photos, not the rest of your data.

Back up both, e.g. with `docker run --rm -v lasform_mongo-data:/data -v $(pwd):/backup alpine tar
czf /backup/mongo-data.tar.gz /data` (adjust the volume name prefix to match your project/compose
name).

## Resource footprint

- **Absolute floor** (small/test instance): 2 vCPU / 2 GB RAM. Mongo idles around 200–300MB but can
  spike under load or while building indexes on a large collection; the JVM with the default
  `-Xmx768m` plus its own off-heap overhead (thread stacks, metaspace, direct buffers) realistically
  wants close to 1GB.
- **Comfortable for real usage**: 4 GB RAM or more, especially once Mongo's working set (indexes +
  hot data) grows past what fits in its default WiredTiger cache — which by default sizes itself off
  the **host's** visible memory (50% of RAM minus 1GB), not a container memory limit, unless you also
  constrain the `mongo` service's own resources.
- Both `JAVA_OPTS` (via `.env`) and the `app` service's `deploy.resources.limits` in
  `docker-compose.yml` are adjustable if you need more or less headroom.

## Health checks

Both services declare a container `HEALTHCHECK`:

- `mongo`: `mongosh --eval "db.adminCommand('ping')"`.
- `app`: `GET /actuator/health` (Spring Boot Actuator — only the `health` endpoint is exposed, see
  `application.yml`; nothing else from actuator is reachable, since this app has no auth wall in
  front of it, same as the rest of the API).

`app` also has `depends_on: mongo: condition: service_healthy`, so it won't even start until Mongo
reports healthy. Run `docker compose ps` — both services should show `healthy`, not just `running`,
before you consider the stack up. If `app` never goes healthy, `docker compose logs app` almost
always points at either a bad `LASFORM_JWT_SECRET` (missing entirely fails the container outright,
via the `:?` guard in `docker-compose.yml`) or Mongo connectivity.

## Publishing to GHCR (manual, for now)

No CI workflow exists yet for this — build and push by hand:

```bash
docker build -t ghcr.io/farzinpashaee/lasform:latest -t ghcr.io/farzinpashaee/lasform:X.Y.Z .
docker login ghcr.io
docker push ghcr.io/farzinpashaee/lasform:latest
docker push ghcr.io/farzinpashaee/lasform:X.Y.Z
```

`X.Y.Z` should track `core/pom.xml`'s `<version>` (currently `0.0.1-SNAPSHOT` — bump it before
cutting a real tagged release). Automating this with a GitHub Actions workflow on push-to-master
(→ `latest`) and version tags (→ semver) is a reasonable next step once you're ready to publish
regularly, just not wired up in this pass.
