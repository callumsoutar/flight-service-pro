# Supabase Auth Email Templates

Custom email templates for Aero Safety authentication emails sent via Resend SMTP.

## Template: Confirm Signup

**Subject**: `Confirm Your Email - Aero Safety`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">Aero Safety</h1>
    <p style="color: #64748b; margin: 5px 0 0 0;">Safety Management System</p>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to Aero Safety!</h2>
    
    <p style="color: #334155; line-height: 1.6;">
      Thank you for signing up. To complete your registration and access your account, 
      please confirm your email address by clicking the button below:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #2563eb; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-weight: 600;">
        Confirm Email Address
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
      <strong>Security Notice:</strong> If you did not create an account with Aero Safety, 
      you can safely ignore this email. This confirmation link will expire in 24 hours.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Aero Safety - Comprehensive Safety Management System for Flight Schools
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Need help? Contact us at <a href="mailto:support@yourdomain.com" style="color: #2563eb;">support@yourdomain.com</a>
    </p>
  </div>
</div>
```

---

## Template: Reset Password

**Subject**: `Reset Your Password - Aero Safety`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">Aero Safety</h1>
    <p style="color: #64748b; margin: 5px 0 0 0;">Safety Management System</p>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
    
    <p style="color: #334155; line-height: 1.6;">
      We received a request to reset the password for your Aero Safety account 
      (<strong>{{ .Email }}</strong>).
    </p>
    
    <p style="color: #334155; line-height: 1.6;">
      Click the button below to create a new password:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #2563eb; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-weight: 600;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
    <p style="color: #dc2626; font-size: 13px; line-height: 1.5; margin: 0;">
      <strong>⚠️ Security Notice:</strong> If you did not request a password reset, 
      please ignore this email or contact support immediately if you have concerns about 
      your account security. This reset link will expire in 1 hour.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Aero Safety - Comprehensive Safety Management System for Flight Schools
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Need help? Contact us at <a href="mailto:support@yourdomain.com" style="color: #2563eb;">support@yourdomain.com</a>
    </p>
  </div>
</div>
```

---

## Template: Magic Link

**Subject**: `Sign In to Aero Safety`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">Aero Safety</h1>
    <p style="color: #64748b; margin: 5px 0 0 0;">Safety Management System</p>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin-top: 0;">Sign In to Your Account</h2>
    
    <p style="color: #334155; line-height: 1.6;">
      Click the button below to securely sign in to your Aero Safety account:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #2563eb; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-weight: 600;">
        Sign In
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
      <strong>Security Notice:</strong> This sign-in link will expire in 1 hour and can only 
      be used once. If you did not request this link, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Aero Safety - Comprehensive Safety Management System for Flight Schools
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Need help? Contact us at <a href="mailto:support@yourdomain.com" style="color: #2563eb;">support@yourdomain.com</a>
    </p>
  </div>
</div>
```

---

## Template: Change Email Address

**Subject**: `Confirm Email Change - Aero Safety`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">Aero Safety</h1>
    <p style="color: #64748b; margin: 5px 0 0 0;">Safety Management System</p>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin-top: 0;">Confirm Email Address Change</h2>
    
    <p style="color: #334155; line-height: 1.6;">
      We received a request to change the email address for your Aero Safety account 
      to <strong>{{ .Email }}</strong>.
    </p>
    
    <p style="color: #334155; line-height: 1.6;">
      To confirm this change, please click the button below:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #2563eb; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-weight: 600;">
        Confirm Email Change
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
    <p style="color: #dc2626; font-size: 13px; line-height: 1.5; margin: 0;">
      <strong>⚠️ Security Notice:</strong> If you did not request this email change, 
      please contact support immediately. This confirmation link will expire in 24 hours.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Aero Safety - Comprehensive Safety Management System for Flight Schools
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Need help? Contact us at <a href="mailto:support@yourdomain.com" style="color: #2563eb;">support@yourdomain.com</a>
    </p>
  </div>
</div>
```

---

## Template: Invite User

**Subject**: `You've Been Invited to Aero Safety`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1e40af; margin: 0;">Aero Safety</h1>
    <p style="color: #64748b; margin: 5px 0 0 0;">Safety Management System</p>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin-top: 0;">You've Been Invited!</h2>
    
    <p style="color: #334155; line-height: 1.6;">
      You have been invited to join Aero Safety, a comprehensive safety management 
      system for flight schools.
    </p>
    
    <p style="color: #334155; line-height: 1.6;">
      Click the button below to accept your invitation and set up your account:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #2563eb; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; display: inline-block;
                font-weight: 600;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color: #2563eb; word-break: break-all;">{{ .ConfirmationURL }}</span>
    </p>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
      <strong>Note:</strong> If you did not expect this invitation or have questions about 
      joining Aero Safety, please contact the person who invited you or reach out to our 
      support team. This invitation link will expire in 7 days.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Aero Safety - Comprehensive Safety Management System for Flight Schools
    </p>
    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
      Need help? Contact us at <a href="mailto:support@yourdomain.com" style="color: #2563eb;">support@yourdomain.com</a>
    </p>
  </div>
</div>
```

---

## Design Guidelines

### Color Palette
- **Primary Blue**: `#2563eb` (buttons, links)
- **Dark Blue**: `#1e40af` (headers)
- **Dark Gray**: `#0f172a` (headings)
- **Medium Gray**: `#334155` (body text)
- **Light Gray**: `#64748b` (secondary text)
- **Very Light Gray**: `#94a3b8` (footer text)
- **Background**: `#f8fafc` (content boxes)
- **Borders**: `#e2e8f0` (dividers)
- **Warning Red**: `#dc2626` (security notices)

### Typography
- **Font Family**: Arial, sans-serif (universally supported)
- **Main Heading**: 24px, color: `#0f172a`
- **Body Text**: 16px, color: `#334155`, line-height: 1.6
- **Secondary Text**: 14px, color: `#64748b`
- **Footer Text**: 12px, color: `#94a3b8`

### Layout
- **Max Width**: 600px (optimal for email clients)
- **Padding**: 20px outer, 30px inner content boxes
- **Border Radius**: 8px for content boxes, 6px for buttons
- **Button Padding**: 12px vertical, 30px horizontal

### Accessibility
- High contrast text ratios (WCAG AA compliant)
- Clear, descriptive link text
- Security warnings prominently displayed
- Alternative text link provided if button doesn't work

### Mobile Responsiveness
These templates use inline styles and simple layouts that work across all email clients, including mobile devices.

## Important Notes

1. **Required Placeholders**: Never remove Supabase placeholders like `{{ .ConfirmationURL }}`
2. **Update Support Email**: Replace `support@yourdomain.com` with your actual support email
3. **Branding**: Update header to match your exact branding preferences
4. **Testing**: Test across multiple email clients (Gmail, Outlook, Apple Mail, etc.)
5. **Spam Filters**: Avoid spam trigger words, keep text-to-image ratio high

## Usage

1. Copy the HTML from desired template
2. Navigate to Supabase Dashboard → Authentication → Email Templates
3. Select the template to edit (e.g., "Confirm signup")
4. Paste the HTML, ensuring Supabase placeholders are preserved
5. Update any branding/contact information
6. Save and test the template

---

**Project**: Aero Safety / Flight Desk Pro  
**Last Updated**: October 10, 2025  
**Maintained By**: Development Team

