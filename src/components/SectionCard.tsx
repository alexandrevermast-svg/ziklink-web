// src/components/SectionCard.tsx
import React from "react";

export default function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <span>{title}</span>
        </h2>
      </header>
      <div>{children}</div>
    </section>
  );
}