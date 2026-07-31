'use client';

import type { Group } from "@/types";

export function GroupAvatar({ group, size = 'md' }: { group: Pick<Group, 'name' | 'avatar_url'>; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-24 w-24 text-3xl' : size === 'md' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm';
  const initials = group.name.slice(0, 2).toUpperCase();
  return group.avatar_url ? (
    <img src={group.avatar_url} alt={group.name} className={`${cls} rounded-2xl object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-2xl bg-linear-to-br from-zik-purple to-zik-indigo flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}
