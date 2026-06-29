'use client';
import { usePathname } from 'next/navigation';

export default function HeaderSpacer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/messages/')) return null;
  return <div className="h-16" />;
}