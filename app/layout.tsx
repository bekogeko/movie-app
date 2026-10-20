import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { SearchBar, SearchForm } from "@/components/search-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie App",
  description: "Movie recommendations powered by Neo4j",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* `group` lets page content react to the search's pending state. */}
      <body className="group min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-black/[.08] bg-background/80 backdrop-blur dark:border-white/[.145]">
          <div className="mx-auto w-full max-w-3xl px-6 py-3">
            {/* The prerendered shell shows an empty box; the real one fills in `?q=`. */}
            <Suspense fallback={<SearchForm />}>
              <SearchBar />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
