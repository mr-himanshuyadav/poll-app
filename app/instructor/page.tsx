"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InstructorDashboard() {
  // Mock data - to be replaced by your real-time database listener
  const results = [
    { name: "shadcn/ui", votes: 45, total: 60 },
    { name: "Material UI", votes: 10, total: 60 },
    { name: "Chakra UI", votes: 5, total: 60 },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Instructor Panel</h1>
        <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1 text-sm">Live Poll Active</Badge>
      </div>
      
      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>What is your preferred UI framework?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {results.map((option) => {
            const percentage = Math.round((option.votes / option.total) * 100) || 0;
            return (
              <div key={option.name} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{option.name}</span>
                  <span className="text-muted-foreground">{percentage}% ({option.votes} votes)</span>
                </div>
                {/* Custom animated progress bar wrapper */}
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}