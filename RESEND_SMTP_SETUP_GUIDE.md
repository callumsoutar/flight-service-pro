# Resend SMTP Setup Guide for Supabase Auth

This guide walks you through configuring Resend as your SMTP provider for Supabase authentication emails, removing the 2 emails/hour rate limit and making your application production-ready.

## Prerequisites

Before starting, ensure you have:

- [x] Resend account created
- [x] Domain verified in Resend dashboard
- [x] Resend API key (already set as `RESEND_API_KEY` environment variable)
- [ ] Access to Supabase project dashboard
- [ ] Verified sender email domain in Resend

## Step 1: Verify Resend Domain Setup

1. Log in to [Resend Dashboard](https://resend.com/domains)
2. Verify your domain is listed and shows "Verified" status
3. Note the email address you'll use as sender (e.g., `no-reply@yourdomain.com`)

## Step 2: Configure Supabase SMTP Settings

### Navigate to SMTP Settings

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **fergmobsjyucucxeumvb** (Aero Safety)
3. Go to **Project Settings** (bottom left gear icon)
4. Click **Authentication** in the left sidebar
5. Scroll down to **SMTP Settings** section

### Configure SMTP

Enter the following settings exactly:

```
Enable Custom SMTP: [Toggle ON]

Sender Details:
  Sender Email: [Your verified email from Resend]
                Example: no-reply@yourdomain.com
  Sender Name: Aero Safety
               (or Flight Desk Pro - choose your preferred branding)

SMTP Configuration:
  SMTP Host: smtp.resend.com
  SMTP Port: 465
  SMTP User: resend
  SMTP Password: [Your RESEND_API_KEY value]
                 (Same API key you use for transactional emails)
```

### Important Notes

- **Port 465**: Uses SSL/TLS encryption by default
- **SMTP User**: Always `resend` (not your email address)
- **SMTP Password**: Your Resend API key (treat as sensitive)

### Save Configuration

1. Click **Save** button at the bottom of the SMTP Settings section
2. Wait for the success confirmation message
3. The warning about built-in email service should disappear

## Step 3: Customize Email Templates (Recommended)

### Navigate to Email Templates

1. In Supabase Dashboard, go to **Authentication** (left sidebar)
2. Click **Email Templates** tab
3. You'll see templates for: Confirm signup, Invite user, Magic link, Change email, Reset password

### Template Customization Guidelines

For each template, maintain the required Supabase placeholders while customizing the content:

#### Required Placeholders (DO NOT REMOVE):
- `{{ .ConfirmationURL }}` - For confirmation links
- `{{ .Token }}` - For verification tokens
- `{{ .TokenHash }}` - For token hashes
- `{{ .SiteURL }}` - Your application URL
- `{{ .Email }}` - User's email address

#### Customization Example: Confirm Signup

```html
<h2>Welcome to Aero Safety!</h2>

<p>Thank you for signing up. Please confirm your email address by clicking the link below:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>If you did not sign up for this account, you can safely ignore this email.</p>

<p>This link will expire in 24 hours.</p>

<hr>
<p style="font-size: 12px; color: #666;">
  Aero Safety - Comprehensive Safety Management System<br>
  Need help? Contact us at support@yourdomain.com
</p>
```

#### Customization Example: Reset Password

```html
<h2>Password Reset Request</h2>

<p>We received a request to reset your password for your Aero Safety account.</p>

<p><a href="{{ .ConfirmationURL }}">Reset your password</a></p>

<p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>

<p>This link will expire in 1 hour.</p>

<hr>
<p style="font-size: 12px; color: #666;">
  Aero Safety - Comprehensive Safety Management System<br>
  Need help? Contact us at support@yourdomain.com
</p>
```

### Branding Consistency

- Use consistent colors, fonts, and styling with your application
- Include your logo (if desired)
- Add footer with company info and support contact
- Keep language clear and professional (aviation context)
- Ensure mobile-responsive design

### Save Each Template

After editing each template, click **Save** to apply changes.

## Step 4: Configure Rate Limits (Optional)

Now that custom SMTP is enabled, you can adjust rate limits:

### Navigate to Rate Limits

1. In Supabase Dashboard, go to **Authentication**
2. Click **Rate Limits** tab

### Recommended Settings for Production

```
Email Rate Limits:
  Emails per hour: 360 (default after custom SMTP)
                   Adjust based on expected signup volume

OTP Rate Limits:
  OTPs per hour: 360 (default)
  
Request Intervals:
  Minimum interval between requests: 60 seconds (default)
                                     Can reduce to 30s if needed

Anonymous Sign-ins:
  Per IP per hour: 30 (default)
```

### Considerations

- **Launch Events**: If expecting high signup volume (e.g., product launch), increase limits temporarily
- **Normal Operations**: Default limits (360/hour) should be sufficient for most applications
- **Monitoring**: Monitor actual usage via Resend dashboard to adjust as needed

## Step 5: Testing

Test all authentication flows to ensure proper email delivery:

### Test Checklist

#### 1. User Signup Flow
- [ ] Create a new test user account
- [ ] Check that confirmation email arrives within 1-2 minutes
- [ ] Verify email sender shows your custom domain
- [ ] Click confirmation link and verify it works
- [ ] Check that user is successfully confirmed in Supabase

#### 2. Password Reset Flow
- [ ] Request a password reset for test user
- [ ] Check that reset email arrives promptly
- [ ] Verify email content and branding
- [ ] Click reset link and verify it redirects correctly
- [ ] Complete password reset successfully

#### 3. Magic Link Flow (if enabled)
- [ ] Request a magic link login
- [ ] Check that magic link email arrives
- [ ] Verify email formatting and content
- [ ] Click magic link and verify authentication works

#### 4. Change Email Flow (if supported)
- [ ] Initiate email change for test user
- [ ] Verify confirmation emails sent to both old and new addresses
- [ ] Complete email change successfully

### Monitoring Email Delivery

1. **Resend Dashboard**: Check [Resend Emails](https://resend.com/emails) for delivery status
2. **Supabase Logs**: Monitor authentication logs for any SMTP errors
3. **Test Multiple Email Providers**: Test with Gmail, Outlook, etc. to verify deliverability

### Troubleshooting Common Issues

#### Emails Not Arriving

1. Check spam/junk folders
2. Verify domain is fully verified in Resend
3. Check Resend dashboard for bounce/error messages
4. Verify SMTP credentials are correct in Supabase
5. Check Supabase logs for SMTP connection errors

#### Links Not Working

1. Verify `{{ .ConfirmationURL }}` placeholder is present in template
2. Check that Site URL is correctly configured in Supabase Auth settings
3. Test on different email clients (some scan links)

#### Rate Limit Issues

1. Check current rate limit settings in Supabase
2. Review Resend dashboard for any rate limiting
3. Adjust limits if needed for your use case

## Step 6: Post-Configuration Monitoring

### Ongoing Monitoring Tasks

1. **Weekly**: Review email delivery rates in Resend dashboard
2. **Weekly**: Check for any bounces or failed deliveries
3. **Monthly**: Review rate limits vs actual usage
4. **Monthly**: Test authentication flows to ensure continued functionality

### Set Up Alerts (Recommended)

In Resend dashboard:
- Enable notifications for delivery failures
- Set up alerts for unusual bounce rates
- Monitor for spam complaints

### Security Considerations

- **Link Scanning**: Enterprise email systems may scan links before delivery
  - Consider implementing click-to-reveal pattern for sensitive links
  - Monitor for pre-clicked confirmation links
  
- **Email Security**: 
  - Ensure SPF, DKIM, DMARC records are properly configured in Resend
  - Regularly review email authentication reports
  
- **Rate Limiting**:
  - Keep monitoring enabled to detect abuse attempts
  - Adjust rate limits if seeing automated attacks

## Verification Checklist

Before considering this complete, verify:

- [x] SMTP configuration saved in Supabase
- [ ] Test user signup confirmation email received and working
- [ ] Test password reset email received and working
- [ ] Email templates customized (optional but recommended)
- [ ] Rate limits reviewed and adjusted if needed
- [ ] Documentation updated for your team
- [ ] Monitoring set up in Resend dashboard

## Architecture Notes

### Separation of Concerns

Your application now uses Resend for two distinct purposes:

1. **Supabase Auth Emails** (via SMTP):
   - Signup confirmations
   - Password resets
   - Magic links
   - Email changes
   - Configured in: Supabase Dashboard > Authentication > SMTP Settings

2. **Application Transactional Emails** (via Resend API):
   - Booking confirmations/cancellations
   - Invoice emails
   - Debrief reports
   - Configured in: `src/lib/email/resend-client.ts`

Both use the same Resend account and API key, but route through different systems.

### No Code Changes Required

The existing codebase in `src/lib/email/resend-client.ts` continues to work unchanged. This setup only affects Supabase Auth's email delivery mechanism.

## Production Readiness

After completing this setup, you've addressed the Supabase Production Checklist requirement:

> ✅ "Use your own SMTP credentials so that you have full control over the deliverability of your transactional auth emails"

You can now:
- Remove the rate limit warning from your Supabase dashboard
- Send authentication emails at production volumes
- Monitor email delivery through Resend
- Customize email branding for professional appearance

## Support Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Auth SMTP Guide](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- Your Resend Dashboard: https://resend.com/emails
- Your Supabase Project: https://supabase.com/dashboard/project/fergmobsjyucucxeumvb

## Next Steps

After completing this setup:

1. Review other Production Checklist items:
   - Enable RLS on all tables
   - Enable SSL Enforcement
   - Set up MFA enforcement
   - Configure network restrictions
   
2. Consider implementing:
   - Email deliverability monitoring dashboard
   - Automated alerts for email failures
   - A/B testing for email templates
   - Email engagement analytics

## Questions or Issues?

If you encounter any problems during setup:

1. Check the Troubleshooting section above
2. Review Resend dashboard for delivery errors
3. Check Supabase logs under Logs > Auth Logs
4. Verify all credentials and settings are correct

---

**Last Updated**: October 10, 2025  
**Project**: Aero Safety / Flight Desk Pro  
**Supabase Project ID**: fergmobsjyucucxeumvb

