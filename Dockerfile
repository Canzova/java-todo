#Base Image
FROM eclipse-temurin:21-jre

# Woring directory
WORKDIR /app

# Copy jar file to app.jar
COPY target/app-*.jar app.jar

# Expose this port
EXPOSE 8080

# Command to run jar file
CMD ["java","-jar","app.jar"]