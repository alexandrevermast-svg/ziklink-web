import type { Profile } from "../types";

export function MemberAvatar({ profile, size = 'md', onClick }: {
  profile: Profile | null;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const cls = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-10 w-10 text-sm';
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '?';
  const interactClass = onClick ? "cursor-pointer hover:ring-2 hover:ring-zik-purple/50 hover:ring-offset-1 transition-all" : "";

  return profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.username ?? ''}
      onClick={onClick}
      className={`${cls} ${interactClass} rounded-full object-cover shrink-0`}
    />
  ) : (
    <div
      onClick={onClick}
      className={`${cls} ${interactClass} rounded-full bg-zik-purple flex items-center justify-center text-white font-semibold shrink-0`}
    >
      {initials}
    </div>
  );
}
