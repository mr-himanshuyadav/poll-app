"use client";
import { useState, useEffect, use } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";

export default function ProjectorPage({ params }: { params: any }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const quizId = resolvedParams.id;

  const [quiz, setQuiz] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    if (!quizId) return;

    const fetchInitialData = async () => {
      const { data: qz } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (qz) {
        setQuiz(qz);
        if (qz.active_question_id) fetchQuestion(qz.active_question_id);
      }
    };
    fetchInitialData();

    // Listen for quiz setting changes / new questions
    const quizSub = supabase.channel(`proj-quiz-${quizId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${quizId}` }, 
      (payload) => {
        setQuiz(payload.new);
        if (payload.new.active_question_id !== quiz?.active_question_id) {
          fetchQuestion(payload.new.active_question_id);
        }
      }).subscribe();

    return () => { supabase.removeChannel(quizSub); };
  }, [quizId, quiz?.active_question_id]);

  const fetchQuestion = async (questionId: string) => {
    const { data } = await supabase.from('questions').select('*').eq('id', questionId).single();
    if (data) {
      setQuestion(data);
      fetchResponses(questionId);
    }
  };

  const fetchResponses = async (questionId: string) => {
    const { data } = await supabase.from('responses').select('answer').eq('question_id', questionId);
    setResponses(data || []);
    
    // Subscribe to new incoming answers
    supabase.channel(`proj-resp-${questionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses', filter: `question_id=eq.${questionId}` },
      (payload) => setResponses((prev) => [...prev, payload.new])
    ).subscribe();
  };

  if (!quiz) return <div className="flex h-screen items-center justify-center text-2xl font-bold">Waiting for instructor...</div>;

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/poll/${quizId}`;
  
  // Calculate tally for progress bars
  const totalVotes = responses.length;
  const tally = question?.options.reduce((acc: any, option: string) => {
    acc[option] = responses.filter(r => r.answer === option).length;
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar with QR */}
      <div className="w-1/3 bg-white dark:bg-slate-900 border-r p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-xl">
        <h2 className="text-3xl font-extrabold">{quiz.name}</h2>
        <p className="text-lg text-muted-foreground">Scan to join the live session</p>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <QRCodeSVG value={joinUrl} size={250} />
        </div>
        {quiz.is_offline && (
          <div className="mt-4 px-6 py-2 bg-yellow-100 text-yellow-800 rounded-full font-bold animate-pulse">
            Poll is Paused
          </div>
        )}
      </div>

      {/* Main Presentation Area */}
      <div className="w-2/3 p-12 flex flex-col justify-center">
        {question ? (
          <div className="max-w-4xl w-full mx-auto space-y-12">
            <h1 className="text-5xl font-bold leading-tight">{question.text}</h1>
            
            <div className="space-y-6">
              {question.options.map((option: string) => {
                const count = tally[option] || 0;
                const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
                return (
                  <div key={option} className="space-y-2">
                    <div className="flex justify-between text-2xl font-semibold">
                      <span>{option}</span>
                      <span>{percentage}% ({count})</span>
                    </div>
                    <Progress value={percentage} className="h-6" />
                  </div>
                );
              })}
            </div>
            <div className="text-right text-xl text-muted-foreground font-medium pt-8">
              Total Responses: {totalVotes}
            </div>
          </div>
        ) : (
          <div className="text-center text-4xl font-semibold text-muted-foreground">
            Session is active. Waiting for the next question...
          </div>
        )}
      </div>
    </div>
  );
}