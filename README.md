# Baby Tracker

[English](./README.md) | [中文](./README_CN.md)

A voice-first, cross-platform (iOS + Android) baby growth journal app. Helps new parents quickly log daily baby care activities (feeding, diaper changes, sleep, temperature, etc.) with AI-powered voice input, daily summaries, growth trend charts, and parent messages.

## Features

- **Voice-first input** - Say it once, log multiple records. AI (LLM) parses natural language into structured entries
- **Comprehensive tracking** - Formula/breast feeding, poop, pee, sleep, bath, temperature, weight, jaundice, daily notes
- **Daily summary** - At-a-glance view of all baby care activities for the day
- **Growth statistics** - Feeding trends, weight curves, sleep patterns, jaundice tracking with charts
- **Family collaboration** - Invite family members via invite code, everyone sees the same data
- **Parent messages** - Leave text or audio messages for your baby (time capsule)
- **Photo journal** - Attach photos to records or messages

## Tech Stack

```
Frontend (Mobile App)          Backend (API Server)
---------------------          --------------------
React Native (Expo)            Fastify + TypeScript
Expo Router (file routing)     Prisma ORM
expo-speech-recognition        PostgreSQL
expo-audio                     JWT Authentication
Zustand (state)                OpenAI-compatible LLM API
TypeScript                     sharp (image processing)
```

## Project Structure

```
baby-tracker/
  baby-tracker-app/          # Mobile app (Expo + React Native)
    app/                     # Screens (Expo Router file-based routing)
      (auth)/                # Login / Register
      (tabs)/                # Main tabs: Home, Stats, Messages, Profile
      baby/                  # Create / Join baby
      record/                # Manual record & voice confirm
    components/              # Reusable UI components
    services/                # API client modules
    stores/                  # Zustand state management
    hooks/                   # Custom hooks (speech, audio)
    types/                   # TypeScript type definitions

  baby-tracker-server/       # Backend API server
    src/
      routes/                # REST API routes (auth, babies, records, stats, messages, photos)
      middleware/             # JWT auth & baby access control
      services/              # LLM parsing, file storage, image processing
      lib/                   # Shared Prisma client
    prisma/                  # Database schema
    tests/                   # Integration & E2E tests (Vitest)
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Backend Setup

```bash
cd baby-tracker-server
cp .env.example .env
# Edit .env with your database URL and API keys

pnpm install
pnpm exec prisma db push
pnpm dev
```

The server runs on `http://localhost:3001` by default.

### Environment Variables (Backend)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for access token signing |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing |
| `OPENAI_API_KEY` | API key for LLM voice parsing |
| `OPENAI_BASE_URL` | LLM API base URL (OpenAI-compatible) |
| `UPLOAD_DIR` | File upload directory (default: `./uploads`) |
| `PORT` | Server port (default: `3001`) |

### App Setup

```bash
cd baby-tracker-app
pnpm install
pnpm start          # Start Expo dev server
pnpm ios            # Run on iOS simulator
pnpm android        # Run on Android emulator
```

> **Note**: The app connects to `http://localhost:3001` in development. If testing on a physical device, update the base URL in `services/api.ts`.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/babies` | Create baby profile |
| GET | `/api/babies` | List user's babies |
| PUT | `/api/babies/:id` | Update baby info |
| POST | `/api/babies/:id/invite` | Generate invite code |
| POST | `/api/babies/join` | Join via invite code |
| POST | `/api/babies/:babyId/records` | Create record |
| GET | `/api/babies/:babyId/records` | Query records (optional `?date=`) |
| GET | `/api/babies/:babyId/records/summary` | Daily summary |
| PUT | `/api/records/:id` | Update record |
| DELETE | `/api/records/:id` | Delete record |
| POST | `/api/babies/:babyId/records/voice` | Parse text via LLM (preview) |
| POST | `/api/babies/:babyId/records/voice/confirm` | Confirm & save parsed records |
| GET | `/api/babies/:babyId/stats/feeding` | Feeding statistics |
| GET | `/api/babies/:babyId/stats/weight` | Weight curve |
| GET | `/api/babies/:babyId/stats/sleep` | Sleep patterns |
| GET | `/api/babies/:babyId/stats/jaundice` | Jaundice trend |
| POST | `/api/babies/:babyId/messages` | Create message (multipart) |
| GET | `/api/babies/:babyId/messages` | List messages |
| POST | `/api/babies/:babyId/photos` | Upload photo |
| GET | `/api/babies/:babyId/photos` | List photos |

## Testing

### Backend Tests

```bash
cd baby-tracker-server
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm vitest run tests/records.test.ts   # Run specific test file
```

The test suite includes 128 tests covering:
- Auth (registration, login, token refresh, edge cases)
- Baby management (CRUD, invite/join flow)
- Records (all 10 record types, CRUD, daily summary)
- Statistics (feeding, weight, sleep, jaundice aggregation)
- Voice parsing (LLM integration with mocks)
- Messages & Photos (multipart upload, access control)
- E2E workflows (full family collaboration scenarios)
- Access control (member isolation, auth enforcement)

## License

MIT
