import { cookies } from "next/headers";

import { Badge, Surface } from "@/components/ui";
import { createClient } from "@/utils/supabase/server";

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from("todos").select();

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <div className="flex items-center gap-2">
          <Badge tone="info" dot>
            internal
          </Badge>
          <span className="num-mono text-[11px] text-[var(--color-ink-faint)]">
            supabase.todos
          </span>
        </div>
        <h1 className="mt-2 text-[26px] font-bold tracking-tight text-[var(--color-ink)] md:text-[32px]">
          Todos · Supabase ping
        </h1>
      </div>
      <Surface variant="card" padding="md" radius="lg">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[var(--color-ink)]">Rows</div>
          <span className="num text-[11px] text-[var(--color-ink-muted)]">
            {todos?.length ?? 0}
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {todos?.length ? (
            todos.map((todo: { id: string; name: string }) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-ink)]"
              >
                <span className="num-mono text-[10px] text-[var(--color-ink-faint)]">
                  {todo.id.slice(0, 6)}
                </span>
                <span>{todo.name}</span>
              </li>
            ))
          ) : (
            <li className="text-[13px] text-[var(--color-ink-muted)]">
              No rows. Either the table is missing or unauthorized.
            </li>
          )}
        </ul>
      </Surface>
    </div>
  );
}
