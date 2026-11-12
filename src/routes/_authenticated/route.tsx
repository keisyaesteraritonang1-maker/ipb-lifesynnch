import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/studyflow/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    return { user: data.user };
  },
  component: () => (
    <div className="min-h-screen bg-soft">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  ),
});
