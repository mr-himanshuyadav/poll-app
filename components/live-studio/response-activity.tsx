"use client";

import { useMemo } from "react";
import { Activity, CheckCircle2, Clock3, Timer, Users } from "lucide-react";

import type {
    SessionParticipant,
    SessionResponse,
} from "./live-studio-types";

interface ResponseActivityProps {
    participants: SessionParticipant[];
    responses: SessionResponse[];
}

function formatDuration(milliseconds: number | null) {
    if (milliseconds === null || !Number.isFinite(milliseconds)) {
        return "—";
    }

    const seconds = Math.max(0, Math.round(milliseconds / 1000));

    if (seconds < 60) {
        return seconds + "s";
    }

    return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
}

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function ResponseActivity({
    participants,
    responses,
}: ResponseActivityProps) {
    const summary = useMemo(() => {
        const submitted = responses.length;
        const waiting = Math.max(
            0,
            participants.length - submitted,
        );

        const latestResponse = responses.reduce<
            SessionResponse | null
        >((latest, response) => {
            if (
                !latest ||
                new Date(response.submitted_at).getTime() >
                    new Date(latest.submitted_at).getTime()
            ) {
                return response;
            }

            return latest;
        }, null);

        const times = responses
            .map((response) => response.response_time_ms)
            .filter(
                (time): time is number =>
                    typeof time === "number" && time >= 0,
            );

        const averageTime =
            times.length > 0
                ? times.reduce((total, time) => total + time, 0) /
                  times.length
                : null;

        return {
            submitted,
            waiting,
            latestResponse,
            averageTime,
        };
    }, [participants.length, responses]);

    const recentResponses = useMemo(
        () =>
            [...responses]
                .sort(
                    (left, right) =>
                        new Date(right.submitted_at).getTime() -
                        new Date(left.submitted_at).getTime(),
                )
                .slice(0, 12),
        [responses],
    );

    const participantById = useMemo(
        () =>
            new Map(
                participants.map((participant) => [
                    participant.id,
                    participant,
                ]),
            ),
        [participants],
    );

    return (
        <div className="p-5 sm:p-6">
            <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    Response activity
                </h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Monitor response pace and the latest submissions.
                </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActivityMetric
                    icon={CheckCircle2}
                    label="Responses"
                    value={String(summary.submitted)}
                />
                <ActivityMetric
                    icon={Clock3}
                    label="Still waiting"
                    value={String(summary.waiting)}
                />
                <ActivityMetric
                    icon={Timer}
                    label="Avg. response time"
                    value={formatDuration(summary.averageTime)}
                />
                <ActivityMetric
                    icon={Activity}
                    label="Latest response"
                    value={
                        summary.latestResponse
                            ? formatTime(
                                  summary.latestResponse.submitted_at,
                              )
                            : "—"
                    }
                />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            Latest submissions
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Most recent responses first
                        </p>
                    </div>
                    <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-900">
                        {responses.length} total
                    </span>
                </div>

                {recentResponses.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentResponses.map((response) => {
                            const participant =
                                participantById.get(
                                    response.participant_id,
                                );

                            return (
                                <div
                                    key={response.id}
                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">
                                        {(participant?.name ??
                                            "A")
                                            .slice(0, 1)
                                            .toUpperCase()}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            {participant?.name ??
                                                "Anonymous participant"}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {participant?.roll_number != null
                                                ? "Roll " +
                                                  participant.roll_number
                                                : "No roll number"}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                            {formatTime(
                                                response.submitted_at,
                                            )}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {formatDuration(
                                                response.response_time_ms,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex min-h-[230px] flex-col items-center justify-center px-6 text-center">
                        <Users className="h-9 w-9 text-slate-300 dark:text-slate-700" />
                        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            No response activity yet
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Submissions will appear here as participants answer.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Activity;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 text-slate-400">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
                {value}
            </p>
        </div>
    );
}
