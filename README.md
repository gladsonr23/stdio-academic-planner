# STDIO — Academic Planner

A responsive academic planning frontend built with React, TypeScript, Vite, and Lucide icons.

## Features

- Academic planner dashboard and assessment overview
- Semester and examination question-bank browsing
- Interactive question-paper viewer and question intelligence
- Study notes and material library views
- PDF-grounded STDiO Bot with semantic passage retrieval and page citations
- Admin-only solved study-notes generator for published question-bank PDFs, with private PDF preview before publishing
- Responsive desktop, tablet, and mobile layouts

## Run locally

Use Node.js 22.13 or newer for the server-side PDF text extraction dependency.

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
- Add `GEMINI_API_KEY` as a server-only Vercel environment variable (and to `.env.local` for local `vercel dev`). It is used only by the server-side `/api/rag` and `/api/study-notes-generator` functions; do not use a `VITE_` prefix. `GEMINI_RAG_MODEL` is optional and defaults to `gemini-3.8-flash`.
- On the first question about a PDF, STDiO extracts its selectable text, builds semantic embeddings, and caches the private index in Neon Storage. Later questions reuse that index. The RAG endpoint only reads published PDFs, limits requests, and returns cited page references. Scanned/image-only PDFs are not OCR'd yet, and PDFs over 240 pages or 180 text passages are currently outside the one-request indexing limit.
- Relevant PDF excerpts and the student question are sent to Google Gemini for embeddings and answer generation. Configure API access, quotas, and billing in Google AI Studio; a lightweight per-instance request limit is also applied by the app.
- The first question can take longer because it builds the PDF index. The `/api/rag` Vercel Function has a 60-second maximum duration to allow extraction, embedding, and answer generation in one request.
- The team selects a semester, subject, material type, title, and PDF. The upload is stored under `semester-N/subject-code/<folder>/`, then its published metadata is inserted in Neon so it appears in the corresponding planner section.
- In `/admin`, the team can generate solved notes from a published question bank for the selected subject. The API requires the admin session, returns an unlisted draft PDF for review, and only publishes it to Study Notes after the admin approves it. Source PDFs are limited to 4 MB, 120 pages, and about 36,000 selectable-text characters; scanned PDFs need OCR and are not supported by this generator.
- Uploads are currently PDF-only and limited to 4 MB because they pass through a Vercel Function. Larger files require a direct-to-Neon upload flow.
- Use `vercel dev` for local end-to-end testing; plain `npm run dev` serves the Vite UI but does not run the `/api` functions.

## Legacy Supabase prototype

`supabase/migrations/001_stdio_beta.sql` is an earlier prototype schema and is not used by the current Neon-backed Vercel APIs. The live collections and upload portal use the Neon `subjects` and `documents` tables plus Neon Storage.
