# DigitalHuman

A full-stack digital human service platform for finance consultation, conversation logging, and operations monitoring. The project is a collaboration between Beijing Jiaotong University and Lenovo, built to empower the university's finance department and provide faculty, students, and staff with accessible finance-related Q&A support.

The Q&A experience integrates online large language model APIs, embedding/vector model APIs, and a finance-domain knowledge graph to produce more accurate, traceable, and context-aware answers. The system also records conversation logs, stores detailed interaction metadata, and provides monitoring tools for daily operations and maintenance.


- [Beijing Jiaotong University News](https://mp.weixin.qq.com/s/J67AnABbr6ij_h1s85yT_A)
- [Promotional Video](https://www.douyin.com/video/7668967184319761690)

<img src="docs/images/digital-human-showcase.jpg" alt="Digital human service showcase" width="720">

## Project Highlights

- Full-stack project structure with separate `frontend/`, `backend/`, and `database/` modules.
- Digital human consultation workflow for university finance service scenarios.
- Retrieval-augmented Q&A powered by online LLM APIs, vector model APIs, and knowledge graph context.
- Conversation log management for Tangshan and Beijing service scenarios.
- Detailed response analytics, including response time breakdowns and token usage information.
- Floating chatbot interface for finance-related consultation inside the operations dashboard.
- Server and device monitoring features for day-to-day operations management.
- Environment-variable-based backend configuration to avoid committing local database credentials or secrets.

## Repository Structure

```text
DigitalHuman/
|-- backend/              # Spring Boot backend service
|-- frontend/             # React frontend application
|-- database/             # MySQL schema and initialization scripts
|-- docs/                 # Project images and screenshots
`-- README.md             # Project overview and setup guide
```

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Ant Design, Material UI, Axios, React Router, Chart.js, Recharts |
| Backend | Java 17, Spring Boot, Spring Security, Spring Data JPA, JWT |
| Database | MySQL |
| AI Integration | Online large language model APIs, embedding/vector model APIs, knowledge graph retrieval |
| Monitoring | Server metrics, device monitoring, Tailscale status checks |

## Features

- User login and JWT-based authentication
- Finance consultation through a digital human Q&A interface
- Integration with online LLM and vector retrieval services
- Knowledge graph enhanced answer generation
- Tangshan and Beijing chat log views
- Response time and token usage detail display
- Answered, unanswered, and unclear question statistics
- Server CPU, memory, load, uptime, and hardware monitoring
- Device list management for site and desktop monitoring
- Floating chatbot for finance-related information lookup
- Chinese/English UI language support

## Backend Configuration

The backend configuration is stored in `backend/src/main/resources/application.properties` and supports environment variables.

Common variables:

| Variable | Description |
| --- | --- |
| `DB_URL` | MySQL JDBC URL |
| `DB_USERNAME` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `JWT_SECRET` | JWT signing secret |
| `INIT_ADMIN_ENABLED` | Whether to initialize an administrator account |
| `INIT_ADMIN_USERNAME` | Initial administrator username |
| `INIT_ADMIN_PASSWORD` | Initial administrator password |

Local private values can be provided through `backend/application-local.properties`, which is intentionally excluded from Git.

## Database Setup

The MySQL initialization script is located at:

```text
database/Mysql数据库账户建表.sql
```

## Local Development

Start the backend service:

```bash
cd backend
mvn spring-boot:run
```

Start the frontend application:

```bash
cd frontend
npm install
npm start
```

## Docker Deployment

The repository includes Docker configuration for running the full system with three services: React/Nginx frontend, Spring Boot backend, and MySQL.

Docker-related files:

- `compose.yaml`: runtime services, environment variables, MySQL volume, and service dependencies
- `compose.build.yaml`: local image build configuration for the frontend and backend
- `.env.example`: safe template for required deployment variables
- `backend/Dockerfile`: backend image build
- `frontend/Dockerfile`: frontend image build
- `frontend/nginx/default.conf`: Nginx static hosting and `/api/` reverse proxy configuration
- `scripts/Initialize-DeploymentEnv.ps1`: creates a private local `.env` file with generated secrets
- `scripts/Backup-ComposeDatabase.ps1`: exports a database backup from the Compose MySQL service
- `scripts/Export-OfflinePackage.ps1`: builds an offline deployment package with Docker images and optional database snapshot

Quick start on Windows with Docker Desktop:

```powershell
.\scripts\Initialize-DeploymentEnv.ps1
docker compose -f compose.yaml -f compose.build.yaml up -d --build
```

The generated `.env`, database backups, offline packages, and Docker image archives are intentionally excluded from Git because they may contain secrets or production data. See [Docker Compose Deployment](DOCKER-DEPLOYMENT.md) for the full deployment and migration guide.

## My Role

This project packages a digital human finance consultation scenario into a demonstrable full-stack system. My work focused on organizing the repository, integrating the React frontend with Spring Boot APIs, supporting authentication and conversation records, presenting Q&A analytics, and adding monitoring views for operational maintenance.

## Known Limitations

- Online model and vector API credentials must be configured outside the repository before running the full Q&A workflow.
- Production deployment should provide real database credentials and a strong `JWT_SECRET` through environment variables.
- The included database script is intended for initialization and demonstration; production data is intentionally excluded.
- Some monitoring targets, internal network addresses, and model service endpoints are environment-dependent.

## Screenshots

| Login Screen |
| --- |
| <img src="docs/screenshots/login-screen.png" alt="Login screen" width="720"> |

| Q&A Analytics | Operations Monitoring and Chatbot |
| --- | --- |
| <img src="docs/screenshots/qa-analytics-details.jpg" alt="Q&A analytics details" width="420"> | <img src="docs/screenshots/operations-monitor-chatbot.png" alt="Operations monitoring and chatbot" width="420"> |

| Response Time and Token Details |
| --- |
| <img src="docs/screenshots/response-time-token-details.png" alt="Response time and token details" width="720"> |

| Q&A Statistics Analysis | Answer Image Display |
| --- | --- |
| <img src="docs/screenshots/qa-statistics-analysis.png" alt="Q&A statistics analysis" width="420"> | <img src="docs/screenshots/answer-image-display.png" alt="Answer image display" width="420"> |

| Domain Knowledge Graph |
| --- |
| <img src="docs/screenshots/domain-knowledge-graph.png" alt="Domain knowledge graph" width="720"> |

## Portfolio Summary

This project demonstrates full-stack engineering ability across frontend UI development, backend API design, authentication, database-backed logging, AI service integration, Q&A analytics, and operational monitoring.

Suggested resume entry:

```text
DigitalHuman
Full-stack digital human finance consultation platform built with React, Spring Boot, MySQL, JWT authentication, LLM/vector API integration, knowledge graph retrieval, conversation logging, and operations monitoring.
https://github.com/KFgituser/DigitalHuman
```
