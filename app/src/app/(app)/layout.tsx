import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import ToastContainer from '@/components/ui/ToastContainer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-area">
        <TopBar />
        <main className="pages">{children}</main>
      </div>
      <ToastContainer />
    </div>
  )
}
