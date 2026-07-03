// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, MessageCircle, Music } from "lucide-react";

const navItems = [
  { name: "Accueil",   href: "/",        icon: Home          },
  { name: "Events",    href: "/events",   icon: CalendarDays  },
  { name: "Groupe",    href: "/groups",   icon: Users         },
  { name: "Messages",  href: "/messages", icon: MessageCircle },
  { name: "Cours",     href: "/courses",  icon: Music         },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isHidden = pathname === "/login" || pathname.startsWith("/messages/");
  if (isHidden) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{
        background: "rgba(14, 11, 22, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex justify-around items-stretch max-w-lg mx-auto h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative transition-all duration-200"
              style={{ color: isActive ? "#C084FC" : "rgba(255,255,255,0.35)" }}
            >
              {/* Indicateur actif */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    width: 32,
                    height: 2,
                    background: "linear-gradient(90deg, #C084FC, #818CF8)",
                  }}
                />
              )}

              {/* Icône avec halo */}
              <span
                className="flex items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  width: 36,
                  height: 28,
                  background: isActive
                    ? "rgba(192,132,252,0.12)"
                    : "transparent",
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </span>

              {/* Label */}
              <span
                className="text-[10px] font-medium tracking-wide transition-all duration-200"
                style={{
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area iPhone */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}