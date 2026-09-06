"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InstructorDashboard() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('quiz_templates')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });
      
      setTemplates(data || []);
    }
    setIsLoading(false);
  };

  const createTemplate = async () => {
    if (!newTemplateName) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase.from('quiz_templates').insert({
        instructor_id: user.id,
        title: newTemplateName
      });
      
      if (error) alert(error.message);
      else {
        setNewTemplateName("");
        fetchTemplates();
      }
    }
  };

  const startLiveSession = async (templateId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('sessions').insert({
      template_id: templateId,
      instructor_id: user.id,
      status: 'live'
    }).select().single();

    if (error) alert(error.message);
    else {
      // Redirect to a dedicated Studio view for this session
      window.location.href = `/instructor/studio/${data.id}`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 min-h-screen">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Instructor Command Center</h1>
          <p className="text-muted-foreground mt-2">Manage your teaching modules and live sessions.</p>
        </div>
        <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}>
          Sign Out
        </Button>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="library">Quiz Library</TabsTrigger>
          <TabsTrigger value="studio">Live Studio</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Create New Module</CardTitle></CardHeader>
            <CardContent className="flex gap-4">
              <Input 
                placeholder="e.g., Contract Law: Module 1" 
                value={newTemplateName} 
                onChange={(e) => setNewTemplateName(e.target.value)} 
              />
              <Button onClick={createTemplate}>Create</Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? <p>Loading templates...</p> : templates.map(template => (
              <Card key={template.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{template.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button variant="secondary" className="w-full" onClick={() => window.location.href = `/instructor/template/${template.id}`}>
                    Edit Questions
                  </Button>
                  <Button className="w-full" onClick={() => startLiveSession(template.id)}>
                    Launch Live
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="studio">
          <Card>
            <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Select a template from the Library to launch a new session, or rejoin an active one here.</p>
              {/* Active sessions list will be populated here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Past Sessions & Analytics</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Historical data and student performance metrics will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}