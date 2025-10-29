# Contributing to QA Toolsmith

Thank you for your interest in contributing to QA Toolsmith! This guide outlines how to set up your local environment and ensure your contributions follow our code quality standards.

## Branching Strategy

This project uses **GitHub Flow**, a lightweight, branch-based workflow. All changes should be made through feature branches with pull requests.

### Creating a Feature Branch

1. **Start from an up-to-date master branch:**

   ```bash
   git checkout master
   git pull origin master
   ```

2. **Create a new feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Branch Naming Convention

Use descriptive, kebab-case branch names prefixed with a type:

- `feature/` - New features (e.g., `feature/iban-generator`)
- `fix/` - Bug fixes (e.g., `fix/login-validation`)
- `docs/` - Documentation updates (e.g., `docs/api-documentation`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)
- `test/` - Test improvements (e.g., `test/e2e-coverage`)

### Making Changes

1. Make your changes and commit them (pre-commit hooks will run automatically):

   ```bash
   git add .
   git commit -m "feat: add IBAN generator for Germany"
   ```

2. **Use conventional commits** for better changelog generation:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions or changes
   - `chore:` - Maintenance tasks

### Creating a Pull Request

1. **Push your branch to the remote:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub:
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill in the PR description

3. **Wait for CI checks to pass:**
   - Lint, build, unit tests, and E2E tests run automatically
   - All checks must pass before merging

4. **Get code review approval** (if applicable)

5. **Merge the PR** when approved

### Important Rules

- ❌ **Never push directly to `master` branch**
- ✅ **Always create a feature branch for changes**
- ✅ **Ensure all CI checks pass before merging**
- ✅ **Keep feature branches up-to-date with master**
- ✅ **Delete branch after merging**

## Pre-commit Hooks

This project uses **Husky** and **lint-staged** to automatically validate code before each commit. These hooks prevent common mistakes from entering the repository.

### What Happens on `git commit`?

When you commit staged changes, the following checks run automatically:

1. **ESLint** — Validates TypeScript/JavaScript syntax and style rules, automatically fixing fixable errors
2. **Prettier** — Formats all staged files (TypeScript, CSS, JSON, Markdown, etc.)
3. **TypeScript Type Checking** — Runs `tsc --noEmit` to verify no type errors exist

If any check fails, the commit is **blocked** until errors are resolved.

### Workflow Example

```bash
# 1. Make changes and stage them
git add src/my-feature.ts

# 2. Commit — hooks run automatically
git commit -m "Add my feature"

# If ESLint finds errors:
# → They are automatically fixed
# → Prettier formats the files
# → If TypeScript errors remain, commit is blocked
# → Fix the errors and try again

# 3. Commit succeeds
```

### Bypassing Hooks (Not Recommended)

If you absolutely need to bypass the hooks:

```bash
git commit --no-verify
```

**Note**: This is only for emergency situations. CI/CD will still catch issues.

## Linting & Formatting

Run these commands manually to check/fix code before committing:

```bash
# Check for linting errors
npm run lint

# Automatically fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format

# Type-check the entire project
npm run typecheck
```

## Quick Start

1. **Clone & Install**

   ```bash
   git clone <repo>
   cd qa-toolsmith
   npm install
   ```

2. **Husky hooks are automatically installed** during `npm install` (via `prepare` script)

3. **Start developing**
   ```bash
   npm run dev
   ```

## Code Quality Standards

- Use TypeScript for type safety
- Follow ESLint rules (see `eslint.config.js`)
- Format all files with Prettier (see `.prettierrc.json`)
- Write unit tests for utilities and services
- Write E2E tests for user flows
- Add descriptive commit messages

## Testing Before Submit

```bash
# Run all tests
npm run test:all

# Or individually:
npm run test:unit                # Unit tests
npm run test:e2e                 # E2E tests
npm run lint                     # Linting
npm run typecheck                # Type checking
npm run format                   # Formatting (dry-run, use with caution)
```

## Troubleshooting Pre-commit Hooks

### "pre-commit hook failed"

**Issue**: Commit blocked due to lint/format errors.

**Solution**: Run the failing command manually to understand the error:

```bash
npm run lint           # See what ESLint found
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format all files
npm run typecheck      # Find type errors
```

Then stage the fixes and commit again:

```bash
git add .
git commit -m "Fix lint/format issues"
```

### "Cannot find lint-staged"

**Issue**: `npm install` did not properly install devDependencies.

**Solution**:

```bash
npm install
npx husky install
```

### "tsc not found"

**Issue**: TypeScript is not installed.

**Solution**:

```bash
npm install
```

## lint-staged Configuration

The project uses `.lintstagedrc` to configure which tools run on which files:

```json
{
  "*.{ts,tsx,js,jsx,astro}": ["eslint --fix"],
  "*.{ts,tsx,js,jsx,md,css,json,astro}": ["prettier --write"]
}
```

This ensures:

- TypeScript/JavaScript files get linted with ESLint (auto-fix enabled)
- All staged files get formatted with Prettier

## Questions?

If you encounter issues or have questions about the contributing process, feel free to open an issue on GitHub.

Thank you for helping improve QA Toolsmith! 🎉
