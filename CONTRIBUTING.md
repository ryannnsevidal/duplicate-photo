# Contributing Guide

Thank you for contributing! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. Fork the repository
2. Clone your fork
3. Set up the development environment (see [Getting Started Guide](./docs/guides/getting-started.md))
4. Create a new branch for your feature/fix

## Development Process

### 1. Branch Naming

- `feat/<scope>` - New features
- `fix/<scope>` - Bug fixes  
- `docs/<scope>` - Documentation changes
- `refactor/<scope>` - Code refactoring
- `test/<scope>` - Test improvements
- `chore/<scope>` - Maintenance tasks

Examples:
- `feat/user-authentication`
- `fix/api-validation-error`
- `docs/testing-guide`

### 2. Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Test additions or corrections
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files

Examples:
```bash
feat(auth): add JWT refresh token support

Implements refresh token rotation for improved security.
Tokens expire after 7 days and can be revoked.

Closes #123

---

fix(api): validate email format in user registration

The API was accepting invalid email formats. Added proper
validation using zod schema.

BREAKING CHANGE: API now returns 400 for invalid emails
```

### 3. Pull Request Process

1. **Update your branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks locally**
   ```bash
   pnpm ci
   ```

3. **Write/update tests**
   - All new features must have tests
   - All bug fixes must have regression tests
   - Maintain or improve code coverage

4. **Update documentation**
   - Update relevant guides in `/docs/guides`
   - Add ADR if making architectural decisions
   - Update API docs if changing endpoints

5. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

### 4. Code Review

- Respond to feedback constructively
- Make requested changes promptly
- Ask questions if something is unclear
- Approve PRs you've reviewed with clear feedback

## Code Standards

### TypeScript

- Use strict mode
- Avoid `any` types
- Prefer interfaces over types for objects
- Use descriptive variable names
- Document complex logic with comments

```typescript
// ✅ Good
interface UserProfile {
  id: string
  email: string
  preferences: UserPreferences
}

async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  // Validate updates before applying
  const validated = validateProfileUpdates(updates)
  return userRepository.update(userId, validated)
}

// ❌ Bad
async function update(id: any, data: any) {
  return db.update(id, data)
}
```

### React Components

- Use functional components with hooks
- Implement proper error boundaries
- Memoize expensive computations
- Follow accessibility guidelines

```tsx
// ✅ Good
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = memo(({ 
  variant = 'primary',
  onClick,
  children,
  disabled = false
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {children}
    </button>
  )
})
```

### Testing

- Write tests first (TDD)
- One assertion per test when possible
- Use descriptive test names
- Mock external dependencies

```typescript
// ✅ Good
describe('UserService', () => {
  describe('createUser', () => {
    it('should hash password before storing', async () => {
      const user = await userService.createUser({
        email: 'test@example.com',
        password: 'plain-text'
      })
      
      expect(user.password).not.toBe('plain-text')
      expect(user.password).toMatch(/^\$2[aby]\$/)
    })

    it('should reject duplicate emails', async () => {
      await userService.createUser({
        email: 'existing@example.com',
        password: 'password'
      })

      await expect(
        userService.createUser({
          email: 'existing@example.com',
          password: 'password'
        })
      ).rejects.toThrow('Email already exists')
    })
  })
})
```

## CI Requirements

All PRs must pass these checks:

1. **Linting**: No ESLint errors
2. **Type Check**: No TypeScript errors
3. **Tests**: All tests passing
4. **Coverage**: Maintain 80%+ coverage
5. **Build**: Successful production build

## Adding Dependencies

1. Discuss large dependencies in an issue first
2. Prefer well-maintained packages
3. Check bundle size impact
4. Update relevant documentation

```bash
# Add to specific workspace
pnpm add --filter @app/web react-query

# Add to root (dev dependency)
pnpm add -D -w @types/node
```

## Project Structure

When adding new code, follow the established patterns:

- **Apps**: Complete applications in `/apps/*`
- **Packages**: Shared code in `/packages/*`
- **Pure Logic**: Business logic in `/packages/core`
- **Types**: Shared types in `/packages/types`
- **UI Components**: Reusable UI in `/packages/ui`

## Release Process

We use [changesets](https://github.com/changesets/changesets) for versioning:

1. **Add changeset for your PR**
   ```bash
   pnpm changeset
   ```

2. **Select change type**
   - patch: Bug fixes
   - minor: New features
   - major: Breaking changes

3. **Write summary**
   - User-facing description
   - Migration instructions for breaking changes

## Getting Help

- Check existing issues and PRs
- Read the documentation
- Ask in discussions
- Tag maintainers for complex issues

## Recognition

Contributors are recognized in:
- Release notes
- Contributors list
- Special mentions for significant contributions

Thank you for making this project better! 🎉