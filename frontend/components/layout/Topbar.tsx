'use client';

import { Menu, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/medical-records': 'Medical Records',
  '/admissions': 'Admissions',
  '/billing': 'Billing',
  '/pharmacy': 'Pharmacy',
  '/staff': 'Staff Management',
};

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname === path || pathname.startsWith(path + '/')) return title;
    }
    return 'Hospital MS';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-900 p-1"
      >
        <Menu size={22} />
      </button>

      <h1 className="text-lg font-semibold text-gray-900 flex-1">{getTitle()}</h1>

      <div className="flex items-center gap-2">
        <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
