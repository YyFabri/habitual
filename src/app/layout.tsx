import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Habitual — Tu rastreador de hábitos",
  description:
    "Construí mejores hábitos día a día con Habitual. Rastreá tu progreso, mantené la constancia y alcanzá tus metas.",
  manifest: "/manifest.json",
  authors: [{ name: "YyFabri" }],
  creator: "YyFabri",
  other: {
    "copyright": "© 2025-2026 YyFabri. Todos los derechos reservados.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Habitual",
  },
  openGraph: {
    title: "Habitual — Tu rastreador de hábitos",
    description: "Construí mejores hábitos día a día.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f0e8f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} antialiased min-h-dvh`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
