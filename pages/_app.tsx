import type { AppProps } from "next/app";
import Head from "next/head";
import { SessionProvider } from "../lib/web/session";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <style jsx global>{`
        :root {
          /* Cloister palette — ported from mobile/theme/tokens.ts */
          --bg: #efe6d3;
          --surface: #f6efe0;
          --surface-2: #e6dcc4;
          --hairline: rgba(40, 28, 18, 0.14);
          --rule: rgba(40, 28, 18, 0.22);

          --ink: #1d150e;
          --ink-soft: #3a2d1f;
          --ink-muted: #7a6a52;
          --ink-faint: rgba(40, 28, 18, 0.45);

          --brass: #a8823a;
          --brass-deep: #7e5f23;
          --terracotta: #a8442a;
          --olive: #5b6a36;
          --cardinal: #7a1e21;

          --font-display: "EB Garamond", ui-serif, Georgia, "Times New Roman", serif;
          --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--font-body);
          line-height: 1.55;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        button,
        input,
        textarea {
          font-family: inherit;
          font-size: 1rem;
          color: inherit;
        }
        a {
          color: var(--brass-deep);
        }
        ::selection {
          background: rgba(168, 130, 58, 0.25);
        }
      `}</style>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
