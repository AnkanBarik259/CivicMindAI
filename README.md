# CivicMind AI Architecture Blueprint & Setup

This repository contains the foundational boilerplate for **CivicMind AI**.

## Folder Structure

\`\`\`
/src
  /api          # Express Backend API Routes
  /components   # React Components
    /ui         # Shadcn UI generic components
    /global     # Global layouts (Navbar, Sidebar, etc)
  /lib          # Utilities (cn, firebase config)
  /store        # Zustand state management
  /types        # TypeScript types & interfaces
  /pages        # React Router Page views
/server.ts      # Express Backend Entry Point
/package.json   # Dependencies and Scripts
\`\`\`

## Stack Notes

Since this environment operates via Google AI Studio's Node.js container (where Python cannot be executed), the architecture translates the requested **FastAPI/Next.js** specification into an equivalent, production-ready **Express + React (Vite) Full-Stack setup**.

- **Frontend:** React 19, React Router, TailwindCSS, Zustand, React Hook Form
- **Backend:** Express, TypeScript, serving AI logic via \`/api/*\` routes.
- **Compilation:** \`esbuild\` bundles the server into \`dist/server.cjs\` for production deployments.

## Setup Instructions

1. Populate \`.env\` using the variables listed in \`.env.example\`
2. The environment automatically installs dependencies.

## Run Instructions

- **Development:** The environment runs \`npm run dev\` automatically (via \`tsx server.ts\`).
- **Production Build:** \`npm run build\` packages both Vite frontend and Express backend.
