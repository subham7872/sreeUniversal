import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoStoreProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Shree Universal Pharmacy — Demo only, sample data",
  description: "Clickable sales demo with mock data only. Not a live pharmacy service.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b8a6b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="font-sans antialiased">
        <DemoStoreProvider>
          <Shell>{children}</Shell>
        </DemoStoreProvider>
      </body>
    </html>
  );
}
