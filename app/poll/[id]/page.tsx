"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function PollPage({ params }: { params: { id: string } }) {
  const [selectedOption, setSelectedOption] = useState<string>("");

  const handleVote = async () => {
    // TODO: Connect to your Next.js API route here
    console.log("Voted for:", selectedOption);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">What is your preferred UI framework?</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="gap-4">
            {["shadcn/ui", "Material UI", "Chakra UI"].map((option) => (
              <div key={option} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="flex-grow cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button onClick={handleVote} disabled={!selectedOption} className="w-full text-md h-12">
            Submit Vote
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}