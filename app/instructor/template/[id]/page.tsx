"use client";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TemplateEditor({ params }: { params: any }) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const templateId = resolvedParams.id;

  const [template, setTemplate] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "mcq",
    options: "",
    scaleMax: 5
  });

  useEffect(() => {
    fetchTemplateData();
  }, [templateId]);

  const fetchTemplateData = async () => {
    const { data: tData } = await supabase.from('quiz_templates').select('*').eq('id', templateId).single();
    if (tData) setTemplate(tData);

    const { data: qData } = await supabase.from('questions').select('*').eq('template_id', templateId).order('created_at', { ascending: true });
    if (qData) setQuestions(qData);
  };

  const handleAddQuestion = async () => {
    setIsAdding(true);
    const parsedOptions = newQuestion.type === 'mcq' 
      ? newQuestion.options.split(',').map(o => o.trim())
      : Array.from({ length: newQuestion.scaleMax }, (_, i) => (i + 1).toString());

    const { error } = await supabase.from('questions').insert({
      template_id: templateId,
      text: newQuestion.text,
      type: newQuestion.type === 'mcq' ? 'mcq' : (newQuestion.scaleMax === 10 ? 'scale_10' : 'scale_5'),
      options: parsedOptions
    });

    if (error) {
      alert(error.message);
    } else {
      setNewQuestion({ text: "", type: "mcq", options: "", scaleMax: 5 });
      fetchTemplateData();
    }
    setIsAdding(false);
  };

  if (!template) return <div className="p-8 font-bold">Loading Editor...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">{template.title}</h1>
          <p className="text-muted-foreground">Draft and organize questions for this module.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/instructor'}>
          Back to Hub
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Questions ({questions.length})</h2>
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardContent className="p-4 flex flex-col space-y-2">
              <span className="font-medium text-lg">Q{index + 1}: {q.text}</span>
              <div className="text-sm text-muted-foreground flex gap-2 flex-wrap">
                {q.options.map((opt: string, i: number) => (
                  <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{opt}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Add New Question</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Input 
              placeholder="e.g., What is an essential element of a valid contract?" 
              value={newQuestion.text} 
              onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={newQuestion.type} onValueChange={(v) => setNewQuestion({...newQuestion, type: v as string})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {newQuestion.type === 'mcq' ? (
            <div className="space-y-2">
              <Label>Options (Comma separated)</Label>
              <Input 
                placeholder="Offer, Acceptance, Consideration, All of the above" 
                value={newQuestion.options} 
                onChange={(e) => setNewQuestion({...newQuestion, options: e.target.value})} 
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Scale Range</Label>
              <Select value={newQuestion.scaleMax.toString()} onValueChange={(v) => setNewQuestion({...newQuestion, scaleMax: parseInt(v as string, 10)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">1 to 5</SelectItem>
                  <SelectItem value="10">1 to 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="w-full" onClick={handleAddQuestion} disabled={isAdding || !newQuestion.text}>
            {isAdding ? "Saving..." : "Save Question to Template"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}