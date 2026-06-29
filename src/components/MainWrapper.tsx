'use client';
import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noBottomPad = pathname?.startsWith('/messages/');
  return (
    <main className={`${noBottomPad ? '' : 'pb-16'} md:pb-0`}>
      {children}
    </main>
  );
}