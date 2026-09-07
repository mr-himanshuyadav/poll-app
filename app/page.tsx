"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const joinSession = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const normalizedCode =
      code.trim().toUpperCase();

    if (!normalizedCode) {
      setError(
        "Enter a session code.",
      );
      return;
    }

    setIsJoining(true);
    setError(null);

    const {
      data,
      error: sessionError,
    } = await supabase
      .from("sessions")
      .select("id, status, join_code")
      .eq(
        "join_code",
        normalizedCode,
      )
      .maybeSingle();

    if (
      sessionError ||
      !data
    ) {
      setError(
        "Session not found. Check the code and try again.",
      );

      setIsJoining(false);
      return;
    }

    if (
      data.status ===
        "completed" ||
      data.status ===
        "archived"
    ) {
      setError(
        "This session has already ended.",
      );

      setIsJoining(false);
      return;
    }

    router.push(
      `/session/${normalizedCode}`,
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">

        <div className="w-full max-w-md">

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-black text-white">
              P
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              Join your session
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter the session code shown by your instructor
              to join the live classroom.
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>
                Session Code
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={
                  joinSession
                }
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="session-code">
                    Enter code
                  </Label>

                  <Input
                    id="session-code"
                    autoFocus
                    autoComplete="off"
                    inputMode="text"
                    maxLength={8}
                    placeholder="e.g. ABC123"
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .toUpperCase()
                          .replace(
                            /\s/g,
                            "",
                          ),
                      )
                    }
                    className="h-14 text-center text-xl font-black tracking-[0.3em]"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full"
                  disabled={isJoining}
                >
                  {isJoining
                    ? "Joining..."
                    : "Join Session"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-5 text-center">
            <button
              type="button"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              onClick={() =>
                router.push(
                  "/login",
                )
              }
            >
              Instructor Login
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}