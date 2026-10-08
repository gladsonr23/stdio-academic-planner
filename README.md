# STDIO — Academic Planner

A responsive academic planning frontend built with React, TypeScript, Vite, and Lucide icons.

## Features

- Academic planner dashboard and assessment overview
- Semester and examination question-bank browsing
- Interactive question-paper viewer and question intelligence
- Study notes and material library views
- Context-aware floating AI assistant mockup
- Responsive desktop, tablet, and mobile layouts

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Team upload portal (Neon + Vercel)

- Open `/admin` on the deployed Vercel site (the `G` profile button also links there).
- Configure `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel for Production and Preview. Use a long private team password and a different random session secret with at least 32 characters.
- Keep the existing server-only Neon database and Storage environment variables configured in Vercel. Never use a `VITE_` prefix for these credentials.
- The team selects a semester, subject, material type, title, and PDF. The upload is stored under `semester-N/subject-code/<folder>/`, then its published metadata is inserted in Neon so it appears in the corresponding planner section.
- Uploads are currently PDF-only and limited to 4 MB because they pass through a Vercel Function. Larger files require a direct-to-Neon upload flow.
- Use `vercel dev` for local end-to-end testing; plain `npm run dev` serves the Vite UI but does not run the `/api` functions.

## Legacy Supabase prototype

`supabase/migrations/001_stdio_beta.sql` is an earlier prototype schema and is not used by the current Neon-backed Vercel APIs. The live collections and upload portal use the Neon `subjects` and `documents` tables plus Neon Storage.
