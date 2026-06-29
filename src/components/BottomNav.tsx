// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

// *** MISE À JOUR ICI ***
const navItems = [
  {
    name: "Accueil",
    href: "/",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: "Events",
    href: "/events",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: "Groupe",
    href: "/groups",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.193-1.266-.535-1.803C15.792 14.549 14.475 14 13 14H5c-1.397 0-2.658.659-3.473 1.706C1.196 16.053 1 16.68 1 17.345V20h5V17c0-.653.193-1.266.535-1.803C7.208 14.549 8.525 14 10 14h8c1.397 0 2.658.659 3.473 1.706C22.804 16.053 23 16.68 23 17.345V20h5v-2a3 3 0 00-5.356-1.857M12 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    name: "Messages", // Nouvelle entrée
    href: "/messages", // Nouvelle page
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
  {
    name: "Cours",
    href: "/courses",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.206 5 7.5 5S4.168 5.477 3 6.253m15 0c1.168.776 2.134 1.789 2.923 3L22 12h-8.258m-4.717-4.042A2.493 2.493 0 0112 5.5c2.757 0 5-2.243 5-5s-2.243-5-5-5-5 2.243-5 5a2.493 2.493 0 01-1.042 2.721M21 12c0 2.22-1.278 4.138-3.123 5.161M12 19.752c-1.168-.776-2.134-1.789-2.923-3L2 12h8.258m-4.717 4.042A2.493 2.493 0 0112 18.5c2.757 0 5-2.243 5-5s-2.243-5-5-5-5 2.243-5 5a2.493 2.493 0 01-1.042 2.721"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

const isHidden = pathname === "/login" || pathname.startsWith("/messages/");
if (isHidden) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
      <div className="flex justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
              }`}
            >
              <div className="mb-1">{item.icon}</div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}