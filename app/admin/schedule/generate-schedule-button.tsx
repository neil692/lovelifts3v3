"use client";

import { useState } from "react";
import { generateSchedule } from "@/actions/schedule";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GenerateScheduleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm("This will delete and regenerate all SCHEDULED pool games. Continue?")) return;
    setLoading(true);
    const result = await generateSchedule();
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Schedule generated: ${result?.count} games`);
      router.refresh();
    }
  }

  return (
    <button onClick={handle} disabled={loading} className="btn-primary text-sm">
      {loading ? "Generating…" : "Generate Schedule"}
    </button>
  );
}
