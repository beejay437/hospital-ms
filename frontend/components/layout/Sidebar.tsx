'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCog,
  BedDouble,
  Receipt,
  Pill,
  LogOut,
  Hospital,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist', 'billing_officer'],
  },
  {
    href: '/patients',
    label: 'Patients',
    icon: Users,
    roles: ['admin', 'doctor', 'receptionist', 'nurse'],
  },
  {
    href: '/appointments',
    label: 'Appointments',
    icon: Calendar,
    roles: ['admin', 'doctor', 'receptionist'],
  },
  {
    href: '/medical-records',
    label: 'Medical Records',
    icon: FileText,
    roles: ['admin', 'doctor', 'nurse'],
  },
  {
    href: '/admissions',
    label: 'Admissions',
    icon: BedDouble,
    roles: ['admin', 'doctor', 'nurse', 'receptionist'],
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: Receipt,
    roles: ['admin', 'billing_officer'],
  },
  {
    href: '/pharmacy',
    label: 'Pharmacy',
    icon: Pill,
    roles: ['admin', 'pharmacist'],
  },
  {
    href: '/staff',
    label: 'Staff',
    icon: UserCog,
    roles: ['admin'],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userRole = (user?.role || '').toLowerCase();

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-40 flex flex-col transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Hospital size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">Hospital MS</p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>

          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all w-full"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
