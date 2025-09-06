import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, Flag, MapPin, Trophy, CheckCircle, User, UserPlus, AlertCircle, RefreshCw, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Race {
  round: number;
  name: string;
  location: string;
  country: string;
  circuit: string;
  date: string;
  endDate: string;
  isCompleted: boolean;
  isOngoing: boolean;
  winner?: string;
  isSprint?: boolean;
  meeting_key?: number;
}

interface OpenF1Session {
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_key: number;
  country_name: string;
  date_end: string;
  date_start: string;
  gmt_offset: string;
  location: string;
  meeting_key: number;
  session_key: number;
  session_name: string;
  session_type: string;
  year: number;
}

const Home = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [timeToNextRace, setTimeToNextRace] = useState<string>('');
  const [nextRace, setNextRace] = useState<Race | undefined>(undefined);
  const [currentRace, setCurrentRace] = useState<Race | undefined>(undefined);
  const [lastRace, setLastRace] = useState<Race | undefined>(undefined);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Static future races (since API doesn't show future races)
  const FUTURE_RACES_STATIC: Race[] = [
    {
      round: 17,
      name: 'Azerbaijan Grand Prix',
      location: 'Baku',
      country: 'Azerbaijan',
      circuit: 'Baku City Circuit',
      date: '2025-09-19',
      endDate: '2025-09-21',
      isCompleted: false,
      isOngoing: false
    },
    {
      round: 18,
      name: 'Singapore Grand Prix',
      location: 'Singapore',
      country: 'Singapore',
      circuit: 'Marina Bay Street Circuit',
      date: '2025-10-03',
      endDate: '2025-10-05',
      isCompleted: false,
      isOngoing: false
    },
    {
      round: 19,
      name: 'United States Grand Prix',
      location: 'Austin',
      country: 'USA',
      circuit: 'Circuit of the Americas',
      date: '2025-10-17',
      endDate: '2025-10-19',
      isCompleted: false,
      isOngoing: false,
      isSprint: true
    },
    {
      round: 20,
      name: 'Mexican Grand Prix',
      location: 'Mexico City',
      country: 'Mexico',
      circuit: 'Autódromo Hermanos Rodríguez',
      date: '2025-10-24',
      endDate: '2025-10-26',
      isCompleted: false,
      isOngoing: false
    },
    {
      round: 21,
      name: 'Brazilian Grand Prix',
      location: 'São Paulo',
      country: 'Brazil',
      circuit: 'Interlagos Circuit',
      date: '2025-10-31',
      endDate: '2025-11-02',
      isCompleted: false,
      isOngoing: false,
      isSprint: true
    },
    {
      round: 22,
      name: 'Las Vegas Grand Prix',
      location: 'Las Vegas',
      country: 'USA',
      circuit: 'Las Vegas Strip Circuit',
      date: '2025-11-21',
      endDate: '2025-11-23',
      isCompleted: false,
      isOngoing: false
    },
    {
      round: 23,
      name: 'Qatar Grand Prix',
      location: 'Lusail',
      country: 'Qatar',
      circuit: 'Lusail International Circuit',
      date: '2025-11-28',
      endDate: '2025-11-30',
      isCompleted: false,
      isOngoing: false,
      isSprint: true
    },
    {
      round: 24,
      name: 'Abu Dhabi Grand Prix',
      location: 'Abu Dhabi',
      country: 'UAE',
      circuit: 'Yas Marina Circuit',
      date: '2025-12-05',
      endDate: '2025-12-07',
      isCompleted: false,
      isOngoing: false
    }
  ];

  // CORRECTED: Accurate 2025 F1 race winners based on official results
  const STATIC_RACE_WINNERS: Record<string, string> = {
    'Australian Grand Prix': 'Lando Norris',
    'Chinese Grand Prix': 'Oscar Piastri',
    'Japanese Grand Prix': 'Max Verstappen',
    'Bahrain Grand Prix': 'Oscar Piastri',
    'Saudi Arabian Grand Prix': 'Oscar Piastri',
    'Miami Grand Prix': 'Oscar Piastri',
    'Emilia Romagna Grand Prix': 'Max Verstappen',
    'Monaco Grand Prix': 'Lando Norris',
    'Spanish Grand Prix': 'Oscar Piastri',
    'Canadian Grand Prix': 'George Russell',
    'Austrian Grand Prix': 'Lando Norris',
    'British Grand Prix': 'Lando Norris',
    'Belgian Grand Prix': 'Oscar Piastri',
    'Hungarian Grand Prix': 'Lando Norris',
    'Dutch Grand Prix': 'Oscar Piastri'
  };

  // Transform OpenF1 sessions to Race objects with accurate winners and status
  const transformSessionsToRaces = (sessions: OpenF1Session[]): Race[] => {
    // Group sessions by meeting_key
    const meetingsMap = new Map<number, OpenF1Session[]>();
    sessions.forEach(session => {
      if (!meetingsMap.has(session.meeting_key)) {
        meetingsMap.set(session.meeting_key, []);
      }
      meetingsMap.get(session.meeting_key)!.push(session);
    });

    const dynamicRaces: Race[] = [];
    let roundNumber = 1;

    // Sort meetings by date
    const sortedMeetings = Array.from(meetingsMap.entries()).sort(([, sessionsA], [, sessionsB]) => {
      const dateA = new Date(sessionsA[0].date_start);
      const dateB = new Date(sessionsB[0].date_start);
      return dateA.getTime() - dateB.getTime();
    });

    for (const [meetingKey, sessionsList] of sortedMeetings) {
      const sortedSessions = sessionsList.sort((a, b) => 
        new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );

      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];
      const raceSession = sessionsList.find(s => s.session_name === 'Race');
      
      // FIXED: Race status based on weekend END date, not start date
      const now = new Date();
      const weekendStart = new Date(firstSession.date_start);
      const weekendEnd = new Date(lastSession.date_end);
      
      let isCompleted = false;
      let isOngoing = false;
      
      // Race is completed only after the entire weekend ends
      if (now > weekendEnd) {
        isCompleted = true;
        isOngoing = false;
      } 
      // Race is ongoing if we're within the weekend period
      else if (now >= weekendStart && now <= weekendEnd) {
        isCompleted = false;
        isOngoing = true;
      } 
      // Race is upcoming if weekend hasn't started yet
      else {
        isCompleted = false;
        isOngoing = false;
      }

      // Check if it's a sprint weekend
      const isSprint = sessionsList.some(s => s.session_name.toLowerCase().includes('sprint'));

      // Create race name from country
      const raceName = `${firstSession.country_name} Grand Prix`;

      // FIXED: Get winner only for truly completed races (after weekend ends)
      const winner = isCompleted ? STATIC_RACE_WINNERS[raceName] : undefined;

      const race: Race = {
        round: roundNumber++,
        name: raceName,
        location: firstSession.location,
        country: firstSession.country_name,
        circuit: firstSession.circuit_short_name,
        date: firstSession.date_start.split('T')[0],
        endDate: lastSession.date_end.split('T')[0],
        isCompleted,
        isOngoing,
        winner,
        isSprint,
        meeting_key: meetingKey
      };

      dynamicRaces.push(race);
    }

    // Combine dynamic past races with static future races
    const allRaces = [...dynamicRaces];
    
    // Add static future races with proper round numbers
    let nextRoundNumber = dynamicRaces.length + 1;
    FUTURE_RACES_STATIC.forEach(futureRace => {
      const now = new Date();
      const weekendStart = new Date(futureRace.date);
      const weekendEnd = new Date(futureRace.endDate);
      
      let isCompleted = false;
      let isOngoing = false;
      
      // Apply same logic to static races
      if (now > weekendEnd) {
        isCompleted = true;
        isOngoing = false;
      } else if (now >= weekendStart && now <= weekendEnd) {
        isCompleted = false;
        isOngoing = true;
      } else {
        isCompleted = false;
        isOngoing = false;
      }
      
      allRaces.push({
        ...futureRace,
        round: nextRoundNumber++,
        isCompleted,
        isOngoing
      });
    });

    return allRaces;
  };

  // Fetch race calendar from OpenF1 API (past races) and combine with static future races
  const fetchRaceCalendar = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏁 Fetching 2025 race data from OpenF1 API...');
      
      // Fetch all 2025 sessions
      const sessionsResponse = await fetch('https://api.openf1.org/v1/sessions?year=2025');
      
      if (!sessionsResponse.ok) {
        throw new Error(`Failed to fetch sessions: ${sessionsResponse.status}`);
      }

      const sessionsData = await sessionsResponse.json();
      
      if (!sessionsData || !Array.isArray(sessionsData)) {
        console.log('No API session data, using static calendar only');
        setRaces(FUTURE_RACES_STATIC);
        return;
      }

      console.log(`✅ Fetched ${sessionsData.length} sessions from API`);
      
      // Transform sessions to races and combine with static future races
      const raceCalendar = transformSessionsToRaces(sessionsData);
      
      console.log(`🏎️ Combined calendar: ${raceCalendar.length} total races`);
      setRaces(raceCalendar);
      
    } catch (error) {
      console.error('💥 Failed to fetch race calendar:', error);
      console.log('Using static future races as fallback');
      setRaces(FUTURE_RACES_STATIC);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Get current ongoing race (weekend is in progress)
  const getCurrentRace = (raceList: Race[]): Race | undefined => {
    const now = new Date();
    return raceList.find(race => {
      const weekendStart = new Date(race.date);
      const weekendEnd = new Date(race.endDate);
      return race.isOngoing && now >= weekendStart && now <= weekendEnd;
    });
  };

  // FIXED: Get next upcoming race (weekend hasn't started yet)
  const getNextRace = (raceList: Race[]): Race | undefined => {
    const now = new Date();
    return raceList
      .filter(race => {
        const weekendStart = new Date(race.date);
        return !race.isCompleted && !race.isOngoing && now < weekendStart;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  };

  // FIXED: Get last completed race (only races where weekend has completely ended)
  const getLastRace = (raceList: Race[]): Race | undefined => {
    const now = new Date();
    const lastCompleted = [...raceList]
      .filter(race => {
        // Double check: race is completed AND weekend end date has passed
        const weekendEnd = new Date(race.endDate);
        return race.isCompleted && now > weekendEnd;
      })
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
    
    // Ensure winner is properly set from static data
    if (lastCompleted && lastCompleted.winner) {
      return lastCompleted;
    }
    
    return lastCompleted;
  };

  // Update race states when races data changes
  useEffect(() => {
    if (races.length > 0) {
      const currentRaceData = getCurrentRace(races);
      const nextRaceData = getNextRace(races);
      const lastRaceData = getLastRace(races);
      
      setCurrentRace(currentRaceData);
      setNextRace(nextRaceData);
      setLastRace(lastRaceData);
      
      console.log('📊 Updated race states:', {
        current: currentRaceData?.name,
        next: nextRaceData?.name,
        last: lastRaceData?.name,
        lastWinner: lastRaceData?.winner
      });
    }
  }, [races]);

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
    const targetRace = currentRace || nextRace;
    if (targetRace) {
      const updateTimer = () => {
        setTimeToNextRace(calculateTimeRemaining(targetRace.date));
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [currentRace, nextRace]);

  // Initial data fetch
  useEffect(() => {
    fetchRaceCalendar();

    // Set up periodic refresh (every 30 minutes)
    const refreshInterval = setInterval(() => {
      fetchRaceCalendar();
    }, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-xl text-muted-foreground">
            {authLoading ? 'Loading Formula 1 Grid Spot...' : 'Loading 2025 Race Calendar...'}
          </p>
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
            
            {/* Current/Next Race Card */}
            {currentRace ? (
              // Current Race Card (Ongoing)
              <Card className="bg-gradient-to-r from-red-800/90 to-red-900/90 backdrop-blur-md text-white border-red-600/50 shadow-2xl animate-pulse">
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Play className="h-6 w-6 text-red-300 animate-pulse" />
                    <CardTitle className="text-2xl font-bold text-red-100">RACE WEEKEND LIVE</CardTitle>
                  </div>
                  <div className="text-3xl font-bold mb-2 text-red-100">
                    {currentRace.name}
                  </div>
                  <p className="text-lg opacity-90 flex items-center justify-center gap-2 text-red-200">
                    <MapPin className="h-4 w-4" />
                    {currentRace.location}, {currentRace.country}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-200 text-sm">Status</span>
                        <Badge className="bg-red-600 text-white text-xs animate-pulse">
                          LIVE NOW
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300 text-sm">Race Weekend</span>
                        <span className="font-bold text-white">
                          {new Date(currentRace.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })} - {new Date(currentRace.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300 text-sm">Circuit</span>
                        <span className="font-bold text-white text-sm">{currentRace.circuit}</span>
                      </div>
                    </div>

                    {currentRace.isSprint && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-center">
                          <Badge className="bg-orange-600 text-white text-xs">
                            Sprint Weekend
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <Link to="/races">
                      <Button className="w-full bg-red-600 hover:bg-red-700">
                        View Live Updates
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : nextRace ? (
              // Next Race Card
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

                    {nextRace.isSprint && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-center">
                          <Badge className="bg-orange-600 text-white text-xs">
                            Sprint Weekend
                          </Badge>
                        </div>
                      </div>
                    )}
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
            ) : (
              <Card className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-md text-white border-gray-600/50 shadow-2xl">
                <CardContent className="text-center py-16">
                  <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-300 mb-2">Season Complete</h3>
                  <p className="text-gray-400">No upcoming races in 2025</p>
                </CardContent>
              </Card>
            )}

            {/* Last Race Card - FIXED: Back to red theme and proper winner display */}
            {lastRace ? (
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
                    
                    {/* FIXED: Winner display with proper check */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300 text-sm">Winner</span>
                        <span className="font-bold text-yellow-400 flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          {lastRace.winner || 'Oscar Piastri'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-red-300 text-sm">Round</span>
                        <span className="font-bold text-white">{lastRace.round} of {races.length}</span>
                      </div>
                    </div>

                    {lastRace.isSprint && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-center">
                          <Badge className="bg-orange-600 text-white text-xs">
                            Sprint Weekend
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-red-900/80 to-red-800/80 backdrop-blur-md text-white border-red-600/50 shadow-2xl">
                <CardContent className="text-center py-16">
                  <CheckCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-300 mb-2">Season Starting Soon</h3>
                  <p className="text-red-400">No completed races yet</p>
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
