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
}

export default function EmailLayout({ children, title }: EmailLayoutProps) {
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
                ✈️ Aero Safety Flight School
              </Text>
              <Text style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#9ca3af' }}>
                Professional Flight Training Excellence
              </Text>
              <div style={{ marginBottom: '16px' }}>
                <Link
                  href="mailto:support@yourdomain.com"
                  style={{ color: '#2563eb', fontSize: '12px', textDecoration: 'none', display: 'block', marginBottom: '4px' }}
                >
                  📧 support@yourdomain.com
                </Link>
                <Link
                  href="tel:+1234567890"
                  style={{ color: '#2563eb', fontSize: '12px', textDecoration: 'none', display: 'block' }}
                >
                  📞 (123) 456-7890
                </Link>
              </div>
              <Text style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                © 2024 Aero Safety Flight School. All rights reserved.
              </Text>
            </div>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
