import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { SearchBar, SearchForm } from "@/components/search-bar";
import { UserMenu, UserMenuSkeleton } from "@/components/user-menu";
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
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6 py-3">
            <Link
              href="/"
              className="hidden shrink-0 text-sm font-semibold tracking-tight sm:block"
            >
              Movie App
            </Link>
            <div className="min-w-0 flex-1">
              {/* The prerendered shell shows an empty box; the real one fills in `?q=`. */}
              <Suspense fallback={<SearchForm />}>
                <SearchBar />
              </Suspense>
            </div>
            {/* Reads the session cookie, so it streams in after the shell. */}
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
