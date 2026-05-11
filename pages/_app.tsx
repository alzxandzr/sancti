import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        :root {
          --bg: #faf7f2;
          --ink: #1a1a1a;
          --muted: #6b6258;
          --accent: #6c4a2f;
          --line: #e5dfd5;
          --card: #ffffff;
          --warn: #b7410e;
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
          font-family: ui-serif, Georgia, "Times New Roman", serif;
          line-height: 1.55;
        }
        button,
        input,
        textarea {
          font-family: inherit;
          font-size: 1rem;
        }
        a {
          color: var(--accent);
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
