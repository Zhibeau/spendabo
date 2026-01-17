# Code Style Guidelines

## TypeScript Standards

### General Principles
- **Explicit Types**: Prefer explicit type annotations over inference for function signatures
- **Strict Mode**: All `tsconfig.json` files must use strict mode
- **No `any`**: Avoid `any` type; use `unknown` when type is truly unknown
- **Immutability**: Prefer `const` over `let`; use readonly where appropriate

### Naming Conventions
- **Files**: kebab-case (e.g., `auth-middleware.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Interfaces/Types**: PascalCase (e.g., `AuthConfig`)
- **Functions/Variables**: camelCase (e.g., `verifyToken`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)

### File Organization
```
src/
├── index.ts          # Entry point
├── config.ts         # Configuration
├── types/            # Shared type definitions
├── middleware/       # Express middleware
├── routes/           # Route handlers
└── services/         # Business logic
```

### Import Order
1. Node built-ins (e.g., `import * as fs from 'fs'`)
2. External dependencies (e.g., `import express from 'express'`)
3. Internal modules (e.g., `import { config } from './config'`)

Separate groups with blank lines.

### Functions
- **Arrow Functions**: Use for callbacks and simple functions
- **Named Functions**: Use for exported functions and complex logic
- **Single Responsibility**: Each function should do one thing
- **Max Length**: Keep functions under 50 lines; refactor if longer

### Error Handling
- **Never Swallow Errors**: Always log or propagate errors
- **Use Error Classes**: Extend `Error` for custom error types
- **Async Errors**: Always use try/catch with async/await
- **HTTP Errors**: Use appropriate status codes (401, 403, 404, 500)

### Comments
- **When**: Explain *why*, not *what*
- **JSDoc**: Use for exported functions and classes
- **Inline**: Use sparingly; prefer self-documenting code
- **TODO**: Format as `// TODO(username): description`

## Linting

### ESLint Configuration
- Use `@typescript-eslint` parser and plugin
- Extend recommended TypeScript rules
- Enforce consistent code style
- No unused variables or imports

### Pre-commit Checks
- ESLint must pass
- TypeScript compiler must pass
- Prettier formatting must be applied

## Examples

### Good
```typescript
interface UserProfile {
  readonly uid: string;
  email: string;
  createdAt: Date;
}

async function getUserProfile(uid: string): Promise<UserProfile> {
  if (!uid) {
    throw new Error('UID is required');
  }

  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) {
    throw new Error('User not found');
  }

  return doc.data() as UserProfile;
}
```

### Bad
```typescript
// Missing types, using 'any'
async function getUserProfile(uid: any) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.data();  // No type safety
}
```
