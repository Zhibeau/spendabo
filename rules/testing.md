# Testing Guidelines

## Testing Philosophy

- **Test Behavior, Not Implementation**: Focus on what code does, not how
- **Fail Fast**: Tests should catch bugs before production
- **Maintainable**: Tests should be easy to understand and update
- **Fast**: Unit tests should run in milliseconds

## Test Structure

### Unit Tests
- **Location**: Co-located with source files as `*.test.ts`
- **Framework**: Jest (or Vitest for faster execution)
- **Coverage Target**: Aim for >80% coverage on business logic
- **Scope**: Test individual functions and classes in isolation

### Integration Tests
- **Location**: `/backend/tests/integration/`
- **Scope**: Test API endpoints end-to-end
- **Environment**: Use emulators for Firestore
- **Cleanup**: Always clean up test data

### Test Naming
```typescript
describe('AuthMiddleware', () => {
  describe('verifyToken', () => {
    it('should reject requests without authorization header', async () => {
      // Test implementation
    });

    it('should reject requests with invalid JWT', async () => {
      // Test implementation
    });

    it('should accept requests with valid JWT and set uid', async () => {
      // Test implementation
    });
  });
});
```

## Testing Patterns

### Arrange-Act-Assert (AAA)
```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [
    { amount: 10.50 },
    { amount: 25.00 },
  ];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(35.50);
});
```

### Mocking
- **External Services**: Always mock external API calls
- **Firestore**: Use Firestore emulator or mock the SDK
- **Auth**: Mock JWT verification in unit tests
- **Time**: Mock `Date.now()` for time-dependent tests

### Async Testing
```typescript
it('should fetch user data', async () => {
  const user = await getUserById('test-uid');
  expect(user.email).toBe('test@example.com');
});
```

## What to Test

### ✅ Test
- Business logic and calculations
- Error handling and edge cases
- Authentication and authorization
- Data validation
- API request/response formats

### ❌ Don't Test
- Third-party library internals
- Auto-generated code
- Simple getters/setters
- Framework code

## CI/CD Testing

### Pull Requests
- All tests must pass before merge
- Coverage reports should be generated
- No decrease in overall coverage

### Pre-deployment
- Run full test suite
- Integration tests against emulators
- Smoke tests after deployment

## Test Environment

### Local Development
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Firestore Emulator
```bash
# Start emulator
firebase emulators:start --only firestore

# Run tests against emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npm test
```

## Example Test

```typescript
import { verifyAuthToken } from './auth';
import { Request, Response, NextFunction } from 'express';

describe('verifyAuthToken', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFn = jest.fn();
  });

  it('should return 401 when no authorization header', async () => {
    await verifyAuthToken(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFn).not.toHaveBeenCalled();
  });
});
```
