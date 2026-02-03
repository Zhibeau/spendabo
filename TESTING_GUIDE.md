# Testing Guide for Spendabo API

This guide explains how to test sign up, sign in, and user operations (like imports) in your backend API.

## Architecture Overview

Your application uses **Firebase Authentication** with a JWT-based backend:

```
┌─────────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend UI   │ ──────> │ Firebase Auth│ ──────> │   Backend    │
│  (Not Built)    │ (JWT)   │   Platform   │         │   Express    │
└─────────────────┘         └──────────────┘         └──────────────┘
                                    │
                                    └──> Firestore
                                    
                                    
Key Points:
- Sign up/Sign in happens in FRONTEND (using Firebase SDK)
- Backend validates JWT tokens from Firebase
- Backend DOES NOT implement signup/signin - only validates auth
```

## Testing Strategy

### 1. **Authentication Middleware Tests**
Test that your `requireAuth` and `optionalAuth` middleware properly validates JWT tokens.

```typescript
// File: backend/src/auth.test.ts (create this)

import { requireAuth, optionalAuth } from './auth.js';
import type { AuthenticatedRequest } from './auth.js';
import express, { Request, Response } from 'express';
import type { AppConfig } from './config.js';

describe('Authentication Middleware', () => {
  let mockConfig: AppConfig;
  
  beforeEach(() => {
    mockConfig = {
      projectId: 'test-project',
      region: 'us-central1',
      port: 8080,
      allowLocalDevBypass: false,
      jwtAudience: 'test-project',
    };
  });

  describe('requireAuth', () => {
    it('should reject requests without authorization header', async () => {
      const app = express();
      app.get('/protected', requireAuth(mockConfig), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid JWT', async () => {
      const app = express();
      app.get('/protected', requireAuth(mockConfig), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should allow requests with valid JWT', async () => {
      // This test requires a real or mock Firebase token
      // See "Mocking Firebase Auth" section below
    });
  });

  describe('optionalAuth', () => {
    it('should allow requests without authorization header', async () => {
      const app = express();
      app.get('/public', optionalAuth(), (req, res) => {
        const authReq = req as AuthenticatedRequest;
        res.json({ 
          success: true, 
          hasUser: !!authReq.user 
        });
      });

      const response = await request(app)
        .get('/public')
        .expect(200);

      expect(response.body.hasUser).toBe(false);
    });
  });
});
```

### 2. **Import Operations Tests** (Already Partially Implemented)

Your `imports.test.ts` shows the pattern. Key test scenarios:

```typescript
// ✅ Upload CSV File
it('should successfully upload and process a CSV file', async () => {
  // 1. Mock account verification
  const mockAccountDoc = {
    exists: true,
    data: () => ({ uid: 'test-user-123', name: 'Test Account' }),
  };
  
  // 2. Setup mock data
  const csvContent = Buffer.from(
    'date,amount,description\n2024-01-15,-50.00,Coffee'
  ).toString('base64');
  
  // 3. Send request
  const response = await request(app)
    .post('/api/v1/imports/upload')
    .send({
      accountId: 'acc123',
      content: csvContent,
      filename: 'transactions.csv',
      mimeType: 'text/csv',
    })
    .expect(201);
  
  // 4. Verify response
  expect(response.body.success).toBe(true);
  expect(response.body.data.importId).toBe('import123');
});

// ✅ List user's imports
it('should list user imports ordered by date', async () => {
  const response = await request(app)
    .get('/api/v1/imports')
    .expect(200);
    
  expect(response.body.success).toBe(true);
  expect(response.body.data.imports).toBeInstanceOf(Array);
});

// ✅ Get specific import details
it('should retrieve import details by ID', async () => {
  const response = await request(app)
    .get('/api/v1/imports/import123')
    .expect(200);
    
  expect(response.body.data.import.id).toBe('import123');
});

// ❌ Error cases
it('should reject oversized files', async () => {
  const largeContent = Buffer.alloc(11 * 1024 * 1024); // 11MB
  
  const response = await request(app)
    .post('/api/v1/imports/upload')
    .send({
      accountId: 'acc123',
      content: largeContent.toString('base64'),
      filename: 'huge.csv',
      mimeType: 'text/csv',
    })
    .expect(413);
    
  expect(response.body.error.code).toBe('FILE_TOO_LARGE');
});

it('should reject unsupported file types', async () => {
  const content = Buffer.from('some content').toString('base64');
  
  const response = await request(app)
    .post('/api/v1/imports/upload')
    .send({
      accountId: 'acc123',
      content,
      filename: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    .expect(400);
    
  expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
});
```

## Testing Sign Up & Sign In (Frontend)

Since your backend doesn't implement signup/signin (Firebase Platform does), you need frontend tests:

### Sign Up Test (Frontend - Pseudocode)
```typescript
// Frontend test example (not in your backend)
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase-config';

it('should sign up a new user', async () => {
  const email = 'newuser@example.com';
  const password = 'SecurePassword123!';
  
  const userCredential = await createUserWithEmailAndPassword(
    auth, 
    email, 
    password
  );
  
  expect(userCredential.user.email).toBe(email);
  expect(userCredential.user.uid).toBeTruthy();
});
```

### Sign In Test (Frontend - Pseudocode)
```typescript
// Frontend test example (not in your backend)
import { signInWithEmailAndPassword } from 'firebase/auth';

it('should sign in an existing user', async () => {
  const email = 'user@example.com';
  const password = 'SecurePassword123!';
  
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  
  expect(userCredential.user.email).toBe(email);
});
```

### Getting JWT for Backend Testing
```typescript
// Frontend code to get JWT token
const user = auth.currentUser;
const idToken = await user?.getIdToken();

// Send to backend API with: 
// Authorization: Bearer {idToken}
```

## Running Tests Locally

### 1. **Unit Tests**
```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- src/routes/imports.test.ts

# Watch mode (rerun on file changes)
npm test:watch

# Coverage report
npm test:coverage
```

### 2. **Integration Tests** (With Firestore Emulator)
```bash
# Install Firebase Emulator Suite
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only firestore

# In another terminal, run tests with emulator
export FIRESTORE_EMULATOR_HOST=localhost:8080
npm test
```

### 3. **Manual API Testing with cURL**
```bash
# Get auth token first (from frontend or Firebase CLI)
TOKEN="your-firebase-jwt-token"

# Test upload endpoint
curl -X POST http://localhost:8080/api/v1/imports/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc123",
    "content": "ZGF0ZSxhbW91bnQsZGVzY3JpcHRpb24K",
    "filename": "transactions.csv",
    "mimeType": "text/csv"
  }'

# Test list imports
curl http://localhost:8080/api/v1/imports \
  -H "Authorization: Bearer $TOKEN"

# Test /me endpoint (user info)
curl http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. **Using VS Code REST Client Extension**
```http
### Variables
@host = http://localhost:8080
@token = your-firebase-jwt-token

### Get current user
GET {{@host}}/api/v1/me
Authorization: Bearer {{@token}}

### Upload a file
POST {{@host}}/api/v1/imports/upload
Authorization: Bearer {{@token}}
Content-Type: application/json

{
  "accountId": "acc123",
  "content": "ZGF0ZSxhbW91bnQsZGVzY3JpcHRpb24K",
  "filename": "test.csv",
  "mimeType": "text/csv"
}

### List imports
GET {{@host}}/api/v1/imports?limit=10
Authorization: Bearer {{@token}}

### Get specific import
GET {{@host}}/api/v1/imports/import123
Authorization: Bearer {{@token}}
```

## Mocking Firebase Auth for Unit Tests

Since you're mocking auth in unit tests, you don't need real Firebase tokens:

```typescript
// In your test setup (imports.test.ts)

jest.mock('../auth.js');
import { requireAuth } from '../auth.js';

beforeEach(() => {
  // Mock the middleware to attach user automatically
  (requireAuth as jest.Mock).mockImplementation(() => {
    return (req: AuthenticatedRequest, _res: unknown, next: () => void) => {
      req.user = { 
        uid: 'test-user-123',
        email: 'test@example.com'
      };
      next();
    };
  });
});
```

This way you can test your API logic without dealing with Firebase tokens.

## Test Coverage Checklist

### ✅ Auth Middleware
- [ ] Rejects missing authorization header
- [ ] Rejects invalid JWT tokens
- [ ] Extracts uid and email from valid token
- [ ] Optional auth allows unauthenticated requests
- [ ] Local dev bypass works when enabled

### ✅ Import Operations
- [ ] Upload CSV successfully
- [ ] Upload PDF successfully
- [ ] Upload image successfully
- [ ] Rejects missing required fields
- [ ] Rejects invalid base64 content
- [ ] Rejects oversized files (>10MB)
- [ ] Rejects unsupported MIME types
- [ ] Rejects when account doesn't exist
- [ ] Rejects when account doesn't belong to user
- [ ] List imports ordered by date
- [ ] Get specific import details
- [ ] Pagination works (limit parameter)

### ✅ User Operations
- [ ] GET /api/v1/me returns current user info
- [ ] GET /api/v1/status returns API status
- [ ] All endpoints require valid authentication
- [ ] Unauthenticated requests get 401 errors

### ✅ Error Handling
- [ ] Invalid JSON returns 400
- [ ] Missing parameters return 400
- [ ] Not found resources return 404
- [ ] Unauthenticated requests return 401
- [ ] Server errors return 500 with generic message
- [ ] Error messages don't expose internal details

## CI/CD Testing

Your GitHub Actions should run:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Next Steps

1. **Create auth.test.ts** with tests for authentication middleware
2. **Expand imports.test.ts** with more error scenarios
3. **Add integration tests** that use Firestore emulator
4. **Setup GitHub Actions** to run tests automatically
5. **Build frontend** with Firebase SDK for real signup/signin tests

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Testing](https://firebase.google.com/docs/emulator-suite)
- [Your testing.md rules](../rules/testing.md)
