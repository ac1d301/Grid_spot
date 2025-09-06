import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Trophy, Timer, Flag, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/contexts/AuthContext';

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
}

interface Driver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name?: string;
}

interface RaceStatus {
  status: 'live' | 'this_weekend' | 'upcoming' | 'just_finished' | 'completed' | 'season_ended';
  title: string;
  badge?: {
    text: string;
    class: string;
  };
}

const NextRaceHighlight = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sessions, setSessions] = useState<OpenF1Session[]>([]);
  const [results, setResults] = useState<Record<string, SessionResult[]>>({});
  const [drivers, setDrivers] = useState<Record<number, Driver>>({});
  const [timeToSessions, setTimeToSessions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [raceStatus, setRaceStatus] = useState<RaceStatus>({ status: 'upcoming', title: 'NEXT RACE' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Authentication check - redirect if not authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-xl text-muted-foreground">Loading Formula 1 Hub...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // FIXED: Proper UTC to IST conversion
  const convertToIST = (utcDateString: string) => {
    const utcDate = new Date(utcDateString);
    // Use proper timezone conversion to IST (Asia/Kolkata)
    return new Date(utcDate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  };

  // FIXED: Alternative IST conversion method for display
  const formatInIST = (utcDateString: string) => {
    const utcDate = new Date(utcDateString);
    return utcDate.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: true,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate time remaining or time since
  const calculateTimeRemaining = (targetDate: Date) => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();
    const absDifference = Math.abs(difference);

    const days = Math.floor(absDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDifference % (1000 * 60 * 60)) / (1000 * 60));

    if (difference > 0) {
      // Future
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } else {
      // Past
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      return `${minutes}m ago`;
    }
  };

  // FIXED: Improved race status determination logic - using IST consistently
  const determineRaceStatus = (sessionsList: OpenF1Session[]): RaceStatus => {
    if (!sessionsList.length) {
      return {
        status: 'season_ended',
        title: 'SEASON ENDED',
        badge: { text: 'SEASON ENDED', class: 'bg-gray-700 text-white' }
      };
    }

    const nowIST = new Date();
    const sortedSessions = [...sessionsList].sort((a, b) => 
      convertToIST(a.date_start).getTime() - convertToIST(b.date_start).getTime()
    );
    
    const raceSession = sessionsList.find(s => s.session_name === 'Race');
    
    if (!raceSession) {
      // If all sessions are in the past (using IST)
      const allSessionsCompleted = sessionsList.every(s => convertToIST(s.date_end) < nowIST);
      if (allSessionsCompleted) {
        return {
          status: 'completed',
          title: 'LAST RACE',
          badge: { text: 'COMPLETED', class: 'bg-red-800 text-white' }
        };
      }
      return { status: 'upcoming', title: 'NEXT RACE' };
    }

    const raceStartIST = convertToIST(raceSession.date_start);
    const raceEndIST = convertToIST(raceSession.date_end);
    const firstSession = sortedSessions[0];
    const weekendStartIST = convertToIST(firstSession.date_start);
    
    // Extend weekend end to 4 hours after race end for better detection
    const weekendEndIST = new Date(raceEndIST.getTime() + (4 * 60 * 60 * 1000));

    // Check if any session is currently live (using IST)
    const liveSession = sessionsList.find(session => {
      const sessionStartIST = convertToIST(session.date_start);
      const sessionEndIST = convertToIST(session.date_end);
      return nowIST >= sessionStartIST && nowIST <= sessionEndIST;
    });

    if (liveSession) {
      return {
        status: 'live',
        title: `${liveSession.session_name.toUpperCase()} IS LIVE`,
        badge: { text: `${liveSession.session_name} LIVE`, class: 'bg-red-600 text-white animate-pulse' }
      };
    }

    // FIXED: Better race weekend detection using IST
    // Check if we're within the race weekend period (from first session start to 4 hours after race end)
    if (nowIST >= weekendStartIST && nowIST <= weekendEndIST) {
      // If race has finished but we're still within weekend period
      if (nowIST > raceEndIST) {
        return {
          status: 'just_finished',
          title: 'RACE FINISHED',
          badge: { text: 'JUST FINISHED', class: 'bg-red-700 text-white' }
        };
      }
      
      return {
        status: 'this_weekend',
        title: 'THIS WEEKEND',
        badge: { text: 'RACE WEEKEND', class: 'bg-red-500 text-white' }
      };
    }

    // FIXED: Improved completed race detection using IST
      // If race has ended and we're past the weekend period
      if (nowIST > raceEndIST) {
        // Check if race finished within last 24 hours for "just finished" status (using IST)
        const hoursSinceRace = (nowIST.getTime() - raceEndIST.getTime()) / (1000 * 60 * 60);
        if (hoursSinceRace <= 24) {
          return {
            status: 'just_finished',
            title: 'RACE JUST FINISHED',
            badge: { text: 'JUST FINISHED', class: 'bg-red-700 text-white animate-pulse' }
          };
        }      return {
        status: 'completed',
        title: 'LAST RACE',
        badge: { text: 'COMPLETED', class: 'bg-red-800 text-white' }
      };
    }

    // Default to upcoming race
    return { 
      status: 'upcoming', 
      title: 'NEXT RACE' 
    };
  };

  // FIXED: Improved session status detection using IST consistently
  const getSessionStatus = (session: OpenF1Session) => {
    const nowIST = new Date();
    const sessionStartIST = convertToIST(session.date_start);
    const sessionEndIST = convertToIST(session.date_end);

    if (nowIST > sessionEndIST) {
      return 'completed';
    } else if (nowIST >= sessionStartIST && nowIST <= sessionEndIST) {
      return 'live';
    } else {
      return 'upcoming';
    }
  };

  // Fetch driver information
  const fetchDrivers = async () => {
    try {
      console.log('Fetching driver information...');
      const response = await fetch('https://api.openf1.org/v1/drivers');
      
      if (response.ok) {
        const driverData = await response.json();
        const driverMap: Record<number, Driver> = {};
        
        driverData.forEach((driver: Driver) => {
          if (driver.driver_number) {
            driverMap[driver.driver_number] = driver;
          }
        });
        
        setDrivers(driverMap);
        console.log('Loaded', Object.keys(driverMap).length, 'drivers');
      }
    } catch (error) {
      console.log('Failed to fetch drivers:', error);
    }
  };

  // Main data fetching function
  const fetchRaceData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setIsRefreshing(true);
    
    console.log('Starting F1 data fetch...');

    try {
      console.log('Attempting OpenF1 API calls...');
      
      // Prioritize 2025 data, then fall back to latest
      const apiUrls = [
        'https://api.openf1.org/v1/sessions?year=2025',
        'https://api.openf1.org/v1/sessions?meeting_key=latest'
      ];

      let allSessions: OpenF1Session[] = [];
      let apiWorked = false;
      
      for (let i = 0; i < apiUrls.length; i++) {
        try {
          console.log(`Trying API ${i + 1}: ${apiUrls[i]}`);
          const response = await fetch(apiUrls[i]);
          
          if (!response.ok) {
            console.log(`API ${i + 1} failed with status:`, response.status);
            continue;
          }
          
          const data = await response.json();
          console.log(`API ${i + 1} returned:`, data?.length || 0, 'sessions');
          
          if (data && Array.isArray(data) && data.length > 0) {
            allSessions = data;
            apiWorked = true;
            break;
          }
        } catch (err) {
          console.log(`API ${i + 1} error:`, err);
          continue;
        }
      }

      if (!apiWorked || allSessions.length === 0) {
        throw new Error('No valid API data found');
      }

      // Filter to 2025 sessions if available
      const sessions2025 = allSessions.filter(session => session.year === 2025);
      const targetSessions = sessions2025.length > 0 ? sessions2025 : allSessions;

      // Get current date
      const now = new Date();
      
      // Group sessions by meeting_key
      const meetingsMap = new Map<number, OpenF1Session[]>();
      targetSessions.forEach(session => {
        if (!meetingsMap.has(session.meeting_key)) {
          meetingsMap.set(session.meeting_key, []);
        }
        meetingsMap.get(session.meeting_key)!.push(session);
      });

      // Convert to array and sort by first session date
      const meetings = Array.from(meetingsMap.entries()).map(([key, sessionsList]) => {
        const sortedSessions = sessionsList.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        
        return {
          meeting_key: key,
          sessions: sortedSessions,
          firstSessionDate: new Date(sortedSessions[0].date_start),
          raceDate: new Date(sortedSessions.find(s => s.session_name === 'Race')?.date_start || sortedSessions[0].date_start),
          raceEndDate: new Date(sortedSessions.find(s => s.session_name === 'Race')?.date_end || sortedSessions[0].date_end)
        };
      }).sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());

      // Get the most recently completed race
      const completedMeetings = meetings.filter(meeting => meeting.raceEndDate < now);
      const lastCompletedRace = completedMeetings[completedMeetings.length - 1];

      let targetMeeting;

      // Find current race weekend based on end time with extended window
      const currentWeekendMeeting = meetings.find(meeting => {
        const raceSession = meeting.sessions.find(s => s.session_name === 'Race');
        if (!raceSession) return false;
        
        const raceEndDate = new Date(raceSession.date_end);
        // Add 6 hours after race end for post-race coverage
        const weekendEnd = new Date(raceEndDate.getTime() + (6 * 60 * 60 * 1000));
        // Start window 12 hours before first session
        const weekendStart = new Date(meeting.firstSessionDate.getTime() - (12 * 60 * 60 * 1000));

        // Check if first session has started
        const firstSessionStarted = now >= meeting.firstSessionDate;
        
        // If we're in the weekend window but first session hasn't started,
        // we should show the last completed race instead
        if (now >= weekendStart && now <= weekendEnd) {
          return firstSessionStarted;
        }
        return false;
      });

      if (currentWeekendMeeting) {
        targetMeeting = currentWeekendMeeting;
        console.log('Using current race weekend');
      } else {
        // Find next upcoming meeting
        const nextMeeting = meetings.find(meeting => meeting.raceDate > now);
        
        if (!nextMeeting) {
          // No upcoming meetings, use last completed race
          targetMeeting = lastCompletedRace;
          console.log('Using most recent completed race');
        } else {
          // If the next meeting's first session hasn't started yet, show last completed race
          if (now < nextMeeting.firstSessionDate && lastCompletedRace) {
            targetMeeting = lastCompletedRace;
            console.log('Using most recent completed race (next race session not started)');
          } else {
            targetMeeting = nextMeeting;
            console.log('Using next upcoming race');
          }
        }
      }

      if (!targetMeeting) {
        throw new Error('No suitable meeting found');
      }

      setSessions(targetMeeting.sessions);
      
      // Determine race status
      const status = determineRaceStatus(targetMeeting.sessions);
      setRaceStatus(status);
      
      setApiError(null);
      setLastUpdated(new Date());
      console.log('Successfully loaded race data for:', targetMeeting.sessions[0]?.country_name);

    } catch (error) {
      console.log('All APIs failed:', error);
      setApiError('Unable to load race data');
      setSessions([]);
    } finally {
      if (!isRefresh) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  // Fetch results for sessions
  const fetchResults = async (sessionsList: OpenF1Session[]) => {
    if (sessionsList.length === 0) return;

                    console.log('Fetching session results...');
    
    const mainSessions = sessionsList.filter(session => 
      ['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Race'].includes(session.session_name) ||
      session.session_type === 'Practice' || 
      session.session_type === 'Qualifying' || 
      session.session_type === 'Race'
    );

    const resultsPromises = mainSessions.map(async (session: OpenF1Session) => {
      try {
        const response = await fetch(
          `https://api.openf1.org/v1/session_result?session_key=${session.session_key}&position<=3`
        );
        
        if (!response.ok) {
          console.log(`No results for ${session.session_name} (${response.status})`);
          return { sessionName: session.session_name, results: [] };
        }
        
        const sessionResults = await response.json();
        console.log(`Results for ${session.session_name}:`, sessionResults?.length || 0);
        
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

  // CONSOLIDATED DATA FETCHING - Single useEffect to prevent double fetch
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchAllData = async (isRefresh = false) => {
      try {
        // Fetch drivers only once (not on refresh)
        if (!isRefresh && Object.keys(drivers).length === 0) {
          await fetchDrivers();
        }
        
        // Fetch race data
        await fetchRaceData(isRefresh);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    // Initial fetch
    fetchAllData();

    // Set up auto-refresh interval (every 2 minutes)
    intervalId = setInterval(() => {
      fetchAllData(true);
    }, 2 * 60 * 1000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array - runs only once on mount

  // Fetch results when sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      fetchResults(sessions);
    }
  }, [sessions]); // Only depends on sessions

  // FIXED: Update countdown timers with proper IST conversion
  useEffect(() => {
    const updateTimers = () => {
      const timers: Record<string, string> = {};
      sessions.forEach(session => {
        const sessionStart = new Date(session.date_start);
        timers[session.session_key.toString()] = calculateTimeRemaining(sessionStart);
      });
      setTimeToSessions(timers);
    };

    if (sessions.length > 0) {
      updateTimers();
      const interval = setInterval(updateTimers, 1000);
      return () => clearInterval(interval);
    }
  }, [sessions]);

  // FIXED: Get next upcoming session with proper date handling
  const nextSession = sessions
    .filter(session => new Date(session.date_start) > new Date())
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())[0];

  // Get winner from results
  const getWinner = (sessionName: string) => {
    const sessionResults = results[sessionName];
    if (!sessionResults || sessionResults.length === 0) return '—';
    
    const winner = sessionResults.find(result => result.position === 1);
    if (!winner) return '—';

    const driverInfo = drivers[winner.driver_number];
    const driverName = winner.full_name || driverInfo?.full_name || driverInfo?.name_acronym || '';
    const driverNumber = winner.driver_number;

    if (sessionName === 'Race') {
      if (driverName) {
        return `#${driverNumber} ${driverName}`;
      }
      return `Driver #${driverNumber}`;
    }

    if (driverName) {
      return driverName;
    }
    return `Driver #${driverNumber}`;
  };

  // Manual refresh handler
  const handleRefresh = () => {
    fetchRaceData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="h-8 bg-zinc-800 rounded w-1/2 mx-auto animate-pulse" />
            </CardHeader>
            <CardContent>
              <LoadingSkeleton lines={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (apiError || sessions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-zinc-100 font-medium">No race data available</p>
              <p className="text-zinc-400 text-sm mt-2">Please check back during race weekends</p>
              <button 
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const meetingInfo = sessions[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white shadow-2xl shadow-red-900/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center pb-8 border-b border-zinc-800/50">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Flag className="h-6 w-6 text-red-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">
                {raceStatus.title}
              </h1>
              {raceStatus.badge && (
                <Badge className={`text-sm font-bold ${raceStatus.badge.class}`}>
                  {raceStatus.badge.text}
                </Badge>
              )}
            </div>
            
            <div className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent mb-4">
              {(meetingInfo?.country_name || '').toUpperCase()} GRAND PRIX
            </div>
            
            <p className="text-zinc-300 text-lg flex items-center justify-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-red-400" />
              {meetingInfo?.circuit_short_name} • {meetingInfo?.location}
            </p>
            
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <p className="text-red-400 text-sm font-semibold">
                Round {meetingInfo?.year === 2025 ? '15' : '14'} of 24 • {meetingInfo?.year}
              </p>
              {lastUpdated && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Clock className="h-3 w-3" />
                  <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Session Schedule */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2 text-zinc-100">
                <Clock className="h-5 w-5 text-red-400" />
                Session Schedule (IST)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions
                .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
                .map((session) => {
                  const sessionDate = new Date(session.date_start);
                  const istFormatted = formatInIST(session.date_start);
                  const isNext = nextSession?.session_key === session.session_key;
                  const status = getSessionStatus(session);
                  
                  return (
                    <div 
                      key={session.session_key}
                      className={`rounded-lg p-4 border transition-all ${
                        status === 'live'
                          ? 'bg-red-500/20 border-red-500/50 shadow-red-500/30 shadow-lg animate-pulse' 
                        : isNext 
                          ? 'bg-red-500/10 border-red-500/30 shadow-red-500/20 shadow-lg' 
                          : status === 'completed'
                          ? 'bg-red-900/10 border-red-800/30'
                          : 'bg-zinc-800/30 border-zinc-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-zinc-100">{session.session_name}</span>
                        <div className="flex gap-2">
                          {status === 'completed' && (
                            <Badge className="bg-red-800/20 text-red-400 border border-red-700/30 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              DONE
                            </Badge>
                          )}
                          {status === 'live' && (
                            <Badge className="bg-red-600 text-white text-xs animate-pulse font-bold">
                              LIVE NOW
                            </Badge>
                          )}
                          {isNext && status === 'upcoming' && (
                            <Badge className="bg-red-500 text-white font-bold text-xs">
                              NEXT UP
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-zinc-400 mb-1">
                        {sessionDate.toLocaleDateString('en-US', {
                          timeZone: 'Asia/Kolkata',
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </div>
                      
                      <div className="text-lg font-bold mb-2 text-zinc-200">
                        {sessionDate.toLocaleTimeString('en-US', {
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })} IST
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Timer className={`h-4 w-4 ${status === 'live' ? 'text-red-400 animate-pulse' : 'text-red-400'}`} />
                        <span className={`font-mono text-sm font-medium ${status === 'live' ? 'text-red-400 font-bold' : 'text-red-400'}`}>
                          {timeToSessions[session.session_key.toString()] || 'Loading...'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Results and Track Info */}
          <div className="space-y-6">
            {/* Session Results */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-zinc-100">
                  <Trophy className="h-5 w-5 text-red-400" />
                  Session Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-zinc-700/30">
                    <span className="text-sm font-medium text-zinc-300">Practice 1 (Fastest):</span>
                    <span className="font-bold text-zinc-100">
                      {getWinner('Practice 1')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-zinc-700/30">
                    <span className="text-sm font-medium text-zinc-300">Practice 2 (Fastest):</span>
                    <span className="font-bold text-zinc-100">
                      {getWinner('Practice 2')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-zinc-700/30">
                    <span className="text-sm font-medium text-zinc-300">Practice 3 (Fastest):</span>
                    <span className="font-bold text-zinc-100">
                      {getWinner('Practice 3')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-zinc-700/30">
                    <span className="text-sm font-medium text-zinc-300">Qualifying (Pole):</span>
                    <span className="font-bold text-zinc-100">{getWinner('Qualifying')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-medium text-zinc-300">Race Winner:</span>
                    <div className="text-right">
                      <span className="font-bold text-red-400 text-lg block">
                        {getWinner('Race')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Track Info */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-zinc-100">
                  <MapPin className="h-5 w-5 text-red-400" />
                  {meetingInfo?.circuit_short_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Location:</span>
                    <span className="font-bold text-zinc-200">{meetingInfo?.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Country:</span>
                    <span className="font-bold text-zinc-200">{meetingInfo?.country_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Year:</span>
                    <span className="font-bold text-zinc-200">{meetingInfo?.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">GMT Offset:</span>
                    <span className="font-bold text-zinc-200">{meetingInfo?.gmt_offset}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextRaceHighlight;
