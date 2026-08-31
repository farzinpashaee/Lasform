# syntax=docker/dockerfile:1

# Build context is the repo root (not core/) because the "with-frontend" Maven profile
# (core/pom.xml) builds web-face as a relative sibling directory and copies its output into the
# jar's static/ classpath folder — one jar ends up serving both the API and the UI.

# --- build ---------------------------------------------------------------------------------
# glibc-based (not alpine): frontend-maven-plugin downloads an official, glibc-linked Node.js
# binary during the Maven build (generate-resources phase, see the with-frontend profile) — an
# alpine/musl JDK image would fail to run that binary.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Warm the Maven dependency cache in its own layer before the full source copy, so editing
# application code doesn't bust it. (Best-effort: frontend-maven-plugin's own npm/node install
# still happens during the real build below, since it manages its own working directory.)
COPY core/pom.xml core/mvnw ./core/
COPY core/.mvn ./core/.mvn
COPY web-face/package.json web-face/package-lock.json ./web-face/
RUN cd core && chmod +x mvnw && ./mvnw -B -P with-frontend dependency:go-offline || true

COPY core ./core
COPY web-face ./web-face
RUN cd core && ./mvnw -B clean package -P with-frontend -DskipTests

# --- runtime ---------------------------------------------------------------------------------
# Slim, JRE-only — no Maven/Node/JDK in the final image.
FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S lasform && adduser -S lasform -G lasform
WORKDIR /app
COPY --from=build /workspace/core/target/lasform.jar ./lasform.jar

# Created and chowned before VOLUME so a fresh named volume inherits ownership by the non-root
# user instead of coming up root-owned (Docker seeds an empty named volume from image content).
RUN mkdir -p /app/data/images && chown -R lasform:lasform /app
USER lasform

VOLUME /app/data
EXPOSE 8078
ENV JAVA_OPTS=""

# wget ships with alpine's busybox — no extra package needed for the healthcheck.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -q --spider http://localhost:8078/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar lasform.jar"]
