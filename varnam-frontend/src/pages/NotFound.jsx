import Seo from '../components/common/Seo'

export default function NotFound() {
  return (
    <div className="container-main section text-center">
      <Seo title="Page Not Found" description="The page you're looking for doesn't exist." path="/404" noindex />
      <h1 className="text-6xl font-heading text-brand-green mb-4">404</h1>
      <p className="text-neutral-500 text-lg">Page not found.</p>
      <a href="/" className="btn-primary mt-6 inline-flex">Go Home</a>
    </div>
  )
}