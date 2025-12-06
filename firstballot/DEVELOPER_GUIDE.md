# FirstBallotFF Developer Guide

## Project Overview

FirstBallotFF is a comprehensive fantasy football analytics platform built with Next.js 15, providing advanced tools for draft analysis, league management, trade evaluation, and player insights.

## Getting Started

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/cameron-eth/firstballotfantasy.git

# 2. Navigate to project directory
cd FIRSTBALLOTFF/firstballotfantasy/firstballot

# 3. Install dependencies
bun install

# 4. Start development server
bun dev
```

### Git Workflow for Changes

```bash
# 1. Create feature branch from target branch (main)
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. Make your changes, then commit
git add .
git commit -m "your commit message"
git push origin feature/your-feature-name

# 3. Create Pull Request
# - Go to GitHub and create PR from feature/your-feature-name → main
# - Request code review before merging
```

### Additional Commands (Optional)

```bash
# Build for production
bun run build

# Lint code
bun run lint

# Type check
bun run type-check
```

## Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **State Management**: React Hooks (useState, useContext)

### Backend & Services

- **Runtime**: Bun (development)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **External APIs**: Sleeper API (fantasy football data)
- **Caching**: Custom in-memory cache + Next.js cache
- **Deployment**: Vercel

### Key Dependencies

```json
{
  "next": "15.2.4",
  "react": "^19",
  "typescript": "^5",
  "@supabase/supabase-js": "latest",
  "stripe": "^18.5.0",
  "tailwindcss": "^3.4.17",
  "lucide-react": "^0.454.0"
}
```

## Project Structure

```
firstballotfantasy/firstballot/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── billing/              # Stripe billing endpoints
│   │   ├── webhooks/stripe/      # Stripe webhooks
│   │   ├── user-profile/         # User management
│   │   └── [feature]/            # Feature-specific APIs
│   ├── league-buddy/             # Main league analysis tool
│   ├── draft-buddy/              # Live draft analysis
│   ├── trade-market/             # Trade evaluation
│   ├── scouting-portal/          # Player scouting
│   ├── billing/                  # Subscription management
│   ├── charts/                   # Data visualizations
│   ├── insights/                 # Analytics insights
│   └── page.tsx                  # Landing page
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   ├── LeagueBuddy.tsx           # Main league component
│   ├── DraftAnalysis.tsx         # Draft analysis
│   ├── TradeMarket.tsx           # Trade evaluation
│   └── [feature-components]/
├── lib/                          # Core utilities
│   ├── auth.tsx                  # Authentication context
│   ├── supabase.ts               # Supabase client
│   ├── stripe.ts                 # Stripe server
│   ├── sleeper-api.ts            # External API integration
│   ├── cache-utils.ts            # Caching utilities
│   └── [feature-utils]/
├── hooks/                        # Custom React hooks
│   ├── use-membership.ts         # Membership status
│   ├── use-subscription.ts       # Stripe subscriptions
│   └── use-mobile.tsx            # Mobile detection
└── data/                         # Static data
    └── rankings.ts               # Player rankings
```

## Authentication Flow

### Overview

The app uses **Supabase Auth** with email/password authentication and custom user profiles.

### Auth Architecture

```typescript
// 1. Auth Context Provider (lib/auth.tsx)
const AuthContext = createContext<AuthContextType>()

// 2. User Profile Service (lib/user-profile-service.ts)
class UserProfileService {
  static async createProfile(authId: string, email: string, username: string)
  static async hasActiveMembership(authId: string, email?: string)
}

// 3. Membership Hook (hooks/use-membership.ts)
export function useMembership(): MembershipStatus
```

### Authentication Process

1. **Sign Up**: User creates account → Supabase Auth → User Profile created
2. **Sign In**: Email/password → Supabase session → Auth context updated
3. **Session Management**: Auto-refresh tokens, persistent sessions
4. **Profile Sync**: Auth ID linked to user profile in database

### Protected Routes

```typescript
// Use AuthGuard component for protected pages
<AuthGuard fallback={<LoginPrompt />}>
  <ProtectedContent />
</AuthGuard>

// Or use useAuth hook
const { user, loading } = useAuth()
if (!user) return <LoginPage />
```

## Subscription & Billing

### Stripe Integration

- **Payment Links**: Personalized checkout URLs
- **Webhooks**: Automatic membership updates
- **Subscription Management**: Self-service portal

### Membership Tiers

- **Free**: 1 league connection, basic features
- **Pro Monthly**: $7/month, unlimited access
- **Pro Yearly**: $15/year, all features + 2 months free

### Implementation

```typescript
// Check membership status
const { isMember, canAccessLeague } = useMembershipCheck()

// Create payment link
const paymentLink = await StripePaymentLinks.createPersonalizedLink(user.email, 'monthly')
```

## Core Features

### 1. League Buddy (`/league-buddy`)

**Main league analysis and management tool**

**Key Components:**

- `LeagueBuddy.tsx` - Main component (1,628 lines)
- League overview dashboard
- Team rankings with tier system (Powerhouse/Contender/Pretender/Rebuilder)
- Detailed team analysis tabs (Roster, Trends, Power Ranking, Analysis, Projections)
- Transaction tracking
- Position-based rankings

**Data Sources:**

- Sleeper API for league/roster data
- Custom player rankings
- Real-time transaction data

### 2. Draft Buddy (`/draft-buddy`)

**Live draft analysis and recommendations**

**Features:**

- Real-time draft board
- Player tier analysis
- Pick value calculations
- Draft grade tracking
- Team roster building

### 3. Trade Market (`/trade-market`)

**Advanced trade evaluation and analysis**

**Features:**

- Player value calculations
- Trade analysis with win/loss tracking
- Market trends
- Trade recommendations
- Historical trade data

### 4. Scouting Portal (`/scouting-portal`)

**Player research and prospect analysis**

**Features:**

- Prospect database
- Player comparisons
- Draft board integration
- Tier-based player organization

## Data Flow & APIs

### External APIs

```typescript
// Sleeper API Integration (lib/sleeper-api.ts)
class SleeperAPI {
  async getLeagues(username: string)
  async getLeagueRosters(leagueId: string)
  async getLeagueMatchups(leagueId: string, week: number)
  async getTrendingPlayers()
}
```

### Caching Strategy

```typescript
// Multi-layer caching (lib/cache-utils.ts)
const cacheUtils = {
  set: (key: string, data: any, ttl?: number) => void
  get: (key: string) => any
  clear: () => void
}

// Next.js caching for API routes
export const revalidate = 300 // 5 minutes
```

### Database Schema (Supabase)

```sql
-- Core tables
user_profiles (id, auth_id, email, username, membership_status)
league_data (league_id, user_id, data, cached_at)
player_rankings (player_name, rank, position, tier)
```

## UI/UX Patterns

### Design System

- **Colors**: Slate backgrounds, Yellow accents, Green success, Red danger
- **Typography**: Mono font for headers, Sans for body
- **Components**: Consistent card layouts, badge systems, hover effects

### Key UI Components

```typescript
// Reusable patterns
<Card className="bg-slate-800 border-slate-700">
<Badge variant="outline" className="bg-yellow-400/20 text-yellow-400">
<Button className="bg-yellow-400 text-black hover:bg-yellow-300">
```

### Responsive Design

- Mobile-first approach
- Collapsible navigation
- Touch-friendly controls
- Optimized table layouts

## Development Workflow

### Environment Variables

```bash
# Required environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_STRIPE_SECRET_KEY=your_stripe_secret
NEXT_STRIPE_PUBLISHABLE_KEY=your_stripe_public
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_BASE_URL=your_app_url
```

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Next.js
- **Prettier**: Auto-formatting
- **File Naming**: kebab-case for files, PascalCase for components

## Testing & Debugging

### Development Tools

- **React DevTools**: Component inspection
- **Supabase Dashboard**: Database management
- **Stripe Dashboard**: Payment testing
- **Vercel Analytics**: Performance monitoring

### Common Debug Patterns

```typescript
// Logging with context
console.log('Debug info:', { user, league, data })

// Error boundaries
try {
  // risky operation
} catch (error) {
  console.error('Operation failed:', error)
  return fallbackValue
}
```

## Deployment

### Vercel Deployment

- **Platform**: Vercel (recommended)
- **Build Command**: `bun run build`
- **Environment**: Production variables required
- **Domain**: Custom domain configured

### Performance Optimizations

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Caching**: Multi-layer caching strategy
- **Bundle Analysis**: Regular bundle size monitoring

## Key Utilities & Helpers

### Cache Management

```typescript
// lib/cache-utils.ts
export const cacheUtils = {
  set: (key: string, data: any, ttl?: number) => void
  get: (key: string) => any
  clear: () => void
}
```

### API Utilities

```typescript
// lib/nextjs-cache.ts
export const sleeperApi = {
  getLeagueRosters: (leagueId: string) => Promise<any[]>
  getLeagueMatchups: (leagueId: string, week: number) => Promise<any[]>
}
```

### Type Definitions

```typescript
// Key interfaces
interface TeamData {
  rosterId: number
  teamName: string
  players: PlayerData[]
  grade: string
  // ... more fields
}

interface PlayerData {
  playerId: string
  playerName: string
  position: string
  rank: number
  tier: string
}
```

## Common Issues & Solutions

### 1. Supabase Connection Issues

```typescript
// Check environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL')
}
```

### 2. Stripe Webhook Verification

```typescript
// Verify webhook signature
const sig = headers['stripe-signature']
const event = stripe.webhooks.constructEvent(body, sig, secret)
```

### 3. Sleeper API Rate Limits

```typescript
// Implement caching and rate limiting
const cachedData = await cacheUtils.get(`sleeper:${leagueId}`)
if (cachedData) return cachedData
```

## Additional Resources

### Documentation Links

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe API](https://stripe.com/docs/api)
- [Sleeper API](https://docs.sleeper.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)

