# **🔧 WEBHOOK SETUP GUIDE**

## **🎯 Overview**

This guide will help you configure Stripe webhooks to work with our payment system. Webhooks are essential for automatically updating user membership status when payments are successful.

## **📋 Prerequisites**

- Stripe account with test mode enabled
- Access to Stripe Dashboard
- Your application deployed and accessible via HTTPS
- Environment variables configured

## **🚀 Step-by-Step Setup**

### **Step 1: Configure Environment Variables**

Ensure these environment variables are set in your `.env` file:

```bash
# Stripe Configuration
NEXT_STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Application Configuration
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### **Step 2: Set Up Webhook Endpoint in Stripe Dashboard**

1. **Log into Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Ensure you're in **Test Mode** (toggle in top right)

2. **Navigate to Webhooks**
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**

3. **Configure Endpoint**
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
   - **Events to send**: Select the following events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.trial_will_end`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.created`

4. **Save Configuration**
   - Click **Add endpoint**
   - Copy the **Signing secret** (starts with `whsec_`)
   - Update your `STRIPE_WEBHOOK_SECRET` environment variable

### **Step 3: Test Webhook Configuration**

#### **Option A: Using Stripe CLI (Recommended)**

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Local Development**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy Webhook Secret**
   - The CLI will output a webhook secret
   - Update your `STRIPE_WEBHOOK_SECRET` environment variable

#### **Option B: Using Stripe Dashboard**

1. **Go to Webhook Details**
   - Click on your webhook endpoint
   - Go to **Events** tab

2. **Send Test Event**
   - Click **Send test webhook**
   - Select `checkout.session.completed`
   - Click **Send test webhook**

3. **Check Response**
   - Verify the webhook was received successfully
   - Check your application logs for processing

### **Step 4: Verify Webhook Processing**

1. **Check Application Logs**
   - Look for webhook processing logs
   - Verify events are being handled correctly

2. **Test Payment Flow**
   - Make a test payment using Payment Links
   - Verify user membership status is updated
   - Check database for membership changes

## **🔍 Troubleshooting**

### **Common Issues**

#### **1. Webhook Signature Verification Failed**
```
Error: Webhook signature verification failed
```
**Solution:**
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify the webhook secret matches the one in Stripe Dashboard
- Check that the webhook endpoint URL is correct

#### **2. No Webhook Events Received**
```
No webhook events in logs
```
**Solution:**
- Verify webhook endpoint is accessible via HTTPS
- Check that events are configured in Stripe Dashboard
- Ensure webhook endpoint URL is correct

#### **3. Payment Success Not Detected**
```
Payment completed but membership not updated
```
**Solution:**
- Check webhook event types are configured correctly
- Verify email extraction logic in webhook handlers
- Check database connection and user profile updates

#### **4. Environment Variable Issues**
```
STRIPE_WEBHOOK_SECRET not configured
```
**Solution:**
- Ensure all environment variables are set
- Restart your application after updating environment variables
- Check for typos in variable names

### **Debugging Steps**

1. **Check Webhook Logs**
   ```bash
   # Look for webhook processing logs
   tail -f your-app-logs.log | grep webhook
   ```

2. **Verify Webhook Endpoint**
   ```bash
   # Test endpoint accessibility
   curl -X POST https://yourdomain.com/api/webhooks/stripe
   ```

3. **Check Stripe Dashboard**
   - Go to **Developers** → **Webhooks**
   - Check **Events** tab for delivery status
   - Look for failed deliveries and error messages

## **📊 Monitoring**

### **Key Metrics to Monitor**

1. **Webhook Delivery Rate**
   - Should be >99% successful deliveries
   - Monitor failed deliveries in Stripe Dashboard

2. **Processing Time**
   - Webhook processing should complete within 5 seconds
   - Monitor for timeouts or slow processing

3. **Error Rate**
   - Should be <1% error rate
   - Monitor for signature verification failures

### **Log Monitoring**

Look for these log patterns:

```bash
# Successful webhook processing
✅ Webhook signature verified for event: payment_intent.succeeded
✅ Successfully processed payment intent for user@example.com

# Failed webhook processing
❌ Webhook signature verification failed
❌ No customer email found in payment intent
```

## **🔒 Security Considerations**

1. **Webhook Secret**
   - Keep webhook secret secure and private
   - Rotate webhook secrets periodically
   - Never commit secrets to version control

2. **HTTPS Only**
   - Webhook endpoints must use HTTPS
   - Stripe will not send webhooks to HTTP endpoints

3. **Signature Verification**
   - Always verify webhook signatures
   - Never trust webhook data without verification

## **🚀 Production Deployment**

### **Before Going Live**

1. **Switch to Live Mode**
   - Update environment variables to live keys
   - Configure webhook endpoint for production URL
   - Test with live mode webhooks

2. **Update Webhook URL**
   - Change webhook endpoint to production URL
   - Ensure HTTPS is configured correctly
   - Test webhook delivery

3. **Monitor Closely**
   - Watch webhook delivery rates
   - Monitor for any processing errors
   - Set up alerts for webhook failures

## **📞 Support**

If you encounter issues:

1. **Check Stripe Documentation**
   - https://stripe.com/docs/webhooks
   - https://stripe.com/docs/webhooks/signatures

2. **Review Application Logs**
   - Look for detailed error messages
   - Check webhook processing logs

3. **Test with Stripe CLI**
   - Use `stripe listen` for local testing
   - Verify webhook processing locally

4. **Contact Support**
   - Stripe Support: https://support.stripe.com
   - Application Support: Your team's support channel 