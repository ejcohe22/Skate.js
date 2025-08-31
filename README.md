# Skate.js

1. Prerequisites

Node.js 22.x (tested on 22.5.x)

npm (comes with Node)

Check your versions:

```
node -v
npm -v
```

If Node is missing, download it from https://nodejs.org

2. Install dependencies

```
npm install
```

This installs all dev tools (Vite, TypeScript, ESLint, Prettier, Vitest) and runtime dependencies (Three.js, Rapier).

3. Development workflow

Run the Vite development server:

```
npm run dev
```

Opens a local server at http://localhost:5173/

Supports hot module replacement (HMR) — changes reload instantly

4. Formatting and linting

Format all files with Prettier:

```
npm run format
```

Check code style with ESLint:

```
npm run lint
```

Auto-fix lint issues:

```
npm run lint:fix
```

6. Unit testing

```
npm run test
```

Add more .test.ts or .spec.ts files in src/ for feature/unit tests.

7. Production build test

```
npm run build
```

Output goes into the dist/ folder

Preview the production build locally:

```
npm run preview
```

Runs a local server serving the dist/ folder at http://localhost:4173/

8. Push to GitHub

Feature branches → PR into dev → CI runs lint + tests

Merge dev → main → GitHub Actions deploys built site to GitHub Pages

Assets/Credits

https://www.fab.com/listings/2a5d91a1-7788-4099-9b01-30cd8e2f1471
