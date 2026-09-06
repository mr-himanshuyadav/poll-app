"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  Participant,
  PollResponse,
  Question,
  Session,
} from "@/lib/types";

type StoredParticipant = {
  participantId: string;
  sessionToken: string;
};

export default function JoinPage({
  params,
}: {
  params:
    | Promise<{ code: string }>
    | { code: string };
}) {
  const resolvedParams =
    params instanceof Promise ? use(params) : params;

  const code = resolvedParams.code.toUpperCase();

  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<Question | null>(
    null,
  );
  const [participant, setParticipant] =
    useState<StoredParticipant | null>(null);

  const [selectedAnswer, setSelectedAnswer] =
    useState("");
  const [existingResponse, setExistingResponse] =
    useState<PollResponse | null>(null);

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `live-session-${code}`,
    [code],
  );

  const loadQuestion = async (
    questionId: string | null,
  ) => {
    if (!questionId) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      return;
    }

    const { data: questionData, error: questionError } =
      await supabase
        .from("questions")
        .select("*")
        .eq("id", questionId)
        .single();

    if (questionError || !questionData) {
      setQuestion(null);
      return;
    }

    const currentQuestion =
      questionData as Question;

    setQuestion(currentQuestion);

    if (!participant?.participantId) {
      setExistingResponse(null);
      setSelectedAnswer("");
      return;
    }

    const { data: responseData } = await supabase
      .from("responses")
      .select("*")
      .eq("quiz_id", session?.id ?? "")
      .eq("question_id", questionId)
      .eq(
        "participant_id",
        participant.participantId,
      )
      .maybeSingle();

    if (responseData) {
      const currentResponse =
        responseData as PollResponse;

      setExistingResponse(currentResponse);

      setSelectedAnswer(
        typeof currentResponse.answer === "string"
          ? currentResponse.answer
          : JSON.stringify(currentResponse.answer),
      );
    } else {
      setExistingResponse(null);
      setSelectedAnswer("");
    }
  };

  const loadSession = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: sessionError } =
      await supabase
        .from("sessions")
        .select("*")
        .eq("join_code", code)
        .single();

    if (sessionError || !data) {
      setError(
        "Session not found. Check the join code.",
      );
      setIsLoading(false);
      return;
    }

    const currentSession = data as Session;

    setSession(currentSession);

    if (typeof window !== "undefined") {
      const stored =
        window.localStorage.getItem(storageKey);

      if (stored) {
        try {
          const parsed =
            JSON.parse(stored) as StoredParticipant;

          if (
            parsed.participantId &&
            parsed.sessionToken
          ) {
            setParticipant(parsed);
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadSession();
  }, [code]);

  useEffect(() => {
    if (!session?.active_question_id) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      return;
    }

    void loadQuestion(session.active_question_id);
  }, [
    session?.active_question_id,
    participant?.participantId,
  ]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    const sessionChannel = supabase
      .channel(`student-session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sessionChannel);
    };
  }, [session?.id]);

  useEffect(() => {
    if (!session?.id || !participant?.participantId) {
      return;
    }

    const responseChannel = supabase
      .channel(
        `student-response-${session.id}-${participant.participantId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responses",
          filter: `quiz_id=eq.${session.id}`,
        },
        (payload) => {
          const row =
            payload.new as PollResponse;

          if (
            row.question_id !==
              session.active_question_id ||
            row.participant_id !==
              participant.participantId
          ) {
            return;
          }

          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            setExistingResponse(row);

            setSelectedAnswer(
              typeof row.answer === "string"
                ? row.answer
                : JSON.stringify(row.answer),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        responseChannel,
      );
    };
  }, [
    session?.id,
    session?.active_question_id,
    participant?.participantId,
  ]);

  const joinSession = async () => {
    if (!session || isJoining) {
      return;
    }

    if (
      session.participant_mode === "identified"
    ) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }

      if (
        !/^\d{1,2}$/.test(rollNumber) ||
        Number(rollNumber) < 0 ||
        Number(rollNumber) > 99
      ) {
        setError(
          "Roll number must be between 0 and 99.",
        );
        return;
      }
    }

    setIsJoining(true);
    setError(null);

    const token = crypto.randomUUID();

    const { data, error: participantError } =
      await supabase
        .from("participants")
        .insert({
          quiz_id: session.id,
          session_token: token,
          name:
            session.participant_mode === "identified"
              ? name.trim()
              : null,
          roll_number:
            session.participant_mode === "identified"
              ? Number(rollNumber)
              : null,
          is_anonymous:
            session.participant_mode === "anonymous",
        })
        .select("*")
        .single();

    if (participantError || !data) {
      setError(
        participantError?.message ??
          "Unable to join the session.",
      );
      setIsJoining(false);
      return;
    }

    const created =
      data as Participant;

    const stored: StoredParticipant = {
      participantId: created.id,
      sessionToken: created.session_token,
    };

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(stored),
    );

    setParticipant(stored);
    setIsJoining(false);

    if (session.active_question_id) {
      await loadQuestion(
        session.active_question_id,
      );
    }
  };

  const submitResponse = async () => {
    if (
      !session ||
      !question ||
      !participant ||
      !selectedAnswer ||
      isSubmitting
    ) {
      return;
    }

    if (
      session.status !== "live" ||
      session.is_offline ||
      question.status !== "active"
    ) {
      setError(
        "This question is not currently accepting responses.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const answer = selectedAnswer;

    if (existingResponse) {
      if (!session.allow_answer_change) {
        setIsSubmitting(false);
        return;
      }

      const { data, error: updateError } =
        await supabase
          .from("responses")
          .update({
            answer,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", existingResponse.id)
          .select("*")
          .single();

      if (updateError || !data) {
        setError(
          updateError?.message ??
            "Unable to update response.",
        );
        setIsSubmitting(false);
        return;
      }

      setExistingResponse(data as PollResponse);
      setSelectedAnswer(answer);
      setIsSubmitting(false);
      return;
    }

    const { data, error: insertError } =
      await supabase
        .from("responses")
        .insert({
          quiz_id: session.id,
          question_id: question.id,
          participant_id:
            participant.participantId,
          answer,
        })
        .select("*")
        .single();

    if (insertError || !data) {
      setError(
        insertError?.message ??
          "Unable to submit response.",
      );
      setIsSubmitting(false);
      return;
    }

    setExistingResponse(data as PollResponse);
    setSelectedAnswer(answer);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="font-semibold">
          Loading session...
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to Join</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-red-600">
              {error ?? "Session not found."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (
    session.status === "completed" ||
    session.status === "archived"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{session.name}</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-muted-foreground">
              This session has ended.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!participant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>{session.name}</CardTitle>

            <p className="text-sm text-muted-foreground">
              Join code: {session.join_code}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {session.participant_mode ===
            "identified" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="student-name">
                    Name
                  </Label>

                  <Input
                    id="student-name"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Enter your name"
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roll-number">
                    Roll Number
                  </Label>

                  <Input
                    id="roll-number"
                    value={rollNumber}
                    onChange={(event) =>
                      setRollNumber(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      )
                    }
                    inputMode="numeric"
                    placeholder="00"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border bg-slate-50 p-4 text-sm dark:bg-slate-900">
                You are joining anonymously.
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              disabled={isJoining}
              onClick={() =>
                void joinSession()
              }
            >
              {isJoining
                ? "Joining..."
                : "Join Session"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>{session.name}</CardTitle>

            <p className="text-xs text-muted-foreground">
              {session.participant_mode ===
              "anonymous"
                ? "Anonymous participation"
                : "Identified participation"}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {session.status === "paused" ||
            session.is_offline ? (
              <div className="rounded-2xl border bg-yellow-50 p-6 text-center dark:bg-yellow-950/30">
                <h2 className="text-xl font-bold">
                  Session Paused
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Wait for the instructor to resume.
                </p>
              </div>
            ) : !question ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <h2 className="text-xl font-bold">
                  Waiting for the instructor
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  The next question will appear
                  automatically.
                </p>
              </div>
            ) : question.status ===
              "closed" ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <h2 className="text-xl font-bold">
                  Question Closed
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Waiting for the next question.
                </p>
              </div>
            ) : existingResponse ? (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Your Response
                  </p>

                  <h1 className="text-2xl font-bold leading-tight">
                    {question.text}
                  </h1>
                </div>

                <div className="rounded-2xl border bg-green-50 p-5 dark:bg-green-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                    {session.allow_answer_change
                      ? "Response Submitted"
                      : "Response Locked"}
                  </p>

                  <p className="mt-2 text-lg font-bold">
                    {selectedAnswer}
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {session.allow_answer_change
                      ? "You can change your answer while this question is live."
                      : "You have already answered this question."}
                  </p>
                </div>

                {session.allow_answer_change &&
                  question.status === "active" && (
                    <Button
                      className="w-full"
                      disabled={isSubmitting}
                      onClick={() =>
                        void submitResponse()
                      }
                    >
                      {isSubmitting
                        ? "Saving..."
                        : "Save Answer"}
                    </Button>
                  )}
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Live Question
                  </p>

                  <h1 className="text-2xl font-bold leading-tight">
                    {question.text}
                  </h1>
                </div>

                {question.type ===
                  "multiple_choice" && (
                  <div className="space-y-3">
                    {question.options.map(
                      (option, index) => (
                        <button
                          key={`${question.id}-${index}`}
                          type="button"
                          onClick={() =>
                            setSelectedAnswer(
                              option,
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            selectedAnswer ===
                            option
                              ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 dark:bg-indigo-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span className="mr-3 font-bold text-muted-foreground">
                            {String.fromCharCode(
                              65 + index,
                            )}
                            .
                          </span>

                          {option}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {question.type === "scale" && (
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from(
                      {
                        length:
                          typeof question.config
                            .max === "number"
                            ? question.config.max -
                              (typeof question.config
                                .min === "number"
                                ? question.config
                                    .min
                                : 1) +
                              1
                            : 5,
                      },
                      (_, index) =>
                        String(
                          (typeof question.config
                            .min === "number"
                            ? question.config.min
                            : 1) + index,
                        ),
                    ).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setSelectedAnswer(
                            value,
                          )
                        }
                        className={`rounded-xl border p-4 font-bold ${
                          selectedAnswer ===
                          value
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : ""
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  className="h-12 w-full"
                  disabled={
                    !selectedAnswer ||
                    isSubmitting
                  }
                  onClick={() =>
                    void submitResponse()
                  }
                >
                  {isSubmitting
                    ? "Submitting..."
                    : "Submit Response"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
