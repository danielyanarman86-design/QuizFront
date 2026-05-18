import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#0f0f1a]">
        <Sidebar />
        <main className="ml-60 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
