"use client";

import { use, useEffect, useMemo, useState } from "react";
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

type ResultEntry = {
  option: string;
  count: number;
  percentage: number;
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

  const [session, setSession] =
    useState<Session | null>(null);

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [participant, setParticipant] =
    useState<StoredParticipant | null>(null);

  const [selectedAnswer, setSelectedAnswer] =
    useState("");

  const [existingResponse, setExistingResponse] =
    useState<PollResponse | null>(null);

  const [responseCount, setResponseCount] =
    useState(0);

  const [resultEntries, setResultEntries] =
    useState<ResultEntry[]>([]);

  const [averageValue, setAverageValue] =
    useState<number | null>(null);

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] =
    useState("");

  const [isEditingResponse, setIsEditingResponse] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isJoining, setIsJoining] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const storageKey = useMemo(
    () => `live-session-${code}`,
    [code],
  );

  const answerToString = (
    answer: unknown,
  ) => {
    if (typeof answer === "string") {
      return answer;
    }

    if (
      typeof answer === "number" ||
      typeof answer === "boolean"
    ) {
      return String(answer);
    }

    try {
      return JSON.stringify(answer);
    } catch {
      return String(answer);
    }
  };

  const loadResults = async (
    currentSessionId: string,
    currentQuestion: Question,
  ) => {
    if (!currentQuestion.results_visible) {
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      return;
    }

    const {
      data,
      error: responseError,
    } = await supabase
      .from("responses")
      .select(
        "id, answer, participant_id",
      )
      .eq("quiz_id", currentSessionId)
      .eq(
        "question_id",
        currentQuestion.id,
      );

    if (responseError) {
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      return;
    }

    const rows =
      (data ?? []) as Array<{
        id: string;
        answer: unknown;
        participant_id: string;
      }>;

    setResponseCount(rows.length);

    if (rows.length === 0) {
      setResultEntries([]);
      setAverageValue(null);
      return;
    }

    if (
      currentQuestion.type ===
      "multiple_choice"
    ) {
      const counts: Record<
        string,
        number
      > = {};

      for (
        const option of
          currentQuestion.options
      ) {
        counts[option] = 0;
      }

      for (const row of rows) {
        const answer =
          answerToString(row.answer);

        counts[answer] =
          (counts[answer] ?? 0) + 1;
      }

      const entries =
        currentQuestion.options.map(
          (option) => {
            const count =
              counts[option] ?? 0;

            return {
              option,
              count,
              percentage:
                rows.length === 0
                  ? 0
                  : Math.round(
                      (count /
                        rows.length) *
                        100,
                    ),
            };
          },
        );

      setResultEntries(entries);
      setAverageValue(null);
      return;
    }

    if (
      currentQuestion.type === "true_false"
    ) {
      const counts: Record<
        string,
        number
      > = {
        True: 0,
        False: 0,
      };

      for (const row of rows) {
        const answer =
          answerToString(row.answer);

        const normalized =
          answer.toLowerCase();

        if (
          normalized === "true"
        ) {
          counts.True += 1;
        } else if (
          normalized === "false"
        ) {
          counts.False += 1;
        }
      }

      const entries = [
        {
          option: "True",
          count: counts.True,
          percentage: Math.round(
            (counts.True /
              rows.length) *
              100,
          ),
        },
        {
          option: "False",
          count: counts.False,
          percentage: Math.round(
            (counts.False /
              rows.length) *
              100,
          ),
        },
      ];

      setResultEntries(entries);
      setAverageValue(null);
      return;
    }

    if (
      currentQuestion.type === "scale" ||
      currentQuestion.type === "rating"
    ) {
      const numericValues =
        rows
          .map((row) =>
            Number(row.answer),
          )
          .filter((value) =>
            Number.isFinite(value),
          );

      if (
        numericValues.length === 0
      ) {
        setAverageValue(null);
        setResultEntries([]);
        return;
      }

      const average =
        numericValues.reduce(
          (sum, value) =>
            sum + value,
          0,
        ) / numericValues.length;

      setAverageValue(
        Math.round(
          average * 100,
        ) / 100,
      );

      const counts: Record<
        string,
        number
      > = {};

      for (const value of numericValues) {
        const key = String(value);
        counts[key] =
          (counts[key] ?? 0) + 1;
      }

      const entries =
        Object.entries(counts)
          .sort(
            ([a], [b]) =>
              Number(a) -
              Number(b),
          )
          .map(
            ([option, count]) => ({
              option,
              count,
              percentage:
                Math.round(
                  (count /
                    numericValues.length) *
                    100,
                ),
            }),
          );

      setResultEntries(entries);
      return;
    }

    setResultEntries([]);
    setAverageValue(null);
  };

  const loadQuestion = async (
    questionId: string | null,
    currentSession?: Session | null,
    currentParticipant?: StoredParticipant | null,
  ) => {
    const activeSession =
      currentSession ?? session;

    const activeParticipant =
      currentParticipant ?? participant;

    if (!questionId) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      setIsEditingResponse(false);
      return;
    }

    const {
      data: questionData,
      error: questionError,
    } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single();

    if (
      questionError ||
      !questionData
    ) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      setIsEditingResponse(false);
      return;
    }

    const currentQuestion =
      questionData as Question;

    setQuestion(currentQuestion);

    if (
      activeSession?.id &&
      currentParticipant?.participantId
    ) {
      const {
        data: responseData,
      } = await supabase
        .from("responses")
        .select("*")
        .eq(
          "quiz_id",
          activeSession.id,
        )
        .eq(
          "question_id",
          questionId,
        )
        .eq(
          "participant_id",
          currentParticipant.participantId,
        )
        .maybeSingle();

      if (responseData) {
        const currentResponse =
          responseData as PollResponse;

        setExistingResponse(
          currentResponse,
        );

        setSelectedAnswer(
          answerToString(
            currentResponse.answer,
          ),
        );
      } else {
        setExistingResponse(null);
        setSelectedAnswer("");
      }
    } else {
      setExistingResponse(null);
      setSelectedAnswer("");
    }

    setIsEditingResponse(false);

    if (activeSession?.id) {
      await loadResults(
        activeSession.id,
        currentQuestion,
      );
    }
  };

  const loadSession = async () => {
    setIsLoading(true);
    setError(null);

    const {
      data,
      error: sessionError,
    } = await supabase
      .from("sessions")
      .select("*")
      .eq("join_code", code)
      .single();

    if (
      sessionError ||
      !data
    ) {
      setError(
        "Session not found. Check the join code.",
      );
      setIsLoading(false);
      return;
    }

    const currentSession =
      data as Session;

    setSession(currentSession);

    let storedParticipant:
      | StoredParticipant
      | null = null;

    if (
      typeof window !== "undefined"
    ) {
      const stored =
        window.localStorage.getItem(
          storageKey,
        );

      if (stored) {
        try {
          const parsed =
            JSON.parse(stored) as StoredParticipant;

          if (
            parsed.participantId &&
            parsed.sessionToken
          ) {
            storedParticipant =
              parsed;

            setParticipant(
              parsed,
            );
          }
        } catch {
          window.localStorage.removeItem(
            storageKey,
          );
        }
      }
    }

    if (
      currentSession.active_question_id &&
      storedParticipant
    ) {
      await loadQuestion(
        currentSession.active_question_id,
        currentSession,
        storedParticipant,
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadSession();
  }, [code]);

  useEffect(() => {
    if (
      !session?.active_question_id
    ) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      setIsEditingResponse(false);
      return;
    }

    void loadQuestion(
      session.active_question_id,
    );
  }, [
    session?.active_question_id,
    participant?.participantId,
  ]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    const sessionChannel =
      supabase
        .channel(
          `student-session-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sessions",
            filter: `id=eq.${session.id}`,
          },
          (payload) => {
            setSession(
              payload.new as Session,
            );
          },
        )
        .subscribe();

    const questionChannel =
      supabase
        .channel(
          `student-question-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "questions",
          },
          (payload) => {
            const changedQuestion =
              payload.new as Question;

            if (
              !session.active_question_id ||
              changedQuestion.id !==
                session.active_question_id
            ) {
              return;
            }

            setQuestion(
              changedQuestion,
            );

            if (
              session.id &&
              changedQuestion
            ) {
              void loadResults(
                session.id,
                changedQuestion,
              );
            }
          },
        )
        .subscribe();

    const responseChannel =
      supabase
        .channel(
          `student-results-${session.id}`,
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
            const changedResponse =
              payload.new as PollResponse;

            if (
              changedResponse.question_id ===
              session.active_question_id
            ) {
              const active =
                question;

              if (active) {
                void loadResults(
                  session.id,
                  active,
                );
              }

              if (
                participant?.participantId &&
                changedResponse.participant_id ===
                  participant.participantId
              ) {
                if (
                  payload.eventType ===
                    "INSERT" ||
                  payload.eventType ===
                    "UPDATE"
                ) {
                  setExistingResponse(
                    changedResponse,
                  );

                  setSelectedAnswer(
                    answerToString(
                      changedResponse.answer,
                    ),
                  );

                  setIsEditingResponse(
                    false,
                  );
                }

                if (
                  payload.eventType ===
                  "DELETE"
                ) {
                  setExistingResponse(
                    null,
                  );

                  setSelectedAnswer(
                    "",
                  );

                  setIsEditingResponse(
                    false,
                  );
                }
              }
            }
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        sessionChannel,
      );

      void supabase.removeChannel(
        questionChannel,
      );

      void supabase.removeChannel(
        responseChannel,
      );
    };
  }, [
    session?.id,
    session?.active_question_id,
    question,
    participant?.participantId,
  ]);

  useEffect(() => {
    if (
      !session?.id ||
      !participant?.participantId
    ) {
      return;
    }

    const updateLastSeen =
      async () => {
        await supabase
          .from("participants")
          .update({
            last_seen_at:
              new Date().toISOString(),
            left_at: null,
          })
          .eq(
            "id",
            participant.participantId,
          );
      };

    void updateLastSeen();

    const heartbeat =
      window.setInterval(
        () => {
          void updateLastSeen();
        },
        15000,
      );

    return () => {
      window.clearInterval(
        heartbeat,
      );
    };
  }, [
    session?.id,
    participant?.participantId,
  ]);

  const joinSession = async () => {
    if (!session || isJoining) {
      return;
    }

    if (
      session.status ===
        "completed" ||
      session.status ===
        "archived"
    ) {
      setError(
        "This session has already ended.",
      );
      return;
    }

    if (
      session.status === "live" &&
      !session.allow_late_join
    ) {
      setError(
        "This session is currently closed to new participants.",
      );
      return;
    }

    if (
      session.participant_mode ===
      "identified"
    ) {
      if (!name.trim()) {
        setError(
          "Please enter your name.",
        );
        return;
      }

      if (
        !/^\d{1,2}$/.test(
          rollNumber,
        ) ||
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

    const token =
      crypto.randomUUID();

    const {
      data,
      error: participantError,
    } = await supabase
      .from("participants")
      .insert({
        quiz_id: session.id,
        session_token: token,
        name:
          session.participant_mode ===
          "identified"
            ? name.trim()
            : null,
        roll_number:
          session.participant_mode ===
          "identified"
            ? Number(rollNumber)
            : null,
        is_anonymous:
          session.participant_mode ===
          "anonymous",
        last_seen_at:
          new Date().toISOString(),
        left_at: null,
      })
      .select("*")
      .single();

    if (
      participantError ||
      !data
    ) {
      setError(
        participantError?.message ??
          "Unable to join the session.",
      );

      setIsJoining(false);
      return;
    }

    const created =
      data as Participant;

    const stored: StoredParticipant =
      {
        participantId:
          created.id,
        sessionToken:
          created.session_token,
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
        session,
        stored,
      );
    }
  };

  const submitResponse =
    async (): Promise<boolean> => {
      if (
        !session ||
        !question ||
        !participant ||
        !selectedAnswer ||
        isSubmitting
      ) {
        return false;
      }

      if (
        session.status !== "live" ||
        session.is_offline ||
        question.status !== "active"
      ) {
        setError(
          "This question is not currently accepting responses.",
        );
        return false;
      }

      if (
        existingResponse &&
        !session.allow_answer_change
      ) {
        setError(
          "Changing your answer is not allowed for this session.",
        );
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      const answer =
        selectedAnswer;

      if (existingResponse) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("responses")
          .update({
            answer,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingResponse.id,
          )
          .select("*")
          .single();

        if (
          updateError ||
          !data
        ) {
          setError(
            updateError?.message ??
              "Unable to update response.",
          );

          setIsSubmitting(false);
          return false;
        }

        setExistingResponse(
          data as PollResponse,
        );

        setSelectedAnswer(
          answer,
        );

        setIsSubmitting(false);

        return true;
      }

      const {
        data,
        error: insertError,
      } = await supabase
        .from("responses")
        .insert({
          quiz_id: session.id,
          question_id:
            question.id,
          participant_id:
            participant.participantId,
          answer,
        })
        .select("*")
        .single();

      if (
        insertError ||
        !data
      ) {
        const {
          data: existing,
        } = await supabase
          .from("responses")
          .select("*")
          .eq(
            "quiz_id",
            session.id,
          )
          .eq(
            "question_id",
            question.id,
          )
          .eq(
            "participant_id",
            participant.participantId,
          )
          .maybeSingle();

        if (existing) {
          const currentExisting =
            existing as PollResponse;

          setExistingResponse(
            currentExisting,
          );

          setSelectedAnswer(
            answerToString(
              currentExisting.answer,
            ),
          );

          setIsSubmitting(false);

          return true;
        }

        setError(
          insertError?.message ??
            "Unable to submit response.",
        );

        setIsSubmitting(false);
        return false;
      }

      setExistingResponse(
        data as PollResponse,
      );

      setSelectedAnswer(
        answer,
      );

      setIsSubmitting(false);

      return true;
    };

  const startEditingResponse =
    () => {
      if (
        !existingResponse ||
        !session?.allow_answer_change
      ) {
        return;
      }

      setIsEditingResponse(
        true,
      );

      setSelectedAnswer(
        answerToString(
          existingResponse.answer,
        ),
      );

      setError(null);
    };

  const cancelEditingResponse =
    () => {
      if (existingResponse) {
        setSelectedAnswer(
          answerToString(
            existingResponse.answer,
          ),
        );
      } else {
        setSelectedAnswer("");
      }

      setIsEditingResponse(
        false,
      );

      setError(null);
    };

  const handleAnswerSubmit =
    async () => {
      const success =
        await submitResponse();

      if (success) {
        setIsEditingResponse(
          false,
        );
      }
    };

  const renderQuestionInput =
    () => {
      if (!question) {
        return null;
      }

      if (
        question.type ===
        "multiple_choice"
      ) {
        return (
          <div className="space-y-3">
            {question.options.map(
              (option) => {
                const isSelected =
                  selectedAnswer ===
                  option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setSelectedAnswer(
                        option,
                      )
                    }
                    className={[
                      "w-full rounded-xl border p-4 text-left transition",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              },
            )}
          </div>
        );
      }

      if (
        question.type ===
          "scale" ||
        question.type ===
          "rating"
      ) {
        const min =
          Number(
            question.config.min ??
              1,
          );

        const max =
          Number(
            question.config.max ??
              5,
          );

        const values =
          Array.from(
            {
              length: Math.max(
                1,
                max - min + 1,
              ),
            },
            (_, index) =>
              min + index,
          );

        return (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {values.map(
              (value) => {
                const stringValue =
                  String(value);

                const isSelected =
                  selectedAnswer ===
                  stringValue;

                return (
                  <button
                    key={
                      stringValue
                    }
                    type="button"
                    onClick={() =>
                      setSelectedAnswer(
                        stringValue,
                      )
                    }
                    className={[
                      "rounded-xl border p-3 font-semibold",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted",
                    ].join(" ")}
                  >
                    {value}
                  </button>
                );
              },
            )}
          </div>
        );
      }

      if (
        question.type ===
        "true_false"
      ) {
        return (
          <div className="grid grid-cols-2 gap-3">
            {[
              "True",
              "False",
            ].map(
              (option) => {
                const isSelected =
                  selectedAnswer ===
                  option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setSelectedAnswer(
                        option,
                      )
                    }
                    className={[
                      "rounded-xl border p-4 font-semibold",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              },
            )}
          </div>
        );
      }

      return (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          This question type is not
          yet supported in the live
          student interface.
        </div>
      );
    };

  const renderResults =
    () => {
      if (
        !question ||
        !question.results_visible
      ) {
        return null;
      }

      const leadingCount =
        resultEntries.length > 0
          ? Math.max(
              ...resultEntries.map(
                (entry) =>
                  entry.count,
              ),
            )
          : 0;

      return (
        <div className="space-y-4 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                Results
              </p>

              <p className="text-xs text-muted-foreground">
                {responseCount}{" "}
                response
                {responseCount ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            {averageValue !==
              null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Average
                </p>

                <p className="text-lg font-bold">
                  {averageValue}
                </p>
              </div>
            )}
          </div>

          {resultEntries.length ===
          0 ? (
            <p className="text-sm text-muted-foreground">
              No results yet.
            </p>
          ) : (
            <div className="space-y-3">
              {resultEntries.map(
                (entry) => {
                  const isLeading =
                    entry.count ===
                      leadingCount &&
                    leadingCount > 0;

                  const isOwnAnswer =
                    existingResponse &&
                    answerToString(
                      existingResponse.answer,
                    ) ===
                      entry.option;

                  return (
                    <div
                      key={
                        entry.option
                      }
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">
                          {entry.option}

                          {isOwnAnswer && (
                            <span className="ml-2 text-xs text-primary">
                              Your answer
                            </span>
                          )}
                        </span>

                        <span className="shrink-0 text-xs text-muted-foreground">
                          {
                            entry.count
                          }{" "}
                          ·{" "}
                          {
                            entry.percentage
                          }%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={[
                            "h-full rounded-full transition-all",
                            isLeading
                              ? "bg-primary"
                              : "bg-primary/40",
                          ].join(
                            " ",
                          )}
                          style={{
                            width: `${entry.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      );
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
            <CardTitle>
              Unable to Join
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-red-600">
              {error ??
                "Session not found."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (
    session.status ===
      "completed" ||
    session.status ===
      "archived"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>
              {session.name}
            </CardTitle>
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
    const joiningLocked =
      session.status ===
        "live" &&
      !session.allow_late_join;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>
              {session.name}
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Join code:{" "}
              {session.join_code}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {joiningLocked ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                The instructor has
                closed the session to
                new participants.
              </div>
            ) : (
              <>
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
                        onChange={(
                          event,
                        ) =>
                          setName(
                            event.target
                              .value,
                          )
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
                        value={
                          rollNumber
                        }
                        onChange={(
                          event,
                        ) =>
                          setRollNumber(
                            event.target.value
                              .replace(
                                /\D/g,
                                "",
                              )
                              .slice(
                                0,
                                2,
                              ),
                          )
                        }
                        inputMode="numeric"
                        placeholder="00"
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm dark:bg-slate-900">
                    You are joining
                    anonymously.
                  </div>
                )}
              </>
            )}
          </CardContent>

          {!joiningLocked && (
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
          )}
        </Card>
      </main>
    );
  }

  const canAnswer =
    session.status === "live" &&
    !session.is_offline &&
    question?.status === "active";

  return (
    <main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl items-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>
              {session.name}
            </CardTitle>

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

            {session.status ===
                "paused" ||
            session.is_offline ? (
              <div className="rounded-2xl border bg-yellow-50 p-6 text-center dark:bg-yellow-950/30">
                <h2 className="text-xl font-bold">
                  Session Paused
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Wait for the
                  instructor to resume.
                </p>
              </div>
            ) : !question ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <h2 className="text-xl font-bold">
                  Waiting for the
                  instructor
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  The next question
                  will appear
                  automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Live Question
                  </div>

                  <h2 className="text-2xl font-bold">
                    {question.text}
                  </h2>
                </div>

                {existingResponse &&
                !isEditingResponse ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border bg-muted/30 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your Answer
                      </p>

                      <p className="mt-2 text-lg font-semibold">
                        {answerToString(
                          existingResponse.answer,
                        )}
                      </p>
                    </div>

                    {canAnswer &&
                      session.allow_answer_change && (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={
                            startEditingResponse
                          }
                        >
                          Change Answer
                        </Button>
                      )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {renderQuestionInput()}

                    <div className="flex gap-3">
                      {isEditingResponse && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={
                            cancelEditingResponse
                          }
                          disabled={
                            isSubmitting
                          }
                        >
                          Cancel
                        </Button>
                      )}

                      <Button
                        className="flex-1"
                        disabled={
                          !selectedAnswer ||
                          isSubmitting ||
                          !canAnswer
                        }
                        onClick={() =>
                          void handleAnswerSubmit()
                        }
                      >
                        {isSubmitting
                          ? existingResponse
                            ? "Saving..."
                            : "Submitting..."
                          : existingResponse
                            ? "Save Answer"
                            : "Submit Answer"}
                      </Button>
                    </div>
                  </div>
                )}

                {renderResults()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}