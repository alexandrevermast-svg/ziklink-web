// app/(protected)/messages/[id]/layout.tsx
export default function ConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pas de BottomNav sur la page de conversation
  // Le layout parent (avec Header) reste actif
  return <>{children}</>;
}