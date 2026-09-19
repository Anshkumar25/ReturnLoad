import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "ReturnLoad — Earn on the empty return trip",
    template: "%s · ReturnLoad",
  },
  description:
    "ReturnLoad connects shippers with trucks returning empty after a delivery, so nobody runs empty and cargo moves cheaper.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // System font stack is defined in globals.css (@theme --font-sans). No
    // webfont download means the build and runtime stay offline-reliable.
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}