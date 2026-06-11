import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDSC Dashboard",
  description: "NDSC matchday dashboard and Neon admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
