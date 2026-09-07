"use client";

import { use, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import type { Session, SessionQuestion } from "@/lib/types";

type ResponseRow = {
    id: string;
    quiz_id: string;
    question_id: string;
    participant_id: string;
    answer: unknown;
    submitted_at: string;
    updated_at: string;
};

type ProjectorPhase =
    | "connecting"
    | "waiting"
    | "live"
    | "paused"
    | "closed"
    | "completed";

export default function ProjectorPage({
    params,
}: {
    params:
    | Promise<{ code: string }>
    | { code: string };
}) {
    const resolvedParams =
        params instanceof Promise ? use(params) : params;

    const sessionCode =
        resolvedParams.code.toUpperCase();

    const [sessionId, setSessionId] =
        useState<string | null>(null);

    const [session, setSession] =
        useState<Session | null>(null);

    const [question, setQuestion] =
        useState<SessionQuestion | null>(null);

    const [responses, setResponses] =
        useState<ResponseRow[]>([]);

    const [error, setError] =
        useState<string | null>(null);

    const [phase, setPhase] =
        useState<ProjectorPhase>("connecting");

    /*
     * ---------------------------------------------
     * LOAD QUESTION + RESPONSES
     * ---------------------------------------------
     */

    const loadQuestion = async (
        currentSessionId: string,
        questionId: string | null,
    ) => {
        if (!questionId) {
            setQuestion(null);
            setResponses([]);
            return;
        }

        const {
            data: questionData,
            error: questionError,
        } = await supabase
            .from("session_questions")
            .select("*")
            .eq("id", questionId)
            .eq("session_id", currentSessionId)
            .single();

        if (questionError || !questionData) {
            setQuestion(null);
            setResponses([]);
            return;
        }

        const currentQuestion =
            questionData as SessionQuestion;

        setQuestion(currentQuestion);

        /*
         * Load every existing response for this
         * exact session question.
         */

        const {
            data: responseData,
            error: responseError,
        } = await supabase
            .from("responses")
            .select(
                `
          id,
          quiz_id,
          question_id,
          participant_id,
          answer,
          submitted_at,
          updated_at
        `,
            )
            .eq("quiz_id", currentSessionId)
            .eq("question_id", questionId)
            .order("updated_at", {
                ascending: true,
            });

        if (responseError) {
            setResponses([]);
            return;
        }

        setResponses(
            (responseData ?? []) as ResponseRow[],
        );
    };

    /*
     * ---------------------------------------------
     * LOAD SESSION
     * ---------------------------------------------
     */

    useEffect(() => {

        let cancelled = false;

        const loadSession = async () => {
            setPhase("connecting");
            setError(null);

            const {
                data,
                error: sessionError,
            } = await supabase
                .from("sessions")
                .select("*")
                .eq(
                    "join_code",
                    sessionCode,
                )
                .single();

            if (cancelled) {
                return;
            }

            if (sessionError || !data) {
                setError(
                    sessionError?.message ??
                    "Unable to load session.",
                );

                setPhase("waiting");
                return;
            }

            const currentSession =
                data as Session;

            setSessionId(
                currentSession.id,
            );

            setSession(currentSession);

            if (
                currentSession.status ===
                "completed" ||
                currentSession.status ===
                "archived"
            ) {
                setQuestion(null);
                setResponses([]);
                setPhase("completed");
                return;
            }

            if (
                currentSession.status ===
                "paused" ||
                currentSession.is_offline
            ) {
                if (
                    currentSession.active_question_id
                ) {
                    await loadQuestion(
                        currentSession.id,
                        currentSession.active_question_id,
                    );
                }

                setPhase("paused");
                return;
            }

            if (
                currentSession.active_question_id
            ) {
                await loadQuestion(
                    currentSession.id,
                    currentSession.active_question_id,
                );

                setPhase("live");
            } else {
                setQuestion(null);
                setResponses([]);
                setPhase("waiting");
            }
        };

        void loadSession();

        return () => {
            cancelled = true;
        };
    }, [sessionCode]);

    /*
     * ---------------------------------------------
     * REALTIME SESSION / QUESTION / RESPONSE
     * ---------------------------------------------
     */

    useEffect(() => {
        if (!sessionId) {
            return;
        }

        const channel = supabase
            .channel(
                `projector-live-${sessionId}`,
            )

            /*
             * SESSION EVENTS
             */

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

                    /*
                     * Session ended
                     */

                    if (
                        updatedSession.status ===
                        "completed" ||
                        updatedSession.status ===
                        "archived"
                    ) {
                        setQuestion(null);
                        setResponses([]);
                        setPhase("completed");
                        return;
                    }

                    /*
                     * Session paused
                     */

                    if (
                        updatedSession.status ===
                        "paused" ||
                        updatedSession.is_offline
                    ) {
                        setPhase("paused");

                        /*
                         * Keep the current question loaded
                         * so it can resume cleanly.
                         */

                        if (
                            updatedSession.active_question_id
                        ) {
                            await loadQuestion(
                                updatedSession.id,
                                updatedSession.active_question_id,
                            );
                        }

                        return;
                    }

                    /*
                     * Question cleared
                     */

                    if (
                        !updatedSession.active_question_id
                    ) {
                        setQuestion(null);
                        setResponses([]);
                        setPhase("waiting");
                        return;
                    }

                    /*
                     * Active question changed or session
                     * returned to live.
                     */

                    await loadQuestion(
                        updatedSession.id,
                        updatedSession.active_question_id,
                    );

                    setPhase("live");
                },
            )

            /*
             * QUESTION EVENTS
             *
             * This catches results_visible changing,
             * closing/reopening, etc.
             */

            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "session_questions",
                    filter: `session_id=eq.${sessionId}`,
                },
                async (payload) => {
                    const updatedQuestion =
                        payload.new as SessionQuestion;

                    /*
                     * Only react if this is the current
                     * active question.
                     */

                    setQuestion((currentQuestion) => {
                        if (
                            !currentQuestion ||
                            currentQuestion.id !==
                            updatedQuestion.id
                        ) {
                            return currentQuestion;
                        }

                        return updatedQuestion;
                    });

                    /*
                     * If the active question itself
                     * was closed, update projector state.
                     */

                    if (
                        updatedQuestion.id ===
                        question?.id &&
                        updatedQuestion.status ===
                        "closed"
                    ) {
                        setPhase("closed");
                    }

                    /*
                     * Refresh responses when question
                     * state changes.
                     */

                    setQuestion((currentQuestion) => {
                        if (
                            currentQuestion?.id ===
                            updatedQuestion.id
                        ) {
                            void loadQuestion(
                                sessionId,
                                updatedQuestion.id,
                            );
                        }

                        return updatedQuestion;
                    });
                },
            )

            /*
             * RESPONSE EVENTS
             *
             * IMPORTANT:
             * Do not capture `question` from the
             * effect closure. Instead, check the
             * currently rendered question via the
             * functional state update.
             */

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "responses",
                    filter: `quiz_id=eq.${sessionId}`,
                },
                (payload) => {
                    const inserted =
                        payload.new as ResponseRow;

                    setQuestion((currentQuestion) => {
                        if (
                            !currentQuestion ||
                            inserted.question_id !==
                            currentQuestion.id
                        ) {
                            return currentQuestion;
                        }

                        setResponses((currentResponses) => {
                            const alreadyExists =
                                currentResponses.some(
                                    (response) =>
                                        response.id ===
                                        inserted.id,
                                );

                            if (alreadyExists) {
                                return currentResponses;
                            }

                            return [
                                ...currentResponses,
                                inserted,
                            ];
                        });

                        return currentQuestion;
                    });
                },
            )

            /*
             * RESPONSE UPDATES
             */

            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "responses",
                    filter: `quiz_id=eq.${sessionId}`,
                },
                (payload) => {
                    const updated =
                        payload.new as ResponseRow;

                    setQuestion((currentQuestion) => {
                        if (
                            !currentQuestion ||
                            updated.question_id !==
                            currentQuestion.id
                        ) {
                            return currentQuestion;
                        }

                        setResponses((currentResponses) =>
                            currentResponses.map(
                                (response) =>
                                    response.id ===
                                        updated.id
                                        ? updated
                                        : response,
                            ),
                        );

                        return currentQuestion;
                    });
                },
            )

            /*
             * RESPONSE DELETE
             */

            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "responses",
                    filter: `quiz_id=eq.${sessionId}`,
                },
                (payload) => {
                    const deleted =
                        payload.old as ResponseRow;

                    setResponses((currentResponses) =>
                        currentResponses.filter(
                            (response) =>
                                response.id !== deleted.id,
                        ),
                    );
                },
            )

            .subscribe();

        return () => {
            void supabase.removeChannel(
                channel,
            );
        };
    }, [sessionId]);

    /*
     * ---------------------------------------------
     * DERIVED DATA
     * ---------------------------------------------
     */

    const totalResponses =
        responses.length;

    const tally = useMemo(() => {
        const counts: Record<
            string,
            number
        > = {};

        if (!question) {
            return counts;
        }

        for (
            const option of question.options
        ) {
            counts[option] =
                responses.filter(
                    (response) =>
                        response.answer === option,
                ).length;
        }

        return counts;
    }, [
        question,
        responses,
    ]);

    const leadingOption =
        useMemo(() => {
            if (
                !question ||
                question.options.length ===
                0 ||
                totalResponses === 0
            ) {
                return null;
            }

            let winner =
                question.options[0];

            let winnerCount =
                tally[winner] ?? 0;

            for (
                const option of question.options
            ) {
                const count =
                    tally[option] ?? 0;

                if (count > winnerCount) {
                    winner = option;
                    winnerCount = count;
                }
            }

            return {
                option: winner,
                count: winnerCount,
            };
        }, [
            question,
            tally,
            totalResponses,
        ]);

    /*
     * ---------------------------------------------
     * URL
     * ---------------------------------------------
     */

    const joinUrl =
        typeof window !== "undefined" &&
            session
            ? `${window.location.origin}/session/${session.join_code}`
            : "";

    /*
     * ---------------------------------------------
     * RESULT VISIBILITY
     * ---------------------------------------------
     */

    const showResults =
        Boolean(
            question?.results_visible,
        );

    /*
     * ---------------------------------------------
     * ERROR STATE
     * ---------------------------------------------
     */

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white">
                <div className="text-center">

                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                        Live Session
                    </p>

                    <h1 className="mt-3 text-3xl font-bold">
                        Unable to connect
                    </h1>

                    <p className="mt-3 max-w-lg text-white/60">
                        {error}
                    </p>

                </div>
            </main>
        );
    }

    /*
     * ---------------------------------------------
     * CONNECTING STATE
     * ---------------------------------------------
     */

    if (
        phase === "connecting" ||
        !session
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white">

                <div className="text-center">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">

                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-white/20 border-t-white" />

                    </div>

                    <h1 className="mt-6 text-3xl font-bold">
                        Connecting to live session...
                    </h1>

                </div>

            </main>
        );
    }

    /*
     * ---------------------------------------------
     * PROJECTOR UI
     * ---------------------------------------------
     */

    return (
        <main className="flex h-screen overflow-hidden bg-slate-950 text-white">

            {/* ========================================
          LEFT INFORMATION PANEL
         ======================================== */}

            <aside className="flex w-[27%] min-w-[280px] flex-col justify-between border-r border-white/10 bg-slate-900 p-8">

                <div>

                    {/* BRAND / SESSION */}

                    <div>

                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
                            Live Session
                        </p>

                        <h1 className="mt-3 text-3xl font-black leading-tight">
                            {session.name}
                        </h1>

                    </div>

                    {/* JOIN */}

                    <div className="mt-10">

                        <p className="text-sm font-semibold text-white/60">
                            Join the session
                        </p>

                        {joinUrl && (
                            <div className="mt-4 rounded-2xl bg-white p-4">

                                <QRCodeSVG
                                    value={joinUrl}
                                    size={230}
                                    className="mx-auto h-auto max-w-full"
                                />

                            </div>
                        )}

                        <div className="mt-5 text-center">

                            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                                Join Code
                            </p>

                            <p className="mt-2 text-4xl font-black tracking-[0.25em]">
                                {session.join_code}
                            </p>

                        </div>

                    </div>

                </div>

                {/* SESSION STATUS */}

                <div className="space-y-3">

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                        <div className="flex items-center justify-between">

                            <span className="text-sm text-white/60">
                                Session
                            </span>

                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                                {session.status.toUpperCase()}
                            </span>

                        </div>

                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                        <div className="flex items-center justify-between">

                            <span className="text-sm text-white/60">
                                Responses
                            </span>

                            <span className="text-2xl font-black">
                                {totalResponses}
                            </span>

                        </div>

                    </div>

                </div>

            </aside>

            {/* ========================================
          MAIN PROJECTOR AREA
         ======================================== */}

            <section className="flex min-w-0 flex-1 flex-col">

                {/* TOP STATUS BAR */}

                <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">

                    <div className="flex items-center gap-3">

                        <span
                            className={`h-3 w-3 rounded-full ${phase === "live"
                                ? "bg-emerald-400"
                                : phase === "paused"
                                    ? "bg-yellow-400"
                                    : "bg-white/30"
                                }`}
                        />

                        <span className="text-sm font-semibold text-white/70">
                            {phase === "live"
                                ? "Live"
                                : phase === "paused"
                                    ? "Paused"
                                    : phase === "closed"
                                        ? "Question Closed"
                                        : phase === "completed"
                                            ? "Session Ended"
                                            : "Waiting"}
                        </span>

                    </div>

                    {question && (

                        <div className="flex items-center gap-2">

                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                                {question.results_mode ===
                                    "live"
                                    ? "Live Results"
                                    : question.results_mode ===
                                        "on_command"
                                        ? question.results_visible
                                            ? "Results Revealed"
                                            : "Results Hidden"
                                        : "Hidden Results"}
                            </span>

                        </div>

                    )}

                </div>

                {/* CONTENT */}

                <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-10 lg:p-16">

                    {/* WAITING */}

                    {phase === "waiting" && (
                        <div className="max-w-3xl text-center">

                            <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-400">
                                Live Classroom
                            </p>

                            <h2 className="mt-6 text-5xl font-black leading-tight lg:text-7xl">
                                Waiting for the instructor
                            </h2>

                            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-white/50">
                                The next question will appear here
                                automatically.
                            </p>

                        </div>
                    )}

                    {/* PAUSED */}

                    {phase === "paused" && (
                        <div className="max-w-3xl text-center">

                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-400/10 text-4xl">
                                ⏸
                            </div>

                            <h2 className="mt-7 text-5xl font-black lg:text-7xl">
                                Session Paused
                            </h2>

                            <p className="mx-auto mt-6 max-w-2xl text-xl text-white/50">
                                Please wait while the instructor
                                resumes the session.
                            </p>

                        </div>
                    )}

                    {/* COMPLETED */}

                    {phase === "completed" && (
                        <div className="max-w-3xl text-center">

                            <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-400">
                                Session Complete
                            </p>

                            <h2 className="mt-6 text-5xl font-black lg:text-7xl">
                                Thank you
                            </h2>

                            <p className="mx-auto mt-6 max-w-2xl text-xl text-white/50">
                                This live session has ended.
                            </p>

                            <div className="mx-auto mt-8 inline-flex rounded-full border border-white/10 bg-white/5 px-6 py-3 text-lg font-semibold">
                                {totalResponses} responses recorded
                            </div>

                        </div>
                    )}

                    {/* QUESTION CLOSED */}

                    {phase === "closed" && (
                        <div className="max-w-3xl text-center">

                            <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-400">
                                Question Complete
                            </p>

                            <h2 className="mt-6 text-5xl font-black lg:text-7xl">
                                Waiting for the next question
                            </h2>

                        </div>
                    )}

                    {/* LIVE QUESTION */}

                    {phase === "live" &&
                        question && (

                            <div className="w-full max-w-6xl">

                                {/* QUESTION */}

                                <div className="text-center">

                                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-400">
                                        Live Question
                                    </p>

                                    <h2 className="mx-auto mt-6 max-w-6xl text-4xl font-black leading-tight lg:text-6xl">
                                        {question.text}
                                    </h2>

                                </div>

                                {/* RESULTS */}

                                {question.type ===
                                    "multiple_choice" && (
                                        <div className="mt-14 space-y-7">

                                            {question.options.map(
                                                (option, index) => {

                                                    const count =
                                                        tally[option] ?? 0;

                                                    const percentage =
                                                        totalResponses ===
                                                            0
                                                            ? 0
                                                            : Math.round(
                                                                (count /
                                                                    totalResponses) *
                                                                100,
                                                            );

                                                    return (

                                                        <div
                                                            key={`${question.id}-${index}`}
                                                        >

                                                            <div className="mb-3 flex items-center justify-between gap-6">

                                                                <div className="min-w-0">

                                                                    <span className="mr-4 text-2xl font-black text-white/30 lg:text-3xl">
                                                                        {String.fromCharCode(
                                                                            65 + index,
                                                                        )}
                                                                    </span>

                                                                    <span className="text-2xl font-bold lg:text-3xl">
                                                                        {option}
                                                                    </span>

                                                                </div>

                                                                {showResults ? (

                                                                    <div className="shrink-0 text-right">

                                                                        <span className="text-2xl font-black lg:text-3xl">
                                                                            {percentage}%
                                                                        </span>

                                                                        <span className="ml-3 text-lg text-white/40">
                                                                            {count}
                                                                        </span>

                                                                    </div>

                                                                ) : (

                                                                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/50">
                                                                        Responses collected
                                                                    </span>

                                                                )}

                                                            </div>

                                                            {showResults ? (

                                                                <Progress
                                                                    value={
                                                                        percentage
                                                                    }
                                                                    className="h-7 bg-white/10"
                                                                />

                                                            ) : (

                                                                <div className="h-4 rounded-full bg-white/5" />

                                                            )}

                                                        </div>

                                                    );

                                                },
                                            )}

                                        </div>
                                    )}

                                {/* SCALE */}

                                {question.type ===
                                    "scale" && (

                                        <div className="mt-14">

                                            {showResults ? (

                                                <div className="space-y-6">

                                                    {question.options.length >
                                                        0 ? (

                                                        question.options.map(
                                                            (
                                                                option,
                                                                index,
                                                            ) => {

                                                                const count =
                                                                    tally[
                                                                    option
                                                                    ] ?? 0;

                                                                const percentage =
                                                                    totalResponses ===
                                                                        0
                                                                        ? 0
                                                                        : Math.round(
                                                                            (count /
                                                                                totalResponses) *
                                                                            100,
                                                                        );

                                                                return (

                                                                    <div
                                                                        key={`${question.id}-${index}`}
                                                                    >

                                                                        <div className="mb-2 flex justify-between text-xl font-bold">

                                                                            <span>
                                                                                {option}
                                                                            </span>

                                                                            <span>
                                                                                {percentage}% (
                                                                                {count})
                                                                            </span>

                                                                        </div>

                                                                        <Progress
                                                                            value={
                                                                                percentage
                                                                            }
                                                                            className="h-6"
                                                                        />

                                                                    </div>

                                                                );

                                                            },
                                                        )

                                                    ) : (

                                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">

                                                            <p className="text-2xl font-bold">
                                                                {totalResponses}{" "}
                                                                responses
                                                            </p>

                                                        </div>

                                                    )}

                                                </div>

                                            ) : (

                                                <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">

                                                    <p className="text-2xl font-bold">
                                                        Responses are being collected
                                                    </p>

                                                    <p className="mt-3 text-lg text-white/40">
                                                        Results will appear when
                                                        they are revealed.
                                                    </p>

                                                </div>

                                            )}

                                        </div>

                                    )}

                                {/* RESPONSE FOOTER */}

                                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">

                                    <div>

                                        <p className="text-sm font-semibold text-white/40">
                                            Total Responses
                                        </p>

                                        <p className="mt-1 text-3xl font-black">
                                            {totalResponses}
                                        </p>

                                    </div>

                                    {showResults &&
                                        leadingOption && (

                                            <div className="text-right">

                                                <p className="text-sm font-semibold text-white/40">
                                                    Leading Answer
                                                </p>

                                                <p className="mt-1 text-xl font-bold">
                                                    {leadingOption.option}
                                                </p>

                                            </div>

                                        )}

                                </div>

                            </div>
                        )}

                </div>

            </section>

        </main>
    );
}