import { Geist, Geist_Mono } from "next/font/google";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack/server";
import "./globals.css";
import DatabaseProvider from "./convex_provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Speech Coach",
  description: "A personal AI assistant to help you practice and improve your public speaking skills. Get feedback on your delivery, content.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StackProvider app={stackServerApp}><StackTheme>
            <DatabaseProvider>
              {children}
            </DatabaseProvider>
        </StackTheme></StackProvider>
      </body>
    </html>
  );
}
