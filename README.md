# Video Driven Skill

Turn operation recordings into reusable automation skills.

Video Driven Skill is an open-source studio for turning a screen recording into a runnable, editable automation package. Upload a video, extract key frames, annotate intent, let a multimodal model draft the skill, then refine, run, version, archive, and export it.

The project is designed for teams that want automation to start from how work is actually performed, not from a blank script editor.

## What It Does

- Converts operation videos into structured skill packages with `SKILL.md`, `package.json`, scripts, and variables.
- Lets you extract frames automatically or manually, then annotate important UI states and actions.
- Generates browser, Android, iOS, or desktop-oriented automation code through an OpenAI-compatible multimodal API.
- Provides an in-browser code editor, partial regeneration workflow, diff review, prompt templates, and version history.
- Runs generated skills locally with streamed logs and optional screenshots.
- Keeps reusable context in a knowledge base so skills can carry reference images, documents, and notes.
- Archives videos, frames, and requirements so future skills can be built from previous material.

## Why Video Driven

Most automation systems ask users to translate their work into code too early. Video Driven Skill keeps the first input close to reality: a recording of the actual process. The application then turns visual evidence, annotations, and user intent into a skill that can be reviewed like code and reused like a tool.

The workflow is intentionally human-in-the-loop:

1. Record the workflow.
2. Pick the frames that matter.
3. Add annotations and intent.
4. Generate a skill.
5. Review, edit, run, and iterate.
6. Export or deploy the final package.

## Architecture

```text
video-driven-skill/
├── backend/                 # Spring Boot API, video processing, AI orchestration, runner
├── frontend/                # React + Vite workspace UI
├── docs/                    # Open-source documentation
├── start.sh                 # Local development helper
└── kill-midscene.sh         # Optional local cleanup helper
```

Backend responsibilities:

- Video upload and frame extraction through FFmpeg.
- SQLite persistence for skills, archives, templates, versions, and knowledge files.
- Skill generation and regeneration through an OpenAI-compatible API.
- Skill export, import, ordering, versioning, and local runner orchestration.
- WebSocket log streaming for skill runs.

Frontend responsibilities:

- Video upload, playback, timeline, and frame annotation.
- Requirement drafting, prompt templates, and generation controls.
- Skill repository, editor, export panel, runner panel, and regeneration views.
- Archive and knowledge-base management.

See [docs/architecture.md](docs/architecture.md) for a deeper walkthrough.

## Requirements

- Java 17+
- Maven 3.8+
- Node.js 18+
- npm 9+
- FFmpeg available on `PATH`
- An OpenAI-compatible multimodal API key

Install FFmpeg:

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt-get update
sudo apt-get install ffmpeg
```

## Configuration

Create your local environment from the example file:

```bash
cp .env.example .env
```

Required:

```bash
export AI_API_KEY="your_api_key"
```

Optional:

```bash
export AI_BASE_URL="https://api.openai.com/v1"
export AI_MODEL="gpt-4o-mini"
```

The default SQLite database and generated files live under:

```text
~/video-driven-skill/
```

You can override paths in `backend/src/main/resources/application.yml`.

## Quick Start

Run both services:

```bash
./start.sh
```

Or start them separately:

```bash
cd backend
AI_API_KEY="your_api_key" mvn spring-boot:run
```

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:8080
```

## Typical Workflow

1. Upload an operation recording, such as a public demo-site workflow.
2. Extract frames automatically or capture key moments manually.
3. Annotate frames with arrows, notes, and corrections.
4. Describe the goal, for example: "Collect item names from a public demo page and export them."
5. Generate a skill.
6. Review the generated files and variables.
7. Run the skill locally and inspect streamed logs.
8. Regenerate the full skill or only a selected code range if needed.
9. Export the skill ZIP or deploy it into your local skill directory.

## API Overview

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/videos/upload` | Upload a video |
| `POST` | `/api/videos/{id}/frames/auto` | Extract frames automatically |
| `POST` | `/api/videos/{id}/frames/manual` | Capture frames at selected timestamps |
| `GET` | `/api/videos/{id}/stream` | Stream uploaded video |
| `GET` | `/api/skills` | List skills |
| `PUT` | `/api/skills/order` | Persist manual skill ordering |
| `POST` | `/api/skills/generate` | Generate a skill |
| `GET` | `/api/skills/{id}` | Read a skill |
| `PUT` | `/api/skills/{id}/files` | Update a skill file |
| `GET` | `/api/skills/{id}/export` | Export a skill ZIP |
| `POST` | `/api/skills/{id}/regenerate` | Generate a candidate revision |
| `POST` | `/api/skills/{id}/partial-regenerate` | Regenerate a selected code range |
| `POST` | `/api/skills/{id}/accept` | Accept candidate revision |
| `GET` | `/api/skills/{id}/versions` | List skill versions |
| `POST` | `/api/skills/{id}/deploy` | Deploy skill locally |

## Security And Privacy

This repository is prepared for open-source use:

- No API keys are committed.
- Local databases, uploads, archives, generated skills, logs, build outputs, and dependency folders are ignored.
- Runtime configuration should come from environment variables or local files that are not committed.
- Do not upload private recordings, credentials, customer data, personal messages, or production screenshots to a public demo instance.

If you find a security issue, please do not open a public issue with exploit details. See [SECURITY.md](SECURITY.md).

## Development

Backend compile:

```bash
cd backend
mvn -q -DskipTests compile
```

Frontend build:

```bash
cd frontend
npm run build
```

Run status:

```bash
./start.sh status
```

Stop services:

```bash
./start.sh stop
```

## License

MIT. See [LICENSE](LICENSE).
