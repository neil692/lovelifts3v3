"use client";

import { useState } from "react";
import { generatePools } from "@/actions/pools";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GeneratePoolsButton({ divisionId }: { divisionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const result = await generatePools(divisionId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Pools generated!");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="btn-primary text-xs py-1.5 px-3"
    >
      {loading ? "Generating…" : "Generate Pools"}
    </button>
  );
}
