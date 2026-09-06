"use client";
import { useState, useEffect, use } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function PollPage({ params }: { params: any }) {
  // Unwrap params safely to support both Next.js 14 and 15
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const quizId = resolvedParams.id;

  const [quiz, setQuiz] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [hasVoted, setHasVoted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [participantInfo, setParticipantInfo] = useState({ name: "", rollNo: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!quizId) return;

    const fetchInitialData = async () => {
      try {
        const { data: qz, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
          
        if (error) throw error;
        
        if (qz) {
          setQuiz(qz);
          setIsAuthenticated(qz.is_anonymous);
          if (qz.active_question_id) fetchQuestion(qz.active_question_id);
        }
      } catch (error: any) {
        console.error("Fetch Error:", error);
        setErrorMsg(error.message || "Failed to load quiz from database.");
      }
    };
    
    fetchInitialData();

    const channel = supabase.channel(`quiz-${quizId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${quizId}` }, 
      (payload) => {
        setQuiz(payload.new);
        if (payload.new.active_question_id) {
          fetchQuestion(payload.new.active_question_id);
          setHasVoted(false);
          setSelectedOption("");
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [quizId]); // Dependency loop fixed

  const fetchQuestion = async (questionId: string) => {
    const { data, error } = await supabase.from('questions').select('*').eq('id', questionId).single();
    if (error) console.error("Question Fetch Error:", error);
    if (data) setQuestion(data);
  };

  const handleJoin = async () => {
    if (participantInfo.name && participantInfo.rollNo.length > 0 && participantInfo.rollNo.length <= 2) {
      setIsAuthenticated(true);
    }
  };

  const handleVote = async () => {
    if (!selectedOption || !question || !quiz) return;
    
    const { error } = await supabase.from('responses').insert({
      quiz_id: quiz.id,
      question_id: question.id,
      answer: selectedOption,
    });

    if (error) {
      alert(`Failed to submit vote: ${error.message}`);
      return;
    }
    
    setHasVoted(true);
  };

  if (errorMsg) return <div className="flex min-h-screen items-center justify-center text-red-500 font-bold p-4 text-center">{errorMsg}</div>;
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            {question ? question.text : "Waiting for instructor..."}
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
            <div className="text-center space-y-4">
              <p className="text-green-600 font-semibold text-lg">Response recorded!</p>
              {quiz.show_live_results && (
                <p className="text-sm text-muted-foreground">Look at the main screen for live results.</p>
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