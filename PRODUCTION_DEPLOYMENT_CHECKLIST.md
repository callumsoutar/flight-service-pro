# Production Deployment Checklist

Use this checklist to ensure your Aero Safety application is ready for production deployment.

## Pre-Deployment Setup

### 1. Email Configuration ✅

- [ ] **Resend Account Setup**
  - [ ] Resend account created
  - [ ] Domain verified in Resend dashboard
  - [ ] API key generated and secured
  
- [ ] **Supabase SMTP Configuration** ⭐ **CRITICAL**
  - [ ] Custom SMTP enabled in Supabase
  - [ ] SMTP credentials configured (see [SMTP_CONFIGURATION_REFERENCE.md](./SMTP_CONFIGURATION_REFERENCE.md))
  - [ ] Email templates customized with branding
  - [ ] Rate limits reviewed and adjusted
  - [ ] Test emails sent and verified delivery
  - [ ] **Action**: Follow [RESEND_SMTP_SETUP_GUIDE.md](./RESEND_SMTP_SETUP_GUIDE.md)

- [ ] **Transactional Emails**
  - [ ] `RESEND_API_KEY` environment variable set
  - [ ] `FROM_EMAIL` configured with verified domain
  - [ ] `REPLY_TO_EMAIL` set to support address
  - [ ] Test booking confirmation emails
  - [ ] Test invoice emails

### 2. Supabase Security Configuration

- [ ] **Database Security**
  - [ ] Row Level Security (RLS) enabled on all tables
  - [ ] RLS policies reviewed and tested
  - [ ] SSL enforcement enabled
  - [ ] Network restrictions configured (if needed)
  - [ ] Run Security Advisor in Supabase dashboard

- [ ] **Authentication Settings**
  - [ ] Email confirmations enabled
  - [ ] Password requirements configured
  - [ ] Session timeouts set appropriately
  - [ ] MFA available for users (if required)
  - [ ] Site URL configured correctly
  - [ ] Redirect URLs whitelisted

- [ ] **Account Security**
  - [ ] Supabase account protected with MFA
  - [ ] Multiple owners added to organization
  - [ ] MFA enforcement enabled for organization (if applicable)

### 3. Environment Variables

Verify all required environment variables are set in production:

#### Required Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `FROM_EMAIL`
- [ ] `NEXT_PUBLIC_SITE_URL`

#### Optional Variables
- [ ] `REPLY_TO_EMAIL`
- [ ] `DATABASE_URL` (if using migrations)

### 4. Database Setup

- [ ] **Schema & Migrations**
  - [ ] All migrations applied successfully
  - [ ] Database indexes created for common queries
  - [ ] Foreign key constraints verified
  - [ ] Run Performance Advisor in Supabase

- [ ] **Data Seeding**
  - [ ] Default tax rates created
  - [ ] System roles configured
  - [ ] Initial admin user created
  - [ ] Test data removed

- [ ] **Backups**
  - [ ] Backup strategy configured
  - [ ] Point-in-Time Recovery (PITR) enabled (recommended if DB > 4GB)
  - [ ] Backup restoration tested

### 5. Performance Optimization

- [ ] **Database**
  - [ ] Indexes created for frequent queries
  - [ ] Query performance analyzed with `pg_stat_statements`
  - [ ] Connection pooling configured
  - [ ] Appropriate database size tier selected

- [ ] **Frontend**
  - [ ] Production build tested (`npm run build`)
  - [ ] Images optimized
  - [ ] Unnecessary console logs removed
  - [ ] Source maps configured appropriately

- [ ] **API Routes**
  - [ ] API response times measured
  - [ ] Error handling implemented
  - [ ] Rate limiting considered for public endpoints

### 6. Monitoring & Logging

- [ ] **Supabase**
  - [ ] Subscribed to Supabase Status Page (see [RESEND_SMTP_SETUP_GUIDE.md](./RESEND_SMTP_SETUP_GUIDE.md#subscribe-to-supabase-status-page))
  - [ ] Slack notifications set up for status updates
  - [ ] Database alerts configured

- [ ] **Email Delivery**
  - [ ] Resend dashboard monitoring set up
  - [ ] Email delivery failure alerts configured
  - [ ] Bounce rate monitoring enabled

- [ ] **Application**
  - [ ] Error tracking service integrated (e.g., Sentry)
  - [ ] Analytics configured (if needed)
  - [ ] Uptime monitoring set up

### 7. Testing

- [ ] **Authentication Flows**
  - [ ] User signup → email confirmation → login
  - [ ] Password reset flow
  - [ ] Magic link login (if enabled)
  - [ ] Email change flow
  - [ ] MFA flow (if enabled)

- [ ] **Core Features**
  - [ ] Booking creation and management
  - [ ] Flight authorization workflows
  - [ ] Invoice generation and payment
  - [ ] Credit note creation
  - [ ] Aircraft management
  - [ ] Member management
  - [ ] Debrief submissions

- [ ] **Role-Based Access**
  - [ ] Admin permissions tested
  - [ ] Instructor permissions tested
  - [ ] Student permissions tested
  - [ ] Member permissions tested

- [ ] **Email Notifications**
  - [ ] Booking confirmation emails
  - [ ] Booking cancellation emails
  - [ ] Invoice emails
  - [ ] Debrief report emails
  - [ ] Authentication emails (signup, reset, etc.)

### 8. Security Review

- [ ] **Code Security**
  - [ ] No sensitive data in client-side code
  - [ ] API keys secured (not in client bundle)
  - [ ] Input validation implemented (Zod schemas)
  - [ ] SQL injection prevention (using Supabase client)
  - [ ] XSS prevention measures

- [ ] **Infrastructure**
  - [ ] HTTPS enforced
  - [ ] CORS configured correctly
  - [ ] Security headers configured (CSP, etc.)
  - [ ] Rate limiting implemented where needed

- [ ] **Data Privacy**
  - [ ] GDPR compliance considered
  - [ ] Data retention policies defined
  - [ ] User data export capability (if required)
  - [ ] User data deletion capability

### 9. Documentation

- [ ] **Technical Documentation**
  - [ ] README updated with production setup steps
  - [ ] Environment variables documented
  - [ ] Deployment process documented
  - [ ] Troubleshooting guide created

- [ ] **User Documentation**
  - [ ] User guides prepared (if needed)
  - [ ] Admin documentation created
  - [ ] Support documentation ready

### 10. Deployment Platform (Vercel)

- [ ] **Vercel Configuration**
  - [ ] Project created in Vercel
  - [ ] GitHub repository connected
  - [ ] Environment variables set
  - [ ] Build settings configured
  - [ ] Custom domain configured (if applicable)
  - [ ] SSL certificate verified

- [ ] **Deployment Process**
  - [ ] Staging environment set up
  - [ ] Production deployment tested
  - [ ] Rollback procedure documented
  - [ ] CI/CD pipeline configured (if applicable)

## Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Verify all authentication emails are sending
- [ ] Monitor error logs for issues
- [ ] Test critical user flows in production
- [ ] Verify SSL certificate is active
- [ ] Check all external integrations are working

### First Week

- [ ] Monitor email delivery rates
- [ ] Review database performance
- [ ] Check for any security alerts
- [ ] Gather initial user feedback
- [ ] Monitor application performance

### Ongoing

- [ ] Weekly email delivery review
- [ ] Weekly security review
- [ ] Monthly performance review
- [ ] Monthly backup verification
- [ ] Quarterly security audit

## Emergency Contacts & Resources

### Support Links
- **Supabase Dashboard**: https://supabase.com/dashboard/project/fergmobsjyucucxeumvb
- **Resend Dashboard**: https://resend.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard

### Documentation
- [SMTP Setup Guide](./RESEND_SMTP_SETUP_GUIDE.md)
- [SMTP Quick Reference](./SMTP_CONFIGURATION_REFERENCE.md)
- [Email Templates](./email-templates/supabase-auth-templates.md)

### Emergency Procedures
- **Email Delivery Issues**: Check [RESEND_SMTP_SETUP_GUIDE.md](./RESEND_SMTP_SETUP_GUIDE.md#troubleshooting-common-issues)
- **Database Issues**: Contact Supabase support (Pro plan and above)
- **Application Downtime**: Check Vercel status and logs

## Production Readiness Score

Track your readiness by counting completed items:

- **Email Configuration**: ___/12 items
- **Supabase Security**: ___/11 items
- **Environment Variables**: ___/5 items
- **Database Setup**: ___/9 items
- **Performance**: ___/8 items
- **Monitoring**: ___/7 items
- **Testing**: ___/14 items
- **Security Review**: ___/11 items
- **Documentation**: ___/4 items
- **Deployment**: ___/9 items

**Total**: ___/90 items completed

**Minimum for Production**: 85/90 (95%)

## Notes

- Items marked ⭐ **CRITICAL** must be completed before production deployment
- Review this checklist regularly and update as requirements change
- Keep this document in version control for team visibility

---

**Last Updated**: October 10, 2025  
**Project**: Aero Safety / Flight Desk Pro  
**Maintained By**: Development Team

