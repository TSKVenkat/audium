import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';


export const metadata: Metadata = {
  title: "Audium - AI Podcast Studio",
  description: "Transform any content into professional podcasts with AI-powered script generation and premium voice synthesis. Create engaging audio experiences instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-black min-h-screen"
      >
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'text-sm',
              style: {
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid #27272a',
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
