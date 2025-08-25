import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Flag, MapPin, Trophy, CheckCircle, User, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Race {
  round: number;
  name: string;
  location: string;
  country: string;
  circuit: string;
  date: string;
  endDate: string;
  isCompleted: boolean;
  winner?: string;
  isSprint?: boolean;
}

const Home = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [timeToNextRace, setTimeToNextRace] = useState<string>('');

  // 2025 F1 Calendar Data (corrected order by date)
  const RACE_CALENDAR_2025: Race[] = [
    {
      round: 1,
      name: 'Australian Grand Prix',
      location: 'Melbourne',
      country: 'Australia',
      circuit: 'Albert Park Circuit',
      date: '2025-03-14',
      endDate: '2025-03-16',
      isCompleted: true,
      winner: 'Lando Norris'
    },
    {
      round: 2,
      name: 'Chinese Grand Prix',
      location: 'Shanghai',
      country: 'China',
      circuit: 'Shanghai International Circuit',
      date: '2025-03-21',
      endDate: '2025-03-23',
      isCompleted: true,
      winner: 'Oscar Piastri',
      isSprint: true
    },
    {
      round: 3,
      name: 'Japanese Grand Prix',
      location: 'Suzuka',
      country: 'Japan',
      circuit: 'Suzuka International Racing Course',
      date: '2025-04-04',
      endDate: '2025-04-06',
      isCompleted: true,
      winner: 'Max Verstappen'
    },
    {
      round: 4,
      name: 'Bahrain Grand Prix',
      location: 'Sakhir',
      country: 'Bahrain',
      circuit: 'Bahrain International Circuit',
      date: '2025-04-11',
      endDate: '2025-04-13',
      isCompleted: true,
      winner: 'Oscar Piastri'
    },
    // ... other races in chronological order
    {
      round: 14,
      name: 'Hungarian Grand Prix',
      location: 'Budapest',
      country: 'Hungary',
      circuit: 'Hungaroring',
      date: '2025-08-01',
      endDate: '2025-08-03',
      isCompleted: true,
      winner: 'Lando Norris'
    },
    {
      round: 15,
      name: 'Dutch Grand Prix',
      location: 'Zandvoort',
      country: 'Netherlands',
      circuit: 'Circuit Park Zandvoort',
      date: '2025-08-29',
      endDate: '2025-08-31',
      isCompleted: false
    },
    {
      round: 16,
      name: 'Italian Grand Prix',
      location: 'Monza',
      country: 'Italy',
      circuit: 'Autodromo Nazionale Monza',
      date: '2025-09-05',
      endDate: '2025-09-07',
      isCompleted: false
    }
    // Add remaining races...
  ];

  // Get next race (first uncompleted race)
  const getNextRace = () => {
    const now = new Date();
    return RACE_CALENDAR_2025
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find(race => new Date(race.date) > now);
  };

  // Get last completed race (most recent completed race)
  const getLastRace = () => {
    const now = new Date();
    return [...RACE_CALENDAR_2025]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date descending
      .find(race => race.isCompleted && new Date(race.endDate) < now);
  };

  const nextRace = getNextRace();
  const lastRace = getLastRace();

  // Debug logging to check which races are being selected
  console.log('Current date:', new Date().toISOString());
  console.log('Next race:', nextRace);
  console.log('Last race:', lastRace);

  // Calculate countdown to next race
  const calculateTimeRemaining = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const difference = target.getTime() - now.getTime();

    if (difference <= 0) return 'Race Weekend';

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days, ${hours} hours`;
    return `${hours} hours`;
  };

  // Update countdown timer
  useEffect(() => {
    if (nextRace) {
      const updateTimer = () => {
        setTimeToNextRace(calculateTimeRemaining(nextRace.date));
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [nextRace]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-xl text-muted-foreground">Loading Formula 1 Grid spot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/f1-hero-bg.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
              FORMULA 1 Grid Spot
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300 leading-relaxed">
              Experience Formula 1 like never before. Live Discussions, Championship standings, 
              and comprehensive race calendar all in one place.
            </p>
            
            {/* Welcome message for authenticated users */}
            {isAuthenticated && user && (
              <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
                <p className="text-lg text-gray-200">
                  Welcome back, <span className="font-semibold text-white">{user.username || user.email}</span>!
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/forum">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-3">
                  {/* <Calendar className="mr-2 h-5 w-5" /> */}
                  Join a Discussion
                </Button>
              </Link>
              <Link to="/ratings">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-3">
                  <Trophy className="mr-2 h-5 w-5" />
                  Driver Standings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Race Information Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Next Race Card */}
            {nextRace && (
              <Card className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-md text-white border-gray-600/50 shadow-2xl">
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Flag className="h-6 w-6 text-gray-300" />
                    <CardTitle className="text-2xl font-bold text-gray-100">NEXT RACE</CardTitle>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-gray-100">
                    {nextRace.name}
                  </div>
                  <p className="text-lg opacity-90 flex items-center justify-center gap-2 text-gray-200">
                    <MapPin className="h-4 w-4" />
                    {nextRace.location}, {nextRace.country}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Race Weekend</span>
                        <span className="font-bold text-white">
                          {new Date(nextRace.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })} - {new Date(nextRace.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Time Remaining</span>
                        <span className="font-bold text-red-400">{timeToNextRace}</span>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Circuit</span>
                        <span className="font-bold text-white text-sm">{nextRace.circuit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Link to="/race-calendar">
                      <Button className="w-full bg-red-600 hover:bg-red-700">
                        View Full Calendar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Last Race Card - Updated with Red Theme */}
            {lastRace && (
              <Card className="bg-gradient-to-r from-red-900/80 to-red-800/80 backdrop-blur-md text-white border-red-600/50 shadow-2xl">
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="h-6 w-6 text-red-300" />
                    <CardTitle className="text-2xl font-bold text-red-100">LAST RACE</CardTitle>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-red-100">
                    {lastRace.name}
                  </div>
                  <p className="text-lg opacity-90 flex items-center justify-center gap-2 text-red-200">
                    <MapPin className="h-4 w-4" />
                    {lastRace.location}, {lastRace.country}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300 text-sm">Race Date</span>
                        <span className="font-bold text-white">
                          {new Date(lastRace.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {lastRace.winner && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-red-300 text-sm">Winner</span>
                          <span className="font-bold text-yellow-400 flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {lastRace.winner}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300 text-sm">Round</span>
                        <span className="font-bold text-white">{lastRace.round} of 24</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Link to={`/races/${lastRace.round}`}>
                      {/* <Button className="w-full bg-red-600 hover:bg-red-700">
                        View Race Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button> */}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* News Highlight Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              F1 News & Updates
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stay updated with the latest Formula 1 news, race highlights, and championship updates
            </p>
          </div>

          {/* Coming Soon Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="text-center py-16 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300">
              <CardContent>
                <div className="mb-6">
                  <Badge className="bg-red-500 text-white text-lg px-4 py-2 mb-4">
                    Coming Soon
                  </Badge>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                  Live F1 News Feed
                </h3>
                <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                  We're working on bringing you the latest Formula 1 news, race analysis, 
                  driver interviews, and championship insights all in one place.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Live Race Updates</h4>
                    <p className="text-sm text-gray-600">Real-time race commentary and results</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Driver Interviews</h4>
                    <p className="text-sm text-gray-600">Exclusive content from F1 drivers</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Championship Analysis</h4>
                    <p className="text-sm text-gray-600">Deep dive into standings and statistics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Authentication CTA Section - Only show if NOT logged in */}
      {!isAuthenticated && (
        <section className="py-16 bg-gray-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Join the F1 Community</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Create an account to personalize your F1 experience, save favorite drivers, 
              and get notified about race updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 px-8 py-3">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Account
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-3">
                  <User className="mr-2 h-5 w-5" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
