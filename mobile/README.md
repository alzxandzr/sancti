# Sancti Mobile (Expo)

React Native client for Sancti. This directory is its own package — the web
deploy at the repo root does not install these dependencies.

## Develop

```bash
cd mobile
npm install
npm run start            # opens Expo dev tools
npm run ios              # iOS simulator
npm run android          # Android emulator
```

## Environment

The mobile app calls the public Next.js API hosted at the repo root. Configure
`EXPO_PUBLIC_API_BASE_URL` (e.g. `https://sancti.vercel.app/api`) in `.env`
before building. See `../.env.example` for the full list.

## Build / Submit

`eas.json` here drives EAS builds. Fill in `appleTeamId` / `ascAppId` /
`extra.eas.projectId` in `app.json` before submitting.
