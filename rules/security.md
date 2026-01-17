# Security Guidelines

## Core Security Principles

### Defense in Depth
- **Multiple Layers**: Authentication, authorization, validation, and auditing
- **Fail Secure**: Default to deny; require explicit permission grants
- **Least Privilege**: Grant minimum permissions necessary
- **Zero Trust**: Verify every request, even internal ones

### Authentication & Authorization

#### Identity Platform (Firebase Auth)
- **JWT Verification**: Always verify tokens server-side
- **Token Expiry**: Respect token expiration; reject expired tokens
- **UID Extraction**: Extract `uid` from verified token for authorization
- **Session Management**: Use short-lived tokens; implement refresh logic

#### API Authentication
```typescript
// ✅ Good: Verify token and extract UID
const decodedToken = await admin.auth().verifyIdToken(idToken);
const uid = decodedToken.uid;

// ❌ Bad: Trust client-provided UID
const uid = req.body.uid;  // Never do this!
```

### Data Access Control

#### Firestore Rules
- **Authenticate All Reads**: No unauthenticated access to any data
- **UID Isolation**: Users can only access their own data
- **Field Validation**: Validate data types and required fields
- **Immutable Fields**: Prevent modification of critical fields (e.g., `uid`, `createdAt`)

#### Backend Validation
- **Input Validation**: Validate all user inputs
- **Output Sanitization**: Sanitize data before returning to client
- **SQL Injection**: Use parameterized queries (N/A for Firestore)
- **NoSQL Injection**: Validate field names and operators

### Secret Management

#### Secret Manager
- **All Secrets**: Store API keys, credentials, tokens in Secret Manager
- **Access Control**: Grant secret access only to services that need them
- **Rotation**: Plan for secret rotation (document process)
- **Never Commit**: Secrets must never appear in code or environment variables

#### Environment Variables
```typescript
// ✅ Good: Load from Secret Manager
const apiKey = await getSecret('third-party-api-key');

// ❌ Bad: Hardcoded secret
const apiKey = 'sk_live_123456789';  // Never do this!

// ❌ Bad: Environment variable for secrets
const apiKey = process.env.API_KEY;  // Use Secret Manager instead
```

### Network Security

#### Cloud Run
- **Private Services**: No public ingress by default
- **IAM Authentication**: Require authentication for all invocations
- **VPC Connector**: Use VPC for internal service communication
- **HTTPS Only**: Never allow plain HTTP

#### CORS
```typescript
// ✅ Good: Strict CORS policy
app.use(cors({
  origin: ['https://app.spendabo.com'],
  credentials: true,
}));

// ❌ Bad: Permissive CORS
app.use(cors({ origin: '*' }));  // Too permissive
```

### Input Validation

#### Validation Rules
- **Type Checking**: Validate data types
- **Range Checking**: Validate numeric ranges
- **Length Limits**: Enforce string length limits
- **Format Validation**: Use regex for email, phone, etc.
- **Whitelist**: Prefer whitelist over blacklist

```typescript
// ✅ Good: Explicit validation
function validateTransaction(data: unknown): Transaction {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid transaction data');
  }

  const { amount, description } = data as any;

  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Amount must be positive number');
  }

  if (typeof description !== 'string' || description.length > 500) {
    throw new Error('Invalid description');
  }

  return { amount, description };
}
```

### Error Handling

#### Information Disclosure
- **Generic Errors**: Return generic error messages to clients
- **Detailed Logs**: Log detailed errors server-side only
- **No Stack Traces**: Never send stack traces to clients in production

```typescript
// ✅ Good: Safe error handling
try {
  await processPayment(data);
} catch (error) {
  console.error('Payment processing failed:', error);  // Detailed log
  res.status(500).json({ error: 'Payment failed' });   // Generic response
}

// ❌ Bad: Leaking information
try {
  await processPayment(data);
} catch (error) {
  res.status(500).json({ error: error.message });  // May leak details
}
```

### Logging & Monitoring

#### Audit Logging
- **Authentication Events**: Log all login attempts
- **Authorization Failures**: Log denied access attempts
- **Data Modifications**: Log creates, updates, deletes
- **Security Events**: Log suspicious activities

#### What NOT to Log
- **Secrets**: API keys, passwords, tokens
- **PII**: Personal information (unless required for audit)
- **Full Requests**: May contain sensitive data

### Dependency Management

#### NPM Packages
- **Audit Regularly**: Run `npm audit` before each deployment
- **Pin Versions**: Use exact versions in production
- **Minimal Dependencies**: Only include necessary packages
- **Trusted Sources**: Verify package authenticity

### Rate Limiting

#### API Protection
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // Limit each IP to 100 requests per window
});

app.use('/api', limiter);
```

### Security Checklist

Before deploying:
- [ ] All endpoints require authentication
- [ ] JWT tokens are verified server-side
- [ ] Firestore rules enforce UID isolation
- [ ] No secrets in code or environment variables
- [ ] Cloud Run service is private (no allUsers)
- [ ] CORS is configured with specific origins
- [ ] Input validation on all user data
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are up-to-date (`npm audit` passes)
- [ ] Rate limiting is enabled
- [ ] Audit logging is in place
