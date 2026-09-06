"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function LiveStudio({ params }: { params: any }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const sessionId = resolvedParams.id;

  const [session, setSession] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    // 1. Fetch Session
    const { data: sData, error: sError } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    if (sError || !sData) return alert("Session not found");
    setSession(sData);

    // 2. Fetch Template details
    const { data: tData } = await supabase.from('quiz_templates').select('*').eq('id', sData.template_id).single();
    if (tData) setTemplate(tData);

    // 3. Fetch Questions queue
    const { data: qData } = await supabase.from('questions').select('*').eq('template_id', sData.template_id).order('created_at', { ascending: true });
    if (qData) setQuestions(qData);

    setIsLoading(false);
  };

  const pushQuestionLive = async (questionId: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ active_question_id: questionId, status: 'live' })
      .eq('id', sessionId);
      
    if (error) alert(error.message);
    else setSession({ ...session, active_question_id: questionId, status: 'live' });
  };

  const toggleSetting = async (field: string, value: any) => {
    const { error } = await supabase.from('sessions').update({ [field]: value }).eq('id', sessionId);
    if (error) alert(error.message);
    else setSession({ ...session, [field]: value });
  };

  const togglePause = async (isPaused: boolean) => {
    const newStatus = isPaused ? 'paused' : 'live';
    const { error } = await supabase.from('sessions').update({ status: newStatus }).eq('id', sessionId);
    if (error) alert(error.message);
    else setSession({ ...session, status: newStatus });
  };

  const endSession = async () => {
    if (!confirm("Are you sure you want to end this session? Students will be disconnected.")) return;
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId);
    window.location.href = '/instructor';
  };

  if (isLoading) return <div className="p-8 font-bold">Loading Live Studio...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-screen">
      {/* Left Sidebar: Controls & Settings */}
      <div className="md:col-span-1 space-y-6">
        <Card className="border-teal-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl text-teal-700 dark:text-teal-400">Live Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              className="w-full text-lg h-12 bg-indigo-600 hover:bg-indigo-700" 
              onClick={() => window.open(`/poll/${sessionId}/projector`, '_blank')}
            >
              Open Projector Screen ↗
            </Button>
            
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Anonymous Mode</Label>
                <Switch checked={session.is_anonymous} onCheckedChange={(c) => toggleSetting('is_anonymous', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Live Results</Label>
                <Switch checked={session.show_live_results} onCheckedChange={(c) => toggleSetting('show_live_results', c)} />
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Label className="text-yellow-700 dark:text-yellow-500 font-bold">Pause Polling</Label>
                <Switch checked={session.status === 'paused'} onCheckedChange={(c) => togglePause(c)} />
              </div>
            </div>

            <Button variant="destructive" className="w-full mt-4" onClick={endSession}>
              End Session
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Stage: Question Queue */}
      <div className="md:col-span-2 space-y-6">
        <div className="flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold">{template?.title}</h1>
            <p className="text-muted-foreground">Select a question to push it to student devices.</p>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => {
            const isActive = session.active_question_id === q.id;
            return (
              <Card key={q.id} className={`transition-all ${isActive ? 'border-2 border-indigo-500 shadow-lg scale-[1.02]' : 'hover:border-slate-300'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <span className="font-bold text-lg text-slate-500 mr-2">Q{index + 1}</span>
                    <span className="font-semibold text-lg">{q.text}</span>
                    <div className="text-sm text-muted-foreground mt-2 flex gap-2 flex-wrap">
                      {q.options.map((opt: string, i: number) => (
                        <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{opt}</span>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    variant={isActive ? "default" : "secondary"}
                    className={isActive ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                    onClick={() => pushQuestionLive(q.id)}
                    disabled={isActive}
                  >
                    {isActive ? "Live Now" : "Push Live"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
          
          {questions.length === 0 && (
            <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-xl">
              No questions found in this template. Go back to the Library to add some.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}