import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Channel Charity Swim",
  description: "Track Karen and Elaine's English Channel charity swim progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
