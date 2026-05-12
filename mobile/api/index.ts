// Single Vercel Function entry that fronts every Expo Router API route.
// The adapter loads the metro-bundled server build (dist/server) and routes
// requests to the right `+api.ts` handler. vercel.json rewrites everything
// to /api/index so a single function handles the whole surface.

import { createRequestHandler } from "@expo/server/adapter/vercel";
import path from "node:path";

export default createRequestHandler({
  build: path.join(__dirname, "../dist/server"),
});
