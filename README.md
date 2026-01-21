# Lightning League - Quiz Game MVP

A competitive quiz game platform built with React, TypeScript, and Firebase.

## Features

### Authentication & User Management
- **Role-based access**: Coach and Student accounts
- **Team assignment**: Students belong to teams managed by coaches
- **Secure authentication**: Firebase Authentication with email/password

### Gameplay Modes

#### Practice Mode
- Students practice independently
- Choose subject area and number of questions
- Word-by-word question reveal
- Performance tracking stored in Firestore

#### Match Mode
- Server-authoritative buzzer system
- Real-time match state synchronization
- Timed hesitation logic
- Scoring and results tracking

### Question Management
- **Question Editor**: Create, edit, delete questions
- **Public/Private pools**: Control question visibility
- **Date-range filtering**: Filter questions by import year
- **CSV Import**: Bulk import questions
- **Subject categorization**: SS, SC, LA, MA, AH

### Analytics & Dashboards

#### Coach Dashboard
- Team performance overview
- Student analytics with graphs
- Accuracy by subject category
- Buzz-time and hesitation trends
- Match history visualization

#### Student Dashboard
- Personal performance metrics
- Practice and match history
- Best subjects identification
- Historical results with charts

### Leaderboards
- Team-based rankings
- Metrics: Accuracy, Buzz Time, Wins, High Scores
- Auto-updating based on recent matches

### Match History
- Per-student and per-team tracking
- Timestamp, categories, scores
- List and graph visualizations
- Detailed match statistics

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
project/
├── src/
│   ├── components/          # React components
│   ├── context/            # React contexts (Auth, Game)
│   ├── services/           # Firebase services
│   ├── types/              # TypeScript types
│   ├── config/             # Firebase configuration
│   └── App.tsx             # Main app component
├── functions/              # Cloud Functions
│   └── index.js            # Server-side logic
├── firestore.rules          # Security rules
├── firestore.indexes.json   # Database indexes
└── firebase.json            # Firebase configuration
```

## Getting Started

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed setup guide.

Quick start:

1. **Install dependencies:**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. **Set up Firebase:**
   - Create Firebase project
   - Enable Authentication, Firestore, Functions
   - Copy config to `.env` file

3. **Deploy Firebase resources:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,functions
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file with:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Firebase Collections

- `users` - User accounts (coaches and students)
- `teams` - Team information
- `players` - Player statistics
- `questions` - Question bank
- `games` - Active game sessions
- `matchHistory` - Completed match records
- `leaderboards` - Team rankings
- `settings` - Game configuration
- `matchStates` - Real-time match state

## Cloud Functions

- `arbitrateBuzzer` - First-to-buzz arbitration
- `createMatch` - Match creation logic
- `writeMatchStats` - Stats writing
- `calculateLeaderboard` - Leaderboard calculations
- `commitQuestionEdit` - Question editor with access control

## Development

```bash
# Run dev server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

## Deployment

```bash
# Build and deploy
npm run build
firebase deploy
```

## License

Private project - All rights reserved





