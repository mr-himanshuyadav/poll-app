"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";

import type {
  ParticipantMode,
  QuizTemplate,
  ResultsMode,
} from "@/lib/types";

type CreatedSession = {
  id: string;
  join_code: string;
};

type DashboardSession = {
  id: string;
  template_id: string | null;
  instructor_id: string;
  name: string;
  join_code: string;
  status:
    | "draft"
    | "ready"
    | "live"
    | "paused"
    | "completed"
    | "archived";
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export default function InstructorDashboard() {
  const router = useRouter();

  const [templates, setTemplates] =
    useState<QuizTemplate[]>([]);

  const [sessions, setSessions] =
    useState<DashboardSession[]>([]);

  const [newTemplateName, setNewTemplateName] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isCreating, setIsCreating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] =
    useState<QuizTemplate | null>(null);

  const [showSessionDialog, setShowSessionDialog] =
    useState(false);

  const [
    isCreatingInstantSession,
    setIsCreatingInstantSession,
  ] = useState(false);

  const [sessionName, setSessionName] =
    useState("");

  const [participantMode, setParticipantMode] =
    useState<ParticipantMode>("anonymous");

  const [resultsMode, setResultsMode] =
    useState<ResultsMode>("on_command");

  const [allowLateJoin, setAllowLateJoin] =
    useState(true);

  const [allowAnswerChange, setAllowAnswerChange] =
    useState(false);

  const [isCreatingSession, setIsCreatingSession] =
    useState(false);

  const [createdSession, setCreatedSession] =
    useState<CreatedSession | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const [
      templateResult,
      sessionResult,
    ] = await Promise.all([
      supabase
        .from("quiz_templates")
        .select("*")
        .eq("instructor_id", user.id)
        .order("updated_at", {
          ascending: false,
        }),

      supabase
        .from("sessions")
        .select(
          `
            id,
            template_id,
            instructor_id,
            name,
            join_code,
            status,
            created_at,
            started_at,
            ended_at
          `,
        )
        .eq("instructor_id", user.id)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (templateResult.error) {
      setError(
        templateResult.error.message,
      );

      setTemplates([]);
    } else {
      setTemplates(
        (templateResult.data ??
          []) as QuizTemplate[],
      );
    }

    if (sessionResult.error) {
      setError(
        sessionResult.error.message,
      );

      setSessions([]);
    } else {
      setSessions(
        (sessionResult.data ??
          []) as DashboardSession[],
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredTemplates =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return templates;
      }

      return templates.filter(
        (template) =>
          template.title
            .toLowerCase()
            .includes(query),
      );
    }, [templates, search]);

  const createTemplate = async () => {
    const title =
      newTemplateName.trim();

    if (!title || isCreating) {
      return;
    }

    setIsCreating(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      setIsCreating(false);
      return;
    }

    const {
      data,
      error: createError,
    } =
      await supabase
        .from("quiz_templates")
        .insert({
          instructor_id:
            user.id,
          title,
          description: null,
        })
        .select("*")
        .single();

    if (
      createError ||
      !data
    ) {
      setError(
        createError?.message ??
          "Unable to create quiz module.",
      );

      setIsCreating(false);
      return;
    }

    setTemplates(
      (current) => [
        data as QuizTemplate,
        ...current,
      ],
    );

    setNewTemplateName("");
    setIsCreating(false);
  };

  const generateJoinCode = () => {
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (
      let index = 0;
      index < 6;
      index++
    ) {
      const randomIndex =
        Math.floor(
          Math.random() *
            characters.length,
        );

      code +=
        characters[randomIndex];
    }

    return code;
  };

  const openSessionDialog = (
    template: QuizTemplate,
  ) => {
    setSelectedTemplate(template);

    setSessionName(
      template.title,
    );

    setParticipantMode(
      "anonymous",
    );

    setResultsMode(
      "on_command",
    );

    setAllowLateJoin(true);
    setAllowAnswerChange(false);

    setCreatedSession(null);
    setError(null);
    setShowSessionDialog(true);
  };

  const createLiveSession = async () => {
    if (!selectedTemplate) {
      return;
    }

    const trimmedName =
      sessionName.trim();

    if (
      !trimmedName ||
      isCreatingSession
    ) {
      return;
    }

    setIsCreatingSession(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      setIsCreatingSession(false);
      return;
    }

    let createdSession:
      | CreatedSession
      | null = null;

    for (
      let attempt = 0;
      attempt < 5;
      attempt++
    ) {
      const joinCode =
        generateJoinCode();

      const {
        data,
        error: createError,
      } =
        await supabase
          .from("sessions")
          .insert({
            template_id:
              selectedTemplate.id,

            instructor_id:
              user.id,

            name:
              trimmedName,

            join_code:
              joinCode,

            status: "ready",

            participant_mode:
              participantMode,

            results_mode:
              resultsMode,

            allow_late_join:
              allowLateJoin,

            allow_answer_change:
              allowAnswerChange,

            is_offline: false,

            active_question_id:
              null,
          })
          .select(
            "id, join_code",
          )
          .single();

      if (
        !createError &&
        data
      ) {
        createdSession =
          data as CreatedSession;

        break;
      }

      if (
        createError &&
        !createError.message
          .toLowerCase()
          .includes("duplicate")
      ) {
        setError(
          createError.message,
        );

        break;
      }
    }

    if (!createdSession) {
      setError(
        "Unable to generate a unique session code. Please try again.",
      );

      setIsCreatingSession(false);
      return;
    }

    const {
      data: templateQuestions,
      error:
        templateQuestionsError,
    } =
      await supabase
        .from("questions")
        .select("*")
        .eq(
          "template_id",
          selectedTemplate.id,
        )
        .order("position", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

    if (
      templateQuestionsError
    ) {
      await supabase
        .from("sessions")
        .delete()
        .eq(
          "id",
          createdSession.id,
        );

      setError(
        templateQuestionsError.message,
      );

      setIsCreatingSession(false);
      return;
    }

    if (
      templateQuestions &&
      templateQuestions.length > 0
    ) {
      const sessionQuestions =
        templateQuestions.map(
          (question) => ({
            session_id:
              createdSession!.id,

            source_question_id:
              question.id,

            text:
              question.text,

            type:
              question.type,

            options:
              question.options,

            config:
              question.config,

            position:
              question.position,

            status: "draft",

            results_mode:
              question.results_mode,

            results_visible:
              false,
          }),
        );

      const {
        error:
          snapshotError,
      } =
        await supabase
          .from(
            "session_questions",
          )
          .insert(
            sessionQuestions,
          );

      if (snapshotError) {
        await supabase
          .from("sessions")
          .delete()
          .eq(
            "id",
            createdSession.id,
          );

        setError(
          snapshotError.message,
        );

        setIsCreatingSession(false);
        return;
      }
    }

    setSessions(
      (current) => [
        {
          id: createdSession!.id,
          template_id:
            selectedTemplate.id,
          instructor_id:
            user.id,
          name: trimmedName,
          join_code:
            createdSession!.join_code,
          status: "ready",
          created_at:
            new Date().toISOString(),
          started_at: null,
          ended_at: null,
        },
        ...current,
      ],
    );

    setCreatedSession(
      createdSession,
    );

    setIsCreatingSession(false);
  };

  const createInstantSession =
    async () => {
      if (
        isCreatingInstantSession
      ) {
        return;
      }

      setIsCreatingInstantSession(
        true,
      );

      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        setIsCreatingInstantSession(
          false,
        );
        return;
      }

      let createdSession:
        | CreatedSession
        | null = null;

      for (
        let attempt = 0;
        attempt < 5;
        attempt++
      ) {
        const joinCode =
          generateJoinCode();

        const {
          data,
          error: createError,
        } =
          await supabase
            .from("sessions")
            .insert({
              template_id: null,
              instructor_id:
                user.id,
              name: "Instant Session",
              join_code:
                joinCode,
              status: "ready",
              participant_mode:
                "anonymous",
              results_mode:
                "on_command",
              allow_late_join:
                true,
              allow_answer_change:
                false,
              is_offline: false,
              active_question_id:
                null,
            })
            .select(
              "id, join_code",
            )
            .single();

        if (
          !createError &&
          data
        ) {
          createdSession =
            data as CreatedSession;

          break;
        }

        if (
          createError &&
          !createError.message
            .toLowerCase()
            .includes("duplicate")
        ) {
          setError(
            createError.message,
          );

          break;
        }
      }

      if (!createdSession) {
        setError(
          "Unable to generate a unique session code. Please try again.",
        );

        setIsCreatingInstantSession(
          false,
        );

        return;
      }

      setSessions(
        (current) => [
          {
            id: createdSession!.id,
            template_id: null,
            instructor_id:
              user.id,
            name: "Instant Session",
            join_code:
              createdSession!.join_code,
            status: "ready",
            created_at:
              new Date().toISOString(),
            started_at: null,
            ended_at: null,
          },
          ...current,
        ],
      );

      router.push(
        `/instructor/${createdSession.join_code}/studio`,
      );

      setIsCreatingInstantSession(
        false,
      );
    };

  const deleteSession = async (
    currentSession: DashboardSession,
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${currentSession.name}"? All responses, participants, session questions, and session history will be permanently removed.`,
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    const {
      error: deleteError,
    } = await supabase
      .from("sessions")
      .delete()
      .eq(
        "id",
        currentSession.id,
      )
      .eq(
        "instructor_id",
        currentSession.instructor_id,
      );

    if (deleteError) {
      setError(
        deleteError.message,
      );
      return;
    }

    setSessions(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            currentSession.id,
        ),
    );
  };

  const closeSessionDialog = () => {
    if (isCreatingSession) {
      return;
    }

    setShowSessionDialog(false);
    setCreatedSession(null);
    setSelectedTemplate(null);
    setError(null);
  };

  const enterStudio = () => {
    if (!createdSession) {
      return;
    }

    setShowSessionDialog(false);

    router.push(
      `/instructor/${createdSession.join_code}/studio`,
    );
  };

  const openStudioNewTab = () => {
    if (!createdSession) {
      return;
    }

    window.open(
      `/instructor/${createdSession.join_code}/studio`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const recentSessions =
    sessions.slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}

        <header className="mb-8 rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Instructor Command Center
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Run your classroom from one place
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Build reusable question modules, launch
                live sessions, or start an instant session
                whenever you need to ask something on the fly.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                onClick={
                  createInstantSession
                }
                disabled={
                  isCreatingInstantSession
                }
              >
                {isCreatingInstantSession
                  ? "Starting..."
                  : "Start Instant Session"}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {error &&
          !showSessionDialog && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        {/* LIBRARY */}

        <section className="mb-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">
                  Quiz Library
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                  {templates.length}
                </span>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Reusable question modules for future classes.
              </p>
            </div>

            <Input
              className="w-full sm:max-w-xs"
              placeholder="Search modules..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>

          {isLoading ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-sm text-muted-foreground shadow-sm dark:bg-slate-900">
              Loading your classroom...
            </div>
          ) : filteredTemplates.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm dark:bg-slate-900">
              <h3 className="text-lg font-semibold">
                {templates.length === 0
                  ? "No quiz modules yet"
                  : "No matching modules"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {templates.length === 0
                  ? "Create your first reusable module below."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map(
                (template) => (
                  <Card
                    key={
                      template.id
                    }
                    className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <CardHeader className="pb-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          Module
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Updated{" "}
                          {new Date(
                            template.updated_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      <CardTitle className="line-clamp-2 text-xl">
                        {template.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="mt-auto space-y-3">
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/instructor/template/${template.id}`,
                          )
                        }
                      >
                        Open Module
                      </Button>

                      <Button
                        className="w-full"
                        onClick={() =>
                          openSessionDialog(
                            template,
                          )
                        }
                      >
                        Launch Live Session
                      </Button>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}
        </section>

        {/* RECENT SESSIONS */}

        <section className="mb-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Recent Sessions
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Reopen a previous studio or remove a session you no longer need.
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              Showing latest{" "}
              {Math.min(
                sessions.length,
                10,
              )}
            </span>
          </div>

          {recentSessions.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center shadow-sm dark:bg-slate-900">
              <h3 className="text-lg font-semibold">
                No sessions yet
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Launch a module or start an instant session
                to see your classroom sessions here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900">
              <div className="hidden grid-cols-[1.7fr_1fr_1fr_160px] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground dark:bg-slate-950 md:grid">
                <span>Session</span>
                <span>Type</span>
                <span>Created</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y">
                {recentSessions.map(
                  (session) => (
                    <div
                      key={
                        session.id
                      }
                      className="grid gap-4 px-5 py-4 md:grid-cols-[1.7fr_1fr_1fr_160px] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              session.status ===
                              "completed"
                                ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                : session.status ===
                                    "live"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : session.status ===
                                      "paused"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                            }`}
                          >
                            {session.status}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            Code{" "}
                            <span className="font-semibold">
                              {
                                session.join_code
                              }
                            </span>
                          </span>
                        </div>

                        <h3 className="mt-2 truncate font-semibold">
                          {session.name}
                        </h3>
                      </div>

                      <div className="text-sm">
                        <span className="text-muted-foreground md:hidden">
                          Type:{" "}
                        </span>

                        {session.template_id
                          ? "Template session"
                          : "Instant session"}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="md:hidden">
                          Created:{" "}
                        </span>

                        {new Date(
                          session.created_at,
                        ).toLocaleString()}
                      </div>

                      <div className="flex justify-start gap-2 md:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/instructor/${session.join_code}/studio`,
                            )
                          }
                        >
                          Open
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            void deleteSession(
                              session,
                            )
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </section>

        {/* CREATE MODULE */}

        <section>
          <Card className="overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_380px]">
              <div className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Build your library
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Create a quiz module
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Modules store reusable questions. When
                  you launch a live session, those questions
                  are copied into a session snapshot so
                  later template edits never rewrite history.
                </p>
              </div>

              <div className="border-t p-6 dark:border-slate-800 lg:border-l lg:border-t-0">
                <div className="space-y-3">
                  <Label htmlFor="template-name">
                    Module name
                  </Label>

                  <Input
                    id="template-name"
                    placeholder="e.g. Physics — Thermodynamics"
                    value={
                      newTemplateName
                    }
                    disabled={
                      isCreating
                    }
                    onChange={(event) =>
                      setNewTemplateName(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        void createTemplate();
                      }
                    }}
                  />

                  <Button
                    className="w-full"
                    disabled={
                      isCreating ||
                      !newTemplateName.trim()
                    }
                    onClick={() =>
                      void createTemplate()
                    }
                  >
                    {isCreating
                      ? "Creating..."
                      : "Create Module"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* LIVE SESSION DIALOG */}

      <Dialog
        open={
          showSessionDialog
        }
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            closeSessionDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {!createdSession ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Launch Live Session
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quiz Module
                  </p>

                  <p className="mt-1 font-semibold">
                    {
                      selectedTemplate?.title
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-name">
                    Session name
                  </Label>

                  <Input
                    id="session-name"
                    value={
                      sessionName
                    }
                    onChange={(event) =>
                      setSessionName(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Physics — Class 12A"
                    disabled={
                      isCreatingSession
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Student identity
                  </Label>

                  <Select
                    value={
                      participantMode
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setParticipantMode(
                        value as ParticipantMode,
                      )
                    }
                    disabled={
                      isCreatingSession
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="anonymous">
                        Anonymous
                      </SelectItem>

                      <SelectItem value="identified">
                        Name + Roll Number
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Student results
                  </Label>

                  <Select
                    value={
                      resultsMode
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setResultsMode(
                        value as ResultsMode,
                      )
                    }
                    disabled={
                      isCreatingSession
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="live">
                        Show Live Results
                      </SelectItem>

                      <SelectItem value="on_command">
                        Reveal on Command
                      </SelectItem>

                      <SelectItem value="hidden">
                        Never Show Results
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div className="pr-4">
                    <p className="font-medium">
                      Allow late joining
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Students can join after the session starts.
                    </p>
                  </div>

                  <Switch
                    checked={
                      allowLateJoin
                    }
                    disabled={
                      isCreatingSession
                    }
                    onCheckedChange={
                      setAllowLateJoin
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div className="pr-4">
                    <p className="font-medium">
                      Allow answer changes
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Students can change an answer after submitting it.
                    </p>
                  </div>

                  <Switch
                    checked={
                      allowAnswerChange
                    }
                    disabled={
                      isCreatingSession
                    }
                    onCheckedChange={
                      setAllowAnswerChange
                    }
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={
                    isCreatingSession
                  }
                  onClick={
                    closeSessionDialog
                  }
                >
                  Cancel
                </Button>

                <Button
                  disabled={
                    isCreatingSession ||
                    !sessionName.trim()
                  }
                  onClick={() =>
                    void createLiveSession()
                  }
                >
                  {isCreatingSession
                    ? "Creating..."
                    : "Create Live Session"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  Live Session Ready
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="rounded-2xl border bg-slate-50 p-5 text-center dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Join Code
                  </p>

                  <p className="mt-2 text-4xl font-black tracking-[0.2em]">
                    {
                      createdSession.join_code
                    }
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Students can join at:
                  </p>

                  <p className="mt-1 break-all text-sm font-medium">
                    {typeof window !==
                    "undefined"
                      ? `${window.location.origin}/session/${createdSession.join_code}`
                      : `/session/${createdSession.join_code}`}
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="rounded-2xl border bg-white p-4">
                    <QRCodeSVG
                      value={
                        typeof window !==
                        "undefined"
                          ? `${window.location.origin}/session/${createdSession.join_code}`
                          : `/session/${createdSession.join_code}`
                      }
                      size={220}
                      includeMargin
                    />
                  </div>
                </div>

                <div className="rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
                  The session contains a snapshot of the
                  module questions. Later changes to the
                  reusable module will not affect this
                  session.
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={
                    openStudioNewTab
                  }
                >
                  Open Studio in New Tab
                </Button>

                <Button
                  onClick={
                    enterStudio
                  }
                >
                  Enter Live Studio
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}