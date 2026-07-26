import type { Metadata, Viewport } from "next";
import "./globals.css";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const publicUrl = isGitHubPages
  ? "https://emfau88.github.io/KesselKrawall/"
  : "https://kessel-krawall.maddeanhotmail.chatgpt.site/";

export const metadata: Metadata = {
  metadataBase: new URL(publicUrl),
  title: {
    default: "Kessel-Krawall",
    template: "%s · Kessel-Krawall",
  },
  description:
    "Ein zugänglicher Mobile-Autobattler mit magischen Zutaten, automatischen Merges und starken Synergien.",
  applicationName: "Kessel-Krawall",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "./",
    siteName: "Kessel-Krawall",
    title: "Kessel-Krawall – Magischer Mobile-Autobattler",
    description:
      "Zutaten kaufen, mächtig mergen und einen kurzen automatischen Kesselkampf gewinnen.",
    images: [
      {
        url: "og.png",
        width: 1734,
        height: 907,
        alt: "Kessel-Krawall mit magischem Kessel und drei Zutaten",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kessel-Krawall",
    description:
      "Der Mobile-Autobattler rund um magische Zutaten, Merges und Kessel-Synergien.",
    images: ["og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#100d1b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
