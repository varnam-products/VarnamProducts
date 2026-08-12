import Navbar from './Navbar'
import Footer from './Footer'
import PageTransition from './PageTransition'
import WhatsAppButton from '../ui/WhatsAppButton'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-off-white">
      <Navbar />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}