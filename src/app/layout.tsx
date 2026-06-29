import type { Metadata } from "next";
import "./globals.css";

import AuthWrapper from "@/components/AuthWrapper";

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
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
