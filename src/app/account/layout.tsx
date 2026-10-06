import { AccountNav } from "@/components/account/account-nav";

// No session read here: layouts don't re-run on client navigation, so each
// page calls `requireUser()` itself.
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-page py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <aside>
          <p className="text-eyebrow mb-2 hidden lg:block">My account</p>
          <AccountNav />
        </aside>
        <div className="min-w-0 max-w-prose">{children}</div>
      </div>
    </div>
  );
}
