import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Calendar, Home, MessageSquare, Menu, Gauge, Newspaper } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Race-related items (left group). Forum (social) and News are segmented out to the right.
  const raceNav = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Races', href: '/races', icon: Calendar },
    { name: 'Race Calendar', href: '/race-calendar', icon: Calendar },
    { name: 'Race Center', href: '/race-center', icon: Gauge },
    { name: 'Driver Stats', href: '/ratings', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;
  const navClass = (path: string) =>
    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path) ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`;
  // Forum is the social hub — highlighted so it stands out from the race tools.
  const forumClass = (path: string) =>
    `flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
      isActive(path)
        ? 'bg-red-600 text-white'
        : 'bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Brand logo — purely decorative (the nav has a Home link). Not clickable. */}
          <div className="flex items-center gap-2 select-none" aria-label="Grid Spot">
            <span className="grid h-8 w-8 place-items-center rounded-md f1-gradient shadow-sm shadow-red-900/40">
              <svg viewBox="0 0 8 8" className="h-4 w-4" aria-hidden="true">
                <g fill="white">
                  <rect x="0" y="0" width="2" height="2" />
                  <rect x="4" y="0" width="2" height="2" />
                  <rect x="2" y="2" width="2" height="2" />
                  <rect x="6" y="2" width="2" height="2" />
                  <rect x="0" y="4" width="2" height="2" />
                  <rect x="4" y="4" width="2" height="2" />
                  <rect x="2" y="6" width="2" height="2" />
                  <rect x="6" y="6" width="2" height="2" />
                </g>
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight leading-none">
              <span className="text-foreground">GRID</span>{' '}
              <span className="text-red-600">SPOT</span>
            </span>
          </div>
          <nav className="hidden lg:flex items-center space-x-1">
            {raceNav.map((item) => (
              <Link key={item.name} to={item.href} className={navClass(item.href)}>
                <item.icon className="h-4 w-4 mr-1" />
                {item.name}
              </Link>
            ))}
            {/* divider segmenting race tools from social + news */}
            <span className="mx-2 h-6 w-px bg-border" />
            <Link to="/forum" className={forumClass('/forum')}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Forum
            </Link>
            <Link to="/news" className={navClass('/news')}>
              <Newspaper className="h-4 w-4 mr-1" />
              News
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <span title="Coming soon">
                <Button variant="ghost" size="sm" disabled className="cursor-not-allowed opacity-70">
                  <User className="h-4 w-4 mr-1" />
                  {user?.username || 'Profile'}
                </Button>
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="f1-gradient">Register</Button>
              </Link>
            </div>
          )}
          <button
            className="lg:hidden p-2 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {isMenuOpen && (
        <nav className="lg:hidden bg-background border-t border-border/40 p-4 space-y-1">
          {raceNav.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={navClass(item.href)}
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon className="h-4 w-4 mr-1" />
              {item.name}
            </Link>
          ))}
          <div className="my-2 border-t border-border/40" />
          <Link to="/forum" className={forumClass('/forum')} onClick={() => setIsMenuOpen(false)}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Forum
          </Link>
          <Link to="/news" className={navClass('/news')} onClick={() => setIsMenuOpen(false)}>
            <Newspaper className="h-4 w-4 mr-1" />
            News
          </Link>
          <div className="mt-4">
            {isAuthenticated ? (
              <>
                <span title="Coming soon" className="block">
                  <Button variant="ghost" size="sm" disabled className="w-full mb-2 cursor-not-allowed opacity-70">
                    <User className="h-4 w-4 mr-1" />
                    {user?.username || 'Profile'}
                  </Button>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="w-full mb-2">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="f1-gradient w-full">Register</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
