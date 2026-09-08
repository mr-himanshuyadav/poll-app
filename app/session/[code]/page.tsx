"use client";

import { ScaleResponseInput } from "@/components/live-studio/scale-response-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Radio } from "lucide-react";
import { resolveScaleConfig } from "@/lib/scale-config";
import { getResponseDisplayLabel } from "@/lib/response-label";
import { getParticipantDisplayName } from "@/lib/participant-labels";

import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  Session,
  SessionQuestion,
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
    params instanceof Promise
      ? use(params)
      : params;

  const code =
    resolvedParams.code.toUpperCase();

  const [session, setSession] =
    useState<Session | null>(null);

  const [question, setQuestion] =
    useState<SessionQuestion | null>(
      null,
    );

  const [participant, setParticipant] =
    useState<StoredParticipant | null>(
      null,
    );

  const [selectedAnswer, setSelectedAnswer] =
    useState("");

  const [participantProfile, setParticipantProfile] =
    useState<Participant | null>(null);

  const [sessionParticipants, setSessionParticipants] =
    useState<Participant[]>([]);

  const [existingResponse, setExistingResponse] =
    useState<PollResponse | null>(
      null,
    );

  const [responseCount, setResponseCount] =
    useState(0);

  const [resultEntries, setResultEntries] =
    useState<ResultEntry[]>([]);

  const [averageValue, setAverageValue] =
    useState<number | null>(null);

  const [name, setName] =
    useState("");

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
      return JSON.stringify(
        answer,
      );
    } catch {
      return String(answer);
    }
  };


  useEffect(() => {
    if (!session?.id || !participant?.participantId) {
      setParticipantProfile(null);
      setSessionParticipants([]);
      return;
    }

    const loadParticipantIdentity = async () => {
      const { data } = await supabase
        .from("participants")
        .select("*")
        .eq("quiz_id", session.id)
        .order("joined_at", { ascending: true });

      const rows = (data ?? []) as Participant[];
      setSessionParticipants(rows);
      setParticipantProfile(
        rows.find((item) => item.id === participant.participantId) ?? null,
      );
    };

    void loadParticipantIdentity();
  }, [session?.id, participant?.participantId]);

  /*
   * ---------------------------------------------
   * LOAD RESULTS
   * ---------------------------------------------
   */

  const loadResults = async (
    currentSessionId: string,
    currentQuestion: SessionQuestion,
    currentSession?: Session,
  ) => {
    const canShowResults =
      currentSession?.student_display_type === "results" ||
      currentQuestion.results_mode === "live";

    if (!canShowResults) {
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
      .eq(
        "quiz_id",
        currentSessionId,
      )
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

    /*
     * MULTIPLE CHOICE
     */

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
          answerToString(
            row.answer,
          );

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

      setResultEntries(
        entries,
      );

      setAverageValue(null);

      return;
    }

    /*
     * TRUE / FALSE
     */

    if (
      currentQuestion.type ===
      "true_false"
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
          answerToString(
            row.answer,
          );

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
          percentage:
            Math.round(
              (counts.True /
                rows.length) *
                100,
            ),
        },
        {
          option: "False",
          count: counts.False,
          percentage:
            Math.round(
              (counts.False /
                rows.length) *
                100,
            ),
        },
      ];

      setResultEntries(
        entries,
      );

      setAverageValue(null);

      return;
    }

    /*
     * SCALE / RATING
     */

    if (
      currentQuestion.type ===
        "scale" ||
      currentQuestion.type ===
        "rating"
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
        numericValues.length ===
        0
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
        ) /
        numericValues.length;

      setAverageValue(
        Math.round(
          average * 100,
        ) / 100,
      );

      const counts: Record<
        string,
        number
      > = {};

      for (
        const value of numericValues
      ) {
        const key =
          String(value);

        counts[key] =
          (counts[key] ?? 0) +
          1;
      }

      const scaleConfig = resolveScaleConfig(
        currentQuestion.config,
      );

      const entries = scaleConfig.values.map(
        (scaleValue) => {
          const key = String(scaleValue.value);
          const count = counts[key] ?? 0;

          return {
            option: scaleValue.label
              ? `${scaleValue.value} — ${scaleValue.label}`
              : key,
            count,
            percentage: Math.round(
              (count / numericValues.length) * 100,
            ),
          };
        },
      );

      setResultEntries(
        entries,
      );

      return;
    }

    setResultEntries([]);
    setAverageValue(null);
  };

  /*
   * ---------------------------------------------
   * LOAD QUESTION
   * ---------------------------------------------
   */

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
      setIsEditingResponse(
        false,
      );

      return;
    }

    if (!activeSession?.id) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      setIsEditingResponse(
        false,
      );

      return;
    }

    const {
      data: questionData,
      error: questionError,
    } = await supabase
      .from("session_questions")
      .select("*")
      .eq("id", questionId)
      .eq(
        "session_id",
        activeSession.id,
      )
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
      setIsEditingResponse(
        false,
      );

      return;
    }

    const currentQuestion =
      questionData as SessionQuestion;

    setQuestion(
      currentQuestion,
    );

    if (
      activeParticipant?.participantId
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
          activeParticipant.participantId,
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
        setExistingResponse(
          null,
        );

        setSelectedAnswer("");
      }
    } else {
      setExistingResponse(null);
      setSelectedAnswer("");
    }

    setIsEditingResponse(
      false,
    );

    await loadResults(
      activeSession.id,
      currentQuestion,
      activeSession,
    );
  };

  /*
   * ---------------------------------------------
   * LOAD SESSION
   * ---------------------------------------------
   */

  const loadSession = async () => {
    setIsLoading(true);
    setError(null);

    const {
      data,
      error: sessionError,
    } = await supabase
      .from("sessions")
      .select("*")
      .eq(
        "join_code",
        code,
      )
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

    setSession(
      currentSession,
    );

    let storedParticipant:
      | StoredParticipant
      | null = null;

    if (
      typeof window !==
      "undefined"
    ) {
      const stored =
        window.localStorage.getItem(
          storageKey,
        );

      if (stored) {
        try {
          const parsed =
            JSON.parse(
              stored,
            ) as StoredParticipant;

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

    const initialDisplayQuestionId =
      currentSession.student_display_type === "waiting"
        ? null
        : currentSession.student_question_id ??
          currentSession.active_question_id;

    if (
      initialDisplayQuestionId &&
      storedParticipant
    ) {
      await loadQuestion(
        initialDisplayQuestionId,
        currentSession,
        storedParticipant,
      );
    }

    setIsLoading(false);
  };

  /*
   * ---------------------------------------------
   * INITIAL SESSION LOAD
   * ---------------------------------------------
   */

  useEffect(() => {
    void loadSession();
  }, [code]);

  /*
   * ---------------------------------------------
   * ACTIVE QUESTION LOAD
   * ---------------------------------------------
   */

  useEffect(() => {
    const displayQuestionId =
      session?.student_display_type === "waiting"
        ? null
        : session?.student_question_id ??
          session?.active_question_id;

    if (!displayQuestionId) {
      setQuestion(null);
      setExistingResponse(null);
      setSelectedAnswer("");
      setResponseCount(0);
      setResultEntries([]);
      setAverageValue(null);
      setIsEditingResponse(
        false,
      );

      return;
    }

    void loadQuestion(
      displayQuestionId,
    );
  }, [
    session?.student_display_type,
    session?.student_question_id,
    session?.active_question_id,
    participant?.participantId,
  ]);

  /*
   * ---------------------------------------------
   * SESSION + QUESTION REALTIME
   * ---------------------------------------------
   */

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
          `student-session-questions-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "session_questions",
            filter: `session_id=eq.${session.id}`,
          },
          async (payload) => {
            const changedQuestion =
              (
                payload.eventType ===
                "DELETE"
                  ? payload.old
                  : payload.new
              ) as SessionQuestion;

            if (
              !changedQuestion
            ) {
              return;
            }

            if (
              changedQuestion.id !==
              (
                session.student_display_type === "waiting"
                  ? null
                  : session.student_question_id ??
                    session.active_question_id
              )
            ) {
              return;
            }

            if (
              payload.eventType ===
              "DELETE"
            ) {
              setQuestion(null);
              setExistingResponse(
                null,
              );
              setSelectedAnswer(
                "",
              );
              setResponseCount(
                0,
              );
              setResultEntries(
                [],
              );
              setAverageValue(
                null,
              );
              setIsEditingResponse(
                false,
              );

              return;
            }

            setQuestion(
              changedQuestion,
            );

            await loadResults(
              session.id,
              changedQuestion,
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
    };
  }, [
    session?.id,
    session?.active_question_id,
    session?.student_display_type,
    session?.student_question_id,
  ]);

  /*
   * ---------------------------------------------
   * RESPONSE REALTIME
   * ---------------------------------------------
   */

  useEffect(() => {
    if (
      !session?.id ||
      !participant?.participantId
    ) {
      return;
    }

    const responseChannel =
      supabase
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
            const changedResponse =
              payload.new as PollResponse;

            if (
              changedResponse.question_id !==
              session.active_question_id
            ) {
              return;
            }

            if (
              payload.eventType ===
                "INSERT" ||
              payload.eventType ===
                "UPDATE"
            ) {
              if (
                changedResponse.participant_id ===
                participant.participantId
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

              if (question) {
                void loadResults(
                  session.id,
                  question,
                );
              }

              return;
            }

            if (
              payload.eventType ===
              "DELETE"
            ) {
              if (
                changedResponse.participant_id ===
                participant.participantId
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

              if (question) {
                void loadResults(
                  session.id,
                  question,
                );
              }
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
    question,
  ]);

  /*
   * ---------------------------------------------
   * PARTICIPANT PRESENCE
   * ---------------------------------------------
   */

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

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void updateLastSeen();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(
        heartbeat,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    session?.id,
    participant?.participantId,
  ]);

  /*
   * ---------------------------------------------
   * JOIN SESSION
   * ---------------------------------------------
   */

  const joinSession = async () => {
    if (
      !session ||
      isJoining
    ) {
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
        Number(rollNumber) <
          0 ||
        Number(rollNumber) >
          99
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

    const stored:
      StoredParticipant = {
      participantId:
        created.id,
      sessionToken:
        created.session_token,
    };

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(
        stored,
      ),
    );

    setParticipant(
      stored,
    );

    setIsJoining(false);

    if (
      session.active_question_id
    ) {
      await loadQuestion(
        session.active_question_id,
        session,
        stored,
      );
    }
  };

  /*
   * ---------------------------------------------
   * SUBMIT RESPONSE
   * ---------------------------------------------
   */

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
        session.status !==
          "live" ||
        session.is_offline ||
        question.status !==
          "active"
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

      /*
       * UPDATE EXISTING RESPONSE
       */

      if (
        existingResponse
      ) {
        const {
          data,
          error:
            updateError,
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

      /*
       * INSERT NEW RESPONSE
       */

      const {
        data,
        error: insertError,
      } = await supabase
        .from("responses")
        .insert({
          quiz_id:
            session.id,

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
        /*
         * A duplicate can happen when
         * realtime or another tab has
         * already created the response.
         */

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

  /*
   * ---------------------------------------------
   * RESPONSE EDITING
   * ---------------------------------------------
   */

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

  /*
   * ---------------------------------------------
   * QUESTION INPUT
   * ---------------------------------------------
   */

  const renderQuestionInput =
    () => {
      if (!question) {
        return null;
      }

      /*
       * MULTIPLE CHOICE
       */

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
                      "w-full rounded-2xl border p-4 text-left font-semibold shadow-sm transition-all duration-200",
                      isSelected
                        ? "border-indigo-400 bg-gradient-to-r from-indigo-500/15 to-violet-500/10 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/50 dark:hover:bg-white/[0.08]",
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

      /*
       * SCALE / RATING
       */

      if (
        question.type ===
          "scale" ||
        question.type ===
          "rating"
      ) {
        return (
          <ScaleResponseInput
            config={question.config}
            value={selectedAnswer}
            onChange={setSelectedAnswer}
          />
        );
      }

      /*
       * TRUE / FALSE
       */

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
                      "rounded-2xl border p-4 font-semibold transition-all",
                      isSelected
                        ? "border-indigo-400 bg-indigo-500/15 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/50",
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
          This question type is not yet
          supported in the live student
          interface.
        </div>
      );
    };

  /*
   * ---------------------------------------------
   * RESULTS
   * ---------------------------------------------
   */

  const renderResults =
    () => {
      if (
        !question ||
        !session ||
        (session.student_display_type !== "results" &&
          !(
            question.results_mode === "live" &&
            existingResponse &&
            session.active_question_id === question.id
          ))
      ) {
        return null;
      }

      const visualization =
        session.projector_visualization_type ??
        "horizontal-bar";

      const colors = [
        "#6366f1", "#8b5cf6", "#0ea5e9",
        "#10b981", "#f59e0b", "#f43f5e",
      ];

      const leadingCount = resultEntries.length
        ? Math.max(...resultEntries.map((entry) => entry.count))
        : 0;

      const renderVisualization = () => {
        if (!resultEntries.length) {
          return (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No results yet. Responses will appear here as they arrive.
            </div>
          );
        }

        if (visualization === "likert") {
          return (
            <div className="space-y-3">
              {resultEntries.map((entry, index) => {
                const isOwnAnswer =
                  existingResponse &&
                  answerToString(existingResponse.answer) === entry.option;
                const colors = [
                  "from-rose-500 to-rose-400",
                  "from-orange-500 to-amber-400",
                  "from-slate-400 to-slate-300",
                  "from-cyan-500 to-sky-400",
                  "from-emerald-500 to-emerald-400",
                  "from-indigo-500 to-violet-400",
                ];
                return (
                  <div
                    key={entry.option}
                    className={[
                      "rounded-2xl border p-4 transition-all",
                      isOwnAnswer
                        ? "border-primary/50 bg-primary/[0.07] shadow-sm"
                        : "bg-card",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-bold">
                          {entry.option}
                          {isOwnAnswer && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">
                              Your answer
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-black">
                        {entry.percentage}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className={
                          "h-full rounded-full bg-gradient-to-r transition-all duration-500 " +
                          colors[index % colors.length]
                        }
                        style={{ width: `${entry.percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {entry.count} response{entry.count === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        }

        if (visualization === "donut") {
          let cursor = 0;
          const segments = resultEntries.map((entry, index) => {
            const start = cursor;
            cursor += entry.percentage;
            return `${colors[index % colors.length]} ${start}% ${cursor}%`;
          }).join(", ");

          return (
            <div className="grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
              <div
                className="relative mx-auto h-44 w-44 rounded-full shadow-lg"
                style={{ background: `conic-gradient(${segments})` }}
              >
                <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-background">
                  <span className="text-3xl font-black">{responseCount}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responses</span>
                </div>
              </div>
              <div className="space-y-3">
                {resultEntries.map((entry, index) => (
                  <div key={entry.option} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                      <span className="truncate font-medium">{entry.option}</span>
                    </div>
                    <span className="font-bold">{entry.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (visualization === "vertical-bar") {
          const max = Math.max(...resultEntries.map((entry) => entry.percentage), 1);
          return (
            <div className="flex h-64 items-end gap-3 overflow-x-auto pb-2">
              {resultEntries.map((entry) => (
                <div key={entry.option} className="flex min-w-[64px] flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-bold">{entry.percentage}%</span>
                  <div className="flex h-44 w-full items-end rounded-xl bg-muted p-1">
                    <div className="w-full rounded-lg bg-primary transition-all duration-500" style={{ height: `${Math.max(3, (entry.percentage / max) * 100)}%` }} />
                  </div>
                  <span className="max-w-full truncate text-center text-xs font-medium">{entry.option}</span>
                </div>
              ))}
            </div>
          );
        }

        if (visualization === "ranked") {
          return (
            <div className="space-y-2">
              {[...resultEntries].sort((a, b) => b.count - a.count).map((entry, index) => (
                <div key={entry.option} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">#{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{entry.option}</span>
                  <span className="text-sm font-bold">{entry.count}</span>
                  <span className="w-12 text-right text-sm text-muted-foreground">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          );
        }

        if (visualization === "percentage") {
          return (
            <div className="grid gap-3 sm:grid-cols-2">
              {resultEntries.map((entry) => (
                <div key={entry.option} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <p className="truncate text-sm font-semibold text-muted-foreground">{entry.option}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-3xl font-black">{entry.percentage}%</span>
                    <span className="text-sm text-muted-foreground">{entry.count} votes</span>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {resultEntries.map((entry) => {
              const isOwnAnswer =
                existingResponse &&
                answerToString(existingResponse.answer) === entry.option;
              return (
                <div key={entry.option} className="rounded-xl border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold">
                      {entry.option}
                      {isOwnAnswer && <span className="ml-2 text-xs text-primary">Your answer</span>}
                    </span>
                    <span className="shrink-0 font-bold">{entry.count} · {entry.percentage}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className={entry.count === leadingCount && leadingCount > 0 ? "h-full rounded-full bg-primary transition-all duration-500" : "h-full rounded-full bg-primary/40 transition-all duration-500"} style={{ width: `${entry.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      };

      return (
        <section className="overflow-hidden rounded-3xl border bg-gradient-to-b from-primary/[0.05] to-background shadow-sm">
          <div className="border-b bg-background/70 px-5 py-4 backdrop-blur sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Live results</p>
                <h2 className="mt-1 text-lg font-bold">Response distribution</h2>
                <p className="mt-1 text-xs text-muted-foreground">{responseCount} response{responseCount === 1 ? "" : "s"} collected</p>
              </div>
              {averageValue !== null && (
                <div className="rounded-2xl bg-primary/10 px-4 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average</p>
                  <p className="text-xl font-black text-primary">{averageValue}</p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            {renderVisualization()}
          </div>
        </section>
      );
    };

  /*
   * ---------------------------------------------
   * LOADING
   * ---------------------------------------------
   */

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <p className="font-semibold">
          Loading session...
        </p>
      </main>
    );
  }

  /*
   * ---------------------------------------------
   * INVALID SESSION
   * ---------------------------------------------
   */

  if (!session) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
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

  /*
   * ---------------------------------------------
   * COMPLETED SESSION
   * ---------------------------------------------
   */

  if (
    session.status ===
      "completed" ||
    session.status ===
      "archived"
  ) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
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

  /*
   * ---------------------------------------------
   * JOIN FORM
   * ---------------------------------------------
   */

  if (!participant) {
    const joiningLocked =
      session.status ===
        "live" &&
      !session.allow_late_join;

    return (
      <main className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
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
                disabled={
                  isJoining
                }
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
    session.student_display_type === "question" &&
    session.student_question_id === question?.id &&
    !session.is_offline &&
    question?.status ===
      "active";

  /*
   * ---------------------------------------------
   * PARTICIPANT VIEW
   * ---------------------------------------------
   */

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(99,102,241,0.14),transparent_32%),radial-gradient(circle_at_85%_90%,rgba(14,165,233,0.12),transparent_30%)] dark:bg-[radial-gradient(circle_at_75%_10%,rgba(79,70,229,0.18),transparent_28%),radial-gradient(circle_at_20%_90%,rgba(14,165,233,0.12),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center">
        <Card className="w-full overflow-hidden lg:min-h-[min(760px,calc(100vh-2rem))] border-slate-200/80 bg-white/85 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
          <CardHeader className="border-b border-slate-200/70 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 dark:border-white/10 dark:from-indigo-950/40 dark:via-slate-950/40 dark:to-violet-950/30 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><Radio className="h-4 w-4" /></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">Participant View</span>
                </div>
            <CardTitle>
              {session.name}
            </CardTitle>
              </div>
              <ThemeToggle />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {session.participant_mode === "identified"
                ? participantProfile
                  ? `${participantProfile.name ?? "Participant"} · Roll No. ${participantProfile.roll_number ?? "—"}`
                  : "Identified participation"
                : participantProfile
                  ? `${getParticipantDisplayName(participantProfile, sessionParticipants)} · Anonymous participation`
                  : "Anonymous participation"}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 p-5 sm:p-8 lg:p-10">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {session.status ===
                "paused" ||
            session.is_offline ? (
              <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-sm dark:border-amber-500/20 dark:from-amber-950/30 dark:to-orange-950/20">
                <h2 className="text-xl font-bold">
                  Session Paused
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Wait for the
                  instructor to resume.
                </p>
              </div>
            ) : !question ? (
              <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center dark:border-indigo-400/20 dark:bg-indigo-500/[0.04]">
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
                  <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300"><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />Live Question</div>

                  <h2 className="max-w-5xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">{question.text}</h2>
                </div>

                {existingResponse &&
                !isEditingResponse ? (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 shadow-sm dark:border-emerald-500/20 dark:from-emerald-950/20 dark:to-cyan-950/20">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your Answer
                      </p>

                      <p className="mt-2 text-lg font-semibold">
                        {getResponseDisplayLabel(
                          question,
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