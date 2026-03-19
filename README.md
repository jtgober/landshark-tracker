# React + TypeScript + Vite

## Persistent database & avatars (production)

Uploaded profile photos are stored on disk next to your SQLite DB when you use a single persistent volume:

1. Set **`DATABASE_PATH`** to a file on that volume, e.g. **`/data/database.sqlite`** if the disk is mounted at **`/data`**.
2. Avatar files are written to **`/data/uploads/avatars/`** automatically (same parent folder as the DB)—no extra config required.
3. Optionally set **`UPLOADS_DIR`** to override the uploads root (must be the folder that should map to URL `/uploads`).

Verify in production: `GET /api/health` returns `uploads: "persistent"` and `uploadsPath` when configured correctly.

### Test persistence locally

You don’t need a real `/data` mount on your laptop—use a folder under the server package:

1. From **`server/`**, run with a dedicated DB path (same layout as production):

   ```bash
   cd server
   npm run dev:persist
   ```

   That sets `DATABASE_PATH=./.shark-persist/database.sqlite` so SQLite and avatars live under **`server/.shark-persist/`** (`uploads/avatars/` next to the DB). The folder is gitignored.

2. **Sanity check:** open `http://localhost:3001/api/health` — you should see `"database": "persistent"`, `"uploads": "persistent"`, and `uploadsPath` ending in `.shark-persist/uploads`.

3. **Avatar check:** sign in, upload a profile photo, then confirm a file appears under `server/.shark-persist/uploads/avatars/`. Stop the server, start `npm run dev:persist` again, reload the app — the image should still load.

**Local UI + API:** Run Vite (`npm run dev` in the repo root) and the API on **port 3001**. Leave **`VITE_API_URL` unset** in dev so the app uses same-origin `/api` and the Vite proxy forwards to the backend—avatars and `<img>` loads work reliably. If `.env` sets `VITE_API_URL=http://localhost:3001`, remove it for local development or images load cross-origin from 5173→3001 and may show only the letter fallback.

**Don’t mix `npm run dev` and `npm run dev:persist`** for the same login: they use different SQLite files and upload folders (`server/data` / `server/uploads` vs `server/.shark-persist/`). The DB can still list `/uploads/avatars/...` while the file is only in the other folder — then you’ll see a letter fallback. Use one mode consistently.

To mimic **`/data`** exactly (optional): `sudo mkdir -p /data && sudo chown $USER /data`, then `DATABASE_PATH=/data/database.sqlite npm run dev` from `server/` (absolute path works the same way as on a VPS).

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
