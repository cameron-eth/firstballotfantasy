# Auth & Database Structure Fix

## Problem
The current system has a disconnect between Supabase auth users and the `user_profiles` table. The `user_profiles` table was using the Supabase user ID as the primary key instead of properly linking via the `auth_id` field.

## Solution
We've implemented a proper user profile system that:

1. **Creates user profiles automatically** when users sign up
2. **Links profiles to auth users** via the `auth_id` field
3. **Uses proper UUIDs** for profile IDs
4. **Integrates with Stripe subscriptions** using the auth_id

## Database Schema

### user_profiles table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  sleeper_username TEXT,
  favorite_team TEXT,
  sleeper_league_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### subscriptions table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'incomplete',
  plan_type TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### user_league_access table
```sql
CREATE TABLE user_league_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL REFERENCES auth.users(id),
  sleeper_league_id TEXT NOT NULL,
  league_name TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(auth_id, sleeper_league_id)
);
```

## Implementation Steps

### 1. Run Database Migration
Execute the SQL script in `scripts/migrate-user-profiles.sql` in your Supabase SQL editor.

### 2. Update Environment Variables
Make sure your `.env` file has the correct Stripe keys:
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Create Stripe Products
In your Stripe dashboard, create:
- **Product**: "First Ballot Fantasy Pro"
- **Monthly Price**: $7/month (price_monthly)
- **Yearly Price**: $15/year (price_yearly)

Update the price IDs in `lib/stripe.ts`:
```typescript
export const STRIPE_PRODUCTS = {
  PRO_MONTHLY: 'price_1RopRTF1Alb6tCwHlOy7xdBz', // Your actual monthly price ID
  PRO_YEARLY: 'price_yearly', // Your actual yearly price ID
} as const;
```

### 4. Set Up Webhooks
In your Stripe dashboard, create a webhook endpoint:
- **URL**: `https://yourdomain.com/api/webhooks/stripe`
- **Events**: 
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`

Update the webhook secret in your `.env` file.

## How It Works

### User Registration Flow
1. User signs up with email/password
2. Supabase creates auth user
3. Auth system automatically creates user profile
4. Profile is linked to auth user via `auth_id`

### Subscription Flow
1. User visits `/billing` page
2. System checks subscription status using `auth_id`
3. User clicks subscribe → Stripe Checkout
4. Webhook updates subscription status
5. User gets access based on subscription

### League Access Control
- **Free users**: Can connect 1 league (stored in `user_league_access` with `is_primary = true`)
- **Pro users**: Can connect unlimited leagues
- Access is controlled via `LeagueAccessService.hasActiveSubscription(authId)`

## Testing

### 1. Test User Registration
```bash
# Start the development server
bun run dev

# Visit http://localhost:3000/login
# Create a new account
# Check that user profile is created in database
```

### 2. Test Subscription Flow
```bash
# Sign in with test account
# Visit http://localhost:3000/billing
# Try subscribing with test card: 4242 4242 4242 4242
# Verify subscription is created in database
```

### 3. Test Webhooks (Local)
```bash
# Install Stripe CLI
# Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy webhook secret to .env
```

## Files Modified

### New Files
- `lib/user-profile-service.ts` - User profile management
- `lib/stripe.ts` - Stripe server configuration
- `lib/stripe-client.ts` - Stripe client configuration
- `lib/subscription-service.ts` - Subscription management
- `hooks/use-subscription.ts` - React hook for subscriptions
- `app/billing/page.tsx` - Billing page
- `app/api/billing/*` - Billing API routes
- `app/api/webhooks/stripe/route.ts` - Webhook handler

### Modified Files
- `lib/auth.tsx` - Auto-create profiles on signup
- `app/api/user-profile/route.ts` - Use new service
- `components/header.tsx` - Added billing link

## Security Features

1. **Row Level Security (RLS)** - Users can only access their own data
2. **Foreign Key Constraints** - Ensures data integrity
3. **Webhook Signature Verification** - Prevents webhook spoofing
4. **Auth Guards** - Protect subscription-only features

## Next Steps

1. **Test thoroughly** with existing users
2. **Migrate existing data** if needed
3. **Set up monitoring** for subscription events
4. **Add analytics** for conversion tracking
5. **Implement league access control** in League Buddy and Draft Buddy 