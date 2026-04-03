"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-6">
      <div className="auth-card max-w-xl text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/80">404</div>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-slate-400">
          The requested route does not exist in this Power Fusion workspace.
        </p>
        <Link href="/" className="landing-button landing-button-primary landing-button-large mt-8">
          Return Home
        </Link>
      </div>
    </div>
  );
}
