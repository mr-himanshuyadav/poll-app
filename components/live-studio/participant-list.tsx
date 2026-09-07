"use client";

import {
    Clock3,
    Users,
} from "lucide-react";

import type {
    SessionParticipant,
} from "./live-studio-types";

import {
    formatRelativeTime,
    getInitials,
} from "./live-studio-utils";

interface ParticipantListProps {
    participants: SessionParticipant[];

    isUpdating?: boolean;
}

function isParticipantActive(
    participant: SessionParticipant,
): boolean {
    if (!participant.last_seen_at) {
        return false;
    }

    const lastActive =
        new Date(
            participant.last_seen_at,
        ).getTime();

    if (Number.isNaN(lastActive)) {
        return false;
    }

    const threshold =
        5 * 60 * 1000;

    return (
        Date.now() - lastActive <= threshold
    );
}

export function ParticipantList({
    participants,
}: ParticipantListProps) {
    if (participants.length === 0) {
        return null;
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        <Users className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Participant List
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {
                                participants.length
                            }{" "}
                            total participants
                        </p>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {participants.map(
                    (participant, index) => {
                        const name =
    participant.name ??
    `Participant ${index + 1}`;

                        const isActive =
                            isParticipantActive(
                                participant,
                            );

                        return (
                            <div
                                key={
                                    participant.id
                                }
                                className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40 sm:px-6"
                            >
                                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                    {getInitials(
                                        name,
                                    )}

                                    <span
                                        className={[
                                            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950",
                                            isActive
                                                ? "bg-emerald-500"
                                                : "bg-slate-400",
                                        ].join(
                                            " ",
                                        )}
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {name}
                                    </p>

                                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                        Joined{" "}
                                        {formatRelativeTime(
                                            participant.joined_at,
                                        )}
                                    </p>
                                </div>

                                <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex dark:text-slate-400">
                                    <Clock3 className="h-3.5 w-3.5" />

                                    <span>
                                        {participant.last_seen_at
                                            ? formatRelativeTime(
                                                  participant.last_seen_at,
                                              )
                                            : "No activity"}
                                    </span>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span
                                        className={[
                                            "h-2 w-2 rounded-full",
                                            isActive
                                                ? "bg-emerald-500"
                                                : "bg-slate-400",
                                        ].join(
                                            " ",
                                        )}
                                    />

                                    <span
                                        className={[
                                            "hidden text-xs font-semibold sm:inline",
                                            isActive
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-slate-500 dark:text-slate-400",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        {isActive
                                            ? "Active"
                                            : "Inactive"}
                                    </span>
                                </div>
                            </div>
                        );
                    },
                )}
            </div>
        </section>
    );
}