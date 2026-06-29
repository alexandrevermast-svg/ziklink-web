// app/(private)/courses/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function CoursesPage() {
  const supabase = createClient();
  const { data: { user } } = await (await supabase).auth.getUser();

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold mb-4">Mes Cours</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p>Bienvenue sur la page des cours, {user?.email} !</p>
        <p className="mt-4 text-gray-600">
          Accédez à vos cours et suivez votre progression.
        </p>
        {/* Exemple : Liste de cours */}
        <ul className="mt-4 space-y-2">
            <li className="p-2 border rounded-md">Introduction au Python</li>
            <li className="p-2 border rounded-md">Bases du Marketing Digital</li>
        </ul>
      </div>
    </section>
  );
}