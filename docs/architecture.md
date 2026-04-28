# Architecture

Video Driven Skill is split into a Spring Boot backend and a React frontend. The two services communicate through REST APIs for ordinary operations and WebSocket/SSE channels for long-running generation and execution logs.

## Core Flow

```text
video upload
  -> frame extraction
  -> annotation and requirement
  -> multimodal skill generation
  -> code review and editing
  -> local runner
  -> export, deploy, or regenerate
```

## Backend

The backend owns persistence, file storage, model calls, video processing, and skill execution.

Important modules:

- `controller/`: REST and WebSocket entry points.
- `service/VideoService.java`: upload handling, FFmpeg frame extraction, and video streaming.
- `service/AIService.java`: prompt construction and OpenAI-compatible multimodal API calls.
- `service/SkillService.java`: skill CRUD, import/export, ordering, regeneration, and versioning.
- `service/SkillRunnerService.java`: temporary workspace creation, dependency setup, runtime injection, script execution, and log collection.
- `service/KnowledgeService.java`: per-skill reference files and manifest handling.
- `model/` and `repository/`: SQLite-backed domain records.

Runtime data defaults to `~/video-driven-skill/`:

- `uploads/`: uploaded videos and extracted frames.
- `skills/`: generated skill source files.
- `archives/`: reusable video/frame/requirement resources.
- `video-driven-skill.db`: SQLite database.

## Frontend

The frontend is a Vite application that provides a studio-like workflow:

- `HomePage.jsx`: upload, import, and recent resources.
- `PlaygroundPage.jsx`: frame annotation and skill workspace layout.
- `FrameTimeline.jsx`, `FrameAnnotator.jsx`, `FrameList.jsx`: visual evidence collection.
- `AIProcessor.jsx`: generation control and streamed status.
- `SkillList.jsx`: skill repository with manual drag ordering.
- `SkillEditor.jsx`, `SkillExport.jsx`, `SkillRunner.jsx`: review, export, and execution.
- `RegeneratePanel.jsx`, `PartialRegeneratePanel.jsx`, `CodeComparisonView.jsx`: iteration workflow.
- `KnowledgeBasePanel.jsx`: extra context attached to a skill.

## Skill Package Shape

A generated skill is a small folder that can be exported as ZIP:

```text
SKILL.md
package.json
variables.json
scripts/main.js
knowledge/
```

`SKILL.md` explains the skill intent and variables. `scripts/main.js` is the executable entrypoint. `variables.json` defines user-editable runtime inputs.

## Model Provider

The backend expects an OpenAI-compatible chat completions API. Configure it with:

```bash
AI_API_KEY=...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Providers with compatible request and response shapes can be used by overriding `AI_BASE_URL` and `AI_MODEL`.

## Security Boundaries

The project is local-first by default, but recordings and generated scripts can contain sensitive information. Keep these files out of version control:

- `.env`
- SQLite databases
- uploaded videos
- extracted frames
- generated skills
- logs
- build outputs
- dependency folders
