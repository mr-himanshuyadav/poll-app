"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, CheckCircle2, Clock3, Eye, Search, Users } from "lucide-react";
import type { SessionParticipant, SessionQuestion, SessionResponse } from "./live-studio-types";
import { getParticipantDisplayName } from "@/lib/participant-labels";
import { getResponseDisplayLabel } from "@/lib/response-label";

type ParticipantFilter = "all" | "responded" | "waiting";
type SortKey = "name" | "roll_number" | "answer" | "submitted_at";
type SortDirection = "asc" | "desc";

interface ResponseParticipantsProps {
    participants: SessionParticipant[];
    responses: SessionResponse[];
    allResponses?: SessionResponse[];
    questions?: SessionQuestion[];
    activeFilter?: ParticipantFilter;
    activeAnswer?: string | null;
}

export function ResponseParticipants({
    participants,
    responses,
    allResponses = responses,
    questions = [],
    activeFilter,
    activeAnswer,
}: ResponseParticipantsProps) {
    const [filter, setFilter] = useState<ParticipantFilter>("all");
    const [query, setQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("roll_number");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

    useEffect(() => {
        if (activeFilter) {
            setFilter(activeFilter);
            setSelectedParticipantId(null);
        }
    }, [activeFilter]);

    const responseByParticipant = useMemo(
        () => new Map(
            responses
                .filter((response) => response.participant_id)
                .map((response) => [response.participant_id, response]),
        ),
        [responses],
    );

    const answerToString = (answer: unknown): string => {
        if (answer === null || answer === undefined) return "";
        if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") return String(answer);
        if (Array.isArray(answer)) return answer.map(answerToString).join(", ");
        try { return JSON.stringify(answer); } catch { return String(answer); }
    };

    const participantLabel = (participant: SessionParticipant) =>
        getParticipantDisplayName(participant, participants);

    const selectedParticipant = useMemo(
        () => participants.find((participant) => participant.id === selectedParticipantId) ?? null,
        [participants, selectedParticipantId],
    );

    const selectedResponses = useMemo(() => {
        if (!selectedParticipant) return [];
        return allResponses
            .filter((response) => response.participant_id === selectedParticipant.id)
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    }, [allResponses, selectedParticipant]);

    const questionById = useMemo(
        () => new Map(questions.map((question) => [question.id, question])),
        [questions],
    );

    const counts = {
        all: participants.length,
        responded: participants.filter((participant) => responseByParticipant.has(participant.id)).length,
        waiting: participants.filter((participant) => !responseByParticipant.has(participant.id)).length,
    };

    const visibleParticipants = participants.filter((participant) => {
        const responded = responseByParticipant.has(participant.id);
        if (filter === "responded" && !responded) return false;
        if (filter === "waiting" && responded) return false;
        if (activeAnswer && answerToString(responseByParticipant.get(participant.id)?.answer) !== activeAnswer) return false;
        return [participant.name ?? "", participant.roll_number != null ? String(participant.roll_number) : ""]
            .join(" ").toLowerCase().includes(query.trim().toLowerCase());
    });

    const sortedParticipants = [...visibleParticipants].sort((left, right) => {
        const leftResponse = responseByParticipant.get(left.id);
        const rightResponse = responseByParticipant.get(right.id);
        const value = (participant: SessionParticipant, response?: SessionResponse) =>
            sortKey === "name" ? participant.name ?? "" :
            sortKey === "roll_number" ? participant.roll_number ?? Number.MAX_SAFE_INTEGER :
            sortKey === "answer" ? response ? answerToString(response.answer) : "" :
            response?.submitted_at ?? "";
        const a = value(left, leftResponse);
        const b = value(right, rightResponse);
        const comparison = typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
    });

    const changeSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    const SortHeader = ({ label, column }: { label: string; column: SortKey }) => {
        const active = sortKey === column;
        const Icon = !active ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
        return (
            <button type="button" onClick={() => changeSort(column)}
                className="inline-flex items-center gap-1.5 text-left transition hover:text-slate-700 dark:hover:text-slate-200">
                {label}<Icon className="h-3.5 w-3.5" />
            </button>
        );
    };

    if (selectedParticipant) {
        return (
            <div className="p-5 sm:p-6">
                <button type="button" onClick={() => setSelectedParticipantId(null)}
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400">
                    <ArrowLeft className="h-4 w-4" /> Back to participants
                </button>
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{participantLabel(selectedParticipant)}</h4>
                        <p className="mt-1 text-sm text-slate-500">{selectedParticipant.is_anonymous ? "Anonymous participation · Session response history" : `Roll No. ${selectedParticipant.roll_number ?? "—"} · Session response history`}</p>
                    </div>
                    <span className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {selectedResponses.length} response{selectedResponses.length === 1 ? "" : "s"}
                    </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(100px,.7fr)_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                        <span>#</span><span>Question</span><span>Answer</span><span>Submitted</span>
                    </div>
                    {selectedResponses.length ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selectedResponses.map((response) => {
                                const question = questionById.get(response.question_id);
                                const number = question ? questions.findIndex((item) => item.id === question.id) + 1 : "—";
                                return (
                                    <div key={response.id} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(100px,.7fr)_auto] items-center gap-4 px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                                        <span className="text-sm font-bold text-slate-400">{number}</span>
                                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{question?.text || "Question unavailable"}</p>
                                        <span className="truncate text-sm font-semibold text-indigo-700 dark:text-indigo-300">{getResponseDisplayLabel(question, response.answer)}</span>
                                        <span className="text-right text-xs text-slate-500">{new Date(response.submitted_at).toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">No responses from this participant yet.</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div><h4 className="font-bold text-slate-900 dark:text-slate-100">{activeAnswer ? `Participants who answered: ${activeAnswer}` : "Participant responses"}</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">See who has responded to the viewed question.</p></div>
                <div className="relative w-full lg:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search participants" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900" /></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
                {([["all","All",Users],["responded","Responded",CheckCircle2],["waiting","Waiting",Clock3]] as const).map(([value,label,Icon]) => (
                    <button key={value} type="button" onClick={() => setFilter(value)} className={["inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all",filter === value ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"].join(" ")}>
                        <Icon className="h-4 w-4" />{label}<span className="rounded-md bg-white/70 px-1.5 py-0.5 text-xs dark:bg-slate-900/60">{counts[value]}</span>
                    </button>
                ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-[minmax(130px,1.2fr)_minmax(90px,.7fr)_minmax(140px,1.5fr)_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                    <SortHeader label="Participant" column="name" /><SortHeader label="Roll No." column="roll_number" /><SortHeader label="Answer" column="answer" /><SortHeader label="Submitted" column="submitted_at" /><span>Details</span>
                </div>
                {sortedParticipants.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedParticipants.map((participant) => {
                        const response = responseByParticipant.get(participant.id);
                        const responded = Boolean(response);
                        return <div key={participant.id} className="grid grid-cols-[minmax(130px,1.2fr)_minmax(90px,.7fr)_minmax(140px,1.5fr)_auto_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{participantLabel(participant)}</p>
                            <span className="truncate text-sm text-slate-600 dark:text-slate-300">{participant.roll_number ?? "—"}</span>
                            <div>{responded ? <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{getResponseDisplayLabel(questions[0] ? questionById.get(response?.question_id ?? "") : null, response?.answer)}</span> : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400"><Clock3 className="h-3.5 w-3.5" />Waiting</span>}</div>
                            <span className="text-right text-xs font-medium text-slate-500">{responded ? new Date(response!.submitted_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—"}</span>
                            <button type="button" onClick={() => setSelectedParticipantId(participant.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40" title="View all responses" aria-label="View all responses"><Eye className="h-4 w-4" /></button>
                        </div>;
                    })}
                </div> : <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center"><Users className="h-8 w-8 text-slate-300 dark:text-slate-700" /><p className="mt-3 text-sm font-semibold">No participants found</p><p className="mt-1 text-xs text-slate-500">Try another filter or search term.</p></div>}
            </div>
        </div>
    );
}
