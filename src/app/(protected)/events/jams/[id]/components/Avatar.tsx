import type { Profile } from "../types";

export function Avatar({ profile, size = "md", onClick }: {
  profile: Profile | null; size?: "sm" | "md";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const cls = size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs";
  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : "?";
  const interactClass = onClick ? "cursor-pointer hover:ring-2 hover:ring-zik-purple/50 hover:ring-offset-1 transition-all" : "";
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username ?? ""} onClick={onClick}
      className={`${cls} ${interactClass} rounded-full object-cover shrink-0`} />
  ) : (
    <div onClick={onClick}
      className={`${cls} ${interactClass} rounded-full bg-zik-purple flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}
