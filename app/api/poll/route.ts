import { NextResponse } from 'next/server';

declare global {
  var activePoll: {
    id: string;
    quizName: string;
    isOffline: boolean;
    isAnonymous: boolean;
    showResultsMode: 'live' | 'on_command' | 'hidden';
    resultsTriggered: boolean; // Used if showResultsMode is 'on_command'
    question: string;
    type: 'multiple-choice' | 'scale';
    scaleMax: number; // 5 or 10
    options: string[];
    votes: Record<string, { answer: string | number; name?: string; rollNo?: string }>;
  } | null;
}

if (!global.activePoll) {
  global.activePoll = {
    id: 'default-poll',
    quizName: 'Untitled Quiz',
    isOffline: false,
    isAnonymous: true,
    showResultsMode: 'live',
    resultsTriggered: false,
    question: 'Waiting for instructor to start a poll...',
    type: 'multiple-choice',
    scaleMax: 5,
    options: ['Yes', 'No'],
    votes: {},
  };
}

export async function GET() {
  return NextResponse.json(global.activePoll);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  if (body.action === 'vote') {
    if (global.activePoll && !global.activePoll.isOffline) {
      global.activePoll.votes[body.identifier] = {
        answer: body.answer,
        name: body.name,
        rollNo: body.rollNo
      };
    }
    return NextResponse.json({ success: true, poll: global.activePoll });
  }

  if (body.action === 'trigger_results') {
    if (global.activePoll) global.activePoll.resultsTriggered = true;
    return NextResponse.json({ success: true, poll: global.activePoll });
  }

  // Create or update broadcast
  global.activePoll = {
    id: Math.random().toString(36).substring(2, 9),
    quizName: body.quizName || 'Untitled Quiz',
    isOffline: body.isOffline || false,
    isAnonymous: body.isAnonymous ?? true,
    showResultsMode: body.showResultsMode || 'live',
    resultsTriggered: false,
    question: body.question,
    type: body.type || 'multiple-choice',
    scaleMax: body.scaleMax || 5,
    options: body.options || [],
    votes: {},
  };

  return NextResponse.json(global.activePoll);
}