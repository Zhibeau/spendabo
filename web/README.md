# Spendabo Web Frontend

This directory is a placeholder for the future web frontend.

## Status

**Not implemented in Phase 1-2.**

The current phase focuses on:
- Infrastructure provisioning (Phase 1)
- Backend API foundation with authentication (Phase 1)
- Firestore data model definition (Phase 2)

## Future Implementation (Phase 3+)

The web frontend will:
- Authenticate users via Identity Platform (Firebase Auth)
- Call the private Cloud Run backend API with JWT tokens
- Display transactions, categories, and accounts
- Allow manual categorization and rule creation
- Support CSV/file imports

## Proposed Tech Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Authentication**: Firebase Auth SDK
- **API Client**: Fetch API with JWT interceptor
- **Hosting**: Firebase Hosting or Cloud Run (static)
- **UI Library**: TBD (Material-UI, Tailwind, etc.)

## Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User enters credentials
       ▼
┌─────────────────────┐
│  Identity Platform  │
└──────┬──────────────┘
       │
       │ 2. Returns JWT token
       ▼
┌─────────────┐
│   Browser   │ (stores token)
└──────┬──────┘
       │
       │ 3. API request with Authorization: Bearer <JWT>
       ▼
┌─────────────────────┐
│  Cloud Run Backend  │
└─────────────────────┘
```

## Development Plan (Future)

1. Set up Vite + React + TypeScript
2. Integrate Firebase Auth SDK
3. Create authentication UI (login/signup)
4. Build API client with JWT interceptor
5. Implement transaction list view
6. Implement category management
7. Implement CSV import UI
8. Deploy to Firebase Hosting

## Notes

- Frontend will NOT be publicly accessible via allUsers
- Access control will be via Identity Platform authentication
- All API calls require valid JWT from authenticated users
- Follow security guidelines in `/rules/security.md`

Stay tuned for Phase 3+!
