import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthHandler } from "@/components/auth/auth-handler";
import { ToastContainer } from "@/components/ui/toast";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TravelNest - Your Digital Travel Home",
  description: "Plan trips, travel with friends, track expenses, and preserve memories in one beautiful place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthHandler />
        <ToastContainer />
        <ConfirmationModal />
        {children}
      </body>
    </html>
  );
}
