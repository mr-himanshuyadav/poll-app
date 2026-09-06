"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

export default function InstructorDashboard() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  
  // Real-time synced states
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showLiveResults, setShowLiveResults] = useState(false);
  
  const [questionConfig, setQuestionConfig] = useState({
    quizName: "Class Session",
    text: "",
    type: "multiple-choice",
    options: "Option 1, Option 2",
    scaleMax: 5
  });

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      let currentQuizId = quizId;

      // 1. Create Quiz if it doesn't exist
      if (!currentQuizId) {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert({
            name: questionConfig.quizName,
            is_anonymous: isAnonymous,
            is_offline: isOffline,
            show_live_results: showLiveResults
          })
          .select().single();

        if (quizError) throw new Error(quizError.message);
        currentQuizId = quizData.id;
        setQuizId(currentQuizId);
      }

      // 2. Format options
      const parsedOptions = questionConfig.type === 'multiple-choice' 
        ? questionConfig.options.split(',').map(o => o.trim())
        : Array.from({ length: questionConfig.scaleMax }, (_, i) => (i + 1).toString());

      // 3. Create Question
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .insert({
          quiz_id: currentQuizId,
          text: questionConfig.text,
          type: questionConfig.type === 'scale' ? (questionConfig.scaleMax === 10 ? 'scale_10' : 'scale_5') : 'mcq',
          options: parsedOptions
        }).select().single();

      if (qError) throw new Error(qError.message);

      // 4. Set Active
      await supabase.from('quizzes').update({ active_question_id: qData.id }).eq('id', currentQuizId);
      alert("Question Broadcasted!");
      setQuestionConfig(prev => ({ ...prev, text: "", options: "" })); // Reset input
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const updateQuizSetting = async (field: string, value: boolean) => {
    if (!quizId) return;
    await supabase.from('quizzes').update({ [field]: value }).eq('id', quizId);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Instructor Controls</h1>
        {quizId && (
          <Button variant="outline" onClick={() => window.open(`/poll/${quizId}/projector`, '_blank')}>
            Open Projector Screen ↗
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Global Quiz Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quiz Name</Label>
            <Input value={questionConfig.quizName} disabled={!!quizId} onChange={(e) => setQuestionConfig({...questionConfig, quizName: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-2 border p-4 rounded-lg">
              <Label>Anonymous Mode</Label>
              <Switch checked={isAnonymous} disabled={!!quizId} onCheckedChange={(c) => setIsAnonymous(c)} />
            </div>
            <div className="flex flex-col space-y-2 border p-4 rounded-lg">
              <Label>Offline (Pause)</Label>
              <Switch checked={isOffline} onCheckedChange={(c) => { setIsOffline(c); updateQuizSetting('is_offline', c); }} />
            </div>
            <div className="flex flex-col space-y-2 border p-4 rounded-lg">
              <Label>Show Student Results</Label>
              <Switch checked={showLiveResults} onCheckedChange={(c) => { setShowLiveResults(c); updateQuizSetting('show_live_results', c); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Push New Question</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Input value={questionConfig.text} onChange={(e) => setQuestionConfig({...questionConfig, text: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={questionConfig.type} onValueChange={(v) => setQuestionConfig({...questionConfig, type: v as string})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {questionConfig.type === 'multiple-choice' ? (
             <Input value={questionConfig.options} onChange={(e) => setQuestionConfig({...questionConfig, options: e.target.value})} placeholder="Option 1, Option 2" />
          ) : (
            <Select value={questionConfig.scaleMax.toString()} onValueChange={(v) => setQuestionConfig({...questionConfig, scaleMax: parseInt(v as string, 10)})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="5">1 to 5</SelectItem><SelectItem value="10">1 to 10</SelectItem></SelectContent>
            </Select>
          )}
          <Button className="w-full mt-4" size="lg" onClick={handleBroadcast} disabled={isBroadcasting || !questionConfig.text}>
            {isBroadcasting ? "Broadcasting..." : "Broadcast Question"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}