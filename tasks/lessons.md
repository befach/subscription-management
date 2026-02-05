# Lessons Learned

> Document patterns and rules after any correction to prevent repeating mistakes.

---

## Architecture

### 2026-02-04 - Avoid Over-Engineering
**Mistake:** Added server-side sessions table for single-admin app
**Root Cause:** Applied enterprise patterns without considering actual use case
**Rule:** Match complexity to requirements - single admin doesn't need multi-session management
**Example:**
```typescript
// Overkill for single admin:
// - sessions table
// - server-side session tokens
// - logout mutation

// Appropriate for single admin:
// - localStorage with expiration
// - email-based validation
// - simple logout (clear localStorage)
```

---

## Convex

### Schema
- Add indexes for fields used in `.filter()` or frequent lookups
- `by_name` index on categories for duplicate checking
- `by_currency` index on subscriptions for deletion validation

### Queries / Mutations
- Use `.first()` instead of `.collect()` when checking existence
- Encrypt/decrypt are async with Web Crypto API - use `await`
- Explicit table queries are type-safe; avoid `table as any`

---

## Security

### 2026-02-04 - Encryption
**Mistake:** Using XOR cipher for password encryption
**Root Cause:** XOR is simple but not cryptographically secure
**Rule:** Always use AES-256-GCM for symmetric encryption
**Example:**
```typescript
const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext);
```

### 2026-02-04 - Hardcoded Secrets
**Mistake:** Using hardcoded encryption keys for development
**Rule:** Always require environment variables, no fallbacks
**Example:**
```typescript
// Bad
const key = process.env.KEY || "dev-key";

// Good
if (!key) throw new Error("ENCRYPTION_KEY required. Set via: npx convex env set ...");
```

### 2026-02-04 - HTML Injection
**Mistake:** Interpolating user input directly into email HTML
**Rule:** Always escape HTML entities for user content
**Example:**
```typescript
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

---

## Project-Specific

### Admin Password
- Never seed with known passwords like "admin123"
- Generate random password during seeding, log once
- bcrypt cost factor 12+

### Email Validation
- Check TLD length (2+ chars), no consecutive dots
- Max length 254 characters

---

## Template for New Lessons

```
### [Date] - [Category]
**Mistake:** What went wrong
**Root Cause:** Why it happened
**Rule:** What to do instead
**Example:** Code or pattern to follow
```
