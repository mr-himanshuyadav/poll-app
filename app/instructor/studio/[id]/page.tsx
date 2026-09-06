"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import type {
  Participant,
  PollResponse,
  Question,
  QuizTemplate,
  Session,
} from "@/lib/types";

type ResponseWithParticipant = PollResponse & {
  participant?: Participant | null;
};

export default function LiveStudio({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;

  const sessionId = resolvedParams.id;

  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);

  const [template, setTemplate] =
    useState<QuizTemplate | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);

  const [responses, setResponses] =
    useState<ResponseWithParticipant[]>([]);

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [isUpdatingParticipants, setIsUpdatingParticipants] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdating, setIsUpdating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * ---------------------------------------------
   * LOAD RESPONSES
   * ---------------------------------------------
   */

  const loadResponses = async (
    currentSessionId: string,
  ) => {
    const { data: responseData, error: responseError } =
      await supabase
        .from("responses")
        .select(
          `
            id,
            quiz_id,
            question_id,
            participant_id,
            answer,
            submitted_at,
            updated_at,
            response_time_ms
          `,
        )
        .eq("quiz_id", currentSessionId)
        .order("updated_at", {
          ascending: true,
        });

    if (responseError) {
      setError(responseError.message);
      return;
    }

    const rawResponses =
      (responseData ?? []) as PollResponse[];

    if (rawResponses.length === 0) {
      setResponses([]);
      return;
    }

    const participantIds = [
      ...new Set(
        rawResponses.map(
          (response) => response.participant_id,
        ),
      ),
    ];

    const {
      data: participantData,
      error: participantError,
    } = await supabase
      .from("participants")
      .select("*")
      .in("id", participantIds);

    if (participantError) {
      setResponses(rawResponses);
      return;
    }

    const participantMap = new Map(
      ((participantData ?? []) as Participant[]).map(
        (participant) => [
          participant.id,
          participant,
        ],
      ),
    );

    setResponses(
      rawResponses.map((response) => ({
        ...response,
        participant:
          participantMap.get(
            response.participant_id,
          ) ?? null,
      })),
    );
  };

  const loadParticipants = async (
    currentSessionId: string,
  ) => {
    const {
      data,
      error: participantError,
    } = await supabase
      .from("participants")
      .select("*")
      .eq("quiz_id", currentSessionId)
      .order("joined_at", {
        ascending: true,
      });

    if (participantError) {
      setError(participantError.message);
      return;
    }

    setParticipants(
      (data ?? []) as Participant[],
    );
  };

  /*
   * ---------------------------------------------
   * LOAD STUDIO
   * ---------------------------------------------
   */

  const loadStudio = async () => {
    setIsLoading(true);

    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");

      return;
    }

    /*
     * LOAD SESSION
     */

    const {
      data: sessionData,
      error: sessionError,
    } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("instructor_id", user.id)
      .single();

    if (sessionError || !sessionData) {
      setError(
        sessionError?.message ??
        "Session not found.",
      );

      setIsLoading(false);

      return;
    }

    const currentSession =
      sessionData as Session;

    setSession(currentSession);

    /*
     * LOAD TEMPLATE
     */

    const {
      data: templateData,
      error: templateError,
    } = await supabase
      .from("quiz_templates")
      .select("*")
      .eq(
        "id",
        currentSession.template_id,
      )
      .eq("instructor_id", user.id)
      .single();

    if (templateError || !templateData) {
      setError(
        templateError?.message ??
        "Template not found.",
      );

      setIsLoading(false);

      return;
    }

    setTemplate(
      templateData as QuizTemplate,
    );

    /*
     * LOAD QUESTIONS
     */

    const {
      data: questionData,
      error: questionError,
    } = await supabase
      .from("questions")
      .select("*")
      .eq(
        "template_id",
        currentSession.template_id,
      )
      .order("position", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (questionError) {
      setError(questionError.message);

      setQuestions([]);
    } else {
      setQuestions(
        (questionData ?? []) as Question[],
      );
    }

    /*
     * LOAD RESPONSES
     */

    await loadResponses(
      currentSession.id,
    );

    await loadParticipants(
      currentSession.id,
    );

    setIsLoading(false);
  };

  /*
   * ---------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------
   */

  useEffect(() => {
    void loadStudio();
  }, [sessionId]);

  /*
   * ---------------------------------------------
   * REALTIME
   * ---------------------------------------------
   */

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    /*
     * SESSION REALTIME
     */

    const sessionChannel = supabase
      .channel(
        `studio-session-${sessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",

          schema: "public",

          table: "sessions",

          filter: `id=eq.${sessionId}`,
        },

        (payload) => {
          setSession(
            payload.new as Session,
          );
        },
      )
      .subscribe();

    /*
     * QUESTIONS REALTIME
     */

    const questionChannel = supabase
      .channel(
        `studio-questions-${sessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",

          schema: "public",

          table: "questions",
        },

        (payload) => {
          const changedQuestion =
            (
              payload.eventType ===
                "DELETE"
                ? payload.old
                : payload.new
            ) as Question;

          if (!changedQuestion) {
            return;
          }

          if (
            !(
              "template_id" in
              changedQuestion
            )
          ) {
            return;
          }

          /*
           * INSERT
           */

          if (
            payload.eventType ===
            "INSERT"
          ) {
            setQuestions((current) => {
              const exists =
                current.some(
                  (question) =>
                    question.id ===
                    changedQuestion.id,
                );

              if (exists) {
                return current;
              }

              return [
                ...current,
                changedQuestion,
              ].sort(
                (a, b) =>
                  a.position -
                  b.position,
              );
            });

            return;
          }

          /*
           * UPDATE
           */

          if (
            payload.eventType ===
            "UPDATE"
          ) {
            setQuestions((current) =>
              current.map(
                (question) =>
                  question.id ===
                    changedQuestion.id
                    ? changedQuestion
                    : question,
              ),
            );

            return;
          }

          /*
           * DELETE
           */

          if (
            payload.eventType ===
            "DELETE"
          ) {
            setQuestions((current) =>
              current.filter(
                (question) =>
                  question.id !==
                  changedQuestion.id,
              ),
            );
          }
        },
      )
      .subscribe();

    /*
     * RESPONSES REALTIME
     */

    const responseChannel = supabase
      .channel(
        `studio-responses-${sessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",

          schema: "public",

          table: "responses",

          filter: `quiz_id=eq.${sessionId}`,
        },

        () => {
          void loadResponses(
            sessionId,
          );
        },
      )
      .subscribe();

    /*
     * PARTICIPANTS REALTIME
     */

    const participantChannel =
      supabase
        .channel(
          `studio-participants-${sessionId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "participants",
            filter: `quiz_id=eq.${sessionId}`,
          },
          () => {
            void loadParticipants(
              sessionId,
            );

            void loadResponses(
              sessionId,
            );
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

      void supabase.removeChannel(
        participantChannel,
      );
    };
  }, [sessionId]);

  /*
   * ---------------------------------------------
   * ACTIVE QUESTION
   * ---------------------------------------------
   */

  const activeQuestion = useMemo(() => {
    if (!session?.active_question_id) {
      return null;
    }

    return (
      questions.find(
        (question) =>
          question.id ===
          session.active_question_id,
      ) ?? null
    );
  }, [
    questions,
    session?.active_question_id,
  ]);

  /*
   * ---------------------------------------------
   * ACTIVE RESPONSES
   * ---------------------------------------------
   */

  const activeResponses = useMemo(() => {
    if (!activeQuestion) {
      return [];
    }

    return responses.filter(
      (response) =>
        response.question_id ===
        activeQuestion.id,
    );
  }, [
    activeQuestion,
    responses,
  ]);

  const activeParticipantThresholdMs =
    45 * 1000;

  const participantSummary =
    useMemo(() => {
      const now = Date.now();

      let active = 0;
      let inactive = 0;

      for (const participant of participants) {
        if (participant.left_at) {
          inactive += 1;
          continue;
        }

        const lastSeen =
          new Date(
            participant.last_seen_at,
          ).getTime();

        if (
          now - lastSeen <=
          activeParticipantThresholdMs
        ) {
          active += 1;
        } else {
          inactive += 1;
        }
      }

      return {
        total: participants.length,
        active,
        inactive,
      };
    }, [participants]);

  /*
   * ---------------------------------------------
   * RESPONSE COUNTS
   * ---------------------------------------------
   */

  const responseCountByQuestion =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      for (const response of responses) {
        counts[response.question_id] =
          (counts[
            response.question_id
          ] ?? 0) + 1;
      }

      return counts;
    }, [responses]);

  /*
   * ---------------------------------------------
   * ACTIVE QUESTION RESULTS
   * ---------------------------------------------
   */

  const activeTally = useMemo(() => {
    const tally: Record<
      string,
      number
    > = {};

    if (!activeQuestion) {
      return tally;
    }

    for (
      const option of activeQuestion.options
    ) {
      tally[option] =
        activeResponses.filter(
          (response) =>
            response.answer === option,
        ).length;
    }

    return tally;
  }, [
    activeQuestion,
    activeResponses,
  ]);

  const toggleLateJoin = async () => {
    if (!session || isUpdatingParticipants) {
      return;
    }

    setIsUpdatingParticipants(true);
    setError(null);

    const nextValue =
      !session.allow_late_join;

    const {
      data,
      error: updateError,
    } = await supabase
      .from("sessions")
      .update({
        allow_late_join: nextValue,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (updateError || !data) {
      setError(
        updateError?.message ??
        "Unable to update joining settings.",
      );

      setIsUpdatingParticipants(false);
      return;
    }

    setSession(data as Session);
    setIsUpdatingParticipants(false);
  };

  /*
   * ---------------------------------------------
   * PUSH QUESTION LIVE
   * ---------------------------------------------
   */

  const pushQuestionLive = async (
    question: Question,
  ) => {
    if (!session || isUpdating) {
      return;
    }

    setIsUpdating(true);

    setError(null);

    const now =
      new Date().toISOString();

    /*
     * CLOSE PREVIOUS QUESTION
     */

    if (
      session.active_question_id &&
      session.active_question_id !==
      question.id
    ) {
      await supabase
        .from("questions")
        .update({
          status: "closed",

          closed_at: now,
        })
        .eq(
          "id",
          session.active_question_id,
        );
    }

    /*
     * DETERMINE INITIAL RESULTS VISIBILITY
     *
     * LIVE
     * -> visible immediately
     *
     * ON COMMAND
     * -> hidden until instructor reveals
     *
     * HIDDEN
     * -> always hidden
     */

    const resultsVisible =
      question.results_mode === "live";

    /*
     * ACTIVATE QUESTION
     */

    const {
      error: questionError,
    } = await supabase
      .from("questions")
      .update({
        status: "active",

        activated_at: now,

        closed_at: null,

        results_visible:
          resultsVisible,
      })
      .eq("id", question.id);

    if (questionError) {
      setError(questionError.message);

      setIsUpdating(false);

      return;
    }

    /*
     * UPDATE SESSION
     */

    const {
      error: sessionError,
    } = await supabase
      .from("sessions")
      .update({
        active_question_id:
          question.id,

        status: "live",

        is_offline: false,

        paused_at: null,

        started_at:
          session.started_at ?? now,

        updated_at: now,
      })
      .eq("id", session.id);

    if (sessionError) {
      setError(sessionError.message);

      setIsUpdating(false);

      return;
    }

    /*
     * LOCAL SESSION UPDATE
     */

    setSession((current) =>
      current
        ? {
          ...current,

          active_question_id:
            question.id,

          status: "live",

          is_offline: false,

          paused_at: null,

          started_at:
            current.started_at ?? now,

          updated_at: now,
        }
        : current,
    );

    /*
     * LOCAL QUESTION UPDATE
     */

    setQuestions((current) =>
      current.map((item) => {
        if (
          item.id === question.id
        ) {
          return {
            ...item,

            status: "active",

            activated_at: now,

            closed_at: null,

            results_visible:
              resultsVisible,
          };
        }

        if (
          item.id ===
          session.active_question_id
        ) {
          return {
            ...item,

            status: "closed",

            closed_at: now,
          };
        }

        return item;
      }),
    );

    setIsUpdating(false);
  };

  /*
   * ---------------------------------------------
   * CLOSE ACTIVE QUESTION
   * ---------------------------------------------
   */

  const closeActiveQuestion =
    async () => {
      if (
        !session?.active_question_id ||
        isUpdating
      ) {
        return;
      }

      setIsUpdating(true);

      setError(null);

      const questionId =
        session.active_question_id;

      const now =
        new Date().toISOString();

      const {
        error: questionError,
      } = await supabase
        .from("questions")
        .update({
          status: "closed",

          closed_at: now,
        })
        .eq("id", questionId);

      if (questionError) {
        setError(
          questionError.message,
        );

        setIsUpdating(false);

        return;
      }

      const {
        error: sessionError,
      } = await supabase
        .from("sessions")
        .update({
          active_question_id: null,

          updated_at: now,
        })
        .eq("id", session.id);

      if (sessionError) {
        setError(
          sessionError.message,
        );

        setIsUpdating(false);

        return;
      }

      setQuestions((current) =>
        current.map((question) =>
          question.id === questionId
            ? {
              ...question,

              status: "closed",

              closed_at: now,
            }
            : question,
        ),
      );

      setSession((current) =>
        current
          ? {
            ...current,

            active_question_id:
              null,

            updated_at: now,
          }
          : current,
      );

      setIsUpdating(false);
    };

  /*
   * ---------------------------------------------
   * REVEAL RESULTS
   * ---------------------------------------------
   */

  const revealResults = async () => {
    if (
      !activeQuestion ||
      isUpdating
    ) {
      return;
    }

    /*
     * HIDDEN MODE CAN NEVER
     * BE MANUALLY REVEALED
     */

    if (
      activeQuestion.results_mode ===
      "hidden"
    ) {
      return;
    }

    setIsUpdating(true);

    setError(null);

    const {
      error: updateError,
    } = await supabase
      .from("questions")
      .update({
        results_visible: true,
      })
      .eq("id", activeQuestion.id);

    if (updateError) {
      setError(
        updateError.message,
      );

      setIsUpdating(false);

      return;
    }

    setQuestions((current) =>
      current.map((question) =>
        question.id ===
          activeQuestion.id
          ? {
            ...question,

            results_visible: true,
          }
          : question,
      ),
    );

    setIsUpdating(false);
  };

  /*
   * ---------------------------------------------
   * HIDE RESULTS
   * ---------------------------------------------
   */

  const hideResults = async () => {
    if (
      !activeQuestion ||
      isUpdating
    ) {
      return;
    }

    /*
     * LIVE MODE SHOULD NOT
     * BE MANUALLY HIDDEN
     */

    if (
      activeQuestion.results_mode ===
      "live"
    ) {
      return;
    }

    setIsUpdating(true);

    setError(null);

    const {
      error: updateError,
    } = await supabase
      .from("questions")
      .update({
        results_visible: false,
      })
      .eq("id", activeQuestion.id);

    if (updateError) {
      setError(
        updateError.message,
      );

      setIsUpdating(false);

      return;
    }

    setQuestions((current) =>
      current.map((question) =>
        question.id ===
          activeQuestion.id
          ? {
            ...question,

            results_visible: false,
          }
          : question,
      ),
    );

    setIsUpdating(false);
  };

  /*
   * ---------------------------------------------
   * PAUSE SESSION
   * ---------------------------------------------
   */

  const togglePause = async (
    paused: boolean,
  ) => {
    if (!session || isUpdating) {
      return;
    }

    setIsUpdating(true);

    setError(null);

    const now =
      new Date().toISOString();

    const nextStatus = paused
      ? "paused"
      : "live";

    const {
      error: updateError,
    } = await supabase
      .from("sessions")
      .update({
        status: nextStatus,

        is_offline: paused,

        paused_at: paused
          ? now
          : null,

        updated_at: now,
      })
      .eq("id", session.id);

    if (updateError) {
      setError(
        updateError.message,
      );

      setIsUpdating(false);

      return;
    }

    setSession((current) =>
      current
        ? {
          ...current,

          status: nextStatus,

          is_offline: paused,

          paused_at: paused
            ? now
            : null,

          updated_at: now,
        }
        : current,
    );

    setIsUpdating(false);
  };

  /*
   * ---------------------------------------------
   * END SESSION
   * ---------------------------------------------
   */

  const endSession = async () => {
    if (!session || isUpdating) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to end this session?",
      );

    if (!confirmed) {
      return;
    }

    setIsUpdating(true);

    setError(null);

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("sessions")
      .update({
        status: "completed",

        active_question_id: null,

        ended_at: now,

        updated_at: now,
      })
      .eq("id", session.id);

    if (updateError) {
      setError(
        updateError.message,
      );

      setIsUpdating(false);

      return;
    }

    router.push("/instructor");
  };

  /*
   * ---------------------------------------------
   * LOADING
   * ---------------------------------------------
   */

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-[1600px] rounded-2xl border bg-white p-10 text-center dark:bg-slate-900">
          Loading Live Studio...
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------
   * ERROR
   * ---------------------------------------------
   */

  if (!session || !template) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-[1600px] rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
          {error ??
            "Unable to load session."}
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------
   * RESULTS MODE LABEL
   * ---------------------------------------------
   */

  const getResultsModeLabel = () => {
    if (!activeQuestion) {
      return "";
    }

    if (
      activeQuestion.results_mode ===
      "live"
    ) {
      return "Live Results";
    }

    if (
      activeQuestion.results_mode ===
      "hidden"
    ) {
      return "Hidden Results";
    }

    return "Results on Command";
  };

  /*
   * ---------------------------------------------
   * UI
   * ---------------------------------------------
   */

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6">

        {/* HEADER */}

        <header className="mb-5 rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="min-w-0">

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <Badge>
                  {session.status.toUpperCase()}
                </Badge>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">
                  Join Code: {session.join_code}
                </span>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {responses.length} responses
                </span>

              </div>

              <h1 className="truncate text-2xl font-bold sm:text-3xl">
                {session.name}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {template.title}
              </p>

            </div>

            <div className="flex flex-wrap gap-2">

              <Button
                variant="outline"
                onClick={() =>
                  router.push("/instructor")
                }
              >
                Back
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `/poll/${session.id}/projector`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Projector
              </Button>

              <Button
                variant="destructive"
                disabled={isUpdating}
                onClick={() =>
                  void endSession()
                }
              >
                End Session
              </Button>

            </div>

          </div>

        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* THREE COLUMN LAYOUT */}

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_380px]">

          {/* LEFT COLUMN */}

          <aside className="space-y-5">

            <Card>

              <CardHeader>
                <CardTitle>
                  Live Controls
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                <Button
                  className="h-11 w-full"
                  onClick={() =>
                    window.open(
                      `/poll/${session.id}/projector`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  Open Projector ↗
                </Button>

                <div className="rounded-xl border p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Participation
                  </p>

                  <p className="mt-1 font-semibold">
                    {session.participant_mode ===
                      "anonymous"
                      ? "Anonymous"
                      : "Name + Roll Number"}
                  </p>

                </div>

                <div className="rounded-xl border p-4">

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Results
                  </p>

                  <p className="mt-1 font-semibold">
                    {session.results_mode ===
                      "live"
                      ? "Live"
                      : session.results_mode ===
                        "on_command"
                        ? "On Command"
                        : "Hidden"}
                  </p>

                </div>

                <div className="flex items-center justify-between rounded-xl border p-4">

                  <div>

                    <p className="font-medium">
                      Pause Polling
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Temporarily stop responses.
                    </p>

                  </div>

                  <Switch
                    checked={
                      session.status ===
                      "paused"
                    }
                    disabled={
                      isUpdating ||
                      session.status ===
                      "completed"
                    }
                    onCheckedChange={(
                      checked,
                    ) =>
                      void togglePause(
                        checked,
                      )
                    }
                  />

                </div>

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">

                  <p className="text-xs text-muted-foreground">
                    Total Responses
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {responses.length}
                  </p>

                </div>

              </CardContent>

            </Card>

            <Card>

              <CardHeader>
                <CardTitle>
                  Session Information
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">

                <div>

                  <p className="text-xs text-muted-foreground">
                    Questions
                  </p>

                  <p className="font-semibold">
                    {questions.length}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-muted-foreground">
                    Late Join
                  </p>

                  <p className="font-semibold">
                    {session.allow_late_join
                      ? "Enabled"
                      : "Disabled"}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-muted-foreground">
                    Answer Changes
                  </p>

                  <p className="font-semibold">
                    {session.allow_answer_change
                      ? "Allowed"
                      : "Locked"}
                  </p>

                </div>

              </CardContent>

            </Card>

          </aside>

          {/* CENTER COLUMN */}

          <section className="min-w-0">

            <Card className="min-h-[720px]">

              <CardHeader className="border-b">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <CardTitle>

                      {activeQuestion
                        ? "Live Question"
                        : "Live Session"}

                    </CardTitle>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Question controls and live
                      result summary.
                    </p>

                  </div>

                  {activeQuestion && (

                    <Badge>
                      {activeResponses.length}{" "}
                      responses
                    </Badge>

                  )}

                </div>

              </CardHeader>

              <CardContent className="p-6">

                {activeQuestion ? (

                  <div className="space-y-8">

                    {/* QUESTION */}

                    <div>

                      <div className="mb-3 flex flex-wrap items-center gap-2">

                        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
                          Current Question
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">

                          {getResultsModeLabel()}

                        </span>

                      </div>

                      <h2 className="text-2xl font-bold leading-tight lg:text-4xl">

                        {activeQuestion.text}

                      </h2>

                    </div>

                    {/* RESULTS CONTROL */}

                    <div className="rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="font-semibold">
                            Student Results
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">

                            {activeQuestion.results_mode ===
                              "live"
                              ? "Results are automatically visible to students."
                              : activeQuestion.results_mode ===
                                "hidden"
                                ? "Results cannot be shown to students."
                                : activeQuestion.results_visible
                                  ? "Results are currently visible to students."
                                  : "Results are currently hidden from students."}

                          </p>

                        </div>

                        {/* LIVE MODE */}

                        {activeQuestion.results_mode ===
                          "live" && (

                            <Badge>
                              Automatically Visible
                            </Badge>

                          )}

                        {/* HIDDEN MODE */}

                        {activeQuestion.results_mode ===
                          "hidden" && (

                            <Badge variant="secondary">
                              Permanently Hidden
                            </Badge>

                          )}

                        {/* ON COMMAND MODE */}

                        {activeQuestion.results_mode ===
                          "on_command" && (

                            <Button
                              disabled={isUpdating}
                              variant={
                                activeQuestion.results_visible
                                  ? "outline"
                                  : "default"
                              }
                              onClick={() => {

                                if (
                                  activeQuestion.results_visible
                                ) {
                                  void hideResults();
                                } else {
                                  void revealResults();
                                }

                              }}
                            >

                              {activeQuestion.results_visible
                                ? "Hide Results"
                                : "Reveal Results"}

                            </Button>

                          )}

                      </div>

                    </div>

                    {/* RESULT VISUALIZATION */}

                    {activeQuestion.type ===
                      "multiple_choice" ? (

                      <div className="space-y-4">

                        {activeQuestion.options.map(
                          (
                            option,
                            index,
                          ) => {

                            const count =
                              activeTally[
                              option
                              ] ?? 0;

                            const percentage =
                              activeResponses.length ===
                                0
                                ? 0
                                : Math.round(
                                  (count /
                                    activeResponses.length) *
                                  100,
                                );

                            return (

                              <div
                                key={`${activeQuestion.id}-${index}`}
                                className="rounded-xl border p-4"
                              >

                                <div className="flex items-center justify-between gap-4">

                                  <div className="min-w-0">

                                    <span className="mr-2 font-bold text-muted-foreground">

                                      {String.fromCharCode(
                                        65 + index,
                                      )}
                                      .

                                    </span>

                                    <span className="font-semibold">

                                      {option}

                                    </span>

                                  </div>

                                  <div className="shrink-0 text-right">

                                    <p className="font-bold">
                                      {count}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      {percentage}%
                                    </p>

                                  </div>

                                </div>

                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                                  <div
                                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                                    style={{
                                      width: `${percentage}%`,
                                    }}
                                  />

                                </div>

                              </div>

                            );

                          },
                        )}

                      </div>

                    ) : (

                      <div className="rounded-xl border bg-slate-50 p-6 text-center dark:bg-slate-900">

                        <p className="text-sm text-muted-foreground">

                          {activeResponses.length}{" "}

                          response
                          {activeResponses.length ===
                            1
                            ? ""
                            : "s"}{" "}

                          received.

                        </p>

                      </div>

                    )}

                    {/* QUESTION CONTROLS */}

                    <div className="grid gap-3 sm:grid-cols-2">

                      <Button
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() =>
                          void closeActiveQuestion()
                        }
                      >
                        Close Question
                      </Button>

                      <Button
                        disabled={isUpdating}
                        onClick={() => {

                          const index =
                            questions.findIndex(
                              (item) =>
                                item.id ===
                                activeQuestion.id,
                            );

                          const nextQuestion =
                            questions[
                            index + 1
                            ];

                          if (
                            nextQuestion
                          ) {
                            void pushQuestionLive(
                              nextQuestion,
                            );
                          }

                        }}
                      >
                        Next Question
                      </Button>

                    </div>

                  </div>

                ) : (

                  <div className="flex min-h-[560px] items-center justify-center text-center">

                    <div>

                      <h2 className="text-3xl font-bold">
                        Ready to teach
                      </h2>

                      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">

                        Choose a question from
                        the queue on the right
                        to broadcast it to the
                        class.

                      </p>

                    </div>

                  </div>

                )}

              </CardContent>

            </Card>

          </section>

          {/* RIGHT COLUMN */}

          <aside className="min-w-0 space-y-5">

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Participants
                  </CardTitle>

                  <Badge variant="outline">
                    {participantSummary.active}/
                    {participantSummary.total} active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-lg font-bold">
                      {participantSummary.total}
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Joined
                    </div>
                  </div>

                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {participantSummary.active}
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Active
                    </div>
                  </div>

                  <div className="rounded-lg border p-2 text-center">
                    <div className="text-lg font-bold text-muted-foreground">
                      {participantSummary.inactive}
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Inactive
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      Late joining
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {session?.allow_late_join
                        ? "New students can join"
                        : "Joining is locked"}
                    </p>
                  </div>

                  <Switch
                    checked={session?.allow_late_join ?? false}
                    disabled={isUpdatingParticipants}
                    onCheckedChange={() =>
                      void toggleLateJoin()
                    }
                  />
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {participants.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No participants yet.
                    </p>
                  ) : (
                    participants.map((participant) => {
                      const isActive =
                        !participant.left_at &&
                        Date.now() -
                        new Date(
                          participant.last_seen_at,
                        ).getTime() <=
                        activeParticipantThresholdMs;

                      return (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {participant.is_anonymous
                                ? "Anonymous participant"
                                : participant.name ??
                                "Unnamed participant"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {participant.is_anonymous
                                ? "Anonymous"
                                : `Roll ${participant.roll_number ??
                                "—"
                                }`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "h-2 w-2 rounded-full",
                                isActive
                                  ? "bg-green-500"
                                  : "bg-slate-300",
                              ].join(" ")}
                            />

                            <span className="text-[10px] text-muted-foreground">
                              {isActive
                                ? "Active"
                                : "Away"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QUESTION QUEUE */}

            <Card>

              <CardHeader className="border-b">

                <CardTitle>
                  Question Queue
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  Select any question to make
                  it live.
                </p>

              </CardHeader>

              <CardContent className="max-h-[420px] space-y-3 overflow-y-auto p-3">

                {questions.map(
                  (question, index) => {

                    const isActive =
                      session.active_question_id ===
                      question.id;

                    const responseCount =
                      responseCountByQuestion[
                      question.id
                      ] ?? 0;

                    return (

                      <div
                        key={question.id}
                        className={`rounded-xl border p-3 transition ${isActive
                          ? "border-indigo-500 bg-indigo-50 shadow-sm dark:bg-indigo-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                      >

                        <div className="flex items-start gap-3">

                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">

                            Q{index + 1}

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="line-clamp-2 text-sm font-semibold">

                              {question.text}

                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">

                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">

                                {question.type ===
                                  "multiple_choice"
                                  ? "MCQ"
                                  : question.type}

                              </span>

                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">

                                {responseCount} responses

                              </span>

                              {question.status ===
                                "closed" && (

                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">
                                    Closed
                                  </span>

                                )}

                            </div>

                            <Button
                              size="sm"
                              className="mt-3 w-full"
                              variant={
                                isActive
                                  ? "default"
                                  : "outline"
                              }
                              disabled={
                                isUpdating ||
                                isActive
                              }
                              onClick={() =>
                                void pushQuestionLive(
                                  question,
                                )
                              }
                            >

                              {isActive
                                ? "Live Now"
                                : "Push Live"}

                            </Button>

                          </div>

                        </div>

                      </div>

                    );

                  },
                )}

                {questions.length === 0 && (

                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">

                    No questions found.

                  </div>

                )}

              </CardContent>

            </Card>

            {/* LIVE RESPONSES */}

            <Card>

              <CardHeader className="border-b">

                <CardTitle>
                  Live Responses
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  Student answers for the
                  current question.
                </p>

              </CardHeader>

              <CardContent className="max-h-[520px] overflow-y-auto p-3">

                {!activeQuestion ? (

                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">

                    No active question.

                  </div>

                ) : activeResponses.length ===
                  0 ? (

                  <div className="rounded-xl border border-dashed p-6 text-center">

                    <p className="font-semibold">
                      Waiting for responses
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">

                      New answers will appear
                      here in real time.

                    </p>

                  </div>

                ) : (

                  <div className="space-y-2">

                    {activeResponses.map(
                      (
                        response,
                        index,
                      ) => {

                        const participant =
                          response.participant;

                        const displayName =
                          participant?.is_anonymous
                            ? `Anonymous ${index + 1
                            }`
                            : participant?.name ??
                            `Participant ${index + 1
                            }`;

                        const roll =
                          participant?.roll_number !==
                            null &&
                            participant?.roll_number !==
                            undefined
                            ? `Roll ${participant.roll_number}`
                            : null;

                        const isUpdated =
                          response.updated_at !==
                          response.submitted_at;

                        return (

                          <div
                            key={response.id}
                            className="rounded-xl border p-3"
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold">

                                  {displayName}

                                </p>

                                {roll && (

                                  <p className="text-[11px] text-muted-foreground">

                                    {roll}

                                  </p>

                                )}

                              </div>

                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium dark:bg-slate-800">

                                {isUpdated
                                  ? "Updated"
                                  : "Submitted"}

                              </span>

                            </div>

                            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-900">

                              {typeof response.answer ===
                                "string"
                                ? response.answer
                                : JSON.stringify(
                                  response.answer,
                                )}

                            </div>

                            <p className="mt-2 text-[10px] text-muted-foreground">

                              {new Date(
                                response.updated_at,
                              ).toLocaleTimeString()}

                            </p>

                          </div>

                        );

                      },
                    )}

                  </div>

                )}

              </CardContent>

            </Card>

          </aside>

        </div>

      </div>
    </main>
  );
}