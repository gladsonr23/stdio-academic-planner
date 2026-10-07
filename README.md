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

## Supabase setup

1. Run `supabase/migrations/001_stdio_beta.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and publishable key from Supabase Project Settings → API.
4. Create an Auth user for the first STDIO administrator.
5. Insert that user's UUID into `team_members` with the `admin` role from the SQL Editor.

The Question Banks screen reads published Semester 3 subjects, papers, and question counts from Supabase. It falls back to sample data while the environment variables or database tables are unavailable.
