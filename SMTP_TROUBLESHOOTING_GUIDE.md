# SMTP & Email Troubleshooting Guide

Common issues and solutions when using Resend SMTP with Supabase authentication emails.

## Quick Diagnostics

### Check SMTP Configuration Status

1. **Supabase Dashboard**
   - Navigate to: Project Settings → Authentication → SMTP Settings
   - Verify "Enable Custom SMTP" is toggled **ON**
   - Check that all fields are populated correctly

2. **Resend Dashboard**
   - Visit: https://resend.com/domains
   - Verify domain status shows **"Verified"**
   - Check: https://resend.com/emails for recent email activity

3. **Test Email Flow**
   - Trigger a password reset or new signup
   - Check Resend dashboard within 1-2 minutes
   - Look for email in "Emails" tab with "Delivered" status

---

## Common Issues & Solutions

### Issue 1: Emails Not Being Sent

**Symptoms:**
- No emails arriving (not even in spam)
- No activity in Resend dashboard
- Users not receiving confirmation/reset emails

**Possible Causes & Solutions:**

#### A. SMTP Not Enabled in Supabase
```
Solution:
1. Go to Supabase Dashboard → Settings → Authentication → SMTP Settings
2. Verify "Enable Custom SMTP" toggle is ON
3. If OFF, toggle it ON and save
4. Wait 1-2 minutes for changes to propagate
5. Test again
```

#### B. Incorrect SMTP Credentials
```
Check these values:
- SMTP Host: Must be exactly "smtp.resend.com" (no http://)
- SMTP Port: Must be "465" (not 587 or 25)
- SMTP User: Must be exactly "resend" (lowercase, not your email)
- SMTP Password: Must be your Resend API key (starts with "re_")

Fix:
1. Verify your Resend API key is correct
2. Re-enter credentials in Supabase SMTP Settings
3. Click Save
4. Test again
```

#### C. Domain Not Verified in Resend
```
Check:
1. Go to Resend Dashboard → Domains
2. Find your domain in the list
3. Status must show "Verified" (green checkmark)

If Not Verified:
1. Click on your domain
2. Follow DNS record setup instructions
3. Add required TXT, MX, and CNAME records to your DNS provider
4. Wait 5-60 minutes for DNS propagation
5. Click "Verify" button in Resend
6. Once verified, test email flow again
```

---

### Issue 2: Emails Going to Spam

**Symptoms:**
- Emails arrive but in spam/junk folder
- Low deliverability rate in Resend dashboard

**Solutions:**

#### A. Configure Email Authentication Records
```
Required DNS Records (in Resend → Domains → Your Domain):

1. SPF Record (TXT):
   - Authorizes Resend to send on your behalf
   
2. DKIM Record (TXT):
   - Cryptographic signature for email authentication
   
3. DMARC Record (TXT):
   - Policy for handling failed authentication

Action:
1. Go to Resend Dashboard → Domains → [Your Domain]
2. Copy each DNS record
3. Add all records to your DNS provider
4. Wait for DNS propagation (up to 24 hours)
5. Verify all records show "Verified" in Resend
```

#### B. Improve Email Content
```
Check your email templates for spam triggers:
- Avoid ALL CAPS in subject lines
- Don't use excessive exclamation marks!!!
- Keep text-to-image ratio high (more text than images)
- Avoid words like "FREE", "URGENT", "ACT NOW"
- Include unsubscribe link (for marketing, not required for auth)
- Use proper HTML structure

Action:
1. Review email templates in Supabase → Authentication → Email Templates
2. Simplify content and remove spam trigger words
3. Test emails with mail-tester.com for spam score
```

#### C. Sender Reputation
```
New domains/IPs have low sender reputation:
- Warm up your domain gradually
- Start with low volume, increase over time
- Monitor bounce rates and spam complaints

Action:
1. Monitor email deliverability in Resend dashboard
2. Check for bounces and spam reports
3. Gradually increase sending volume over 2-4 weeks
```

---

### Issue 3: Email Links Not Working

**Symptoms:**
- Email arrives but confirmation/reset link is broken
- Link leads to error page
- Link shows "Token expired" immediately

**Solutions:**

#### A. Site URL Misconfiguration
```
Check:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Verify "Site URL" matches your production URL exactly
3. Must include protocol: https://yourdomain.com (no trailing slash)

Fix:
1. Update Site URL in Supabase Auth settings
2. Add any redirect URLs to the allowed list
3. Save changes
4. Test with new email
```

#### B. Missing Template Placeholders
```
Email templates must include Supabase placeholders:
- {{ .ConfirmationURL }} - for all confirmation/reset links
- {{ .Token }} - for token-based auth
- {{ .Email }} - for displaying user's email

Check:
1. Go to Supabase → Authentication → Email Templates
2. Verify {{ .ConfirmationURL }} exists in template
3. Ensure placeholder is not modified or wrapped incorrectly
4. Should be in href attribute: <a href="{{ .ConfirmationURL }}">

Fix:
1. Review email template HTML
2. Ensure placeholder is present and unmodified
3. Save template
4. Test with new email
```

#### C. Email Link Scanning by Enterprise Systems
```
Some enterprise email systems scan links before delivery:
- This can "use up" single-use confirmation links
- User sees "Token expired" when they click

Solutions:
1. Increase token expiry time in Supabase settings
2. Implement click-to-reveal pattern for sensitive links
3. Add notice in email: "Click within X hours"

Action:
1. Go to Supabase → Authentication → Auth Providers → Email
2. Adjust token expiry (e.g., from 1 hour to 24 hours)
3. Update email template to mention expiry time
```

---

### Issue 4: High Email Bounce Rate

**Symptoms:**
- Many emails showing "Bounced" in Resend dashboard
- Error messages about invalid recipients

**Types of Bounces:**

#### A. Hard Bounces (Permanent)
```
Causes:
- Email address doesn't exist
- Domain doesn't exist
- Recipient blocked sender

Action:
1. Review bounced emails in Resend dashboard
2. Remove invalid email addresses from user database
3. Implement email validation on signup form
4. Consider email verification service
```

#### B. Soft Bounces (Temporary)
```
Causes:
- Mailbox full
- Temporary server issues
- Message too large

Action:
1. Resend will automatically retry soft bounces
2. Monitor in Resend dashboard
3. If persistent, contact recipient through alternative means
```

---

### Issue 5: Rate Limiting Issues

**Symptoms:**
- Error: "Rate limit exceeded"
- Emails stop sending after certain volume
- Some users not receiving emails during high-traffic periods

**Solutions:**

#### A. Check Supabase Rate Limits
```
Action:
1. Go to Supabase Dashboard → Authentication → Rate Limits
2. Review current limits:
   - Emails per hour (default: 360 after custom SMTP)
   - OTPs per hour (default: 360)
   - Request interval (default: 60 seconds)
3. Adjust if needed for your use case
4. Save changes
```

#### B. Check Resend Rate Limits
```
Action:
1. Review your Resend plan limits
2. Check: https://resend.com/pricing
3. Monitor usage in Resend dashboard
4. Upgrade plan if consistently hitting limits
5. Contact Resend support for temporary increases
```

#### C. Implement Backoff Strategy
```
In your application:
1. Handle rate limit errors gracefully
2. Show user-friendly message
3. Implement retry mechanism with exponential backoff
4. Queue emails during high-traffic periods
```

---

### Issue 6: Emails Delayed

**Symptoms:**
- Emails arrive but with significant delay (5+ minutes)
- Inconsistent delivery times

**Solutions:**

#### A. Check Resend Status
```
Action:
1. Visit: https://status.resend.com
2. Check for any ongoing incidents or delays
3. Subscribe to status updates
4. If widespread issue, wait for resolution
```

#### B. DNS Issues
```
Check:
1. Verify all DNS records are properly configured
2. Check DNS propagation: https://dnschecker.org
3. Ensure no DNS caching issues
4. Verify MX records are correct

Action:
1. Use DNS lookup tools to verify records
2. Clear DNS cache if needed
3. Wait for full DNS propagation (up to 48 hours)
```

#### C. Email Queue Backlog
```
If you sent large batch of emails:
1. Resend processes emails in queue
2. Large batches may take time
3. Monitor progress in Resend dashboard

Action:
1. Implement rate limiting in your application
2. Spread out bulk emails over time
3. Use Resend's batch API for large volumes
```

---

### Issue 7: Testing & Development Issues

**Symptoms:**
- Emails work in production but not locally
- Can't test email flows in development

**Solutions:**

#### A. Local Development Testing
```
Options:

1. Use Supabase Local Development:
   - Run Supabase locally with Docker
   - Configure local SMTP (MailHog, Mailpit)
   
2. Use Test Email Addresses:
   - Resend allows test mode emails
   - Use your own verified email for testing
   
3. Use Email Testing Services:
   - Mailtrap.io for dev/staging
   - Ethereal Email for quick tests
```

#### B. Staging Environment
```
Best Practice:
1. Create separate Supabase project for staging
2. Configure Resend SMTP for staging
3. Use test subdomain (staging.yourdomain.com)
4. Test all email flows before production deploy

Setup:
1. Clone production Supabase project settings
2. Create staging environment in Vercel
3. Configure staging-specific env vars
4. Add staging domain to Resend
```

---

## Diagnostic Tools

### Email Testing Tools

1. **Mail-Tester** (https://www.mail-tester.com)
   - Test spam score of your emails
   - Check authentication records (SPF, DKIM, DMARC)
   - Get deliverability recommendations

2. **MXToolbox** (https://mxtoolbox.com)
   - Check DNS records
   - Verify email server configuration
   - Blacklist monitoring

3. **DNS Checker** (https://dnschecker.org)
   - Verify DNS propagation
   - Check records globally
   - Troubleshoot DNS issues

### Monitoring Commands

```bash
# Check DNS records
dig yourdomain.com MX
dig _dmarc.yourdomain.com TXT
dig yourdomain.com TXT

# Test SMTP connection (from terminal)
telnet smtp.resend.com 465
# Should connect successfully

# Check domain verification
curl -X GET https://api.resend.com/domains \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Step-by-Step Diagnostic Procedure

### When Emails Aren't Working

**Step 1: Verify SMTP Configuration**
```
□ Supabase SMTP enabled and saved
□ All credentials entered correctly
□ No typos in SMTP host, port, user
□ Resend API key is valid
```

**Step 2: Check Domain Status**
```
□ Domain shows "Verified" in Resend
□ All DNS records added and verified
□ DNS propagation completed
□ No domain expiration issues
```

**Step 3: Test Email Flow**
```
□ Trigger test email (signup/reset)
□ Check Resend dashboard for activity
□ Verify email in inbox (or spam)
□ Test email link functionality
```

**Step 4: Review Logs**
```
□ Check Supabase logs (Logs → Auth Logs)
□ Look for SMTP connection errors
□ Check Resend dashboard for errors
□ Review browser console for frontend errors
```

**Step 5: Verify Rate Limits**
```
□ Check current usage vs limits
□ Verify no rate limit errors in logs
□ Confirm limits appropriate for traffic
□ Consider increasing if needed
```

**Step 6: Test from Different Locations**
```
□ Test with different email providers (Gmail, Outlook, etc.)
□ Test from different networks/IPs
□ Test in private/incognito browser
□ Check spam folders on all providers
```

---

## Getting Help

### Before Contacting Support

Gather this information:

1. **Error Details**
   - Exact error message
   - When it started occurring
   - Frequency (every time, intermittent)
   - Affected email addresses/domains

2. **Configuration Details**
   - Supabase project ID: fergmobsjyucucxeumvb
   - Resend domain being used
   - Current SMTP settings (without password)
   - Recent configuration changes

3. **Logs**
   - Supabase auth logs (relevant excerpt)
   - Resend dashboard activity/errors
   - Browser console errors (if frontend issue)

### Support Contacts

**Resend Support**
- Dashboard: https://resend.com/support
- Documentation: https://resend.com/docs
- Discord: Available for real-time help

**Supabase Support**
- Dashboard: https://supabase.com/dashboard (support tab)
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: For bugs/feature requests

**Community Help**
- Supabase Discord (fastest response)
- Stack Overflow (tag: supabase, resend)
- GitHub Discussions

---

## Preventive Maintenance

### Weekly Checks
- [ ] Review email delivery rates in Resend dashboard
- [ ] Check for any bounced emails
- [ ] Verify no spam complaints
- [ ] Monitor rate limit usage

### Monthly Checks
- [ ] Review and optimize email templates
- [ ] Check domain/DNS record status
- [ ] Test all email flows (signup, reset, etc.)
- [ ] Review deliverability metrics

### Quarterly Checks
- [ ] Audit SMTP configuration
- [ ] Review security settings
- [ ] Update email templates if needed
- [ ] Test disaster recovery procedures

---

## Common Error Messages

### "SMTP connection failed"
**Meaning**: Supabase cannot connect to Resend SMTP server  
**Fix**: Verify SMTP host is `smtp.resend.com` and port is `465`

### "Authentication failed"
**Meaning**: SMTP credentials are incorrect  
**Fix**: Verify SMTP user is `resend` and password is your valid API key

### "Sender address rejected"
**Meaning**: Sender email address is not verified in Resend  
**Fix**: Verify domain in Resend dashboard or use verified email

### "Rate limit exceeded"
**Meaning**: Too many requests in short time period  
**Fix**: Review and adjust rate limits in Supabase Auth settings

### "Domain not found"
**Meaning**: Email domain doesn't exist or DNS not configured  
**Fix**: Verify DNS records and domain configuration in Resend

---

## Related Documentation

- [SMTP Setup Guide](./RESEND_SMTP_SETUP_GUIDE.md) - Initial configuration
- [SMTP Quick Reference](./SMTP_CONFIGURATION_REFERENCE.md) - Configuration values
- [Email Templates](./email-templates/supabase-auth-templates.md) - Template examples
- [Production Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Pre-launch verification

---

**Last Updated**: October 10, 2025  
**Project**: Aero Safety / Flight Desk Pro  
**For**: Development and Operations Teams

