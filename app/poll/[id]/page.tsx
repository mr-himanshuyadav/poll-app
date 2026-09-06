"use client";
import { useState, useEffect, use } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function PollPage({ params }: { params: any }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const quizId = resolvedParams.id;

  const [quiz, setQuiz] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [hasVoted, setHasVoted] = useState(false);
  const [liveResponses, setLiveResponses] = useState<any[]>([]);
  
  const [participantInfo, setParticipantInfo] = useState({ name: "", rollNo: "" });
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!quizId) return;

    const fetchInitialData = async () => {
      const { data: qz } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (qz) {
        setQuiz(qz);
        setIsAuthenticated(qz.is_anonymous);
        if (qz.active_question_id) fetchQuestion(qz.active_question_id);
      }
    };
    fetchInitialData();

    const channel = supabase.channel(`student-quiz-${quizId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${quizId}` }, 
      (payload) => {
        setQuiz(payload.new);
        if (payload.new.active_question_id !== quiz?.active_question_id) {
          fetchQuestion(payload.new.active_question_id);
          setHasVoted(false);
          setSelectedOption("");
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [quizId, quiz?.active_question_id]);

  const fetchQuestion = async (questionId: string) => {
    const { data } = await supabase.from('questions').select('*').eq('id', questionId).single();
    if (data) setQuestion(data);
    
    // Always fetch existing responses so they are ready if instructor toggles results ON
    const { data: respData } = await supabase.from('responses').select('answer').eq('question_id', questionId);
    setLiveResponses(respData || []);

    supabase.channel(`student-resp-${questionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses', filter: `question_id=eq.${questionId}` },
      (payload) => setLiveResponses((prev) => [...prev, payload.new])
    ).subscribe();
  };

  const handleJoin = async () => {
    if (participantInfo.name && participantInfo.rollNo.length > 0 && participantInfo.rollNo.length <= 2) {
      const { data, error } = await supabase.from('participants').insert({
        quiz_id: quizId,
        name: participantInfo.name,
        roll_number: participantInfo.rollNo,
        session_token: crypto.randomUUID() // Simple persistent identifier
      }).select().single();
      
      if (!error && data) {
        setParticipantId(data.id);
        setIsAuthenticated(true);
      } else {
        alert("Failed to join session.");
      }
    }
  };

  const handleVote = async () => {
    if (!selectedOption || !question || !quiz) return;
    
    const { error } = await supabase.from('responses').insert({
      quiz_id: quiz.id,
      question_id: question.id,
      answer: selectedOption,
      participant_id: participantId // Links to student if not anonymous
    });

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    setHasVoted(true);
  };

  if (!quiz) return <div className="flex min-h-screen items-center justify-center font-bold">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader><CardTitle className="text-xl">Join {quiz.name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={participantInfo.name} onChange={(e) => setParticipantInfo({...participantInfo, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Roll Number (Max 2 digits)</Label>
              <Input type="number" max="99" value={participantInfo.rollNo} onChange={(e) => setParticipantInfo({...participantInfo, rollNo: e.target.value})} />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleJoin} className="w-full h-12">Enter Poll</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Calculate live results for student view
  const totalVotes = liveResponses.length;
  const tally = question?.options.reduce((acc: any, option: string) => {
    acc[option] = liveResponses.filter(r => r.answer === option).length;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            {question ? question.text : "Waiting for next question..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quiz.is_offline ? (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center font-medium">
              Quiz is currently paused.
            </div>
          ) : question && !hasVoted ? (
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="gap-4">
              {question.options.map((option: string) => (
                <div key={option} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option} className="flex-grow cursor-pointer text-base">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : hasVoted ? (
            <div className="space-y-6 mt-2">
              <p className="text-green-600 font-semibold text-center text-lg">Response recorded!</p>
              {quiz.show_live_results ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Live Results</h3>
                  {question.options.map((option: string) => {
                    const count = tally[option] || 0;
                    const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                    return (
                      <div key={option} className="space-y-1">
                        <div className="flex justify-between text-sm font-medium">
                          <span>{option}</span>
                          <span>{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground">Look at the main screen for results.</p>
              )}
            </div>
          ) : null}
        </CardContent>
        {question && !hasVoted && !quiz.is_offline && (
          <CardFooter>
            <Button onClick={handleVote} disabled={!selectedOption} className="w-full text-md h-12">
              Submit Vote
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}