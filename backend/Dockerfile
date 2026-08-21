FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw --batch-mode dependency:go-offline

COPY src src
RUN ./mvnw --batch-mode package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd --system --uid 10001 appuser
COPY --from=build /app/target/DigitalHuman-backend-0.0.1-SNAPSHOT.jar app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
