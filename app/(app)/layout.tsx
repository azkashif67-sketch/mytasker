import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// App shell. The full three-column responsive frame (two section panes +
// shared calendar) is built in M2/M5; this M0 scaffold establishes the
// authenticated boundary and the header.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <div className="min-h-dvh bg-ground">{children}</div>;
}
