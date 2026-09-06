"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InstructorDashboard() {
  const [view, setView] = useState<"settings" | "presentation">("settings");
  const [quizConfig, setQuizConfig] = useState({
    quizName: "My New Quiz",
    isAnonymous: true,
    isOffline: false,
    showResultsMode: "live", // 'live', 'on_command', 'hidden'
    question: "",
    type: "multiple-choice",
    options: ["Option 1", "Option 2"],
    scaleMax: 5
  });

  const handleBroadcast = async () => {
    await fetch("/api/poll", {
      method: "POST",
      body: JSON.stringify({ ...quizConfig, action: "broadcast" })
    });
    setView("presentation");
  };

  if (view === "presentation") {
    // URL would be dynamic based on your deployment (e.g., window.location.origin)
    const joinUrl = `https://your-vercel-domain.com/poll/current`; 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-4xl text-center p-8">
          <h1 className="text-4xl font-bold mb-4">{quizConfig.quizName}</h1>
          <p className="text-xl mb-8">Scan to join the live quiz!</p>
          <div className="flex justify-center mb-8">
            <QRCodeSVG value={joinUrl} size={300} />
          </div>
          <div className="text-2xl font-semibold mb-8">{quizConfig.question}</div>
          
          <div className="space-x-4">
            {quizConfig.showResultsMode === 'on_command' && (
              <Button size="lg" onClick={() => fetch("/api/poll", { method: "POST", body: JSON.stringify({ action: "trigger_results" }) })}>
                Show Results to Students
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => setView("settings")}>Back to Setup</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Quiz Configuration</h1>
      
      <Card>
        <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quiz Name</Label>
            <Input value={quizConfig.quizName} onChange={(e) => setQuizConfig({...quizConfig, quizName: e.target.value})} />
          </div>
          
          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label>Anonymous Mode</Label>
              <p className="text-sm text-muted-foreground">If disabled, voters must enter Name & Roll No (Max 2 digits).</p>
            </div>
            <Switch checked={quizConfig.isAnonymous} onCheckedChange={(c) => setQuizConfig({...quizConfig, isAnonymous: c})} />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label>Offline Mode</Label>
              <p className="text-sm text-muted-foreground">Pause accepting new responses.</p>
            </div>
            <Switch checked={quizConfig.isOffline} onCheckedChange={(c) => setQuizConfig({...quizConfig, isOffline: c})} />
          </div>

          <div className="space-y-2">
            <Label>Result Visibility on Voter Device</Label>
            <Select value={quizConfig.showResultsMode} onValueChange={(v) => setQuizConfig({...quizConfig, showResultsMode: v || "live"})}>
              <SelectTrigger><SelectValue placeholder="Select visibility..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Updated Live</SelectItem>
                <SelectItem value="on_command">On Instructor Command</SelectItem>
                <SelectItem value="hidden">Do Not Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Question Broadcast</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input value={quizConfig.question} onChange={(e) => setQuizConfig({...quizConfig, question: e.target.value})} placeholder="Type your question here..." />
          </div>

          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={quizConfig.type} onValueChange={(v) => setQuizConfig({...quizConfig, type: v || "multiple-choice"})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="scale">Scale (Range)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {quizConfig.type === 'scale' && (
            <div className="space-y-2">
              <Label>Scale Range</Label>
              <Select value={quizConfig.scaleMax.toString()} onValueChange={(v) => setQuizConfig({...quizConfig, scaleMax: parseInt(v || "5", 10)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">1 to 5</SelectItem>
                  <SelectItem value="10">1 to 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button className="w-full mt-4" size="lg" onClick={handleBroadcast}>Broadcast & Show QR</Button>
        </CardContent>
      </Card>
    </div>
  );
}