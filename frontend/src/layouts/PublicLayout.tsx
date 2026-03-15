import { useState } from 'react';
import { Outlet, NavLink, useParams } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { useHeroContent } from '../hooks/useApi';

export default function PublicLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: heroContent } = useHeroContent(slug);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const coupleNames = `${brideName} & ${groomName}`;
  const weddingDate = heroContent?.wedding_date
    ? new Date(heroContent.wedding_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gold-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to={`/${slug}`} className="flex items-center gap-2">
              <span className="font-script text-2xl text-maroon-800">{coupleNames}</span>
            </NavLink>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="#our-story"
                className="text-sm text-gray-700 hover:text-maroon-800 transition-colors"
              >
                Our Story
              </a>
              <a
                href="#events"
                className="text-sm text-gray-700 hover:text-maroon-800 transition-colors"
              >
                Events
              </a>
              <a
                href="#gallery"
                className="text-sm text-gray-700 hover:text-maroon-800 transition-colors"
              >
                Gallery
              </a>
              <a href="#rsvp" className="btn-primary">
                RSVP
              </a>
            </div>

            <NavLink
              to={`/${slug}/admin`}
              className="hidden md:block text-sm text-gold-600 hover:text-gold-700"
            >
              Admin
            </NavLink>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gold-50 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <HiOutlineX className="w-6 h-6 text-maroon-800" />
              ) : (
                <HiOutlineMenu className="w-6 h-6 text-maroon-800" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gold-200 bg-white/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <a
                href="#our-story"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-gray-700 hover:text-maroon-800 hover:bg-gold-50 rounded-lg transition-colors"
              >
                Our Story
              </a>
              <a
                href="#events"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-gray-700 hover:text-maroon-800 hover:bg-gold-50 rounded-lg transition-colors"
              >
                Events
              </a>
              <a
                href="#gallery"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-gray-700 hover:text-maroon-800 hover:bg-gold-50 rounded-lg transition-colors"
              >
                Gallery
              </a>
              <a
                href="#rsvp"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-maroon-800 font-semibold hover:bg-gold-50 rounded-lg transition-colors"
              >
                RSVP
              </a>
              <NavLink
                to={`/${slug}/admin`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-gold-600 hover:text-gold-700 hover:bg-gold-50 rounded-lg transition-colors"
              >
                Admin
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className="bg-maroon-800 text-cream py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="font-script text-4xl mb-4">{coupleNames}</h3>
          {weddingDate && <p className="text-gold-300 mb-6">{weddingDate}</p>}
          <div className="flex justify-center gap-6 text-sm text-cream/70">
            <a href="#" className="hover:text-gold-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-gold-300 transition-colors">
              Contact
            </a>
          </div>
          <p className="mt-8 text-sm text-cream/50">Made with love for our special day</p>
        </div>
      </footer>
    </div>
  );
}
