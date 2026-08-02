# DigitalHuman

DigitalHuman is a collaborative project between Beijing Jiaotong University and Lenovo, designed to empower the university's finance department with an intelligent digital human service.

The system provides finance-related consultation and Q&A support for faculty, students, and staff. Its digital human question-answering capability integrates online large language model APIs, embedding/vector model APIs, and a domain knowledge graph to deliver more accurate and context-aware responses.

In addition to the consultation experience, the software records conversation logs and detailed interaction metadata for review and analysis. It also includes operations and maintenance monitoring features to support stable day-to-day service management.

![Digital human service showcase](docs/images/digital-human-showcase.jpg)

![Digital human login screen](docs/screenshots/login-screen.png)

## Project Structure

- `backend/`: Spring Boot backend service
- `frontend/`: React frontend application
- `database/`: MySQL database initialization scripts

## Database

The database setup script is located at:

```text
database/Mysql数据库账户建表.sql
```

## Backend

```bash
cd backend
mvn spring-boot:run
```

## Frontend

```bash
cd frontend
npm install
npm start
```
