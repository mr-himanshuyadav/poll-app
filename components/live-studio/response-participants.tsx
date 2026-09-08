"use client";

import { useMemo, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    Clock3,
    Search,
    Users,
} from "lucide-react";

import type {
    SessionParticipant,
    SessionResponse,
} from "./live-studio-types";

type ParticipantFilter = "all" | "responded" | "waiting";
type SortKey = "name" | "roll_number" | "answer" | "submitted_at";
type SortDirection = "asc" | "desc";

interface ResponseParticipantsProps {
    participants: SessionParticipant[];
    responses: SessionResponse[];
}

export function ResponseParticipants({
    participants,
    responses,
}: ResponseParticipantsProps) {
    const [filter, setFilter] =
        useState<ParticipantFilter>("all");
    const [query, setQuery] = useState("");
    const [sortKey, setSortKey] =
        useState<SortKey>("roll_number");
    const [sortDirection, setSortDirection] =
        useState<SortDirection>("asc");

    const responseByParticipant = useMemo(
        () =>
            new Map(
                responses
                    .filter((response) => response.participant_id)
                    .map((response) => [
                        response.participant_id,
                        response,
                    ]),
            ),
        [responses],
    );

    const counts = {
        all: participants.length,
        responded: responseByParticipant.size,
        waiting: Math.max(
            0,
            participants.length -
                participants.filter((participant) =>
                    responseByParticipant.has(participant.id),
                ).length,
        ),
    };

    const answerToString = (answer: unknown): string => {
        if (answer === null || answer === undefined) {
            return "";
        }

        if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") {
            return String(answer);
        }

        if (Array.isArray(answer)) {
            return answer.map(answerToString).join(", ");
        }

        try {
            return JSON.stringify(answer);
        } catch {
            return String(answer);
        }
    };

    const visibleParticipants = participants.filter(
        (participant) => {
            const responded =
                responseByParticipant.has(participant.id);

            if (filter === "responded" && !responded) {
                return false;
            }

            if (filter === "waiting" && responded) {
                return false;
            }

            const searchable = [
                participant.name ?? "",
                participant.roll_number != null
                    ? String(participant.roll_number)
                    : "",
            ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(
                query.trim().toLowerCase(),
            );
        },
    );

    const sortedParticipants = [...visibleParticipants].sort(
        (left, right) => {
            const leftResponse = responseByParticipant.get(left.id);
            const rightResponse = responseByParticipant.get(right.id);

            const leftValue =
                sortKey === "name"
                    ? left.name ?? ""
                    : sortKey === "roll_number"
                      ? left.roll_number ?? Number.MAX_SAFE_INTEGER
                      : sortKey === "answer"
                        ? leftResponse
                            ? answerToString(leftResponse.answer)
                            : ""
                        : leftResponse?.submitted_at ?? "";

            const rightValue =
                sortKey === "name"
                    ? right.name ?? ""
                    : sortKey === "roll_number"
                      ? right.roll_number ?? Number.MAX_SAFE_INTEGER
                      : sortKey === "answer"
                        ? rightResponse
                            ? answerToString(rightResponse.answer)
                            : ""
                        : rightResponse?.submitted_at ?? "";

            const comparison =
                typeof leftValue === "number" &&
                typeof rightValue === "number"
                    ? leftValue - rightValue
                    : String(leftValue).localeCompare(
                          String(rightValue),
                          undefined,
                          { numeric: true, sensitivity: "base" },
                      );

            return sortDirection === "asc"
                ? comparison
                : -comparison;
        },
    );

    const changeSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection((direction) =>
                direction === "asc" ? "desc" : "asc",
            );
            return;
        }

        setSortKey(key);
        setSortDirection("asc");
    };

    const SortHeader = ({
        label,
        column,
        className = "",
    }: {
        label: string;
        column: SortKey;
        className?: string;
    }) => {
        const active = sortKey === column;
        const Icon = !active
            ? ArrowUpDown
            : sortDirection === "asc"
              ? ArrowUp
              : ArrowDown;

        return (
            <button
                type="button"
                onClick={() => changeSort(column)}
                className={
                    "inline-flex items-center gap-1.5 text-left transition hover:text-slate-700 dark:hover:text-slate-200 " +
                    className
                }
            >
                {label}
                <Icon className="h-3.5 w-3.5" />
            </button>
        );
    };

    return (
        <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">
                        Participant responses
                    </h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        See who has responded to the viewed question.
                    </p>
                </div>

                <div className="relative w-full lg:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={query}
                        onChange={(event) =>
                            setQuery(event.target.value)
                        }
                        placeholder="Search participants"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-950"
                    />
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {(
                    [
                        ["all", "All", Users],
                        ["responded", "Responded", CheckCircle2],
                        ["waiting", "Waiting", Clock3],
                    ] as const
                ).map(([value, label, Icon]) => {
                    const active = filter === value;

                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={[
                                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200",
                                active
                                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900",
                            ].join(" ")}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                            <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-xs dark:bg-slate-900/60">
                                {counts[value]}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-[minmax(130px,1.2fr)_minmax(90px,.7fr)_minmax(140px,1.5fr)_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                    <SortHeader label="Participant" column="name" />
                    <SortHeader label="Roll No." column="roll_number" />
                    <SortHeader label="Answer" column="answer" />
                    <SortHeader label="Submitted" column="submitted_at" />
                </div>

                {sortedParticipants.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedParticipants.map((participant) => {
                            const response =
                                responseByParticipant.get(
                                    participant.id,
                                );
                            const responded = Boolean(response);

                            return (
                                <div
                                    key={participant.id}
                                    className="grid grid-cols-[minmax(130px,1.2fr)_minmax(90px,.7fr)_minmax(140px,1.5fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            {participant.name ||
                                                "Anonymous participant"}
                                        </p>
                                    </div>

                                    <span className="truncate text-sm text-slate-600 dark:text-slate-300">
                                        {participant.roll_number != null
                                            ? participant.roll_number
                                            : "—"}
                                    </span>

                                    <div className="min-w-0">
                                        {responded ? (
                                            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                {answerToString(response?.answer)}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                Waiting
                                            </span>
                                        )}
                                    </div>

                                    <span className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {responded
                                            ? new Date(response!.submitted_at).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  second: "2-digit",
                                              })
                                            : "—"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
                        <Users className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            No participants found
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Try another filter or search term.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
