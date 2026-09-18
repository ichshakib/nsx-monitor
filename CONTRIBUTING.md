# Contributing to NSX Monitor

Thank you for your interest in contributing to **NSX Monitor**! We welcome community contributions, bug fixes, feature proposals, and documentation improvements.

---

## 🛠️ Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 20)
- [pnpm](https://pnpm.io/) (>= 9)
- [Git](https://git-scm.com/)

### Initial Setup

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/nsx-monitor.git
   cd nsx-monitor
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ichshakib/nsx-monitor.git
   ```
4. **Install dependencies**:
   ```bash
   cd desktop
   pnpm install
   ```

---

## 🌿 Branching Strategy

- Always create a dedicated branch for your work:
  ```bash
  git checkout -b feature/your-feature-name
  # or
  git checkout -b fix/your-bugfix-name
  ```
- Keep your branch synchronized with `upstream/main`:
  ```bash
  git fetch upstream
  git rebase upstream/main
  ```

---

## 💻 Coding Guidelines

- **Code Style & Formatting:** We use Prettier for code formatting and ESLint for linting. Please ensure your code is formatted before committing.
- **TypeScript:** Strict type checking is enabled. Avoid using `any` and ensure all interfaces and types are properly defined.
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

### Verification Commands

Before opening a pull request, run the following checks in `desktop/`:
```bash
# Typecheck
pnpm run typecheck

# Lint check
pnpm run lint

# Build test
pnpm exec vite build
```

---

## 🚀 Running Locally

```bash
cd desktop
pnpm run dev
```

---

## 📤 Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. **Open a Pull Request** (PR) on GitHub targeting `main`.
3. **Fill out the PR Template**: Describe your changes, testing steps, and link any related issues using `Fixes #<issue-number>`.
4. **Await Review**: Address any feedback from reviewers promptly.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
