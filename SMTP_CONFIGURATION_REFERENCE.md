# Quick Reference: Resend SMTP Configuration for Supabase

## SMTP Settings (Copy-Paste Ready)

Use these exact values when configuring Supabase SMTP:

```
Enable Custom SMTP: ON

Sender Email: [YOUR_VERIFIED_EMAIL]
Sender Name: Aero Safety

SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP User: resend
SMTP Password: [YOUR_RESEND_API_KEY]
```

## Where to Find Values

| Setting | Where to Find |
|---------|---------------|
| Sender Email | Your verified domain in Resend (e.g., `no-reply@yourdomain.com`) |
| SMTP Password | Same value as your `RESEND_API_KEY` environment variable |

## Configuration Location

**Supabase Dashboard Path**:
```
Dashboard → Project: fergmobsjyucucxeumvb → Settings → Authentication → SMTP Settings
```

## Required Placeholders in Email Templates

When customizing email templates, ensure these placeholders remain intact:

| Template | Required Placeholder |
|----------|---------------------|
| Confirm Signup | `{{ .ConfirmationURL }}` |
| Reset Password | `{{ .ConfirmationURL }}` |
| Magic Link | `{{ .ConfirmationURL }}` |
| Change Email | `{{ .ConfirmationURL }}`, `{{ .Email }}` |
| Invite User | `{{ .ConfirmationURL }}` |

## Testing Commands

After configuration, test with these scenarios:

```bash
# Test 1: New User Signup
# Navigate to your app's signup page and create a test user
# Expected: Confirmation email arrives within 1-2 minutes

# Test 2: Password Reset
# Use the "Forgot Password" flow with a test account
# Expected: Reset email arrives promptly

# Test 3: Check Resend Dashboard
# Visit: https://resend.com/emails
# Expected: See the sent emails with "Delivered" status
```

## Rate Limits After Custom SMTP

Default limits (can be adjusted in Supabase Auth → Rate Limits):

- **Emails per hour**: 360 (up from 2 with built-in service)
- **OTPs per hour**: 360
- **Minimum request interval**: 60 seconds
- **Anonymous sign-ins per IP**: 30 per hour

## Verification Checklist

- [ ] Domain verified in Resend
- [ ] SMTP settings saved in Supabase (no errors)
- [ ] Warning banner removed from Supabase Auth page
- [ ] Test signup email received and link works
- [ ] Test password reset email received and link works
- [ ] Sender email shows your custom domain (not supabase.co)
- [ ] Email templates customized (optional)
- [ ] Rate limits reviewed and adjusted if needed

## Common Mistakes to Avoid

1. ❌ Using email address as SMTP User (must be `resend`)
2. ❌ Using wrong port (must be `465`, not `587` or `25`)
3. ❌ Domain not verified in Resend
4. ❌ Removing required placeholders from templates
5. ❌ Not testing after configuration

## Support Links

- Resend Dashboard: https://resend.com/dashboard
- Resend Emails Log: https://resend.com/emails
- Resend Domains: https://resend.com/domains
- Supabase Project: https://supabase.com/dashboard/project/fergmobsjyucucxeumvb
- Supabase Auth Settings: https://supabase.com/dashboard/project/fergmobsjyucucxeumvb/settings/auth

---

**Quick Setup Time**: ~10 minutes  
**Testing Time**: ~5 minutes  
**Total Time**: ~15 minutes

