import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface EmailLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function EmailLayout({ children, title }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <title>{title}</title>
      </Head>
      <Tailwind>
        <Body className="bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
          <Container className="mx-auto py-12 px-4 max-w-2xl">
            {/* Header with gradient */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-white text-2xl font-bold m-0 mb-1">
                      ✈️ Aero Safety Flight School
                    </Text>
                    <Text className="text-blue-100 text-sm m-0">
                      Professional Flight Training Excellence
                    </Text>
                  </div>
                </div>
              </div>
              
              {/* Main content */}
              <div className="px-8 py-8">
                {children}
              </div>
              
              {/* Enhanced Footer */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
                <Text className="text-gray-600 text-sm m-0 mb-3 font-medium">
                  Need assistance? We&apos;re here to help!
                </Text>
                <div className="flex flex-wrap gap-4 text-sm">
                  <Link 
                    href="mailto:support@yourdomain.com" 
                    className="text-blue-600 font-medium"
                  >
                    📧 support@yourdomain.com
                  </Link>
                  <Link 
                    href="tel:+1234567890" 
                    className="text-blue-600 font-medium"
                  >
                    📞 (123) 456-7890
                  </Link>
                </div>
                <Hr className="border-gray-200 my-4" />
                <Text className="text-gray-400 text-xs m-0 text-center">
                  © 2024 Aero Safety Flight School. All rights reserved. | Professional flight training since 2010
                </Text>
              </div>
            </div>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
