ARG MAVEN_IMAGE=docker.m.daocloud.io/library/maven:3.9-eclipse-temurin-17
ARG JRE_IMAGE=docker.m.daocloud.io/library/amazoncorretto:17-alpine-jdk

FROM ${MAVEN_IMAGE} AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM ${JRE_IMAGE}
RUN apk add --no-cache ffmpeg curl nodejs npm

WORKDIR /app
COPY --from=build /app/target/video-driven-skill-*.jar app.jar

ENV VIDEO_DRIVEN_SKILL_HOME=/data
VOLUME ["/data"]

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
