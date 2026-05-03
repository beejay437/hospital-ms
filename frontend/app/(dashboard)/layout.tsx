'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Loader2 } from 'lucide-react';

const permissions: Record<string, string[]> = {
  '/dashboard': ['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist', 'billing_officer'],
  '/patients': ['admin', 'receptionist', 'doctor', 'nurse'],
  '/appointments': ['admin', 'receptionist', 'doctor', 'nurse'],
  '/medical-records': ['admin', 'doctor', 'nurse'],
  '/admissions': ['admin', 'receptionist', 'doctor', 'nurse'],
  '/billing': ['admin', 'billing_officer', 'receptionist'],
  '/pharmacy': ['admin', 'pharmacist'],
  '/staff': ['admin'],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, getDefaultRoute } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const userRole = user.role.toLowerCase();
    const matchedRoute = Object.keys(permissions).find(route =>
      pathname === route || pathname.startsWith(route + '/')
    );

    if (matchedRoute && !permissions[matchedRoute].includes(userRole)) {
      router.replace(getDefaultRoute(userRole));
    }
  }, [user, loading, router, pathname, getDefaultRoute]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}