"use client";

import { use, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import type { Question, Session } from "@/lib/types";

type ResponseRow = {
  id: string;
  quiz_id: string;
  question_id: string;
  participant_id: string;
  answer: unknown;
  submitted_at: string;
  updated_at: string;
};

export default function ProjectorPage({
  params,
}: {
  params:
    | Promise<{ id: string }>
    | { id: string };
}) {
  const resolvedParams =
    params instanceof Promise ? use(params) : params;

  const sessionId = resolvedParams.id;

  const [session, setSession] =
    useState<Session | null>(null);
  const [question, setQuestion] =
    useState<Question | null>(null);
  const [responses, setResponses] =
    useState<ResponseRow[]>([]);
  const [error, setError] = useState<string | null>(
    null,
  );

  const loadQuestion = async (
    questionId: string | null,
  ) => {
    if (!questionId) {
      setQuestion(null);
      setResponses([]);
      return;
    }

    const { data: questionData } =
      await supabase
        .from("questions")
        .select("*")
        .eq("id", questionId)
        .single();

    if (!questionData) {
      setQuestion(null);
      setResponses([]);
      return;
    }

    setQuestion(questionData as Question);

    const { data: responseData } =
      await supabase
        .from("responses")
        .select(
          "id, quiz_id, question_id, participant_id, answer, submitted_at, updated_at",
        )
        .eq("quiz_id", sessionId)
        .eq("question_id", questionId)
        .order("updated_at", {
          ascending: true,
        });

    setResponses(
      (responseData ?? []) as ResponseRow[],
    );
  };

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const loadSession = async () => {
      const { data, error: sessionError } =
        await supabase
          .from("sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

      if (sessionError || !data) {
        setError(
          sessionError?.message ??
            "Unable to load session.",
        );
        return;
      }

      const currentSession = data as Session;

      setSession(currentSession);

      await loadQuestion(
        currentSession.active_question_id,
      );
    };

    void loadSession();

    const channel = supabase
      .channel(`projector-live-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          const updatedSession =
            payload.new as Session;

          setSession(updatedSession);

          await loadQuestion(
            updatedSession.active_question_id,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responses",
          filter: `quiz_id=eq.${sessionId}`,
        },
        async (payload) => {
          const changedResponse =
            payload.eventType === "DELETE"
              ? payload.old
              : payload.new;

          if (
            !question ||
            changedResponse.question_id !==
              question.id
          ) {
            return;
          }

          const { data } =
            await supabase
              .from("responses")
              .select(
                "id, quiz_id, question_id, participant_id, answer, submitted_at, updated_at",
              )
              .eq("quiz_id", sessionId)
              .eq("question_id", question.id)
              .order("updated_at", {
                ascending: true,
              });

          setResponses(
            (data ?? []) as ResponseRow[],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const totalResponses = responses.length;

  const tally = useMemo(() => {
    const counts: Record<string, number> = {};

    if (!question) {
      return counts;
    }

    for (const option of question.options) {
      counts[option] = responses.filter(
        (response) =>
          response.answer === option,
      ).length;
    }

    return counts;
  }, [question, responses]);

  const joinUrl =
    typeof window !== "undefined" && session
      ? `${window.location.origin}/join/${session.join_code}`
      : "";

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-lg font-semibold">
          {error}
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-2xl font-semibold">
          Connecting to live session...
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="flex w-[30%] flex-col items-center justify-center border-r bg-white p-8 text-center shadow-xl dark:bg-slate-900">
        <h1 className="text-3xl font-extrabold">
          {session.name}
        </h1>

        <p className="mt-3 text-lg text-muted-foreground">
          Scan to join
        </p>

        {joinUrl && (
          <div className="mt-6 rounded-2xl border bg-white p-4">
            <QRCodeSVG
              value={joinUrl}
              size={240}
            />
          </div>
        )}

        <div className="mt-6 rounded-full bg-slate-100 px-6 py-3 text-2xl font-black tracking-[0.25em] dark:bg-slate-800">
          {session.join_code}
        </div>

        <div className="mt-6 rounded-full bg-indigo-50 px-5 py-2 font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
          {totalResponses} responses
        </div>

        {session.status === "paused" ||
        session.is_offline ? (
          <div className="mt-4 rounded-full bg-yellow-100 px-6 py-2 font-bold text-yellow-800">
            Session Paused
          </div>
        ) : null}
      </aside>

      <section className="flex w-[70%] flex-col justify-center p-10 lg:p-16">
        {!question ? (
          <div className="text-center">
            <h2 className="text-5xl font-bold">
              Waiting for instructor
            </h2>

            <p className="mt-4 text-xl text-muted-foreground">
              The next question will appear
              automatically.
            </p>
          </div>
        ) : question.status === "closed" ? (
          <div className="text-center">
            <h2 className="text-5xl font-bold">
              Question Closed
            </h2>

            <p className="mt-4 text-xl text-muted-foreground">
              Waiting for the next question.
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              Live Question
            </p>

            <h2 className="text-4xl font-extrabold leading-tight lg:text-6xl">
              {question.text}
            </h2>

            {question.type ===
              "multiple_choice" && (
              <div className="mt-12 space-y-6">
                {question.options.map(
                  (option) => {
                    const count =
                      tally[option] ?? 0;

                    const percentage =
                      totalResponses === 0
                        ? 0
                        : Math.round(
                            (count /
                              totalResponses) *
                              100,
                          );

                    return (
                      <div
                        key={option}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between gap-4 text-xl font-bold lg:text-2xl">
                          <span>{option}</span>

                          <span className="text-muted-foreground">
                            {percentage}% ({count})
                          </span>
                        </div>

                        <Progress
                          value={percentage}
                          className="h-7"
                        />
                      </div>
                    );
                  },
                )}
              </div>
            )}

            <div className="mt-10 text-right text-lg font-semibold text-muted-foreground">
              Total Responses: {totalResponses}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
