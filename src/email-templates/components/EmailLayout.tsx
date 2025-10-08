import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface EmailLayoutProps {
  children: React.ReactNode;
  title: string;
  schoolName?: string;
  contactEmail?: string;
  contactPhone?: string;
  tagline?: string;
}

export default function EmailLayout({
  children,
  title,
  schoolName = 'Flight Desk Pro',
  contactEmail = 'support@yourdomain.com',
  contactPhone = '(123) 456-7890',
  tagline = 'Professional Flight Training Excellence'
}: EmailLayoutProps) {
  return (
    <Tailwind>
      <Html>
        <Head>
          <title>{title}</title>
        </Head>
        <Body style={{ backgroundColor: '#ffffff', margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
          <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            {/* Main content */}
            <div style={{ paddingTop: '20px', paddingBottom: '24px' }}>
              {children}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', textAlign: 'center' }}>
              <Text style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                ✈️ {schoolName}
              </Text>
              <Text style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#9ca3af' }}>
                {tagline}
              </Text>
              <div style={{ marginBottom: '16px' }}>
                <Link
                  href={`mailto:${contactEmail}`}
                  style={{ color: '#2563eb', fontSize: '12px', textDecoration: 'none', display: 'block', marginBottom: '4px' }}
                >
                  📧 {contactEmail}
                </Link>
                <Link
                  href={`tel:${contactPhone.replace(/[^0-9+]/g, '')}`}
                  style={{ color: '#2563eb', fontSize: '12px', textDecoration: 'none', display: 'block' }}
                >
                  📞 {contactPhone}
                </Link>
              </div>
              <Text style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                © {new Date().getFullYear()} {schoolName}. All rights reserved.
              </Text>
            </div>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
