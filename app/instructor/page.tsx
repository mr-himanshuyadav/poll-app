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

export default function InstructorDashboard() {
  const router = useRouter();

  const [templates, setTemplates] =
    useState<QuizTemplate[]>([]);

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

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const {
      data,
      error: fetchError,
    } = await supabase
      .from("quiz_templates")
      .select("*")
      .eq(
        "instructor_id",
        user.id,
      )
      .order("updated_at", {
        ascending: false,
      });

    if (fetchError) {
      setError(
        fetchError.message,
      );
      setTemplates([]);
    } else {
      setTemplates(
        (data ?? []) as QuizTemplate[],
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
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
          instructor_id: user.id,
          title,
          description: null,
        })
        .select("*")
        .single();

    if (createError || !data) {
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
          .includes(
            "duplicate",
          )
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

    /*
     * ------------------------------------------------
     * CREATE SESSION QUESTION SNAPSHOTS
     * ------------------------------------------------
     *
     * Every template question gets its own copy
     * inside the new session.
     *
     * The original template question remains in
     * the reusable question bank.
     */

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

            /*
             * A new live session starts with
             * all questions waiting in the queue.
             */
            status: "draft",

            results_mode:
              question.results_mode,

            results_visible:
              false,
          }),
        );

      const {
        error: snapshotError,
      } =
        await supabase
          .from("session_questions")
          .insert(
            sessionQuestions,
          );

      if (snapshotError) {
        /*
         * The session is not useful without
         * its question snapshot, so clean it
         * back up if snapshot creation fails.
         */
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

    setCreatedSession(
      createdSession,
    );

    setIsCreatingSession(false);
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
      `/instructor/studio/${createdSession.id}`,
    );
  };

  const openStudioNewTab = () => {
    if (!createdSession) {
      return;
    }

    window.open(
      `/instructor/studio/${createdSession.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Instructor
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Command Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Create and manage your reusable classroom question modules.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={signOut}
          >
            Sign Out
          </Button>
        </header>

        {error &&
          !showSessionDialog && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Quiz Library
                </h2>

                <p className="text-sm text-muted-foreground">
                  {templates.length}{" "}
                  {templates.length ===
                  1
                    ? "module"
                    : "modules"}
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
                Loading your quiz library...
              </div>
            ) : filteredTemplates.length ===
              0 ? (
              <div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm dark:bg-slate-900">
                <h3 className="text-lg font-semibold">
                  {templates.length ===
                  0
                    ? "No quiz modules yet"
                    : "No matching modules"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {templates.length ===
                  0
                    ? "Create your first module using the panel on the right."
                    : "Try a different search term."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map(
                  (template) => (
                    <Card
                      key={
                        template.id
                      }
                      className="flex h-full flex-col transition-shadow hover:shadow-md"
                    >
                      <CardHeader className="pb-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            Module
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              template.updated_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <CardTitle className="line-clamp-2 text-lg">
                          {
                            template.title
                          }
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="mt-auto flex gap-2">
                        <Button
                          className="flex-1"
                          variant="secondary"
                          onClick={() =>
                            router.push(
                              `/instructor/template/${template.id}`,
                            )
                          }
                        >
                          Edit Questions
                        </Button>

                        <Button
                          className="flex-1"
                          onClick={() =>
                            openSessionDialog(
                              template,
                            )
                          }
                        >
                          Launch Live
                        </Button>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>
                  Create Quiz Module
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">
                    Module name
                  </Label>

                  <Input
                    id="template-name"
                    placeholder="e.g. Physics — Thermodynamics"
                    value={newTemplateName}
                    disabled={
                      isCreating
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewTemplateName(
                        event.target
                          .value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        void createTemplate();
                      }
                    }}
                  />
                </div>

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

                <p className="text-xs leading-5 text-muted-foreground">
                  Modules hold reusable questions. Live classroom sessions
                  use a snapshot of these questions, so later template edits
                  do not change historical sessions.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog
        open={showSessionDialog}
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
                    value={sessionName}
                    onChange={(
                      event,
                    ) =>
                      setSessionName(
                        event.target
                          .value,
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

                  <p className="text-xs text-muted-foreground">
                    Identified students will enter their name and roll number
                    when joining.
                  </p>
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
                    {
                      typeof window !==
                      "undefined"
                        ? `${window.location.origin}/join/${createdSession.join_code}`
                        : `/join/${createdSession.join_code}`
                    }
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="rounded-2xl border bg-white p-4">
                    <QRCodeSVG
                      value={
                        typeof window !==
                        "undefined"
                          ? `${window.location.origin}/join/${createdSession.join_code}`
                          : `/join/${createdSession.join_code}`
                      }
                      size={220}
                      includeMargin
                    />
                  </div>
                </div>

                <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                  The session has been created with a snapshot of the
                  template questions. Changes to the reusable template will
                  not affect this session.
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