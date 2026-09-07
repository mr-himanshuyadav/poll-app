"use client";

import {
    Search,
    Users,
} from "lucide-react";

import {
    useMemo,
    useState,
} from "react";

import { Input } from "@/components/ui/input";

import type {
    SessionParticipant,
} from "./live-studio-types";

import { ParticipantList } from "./participant-list";

interface ParticipantsWorkspaceProps {
    participants: SessionParticipant[];

    isUpdating?: boolean;

    onRefresh?: () => void;
}

export function ParticipantsWorkspace({
    participants,
    isUpdating = false,
}: ParticipantsWorkspaceProps) {
    const [searchQuery, setSearchQuery] =
        useState("");

    const filteredParticipants =
        useMemo(() => {
            const query =
                searchQuery
                    .trim()
                    .toLowerCase();

            if (!query) {
                return participants;
            }

            return participants.filter(
                (participant) => {
                    const name =
                        (
                            participant.display_name ??
                            participant.name ??
                            ""
                        ).toLowerCase();

                    const identifier =
                        (
                            participant.participant_id ??
                            participant.user_id ??
                            ""
                        ).toLowerCase();

                    return (
                        name.includes(query) ||
                        identifier.includes(
                            query,
                        )
                    );
                },
            );
        }, [
            participants,
            searchQuery,
        ]);

    const activeParticipants =
        useMemo(() => {
            const now = Date.now();

            const activeThreshold =
                5 * 60 * 1000;

            return participants.filter(
                (participant) => {
                    if (
                        !participant.last_active_at
                    ) {
                        return false;
                    }

                    const lastActive =
                        new Date(
                            participant.last_active_at,
                        ).getTime();

                    return (
                        now - lastActive <=
                        activeThreshold
                    );
                },
            ).length;
        }, [participants]);

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 md:pb-8">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Live Audience
                        </p>

                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                            Participants
                        </h1>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Monitor everyone who
                            has joined this live
                            session.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Joined
                            </p>

                            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                                {
                                    participants.length
                                }
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Active
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    {
                                        activeParticipants
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <Input
                        value={searchQuery}
                        onChange={(event) =>
                            setSearchQuery(
                                event.target.value,
                            )
                        }
                        placeholder="Search participants..."
                        className="pl-9"
                    />
                </div>

                <ParticipantList
                    participants={
                        filteredParticipants
                    }
                    isUpdating={
                        isUpdating
                    }
                />

                {participants.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                            <Users className="h-7 w-7" />
                        </div>

                        <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-slate-100">
                            No participants yet
                        </h2>

                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Participants will
                            automatically appear
                            here when they join the
                            session.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}