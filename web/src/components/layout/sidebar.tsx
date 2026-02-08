'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, List, Upload, Settings, Tag, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/transactions', icon: List, label: 'Transactions' },
  { href: '/dashboard/import', icon: Upload, label: 'Import' },
  { href: '/dashboard/rules', icon: Settings, label: 'Rules' },
  { href: '/dashboard/categories', icon: Tag, label: 'Categories' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold">Spendabo</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
