import Navbar from '@/components/Navbar'
import PlanGuard from '@/components/PlanGuard'
import InactivityLogout from '@/components/InactivityLogout'
import PermissionsModal from '@/components/PermissionsModal'
import ScreenshotGuard from '@/components/ScreenshotGuard'
import GpsUpdater from '@/components/GpsUpdater'
import ImpersonationBanner from '@/components/ImpersonationBanner'
import './dashboard.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-root" style={{ background: 'radial-gradient(circle at top right, rgba(255,9,108,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 30%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)' }}>
      <PlanGuard />
      <InactivityLogout />
      <PermissionsModal />
      <GpsUpdater />
      <ScreenshotGuard />
      <ImpersonationBanner />
      <div className="lg:flex lg:h-screen lg:overflow-hidden">
        <Navbar />
        <main className="flex-1 min-w-0 relative z-10 lg:overflow-y-auto lg:h-full pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
