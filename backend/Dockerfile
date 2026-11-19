# Two stages: a big image with the JDK and Maven builds the jar,
# then a small Java-runtime-only image runs it. The final image doesn't carry build tools.

# ---- Stage 1: build ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy only the build files first and download dependencies. Docker caches this layer,
# so rebuilding after a code change doesn't download everything again.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package

# ---- Stage 2: run ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Don't run as root. The uploads folder is only used when STORAGE_TYPE=local.
RUN useradd --system --no-create-home app && mkdir uploads && chown app uploads
USER app

COPY --from=build /app/target/*.jar app.jar

# Render sets PORT; application.properties reads it (default 8080).
EXPOSE 8080
# Use up to 75% of the container's memory for Java (free hosts give about 512 MB).
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
