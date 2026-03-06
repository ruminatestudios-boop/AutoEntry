import type { Metadata, Viewport } from "next";
import "./globals.css";
import OptionalClerkProvider from "./OptionalClerkProvider";

export const metadata: Metadata = {
  title: "AuraLink AI – Dashboard",
  description: "Multimodal product onboarding: image → structured data → omnichannel sync",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", background: "#f8fafc", margin: 0 }}>
        <OptionalClerkProvider>{children}</OptionalClerkProvider>
      </body>
    </html>
  );
}
