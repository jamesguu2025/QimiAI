import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  User
} from 'lucide-react';

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!session?.user) return null;

  const userImage = session.user.image;
  const userName = session.user.name || session.user.email?.split('@')[0] || 'User';
  const userEmail = session.user.email;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group"
      >
        {/* Avatar */}
        <div className="relative">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="w-9 h-9 rounded-full ring-2 ring-slate-200 group-hover:ring-primary-purple transition-all"
            />
          ) : (
            <div className="w-9 h-9 rounded-full ring-2 ring-slate-200 group-hover:ring-primary-purple transition-all bg-gradient-to-br from-primary-teal to-primary-purple flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
          )}
        </div>

        {/* Desktop: Name + Chevron */}
        <div className="hidden md:flex items-center gap-1">
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
            {userName}
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="font-medium text-slate-900 text-sm truncate">
              {userName}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {userEmail}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <LayoutDashboard size={18} className="text-slate-500 group-hover:text-primary-purple" />
              <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
                Dashboard
              </span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <Settings size={18} className="text-slate-500 group-hover:text-primary-purple" />
              <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
                Settings
              </span>
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-2"></div>

          {/* Logout */}
          <button
            onClick={() => {
              setIsOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors group w-full"
          >
            <LogOut size={18} className="text-slate-500 group-hover:text-red-600" />
            <span className="text-sm text-slate-700 group-hover:text-red-600 font-medium">
              Log out
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
