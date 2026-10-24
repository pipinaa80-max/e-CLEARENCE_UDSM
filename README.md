# e-Clearance Management Information System

## Overview

The e-Clearance Management Information System is a web-based platform for managing university clearance activities. It helps students submit clearance requests, provide supporting information, follow the progress of approvals, receive notifications, and request related academic services. University staff can review and process requests according to their responsibilities and roles.

The system is designed to replace fragmented, manual clearance processes with a centralized workflow that is easier to track, manage, and audit.

## Main capabilities

- Student account registration, authentication, and profile management
- Staff access based on institutional responsibilities
- Online clearance request submission
- Review and approval by relevant university offices
- Clearance status and history tracking
- Supporting document submission and management
- Notifications and user feedback
- Transcript request workflows
- Convocation-related clearance activities
- Administrative monitoring and system management

## Technology

The project uses a separate web frontend and backend service:

- **Frontend:** Angular and TypeScript, implemented as a single-page application
- **Backend:** Java-based web services responsible for business rules, authentication, workflow processing, data access, and integrations
- **Database:** Persistent storage for users, clearance requests, approvals, documents, notifications, and related records

The Angular frontend communicates with the backend through HTTP APIs. Angular routing, forms, reusable components, services, and route guards provide the main structure for the user experience. Frontend guards improve navigation and user experience, while authorization must also be enforced by the backend.

## User roles

The system supports different experiences for users involved in the clearance process, including:

- Students submitting and monitoring their own requests
- Academic and administrative staff reviewing assigned requests
- Offices responsible for financial, library, information technology, departmental, laboratory, workshop, and other approvals
- Administrators overseeing users, workflows, and system activity

## Typical workflow

1. A student creates an account or signs in.
2. The student completes the required profile and clearance information.
3. The student submits a clearance request and any required documents.
4. Responsible university offices review the request.
5. Each office records its decision or requests additional information.
6. The student monitors the request until the clearance process is complete.
7. The student can access the resulting status and continue with applicable transcript or convocation-related services.

## Running the system

Install the required dependencies for the frontend and backend, configure the database and service connection settings for the local environment, and start both applications. The Angular development server provides the browser interface, while the backend service provides the API and business functionality.

For deployment, configure production API endpoints, database credentials, email settings, file storage, and authentication secrets through environment-specific configuration. Do not commit credentials or other sensitive configuration values to source control.

## Project objectives

- Improve the speed and transparency of university clearance
- Reduce paperwork and repeated manual data entry
- Give students visibility into approval progress
- Help staff process requests consistently
- Maintain a reliable record of clearance decisions and supporting documents
- Provide a foundation for future integrations and reporting