import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHM-SYSTEM Admin",
  description: "Admin panel for SHM-SYSTEM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
