
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Calendar, Home, MessageSquare, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Races', href: '/races', icon: Calendar },
    { name: 'Race Calendar', href: '/race-calendar', icon: Calendar },
    { name: 'Forum', href: '/forum', icon: MessageSquare },
    { name: 'Driver Stats', href: '/ratings', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">F1 Fan Portal</span>
          </Link>
          <nav className="hidden md:flex space-x-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              >
                <item.icon className="h-4 w-4 mr-1" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-1" />
                  {user?.username || 'Profile'}
                </Button>
              </Link>
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
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {isMenuOpen && (
        <nav className="md:hidden bg-background border-t border-border/40 p-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <item.icon className="h-4 w-4 mr-1" />
              {item.name}
            </Link>
          ))}
          <div className="mt-4">
            {isAuthenticated ? (
              <>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="w-full mb-2">
                    <User className="h-4 w-4 mr-1" />
                    {user?.username || 'Profile'}
                  </Button>
                </Link>
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
