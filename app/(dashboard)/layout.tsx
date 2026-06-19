import { DashboardHeader } from '@/components/layout/dashboard-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-900">
      <DashboardHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
