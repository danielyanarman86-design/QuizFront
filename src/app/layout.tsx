export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

// Suppress Next.js 16 warning — html/body are in [locale]/layout.tsx
export const dynamic = 'force-dynamic';
