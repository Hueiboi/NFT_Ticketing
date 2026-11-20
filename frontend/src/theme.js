import { extendTheme } from "@chakra-ui/react";

export const TOKENS = {
  surfaceBase: "#000000",
  surfaceRaised: "#0c0c0c",
  surfaceStrong: "#141414",
  borderSubtle: "#202020",
  accentPrimary: "#83c3ff",
  accentHover: "#a2d3ff",
  textPrimary: "#ffffff",
  textSecondary: "#acacac",
  statusSuccess: "#10B981",
  statusDanger: "#F43F5E",
  radiusCard: "16px",
  radiusControl: "12px",
  radiusPill: "9999px",
  transition: "all 250ms cubic-bezier(0.16, 1, 0.3, 1)",
};

export const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'Inter', system-ui, -apple-system, sans-serif`,
    body: `'Inter', system-ui, -apple-system, sans-serif`,
    mono: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`,
  },
  styles: {
    global: {
      "html, body": {
        bg: TOKENS.surfaceBase,
        color: TOKENS.textPrimary,
        fontSize: "16px",
        lineHeight: "24px",
        WebkitFontSmoothing: "antialiased",
      },
      "*::selection": {
        bg: TOKENS.accentPrimary,
        color: TOKENS.surfaceBase,
      },
      "@keyframes nftixScanline": {
        "0%": { top: "8%" },
        "50%": { top: "88%" },
        "100%": { top: "8%" },
      },
    },
  },
});
