import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            <Link href="/admin" className="text-[var(--accent)] font-black text-sm whitespace-nowrap mr-3">
              🏀 Love Lifts
            </Link>
            {[
              { href: "/admin/teams", label: "Teams" },
              { href: "/admin/results", label: "Results" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
