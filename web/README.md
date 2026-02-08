# Spendabo Web Frontend

Mobile-first web application for Spendabo expense tracking.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix-based)
- **State Management**: SWR + React Context
- **Authentication**: Firebase Auth SDK
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
cd web
npm install
```

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Type Checking

```bash
npm run type-check
```

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Home redirect
│   ├── (auth)/               # Auth pages (login, signup)
│   └── (dashboard)/          # Protected dashboard pages
├── components/
│   ├── ui/                   # Base UI components (shadcn/ui)
│   └── layout/               # Layout components (nav, sidebar)
├── lib/
│   ├── api/                  # API client
│   ├── firebase/             # Firebase configuration
│   ├── contexts/             # React contexts
│   └── utils.ts              # Utility functions
├── styles/
│   └── globals.css           # Global styles + Tailwind
└── types/                    # TypeScript types
```

## Features

- **Authentication**: Email/password and Google sign-in
- **Dashboard**: Monthly spending overview
- **Transactions**: List, filter, and categorize transactions
- **Import**: Upload CSV, PDF, or receipt images
- **Rules**: Auto-categorization rules management
- **Categories**: View spending by category

## Mobile-First Design

- Bottom navigation on mobile
- Sidebar navigation on desktop
- Touch-friendly targets (min 44x44px)
- Responsive layouts using Tailwind breakpoints

## Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User enters credentials
       ▼
┌─────────────────────┐
│  Identity Platform  │
└──────┬──────────────┘
       │
       │ 2. Returns JWT token
       ▼
┌─────────────┐
│   Browser   │ (stores token)
└──────┬──────┘
       │
       │ 3. API request with Authorization: Bearer <JWT>
       ▼
┌─────────────────────┐
│  Cloud Run Backend  │
└─────────────────────┘
```
