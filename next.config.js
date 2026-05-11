/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Pages Router serves /api/* from `pages/api/`. The existing handler
  // bodies live in `api/*.ts` and are re-exported from `pages/api/*.ts` so we
  // don't rewrite the handler shape during the Phase-1 → web deploy step.
  typescript: {
    // Keep `npm run typecheck` as the source of truth so `next build` does
    // not spend cycles re-typechecking the entire repo on every Vercel build.
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
