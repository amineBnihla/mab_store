import { AdminNav } from "@/components/admin/admin-nav";

// No session read here: layouts don't re-run on client navigation, so each
// page calls `requireAdmin()` itself.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="container-page py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <aside>
          <p className="text-eyebrow mb-2 hidden lg:block">Admin</p>
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
