"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
    >
      Sign out
    </button>
  );
}
