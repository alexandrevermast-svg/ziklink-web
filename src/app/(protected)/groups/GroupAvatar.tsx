'use client';

interface Group {
  id: string; name: string; bio: string | null;
  city: string | null; genre: string | null;
  avatar_url: string | null; created_by: string;}

export function GroupAvatar({ group, size = 'md' }: { group: Pick<Group, 'name' | 'avatar_url'>; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'md' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm';
  const initials = group.name.slice(0, 2).toUpperCase();
  return group.avatar_url ? (
    <img src={group.avatar_url} alt={group.name} className={`${cls} rounded-2xl object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-2xl bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}