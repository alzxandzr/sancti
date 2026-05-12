/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Pages Router serves /api/* from `pages/api/`. The handler bodies live
  // in `handlers/*.ts` and are re-exported from `pages/api/*.ts` — keeping
  // them out of a top-level `api/` directory avoids Vercel auto-detecting
  // them as standalone serverless functions alongside the Next.js routes.
  typescript: {
    // Keep `npm run typecheck` as the source of truth so `next build` does
    // not spend cycles re-typechecking the entire repo on every Vercel build.
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
