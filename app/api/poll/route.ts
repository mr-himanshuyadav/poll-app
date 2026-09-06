import { NextResponse } from 'next/server';

// Global memory store for serverless live state
declare global {
  var activePoll: {
      id: string;
          question: string;
              type: string;
                      votes: Record<string, any>;
                        } | null;
                        }

                        if (!global.activePoll) {
                          global.activePoll = {
                              id: 'default-poll',
                                  question: 'Waiting for instructor to start a poll...',
                                      type: 'multiple-choice',
                                          options: ['Yes', 'No'],
                                              votes: {},
                                                };
                                                }

                                                export async function GET(request: Request) {
                                                  const { searchParams } = new URL(request.url);
                                                    const id = searchParams.get('id');
                                                      return NextResponse.json(global.activePoll);
                                                      }

                                                      export async function POST(request: Request) {
                                                        const body = await request.json();
                                                          
                                                            if (body.action === 'vote') {
                                                                if (global.activePoll) {
                                                                      global.activePoll.votes[body.identifier] = body.answer;
                                                                          }
                                                                              return NextResponse.json({ success: true, poll: global.activePoll });
                                                                                }

                                                                                  // Create a new poll
                                                                                    global.activePoll = {
                                                                                        id: Math.random().toString(36.substring(2, 9)),
                                                                                            question: body.question,
                                                                                                type: body.type,
                                                                                                    options: body.options || [],
                                                                                                        votes: {},
                                                                                                          };

                                                                                                            return NextResponse.json(global.activePoll);
                                                                                                            }