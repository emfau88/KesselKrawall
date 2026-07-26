import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kessel-Krawall",
    template: "%s · Kessel-Krawall",
  },
  description:
    "Ein zugänglicher Mobile-Autobattler mit magischen Zutaten, automatischen Merges und starken Synergien.",
  applicationName: "Kessel-Krawall",
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
