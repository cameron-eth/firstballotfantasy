# **🚨 WEBHOOK FIX GUIDE - CRITICAL ISSUES RESOLVED**

## **🔴 CRITICAL ISSUES IDENTIFIED**

Your Stripe webhooks aren't working due to **5 critical issues**. Here's how to fix them:

### **Issue #1: Missing Environment Variables ❌**
**Problem**: No Stripe environment variables configured
**Impact**: Webhook signature verification fails immediately

**Fix**: Add these to your `.env` file:
```bash
# Stripe Configuration
NEXT_STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Supabase Configuration  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### **Issue #2: RLS Blocking Webhook Updates ❌**
**Problem**: Row Level Security prevents webhooks from updating database
**Impact**: All database updates fail silently

**Fix**: ✅ **ALREADY FIXED** - Updated UserProfileService to use service role client

### **Issue #3: No Webhook Endpoint in Stripe ❌**
**Problem**: Stripe Dashboard has no webhook endpoint configured
**Impact**: No webhook events are sent to your application

**Fix**: Configure webhook in Stripe Dashboard:

#### **Step 1: Go to Stripe Dashboard**
1. Visit https://dashboard.stripe.com
2. Ensure you're in **Test Mode** (toggle in top right)
3. Go to **Developers** → **Webhooks**

#### **Step 2: Add Endpoint**
1. Click **Add endpoint**
2. **Endpoint URL**: `http://localhost:3000/api/webhooks/stripe` (for local dev)
3. **Events to send**: Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`  
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

#### **Step 3: Get Webhook Secret**
1. After creating the endpoint, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### **Issue #4: Payment Links Event Mismatch ⚠️**
**Problem**: Payment Links trigger different events than subscriptions
**Impact**: Events might not be handled optimally

**Fix**: ✅ **ALREADY FIXED** - Webhook handler supports all Payment Links events

### **Issue #5: Local Development Setup ⚠️**
**Problem**: Need different webhook secrets for local vs production
**Impact**: Local testing fails

**Fix**: Use Stripe CLI for local development:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook secret - use this for `STRIPE_WEBHOOK_SECRET` in local development.

---

## **🚀 TESTING YOUR FIXES**

### **Step 1: Restart Your Application**
```bash
# Stop your dev server (Ctrl+C)
# Then restart
cd firstballotfantasy/firstballot
bun run dev
```

### **Step 2: Test Webhook Endpoint**
```bash
# Test that your webhook endpoint is accessible
curl -X POST http://localhost:3000/api/webhooks/stripe
```

Expected response: `{"error":"No signature provided"}` (this is correct!)

### **Step 3: Test Payment Flow**
1. **Start Stripe CLI**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. **Make Test Payment**: Use your payment links
3. **Check Logs**: Look for webhook processing in your terminal
4. **Verify Database**: Check that `membership_status` is updated

### **Step 4: Expected Log Output**
Look for these logs when payment succeeds:

```bash
✅ Webhook signature verified for event: payment_intent.succeeded
📧 Processing payment for email: user@example.com
🔄 Updating membership status for user@example.com to true
✅ Successfully updated membership status for user@example.com
✅ Successfully processed payment intent for user@example.com
```

---

## **🔍 TROUBLESHOOTING**

### **If Webhook Signature Verification Fails**
```
❌ Webhook signature verification failed
```
**Solutions**:
1. Check `STRIPE_WEBHOOK_SECRET` is set correctly
2. Ensure webhook secret matches Stripe Dashboard
3. Restart application after updating env vars

### **If Database Updates Fail**
```
❌ Failed to process payment intent for user@example.com
```
**Solutions**:
1. Check `SUPABASE_SERVICE_ROLE_KEY` is set
2. Verify user profile exists for the email
3. Check Supabase connection

### **If No Webhook Events Received**
```
No webhook logs appearing
```
**Solutions**:
1. Verify webhook endpoint URL in Stripe Dashboard
2. Check that correct events are selected
3. Use Stripe CLI for local development

### **If Payment Completes But No Database Update**
```
Payment successful but membership_status still false
```
**Solutions**:
1. Check webhook event types in Stripe Dashboard
2. Verify email matches between payment and user profile
3. Check for RLS policy blocking updates

---

## **✅ VERIFICATION CHECKLIST**

- [ ] Environment variables set in `.env` file
- [ ] Stripe webhook endpoint configured with correct URL
- [ ] Webhook events selected in Stripe Dashboard  
- [ ] Webhook secret copied to environment variables
- [ ] Application restarted after env var changes
- [ ] Stripe CLI running for local development
- [ ] Test payment made and webhook logs visible
- [ ] Database `membership_status` updated to `true`
- [ ] User sees "PRO" status in application header

---

## **🎯 NEXT STEPS AFTER FIXES**

1. **Test Payment Flow End-to-End**
   - Make test payment
   - Verify webhook processing
   - Check database updates
   - Confirm UI shows PRO status

2. **Production Deployment**
   - Update webhook URL to production domain
   - Switch to live Stripe keys
   - Test with real payment

3. **Monitoring Setup**
   - Monitor webhook delivery rates in Stripe Dashboard
   - Set up alerts for webhook failures
   - Track membership conversion rates

---

**🚨 CRITICAL**: All 5 issues must be fixed for webhooks to work. Start with environment variables, then Stripe Dashboard configuration, then test with Stripe CLI.