# AixG Platform: Development & Execution Plan

*Last Updated: October 10, 2025*

## 1. AixG Platform: Vision & Strategy

### Project Vision
To create a market-leading, AI-powered football analytics platform for Israeli football clubs, providing deep tactical insights, real-time coaching assistance, and comprehensive player performance analysis.

### Core Features
*   **Video Ingestion & Analysis:** Automated processing of match footage.
*   **Real-Time Analysis:** Live game analysis with WebRTC streaming and ML pipelines.
*   **AI Coaching Module:** Hebrew-native AI coach providing tactical recommendations.
*   **Football Tactical Board:** A rich, interactive canvas for drawing and analyzing tactics.
*   **Team & Player Management:** A comprehensive system for managing teams and players.
*   **Analytics Dashboard:** A user-friendly frontend for visualizing data and insights.

### High-Level Architecture
The AixG platform is built on a microservices architecture, with the following key components:
*   **Backend:** NestJS (TypeScript) backend with a CQRS and Event Sourcing pattern.
*   **Frontend:** Next.js (React) frontend.
*   **Database:** PostgreSQL as the primary database, with Prisma as the ORM.
*   **Event Streaming:** Apache Pulsar for asynchronous communication between services.
*   **Storage:** MinIO for S3-compatible object storage.
*   **LLM Integration:** A multi-model LLM orchestration service for AI coaching.

## 2. Current State Analysis (October 2025)

### Completed Components
*   **Core Infrastructure:** Dockerized services, including PostgreSQL, Pulsar, MinIO, and Redis.
*   **Video Ingestion Service:** Basic video upload and processing pipeline.
*   **Team & Player Management:** Foundational Prisma schema for teams and players.
*   **AI Coaching Module (Skeleton):**
    *   CQRS command and query handlers have been created.
    *   The module is integrated into the main application.
    *   A multi-model LLM orchestration service is in place, with a mock implementation for API calls.
    *   OpenAI client has been implemented, but not for other providers.

### In-Progress Components
*   **AI Coaching Module (LLM Integration):** The `callLLMModel` method in the `LLMOrchestrationService` is partially implemented, with a real implementation for OpenAI and mock implementations for other providers.
*   **Frontend Dashboard:** A basic Next.js frontend exists, but most of the UI components and features are not implemented.
*   **CI/CD Pipeline:** A CI/CD pipeline is set up using GitHub Actions, but it is currently failing due to TypeScript errors.

### Not Started Components
*   **Football Tactical Board:** This is a new feature that has not been started.
*   **API Documentation:** No automated API documentation has been set up.
*   **Production Deployment:** The application has not been deployed to a production environment.
*   **Comprehensive Testing:** The project lacks a comprehensive test suite.

### Technical Debt
*   **TypeScript Errors:** The project has a significant number of TypeScript errors that are preventing the build from succeeding.
*   **Lack of Tests:** The codebase has very low test coverage, which makes it difficult to refactor and add new features safely.
*   **Mock Implementations:** Several parts of the application, especially the `LLMOrchestrationService`, rely on mock implementations.
*   **Incomplete Frontend:** The frontend is not in a usable state.

## 3. Development Environment & Workflow

### Local Development Setup

#### Frontend with Mocked Backend
To enable parallel development of the frontend and backend, we will create a mocked backend for the frontend to work against.

*   **Tooling:** We will use `msw` (Mock Service Worker) to intercept API requests from the frontend and return mocked responses.
*   **Fixture Files:** Mocked responses will be stored in JSON fixture files in the `frontend/src/mocks/fixtures` directory.
*   **Implementation:**
    1.  Install and configure `msw` in the frontend application.
    2.  Create fixture files for all API endpoints.
    3.  Create `msw` handlers that read from the fixture files and return the mocked responses.
    4.  Add a script to the `frontend/package.json` to run the frontend with the mocked backend.

#### Frontend with Remote Backend
For integration testing and development, the local frontend needs to be able to connect to a deployed backend environment (e.g., staging).

*   **Configuration:** We will use environment variables to configure the API endpoint for the frontend.
*   **Implementation:**
    1.  Create a `.env.staging` file in the `frontend` directory with the URL of the staging backend.
    2.  Update the frontend code to use the environment variable for the API endpoint.
    3.  Add a script to the `frontend/package.json` to run the frontend against the staging backend.

### Git Workflow
We will follow the "GitHub Flow" workflow:
1.  Create a new branch from `main` for each new feature or bug fix.
2.  Open a pull request when the feature is ready for review.
3.  The pull request must be reviewed and approved by at least one other developer.
4.  All CI checks must pass.
5.  Once approved, the branch is merged into `main`.

### CI/CD Pipeline
The CI/CD pipeline is implemented using GitHub Actions. The pipeline will be updated to:
1.  Run on every push to `main` and on every pull request.
2.  Run linting and formatting checks.
3.  Run all tests (unit, integration, and e2e).
4.  Build the application.
5.  Deploy the application to the staging environment.
6.  Deploy the application to the production environment (on manual trigger).

## 4. Feature Roadmap

### AI Coaching Module (Completion)
*   **Implement all LLM clients:** Create real implementations for all LLM providers in the `LLMOrchestrationService` (Anthropic, Gemini, etc.).
*   **Implement mock dependencies:** Create real implementations for the mock dependencies (`VectorDatabaseService`, `EnhancedTacticalKnowledgeBase`, `PlayerPerformanceAnalyzer`).
*   **Write tests:** Write comprehensive tests for the AI Coaching module.

### Football Tactical Board
This is a new feature that will allow coaches to create and analyze football tactics on an interactive canvas.

*   **Canvas Implementation:**
    *   Choose a canvas library (e.g., `Fabric.js`, `Konva.js`).
    *   Implement a basic canvas component in the frontend.
*   **Drawing Tools:**
    *   Implement tools for drawing players, formations, and player movements.
    *   Implement tools for adding text and annotations.
*   **Saving & Loading:**
    *   Implement the functionality to save and load tactical boards to/from the backend.
    *   This will require a new Prisma model for tactical boards.
*   **Integration with AI Coaching:**
    *   Integrate the tactical board with the AI Coaching module to allow for AI-powered tactical analysis.

### Frontend Dashboard (Completion)
*   **Implement all UI components:** Create all the necessary UI components for the dashboard.
*   **Implement all features:** Implement all the features of the dashboard, including real-time updates, data visualization, and user interactions.
*   **Hebrew localization:** Complete the Hebrew localization of the frontend.

### API Documentation
*   **Generate OpenAPI/Swagger documentation:** Use `@nestjs/swagger` to generate OpenAPI documentation for the REST API.
*   **Generate GraphQL documentation:** Use a tool like `graphdoc` to generate documentation for the GraphQL API.

## 5. Phase-Based Execution Plan

### Phase 1: Foundation & Developer Experience (2 Weeks)
*   **Task 1.1: Fix TypeScript Build and CI/CD Pipeline:**
    *   Fix all TypeScript errors.
    *   Ensure the CI/CD pipeline is passing.
*   **Task 1.2: Setup Local Development Environments:**
    *   Implement the mocked backend for the frontend.
    *   Configure the frontend to connect to a remote backend.
*   **Task 1.3: Enhance Test Infrastructure:**
    *   Set up a testing framework for the frontend.
    *   Add more tests to the backend.

### Phase 2: Core Feature Implementation (4 Weeks)
*   **Task 2.1: Complete AI Coaching Module (LLM Integration):**
    *   Implement the remaining LLM clients.
    *   Implement the mock dependencies.
*   **Task 2.2: Implement Football Tactical Board (v1):**
    *   Implement the basic canvas and drawing tools.
    *   Implement the saving and loading of tactical boards.

### Phase 3: Frontend & API (3 Weeks)
*   **Task 3.1: Complete Frontend Dashboard:**
    *   Implement the main dashboard UI.
    *   Integrate the AI Coaching module and the Tactical Board.
*   **Task 3.2: Generate API Documentation:**
    *   Generate OpenAPI and GraphQL documentation.

### Phase 4: Production Readiness (2 Weeks)
*   **Task 4.1: Production Deployment & Monitoring:**
    *   Deploy the application to a production environment.
    *   Set up monitoring and alerting.
*   **Task 4.2: Security Audit & Hardening:**
    *   Perform a security audit of the application.
    *   Implement security best practices.

## 6. Knowledge Base & Documentation

### Documentation Structure
All documentation will be stored in the `/docs` directory and will be organized as follows:

*   `/docs/architecture`: Detailed documentation of the system architecture.
*   `/docs/developer-guides`: Guides for developers on how to set up and work with the project.
*   `/docs/api-reference`: Generated API documentation.
*   `/docs/features`: Detailed documentation for each feature.

### Tools & Platforms
*   **Documentation Website:** We will use a static site generator like Docusaurus or MkDocs to create a documentation website from the Markdown files in the `/docs` directory.
*   **API Documentation:** We will use Swagger UI and GraphQL Playground for interactive API documentation.