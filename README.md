# Hunter

The app's records, Quest progress, theme, and Yoga sets are saved through the
Express API to a single Prisma `AppState` table in PostgreSQL (for example,
Supabase). The browser does not keep an ongoing `localStorage` copy. Data left
by the previous version is imported once after the first successful API save,
then those old browser keys are removed.

## Connect Supabase

1. Copy `.env.example` to `.env`.
2. From Supabase **Project Settings → Database**, copy the pooler connection
   string into `DATABASE_URL` and the direct connection string into
   `DIRECT_URL`. Keep `.env` private; these are server credentials.
3. Run:

   ```sh
   npm install
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

Vite forwards `/api` to the Express API on port `3001`. The first API request
creates an HTTP-only browser session cookie; all later saves load the same row
from the database. If the API or database is unavailable, the app shows a
connection error instead of silently opening an unsaved local copy.

## Deployment Options

### Option A: Both Frontend & Backend Together on Render or Railway (Easiest)
Deploy the full project as a single Web Service on **Render**, **Railway**, or **Koyeb**:
1. Connect your GitHub repository.
2. Set Build Command: `npm install && npm run db:generate && npm run build`
3. Set Start Command: `npm start`
4. Environment Variables:
   - `DATABASE_URL`: Supabase Transaction Pooler URL
   - `DIRECT_URL`: Supabase Direct Connection URL
   - `NODE_ENV`: `production`
5. Express will automatically serve the built Vite frontend (`dist/`) and handle API requests under `/api` on the same domain with 0 CORS issues.

### Option B: Separate Frontend (Vercel) & Backend (Render)
If you want Frontend on **Vercel** / **Netlify** and Backend on **Render** / **Railway**:
1. **Backend (Render / Railway)**:
   - Build Command: `npm install && npm run db:generate`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL`: Supabase Transaction Pooler URL
     - `DIRECT_URL`: Supabase Direct Connection URL
     - `CLIENT_ORIGIN`: `https://your-app.vercel.app`
     - `NODE_ENV`: `production`
2. **Frontend (Vercel)**:
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable:
     - `VITE_API_URL`: `https://your-backend.onrender.com`

The session is anonymous and tied to the browser. There are no user accounts
or cross-device sign-in; add authentication before using this for private,
multi-user data.
