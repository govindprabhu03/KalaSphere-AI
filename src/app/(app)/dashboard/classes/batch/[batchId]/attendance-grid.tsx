"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendanceAction } from "@/lib/classes/actions";
import { cn } from "@/lib/utils";

type Student = { student_user_id: string; full_name: string | null; email: string | null };
type Sess = { id: string; title: string | null; session_date: string };

export function AttendanceGrid({
  batchId,
  students,
  sessions,
  present,
}: {
  batchId: string;
  students: Student[];
  sessions: Sess[];
  present: Record<string, boolean>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(sessionId: string, studentId: string, cur: boolean) {
    startTransition(async () => {
      await markAttendanceAction(sessionId, studentId, !cur, batchId);
      router.refresh();
    });
  }

  if (students.length === 0)
    return <p className="text-sm text-muted-foreground">No students enrolled yet.</p>;
  if (sessions.length === 0)
    return <p className="text-sm text-muted-foreground">Add a session to start marking attendance.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium">Student</th>
            {sessions.map((s) => (
              <th key={s.id} className="px-2 py-2 text-center text-xs font-medium whitespace-nowrap">
                {new Date(s.session_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((st) => (
            <tr key={st.student_user_id} className="border-t border-border/40">
              <td className="px-3 py-2 whitespace-nowrap">{st.full_name ?? st.email}</td>
              {sessions.map((s) => {
                const p = present[`${s.id}:${st.student_user_id}`] ?? false;
                return (
                  <td key={s.id} className="px-2 py-2 text-center">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(s.id, st.student_user_id, p)}
                      className={cn(
                        "size-7 rounded-md text-xs font-semibold transition-colors disabled:opacity-50",
                        p
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
                      )}
                      aria-label={p ? "Present (click to unmark)" : "Absent (click to mark present)"}
                    >
                      {p ? "P" : "–"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
