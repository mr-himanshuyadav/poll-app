"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PollRedirect({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const sessionId = resolvedParams.id;
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("join_code")
        .eq("id", sessionId)
        .single();

      if (error || !data?.join_code) {
        router.replace("/join");
        return;
      }

      router.replace(`/join/${data.join_code}`);
    };

    if (sessionId) {
      void redirect();
    }
  }, [sessionId, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <p className="font-semibold">Opening session...</p>
    </main>
  );
}