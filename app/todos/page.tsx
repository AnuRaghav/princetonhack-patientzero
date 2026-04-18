import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from("todos").select();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 text-white">
      <h1 className="mb-6 text-2xl font-semibold">Todos (Supabase test)</h1>
      <ul className="space-y-2">
        {todos?.map((todo: { id: string; name: string }) => (
          <li key={todo.id} className="rounded border border-white/10 bg-white/5 px-3 py-2">
            {todo.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
