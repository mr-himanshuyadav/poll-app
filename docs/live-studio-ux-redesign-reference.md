# Live Studio UX Redesign Reference

## Purpose
This document is the source of truth for the incremental redesign of Live Studio.

## Product principle
Increase functional capability while reducing visible complexity.

Live Studio is an operational control room, not a collection of independent cards. The instructor must understand the current state and take the next action within seconds.

## Core design rules
1. Design around decisions and state, not features.
2. Keep one obvious primary action for the current context.
3. Use progressive disclosure for secondary and rare actions.
4. Merge related data into shared workspaces rather than adding a new card per metric.
5. Preserve context while exploring data.
6. Projector content has one source of truth and only one primary display at a time.
7. Students, projector and instructor state must always be understandable.
8. Filters and views should scale functionality without permanently increasing UI density.
9. Reuse existing components and business logic where possible.
10. Every implementation step must be independently testable and reversible.

## Current architecture
- LiveQuestionWorkspace: main operational workspace.
- ResponseProgressPanel: participation metrics.
- ResponseDistribution: multiple response visualizations.
- QuestionNavigation: in-context navigation and queue.
- QuestionsWorkspace: creation, editing, search and organization.
- LiveStudioPage: orchestration and session state.

## UX audit findings
### Operational information is fragmented
Question state, response progress, response distribution and navigation are separate components, although they support the same operational decision.

Recommendation: progressively consolidate them into a shared Live Response Workspace.

### Metrics should become views
Response count, response rate, waiting participants, distribution and participant detail should share one area.

Recommended views:
- Overview
- Distribution
- Participants
- Activity

### Navigation and context overlap
Fast previous/next navigation should remain close to the current question. Full queue access should be contextual rather than visually dominant.

### Presentation awareness
The instructor should always know what students and the projector see through a compact persistent status system.

## Target information architecture
### Layer 1 — Control status
Current/viewed question, student state, projector state, live status.

### Layer 2 — Primary action
One contextual action such as Display to Students, Close Question, Show Results or Replace Display.

### Layer 3 — Response workspace
Views:
- Overview: response count, rate, waiting, recent activity
- Distribution: chart and visualization selection
- Participants: responded/waiting
- Activity: response events

### Layer 4 — Deep actions
Dialogs, menus, drawers and dedicated tabs:
- edit
- add
- advanced settings
- historical analysis
- comparison

## Implementation sequence
### Phase A — Audit and consolidation
A1. Map layout and duplicate information.
A2. Introduce shared response workspace shell without removing functionality.
A3. Move overview metrics into it.
A4. Integrate distribution as a workspace view.

### Phase B — Navigation and filtering
B1. Add response views.
B2. Participant filters: All, Responded, Waiting.
B3. Activity view.
B4. Refine contextual queue access.

### Phase C — Presentation awareness
C1. Compact student/projector status.
C2. Standardize display-changing confirmations.
C3. Improve transition feedback.

### Phase D — Data exploration
D1. Question/session scope controls.
D2. Historical data views.
D3. Comparison-ready architecture.

### Phase E — Polish
E1. Loading and empty states.
E2. Motion and transitions.
E3. Responsive density.
E4. Accessibility and keyboard behavior.

## Non-goals
- Do not change database schema unless required.
- Do not rewrite working live/projector logic during layout changes.
- Do not add duplicate sources of truth.
- Do not create a card for every new metric.
- Do not combine unrelated changes in one step.

## Test protocol
1. Build succeeds in Vercel Preview.
2. Live question flow still works.
3. Replacing a live question closes the previous one.
4. Student/projector states remain correct.
5. Results visibility remains correct.
6. Realtime responses update.
7. Test zero, partial and full responses.
8. No hydration or nested-button errors.
9. Test desktop and narrower layouts.

## Design rationale
The redesign uses a decision-first, layered dashboard model with progressive disclosure: overview for rapid scanning, contextual exploration, and details on demand. This reduces cognitive load without reducing capability. citeturn0search1turn0search2turn0search7
