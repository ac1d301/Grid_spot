import { useEffect, useState, useMemo } from 'react';
import { SEASON_YEAR } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Trophy, Timer, Flag, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

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

interface SessionResult {
  position: number;
  driver_number: number;
  full_name?: string;
  team_name?: string;
  session_key: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  duration?: number;
  gap_to_leader?: string;
  number_of_laps?: number;
}

interface Meeting {
  meeting_key: number;
  meeting_name: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
}

// No 2025 fallback; we pin to SEASON_YEAR sessions

const NextRaceHighlight = () => {
  const [sessions, setSessions] = useState<OpenF1Session[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [results, setResults] = useState<Record<string, SessionResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeToSessions, setTimeToSessions] = useState<Record<string, string>>({});
  const [usingFallback, setUsingFallback] = useState(false);

  // Convert UTC to IST
  const convertToIST = (utcDateString: string) => {
    const utcDate = new Date(utcDateString);
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate;
  };

  // Calculate time remaining
  const calculateTimeRemaining = (targetDate: Date) => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }
    return 'Live/Completed';
  };

  // No fallback window; always fetch SEASON_YEAR

  // Fetch next race data with improved error handling
  useEffect(() => {
    const fetchNextRaceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching race data...');
        
        // Try multiple API strategies for SEASON_YEAR data
        const apiStrategies = [
          // Try to get latest sessions first
          () => fetch('https://api.openf1.org/v1/sessions?meeting_key=latest'),
          // Try to get SEASON_YEAR sessions
          () => fetch(`https://api.openf1.org/v1/sessions?year=${SEASON_YEAR}`),
          // Fallback to any recent sessions
          () => fetch('https://api.openf1.org/v1/sessions')
        ];

        let allSessions: OpenF1Session[] = [];
        let apiWorked = false;
        
        for (let i = 0; i < apiStrategies.length; i++) {
          try {
            console.log(`Trying API strategy ${i + 1}...`);
            const response = await apiStrategies[i]();
            
            if (!response.ok) {
              console.log(`API strategy ${i + 1} failed with status:`, response.status);
              continue;
            }
            
            const data = await response.json();
            console.log(`API strategy ${i + 1} returned:`, data?.length || 0, 'sessions');
            
            if (data && Array.isArray(data) && data.length > 0) {
              // Filter for SEASON_YEAR sessions or upcoming sessions
              const filteredSessions = data.filter((session: OpenF1Session) => {
                const sessionDate = new Date(session.date_start);
                const now = new Date();
                return session.year === SEASON_YEAR || sessionDate > now;
              });
              
              if (filteredSessions.length > 0) {
                allSessions = filteredSessions;
                apiWorked = true;
                console.log(`Found ${filteredSessions.length} relevant sessions`);
                break;
              }
            }
          } catch (err) {
            console.log(`API strategy ${i + 1} error:`, err);
            continue;
          }
        }

        if (apiWorked && allSessions.length > 0) {
          // Find next upcoming meeting
          const now = new Date();
          const upcomingSessions = allSessions
            .filter((session: OpenF1Session) => new Date(session.date_start) > now)
            .sort((a: OpenF1Session, b: OpenF1Session) => 
              new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
            );

          if (upcomingSessions.length > 0) {
            const nextMeetingKey = upcomingSessions[0].meeting_key;
            const nextMeetingSessions = allSessions.filter((session: OpenF1Session) => 
              session.meeting_key === nextMeetingKey
            );

            setSessions(nextMeetingSessions);
            
            const firstSession = nextMeetingSessions[0];
            setMeeting({
              meeting_key: firstSession.meeting_key,
              meeting_name: `${firstSession.country_name} Grand Prix`,
              location: firstSession.location,
              country_name: firstSession.country_name,
              circuit_short_name: firstSession.circuit_short_name,
              date_start: firstSession.date_start
            });
            
            setUsingFallback(false);
            console.log('Successfully loaded API data for:', firstSession.country_name);
          } else {
            throw new Error('No upcoming sessions found in API data');
          }
        } else {
          throw new Error('No valid data from any API strategy');
        }

      } catch (error) {
        console.error('All API strategies failed:', error);
        
        setError('Unable to load race data for the selected season.');
      } finally {
        setLoading(false);
      }
    };

    fetchNextRaceData();
  }, []);

  // Fetch results for sessions (only if not using fallback)
  useEffect(() => {
    if (sessions.length === 0 || usingFallback) return;

    const fetchResults = async () => {
      const resultsPromises = sessions.map(async (session: OpenF1Session) => {
        try {
          const response = await fetch(
            `https://api.openf1.org/v1/session_result?session_key=${session.session_key}&position<=3`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const sessionResults = await response.json();
          return {
            sessionName: session.session_name,
            results: sessionResults || []
          };
        } catch (error) {
          console.log(`Failed to fetch results for ${session.session_name}:`, error);
          return {
            sessionName: session.session_name,
            results: []
          };
        }
      });

      const allResults = await Promise.all(resultsPromises);
      const resultsMap: Record<string, SessionResult[]> = {};
      
      allResults.forEach(({ sessionName, results }) => {
        resultsMap[sessionName] = results;
      });

      setResults(resultsMap);
    };

    fetchResults();
  }, [sessions, usingFallback]);

  // Update countdown timers
  useEffect(() => {
    const updateTimers = () => {
      const timers: Record<string, string> = {};
      sessions.forEach(session => {
        const istDate = convertToIST(session.date_start);
        timers[session.session_key.toString()] = calculateTimeRemaining(istDate);
      });
      setTimeToSessions(timers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Get next upcoming session
  const nextSession = useMemo(() => {
    const now = new Date();
    
    return sessions
      .filter(session => convertToIST(session.date_start) > now)
      .sort((a, b) => 
        convertToIST(a.date_start).getTime() - convertToIST(b.date_start).getTime()
      )[0];
  }, [sessions]);

  // Get winner from results
  const getWinner = (sessionName: string) => {
    if (usingFallback) {
      // Mock results for fallback data - sessions haven't happened yet
      return '—';
    }

    const sessionResults = results[sessionName];
    if (!sessionResults || sessionResults.length === 0) return '—';
    
    const winner = sessionResults.find(result => result.position === 1);
    return winner ? (winner.full_name || `Driver #${winner.driver_number}`) : '—';
  };

  // Get session status
  const getSessionStatus = (session: OpenF1Session) => {
    const now = new Date();
    const sessionStart = convertToIST(session.date_start);
    const sessionEnd = convertToIST(session.date_end);

    if (now > sessionEnd) {
      return 'completed';
    } else if (now >= sessionStart && now <= sessionEnd) {
      return 'live';
    } else {
      return 'upcoming';
    }
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="h-8 bg-muted rounded w-1/2 mx-auto animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !usingFallback) {
    return (
      <Card className="mb-8 border-orange-200 bg-orange-50">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <p className="text-orange-700 font-medium mb-2">Unable to load live race data</p>
          <p className="text-orange-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!meeting || sessions.length === 0) {
    return (
      <Card className="mb-8 border-gray-200">
        <CardContent className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming races found</p>
          <p className="text-gray-400 text-sm mt-2">Check back during race weekends for live data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white border-red-500 shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Flag className="h-6 w-6 text-yellow-300" />
          <CardTitle className="text-2xl font-bold">NEXT RACE</CardTitle>
          {usingFallback && (
            <Badge className="bg-yellow-500 text-black text-xs">
              PREVIEW
            </Badge>
          )}
        </div>
        <div className="text-4xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
          {meeting.meeting_name.toUpperCase()}
        </div>
        <p className="text-red-100 text-lg flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4" />
          {meeting.circuit_short_name} • {meeting.location}
        </p>
        {usingFallback && (
          <p className="text-yellow-300 text-sm mt-2">
            ⚠️ Preview Mode - Live data will be available during race weekend
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Session Schedule */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Schedule (IST)
            </h3>
            
            <div className="space-y-3">
              {sessions
                .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
                .map((session) => {
                  const istDate = convertToIST(session.date_start);
                  const isNext = nextSession?.session_key === session.session_key;
                  const status = getSessionStatus(session);
                  
                  return (
                    <div 
                      key={session.session_key}
                      className={`rounded-lg p-4 ${
                        isNext 
                          ? 'bg-yellow-500/20 border-2 border-yellow-400' 
                          : status === 'completed'
                          ? 'bg-green-500/20 border border-green-400'
                          : 'bg-black/20'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{session.session_name}</span>
                        <div className="flex gap-2">
                          {status === 'completed' && (
                            <Badge className="bg-green-500 text-white text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              DONE
                            </Badge>
                          )}
                          {status === 'live' && (
                            <Badge className="bg-red-500 text-white text-xs animate-pulse">
                              LIVE
                            </Badge>
                          )}
                          {isNext && status === 'upcoming' && (
                            <Badge className="bg-yellow-500 text-black font-bold text-xs">
                              NEXT UP
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-red-200 mb-1">
                        {istDate.toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      
                      <div className="text-lg font-bold mb-2">
                        {istDate.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })} IST
                      </div>
                      
                      {status === 'upcoming' && (
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-yellow-400" />
                          <span className="text-yellow-300 font-mono text-lg">
                            {timeToSessions[session.session_key.toString()] || 'Calculating...'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Results Summary & Track Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Session Results
            </h3>
            
            <div className="bg-black/20 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Practice (Fastest):</span>
                  <span className="font-bold">
                    {getWinner('Practice 1') !== '—' ? getWinner('Practice 1') : 
                     getWinner('Practice 3') !== '—' ? getWinner('Practice 3') : '—'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Qualifying (Pole):</span>
                  <span className="font-bold">{getWinner('Qualifying')}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Sprint:</span>
                  <span className="font-bold">{getWinner('Sprint')}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Race Winner:</span>
                  <span className="font-bold text-yellow-300">{getWinner('Race')}</span>
                </div>
              </div>
            </div>

            {/* Track Info for Spa */}
            {meeting.circuit_short_name === 'Spa-Francorchamps' && (
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Circuit de Spa-Francorchamps
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-200">Length:</span>
                    <span className="font-bold">7.004 km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-200">Corners:</span>
                    <span className="font-bold">19</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-200">Laps:</span>
                    <span className="font-bold">44</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-200">DRS Zones:</span>
                    <span className="font-bold">3</span>
                  </div>
                </div>
                <div className="text-center mt-2 text-xs text-red-200">
                  Famous for Eau Rouge/Raidillon complex
                </div>
              </div>
            )}

            {/* Championship Context */}
            <div className="bg-black/30 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                2025 Championship
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">P1</div>
                  <div className="text-sm">Oscar Piastri</div>
                  <div className="text-xs text-red-200">234 points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-300">P2</div>
                  <div className="text-sm">Lando Norris</div>
                  <div className="text-xs text-red-200">226 points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-400">P3</div>
                  <div className="text-sm">Max Verstappen</div>
                  <div className="text-xs text-red-200">165 points</div>
                </div>
              </div>
              <div className="text-center mt-3">
                <p className="text-sm text-red-200">
                  McLaren leads both championships
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NextRaceHighlight;
