import type { Participant } from "@/lib/types";

export function getAnonymousParticipantNumber(participant: Participant, participants: Participant[]): number {
  const anonymous = participants.filter((item) => item.is_anonymous).sort((a, b) => {
    const time = new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    return time || a.id.localeCompare(b.id);
  });
  const index = anonymous.findIndex((item) => item.id === participant.id);
  return index >= 0 ? index + 1 : 1;
}

export function getParticipantDisplayName(participant: Participant, participants: Participant[]): string {
  if (!participant.is_anonymous) return participant.name?.trim() || "Participant";
  return `Anonymous ${getAnonymousParticipantNumber(participant, participants)}`;
}
