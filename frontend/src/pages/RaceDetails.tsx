import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Trophy, Flag, Timer } from 'lucide-react';

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

const RaceCalendar = () => {
  const [timeToNextRace, setTimeToNextRace] = useState<string>('');

  // Official 2025 F1 Calendar
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
    {
      round: 5,
      name: 'Saudi Arabian Grand Prix',
      location: 'Jeddah',
      country: 'Saudi Arabia',
      circuit: 'Jeddah Corniche Circuit',
      date: '2025-04-18',
      endDate: '2025-04-20',
      isCompleted: true,
      winner: 'Oscar Piastri'
    },
    {
      round: 6,
      name: 'Miami Grand Prix',
      location: 'Miami',
      country: 'USA',
      circuit: 'Miami International Autodrome',
      date: '2025-05-02',
      endDate: '2025-05-04',
      isCompleted: true,
      winner: 'Oscar Piastri',
      isSprint: true
    },
    {
      round: 7,
      name: 'Emilia Romagna Grand Prix',
      location: 'Imola',
      country: 'Italy',
      circuit: 'Autodromo Enzo e Dino Ferrari',
      date: '2025-05-16',
      endDate: '2025-05-18',
      isCompleted: true,
      winner: 'Max Verstappen'
    },
    {
      round: 8,
      name: 'Monaco Grand Prix',
      location: 'Monaco',
      country: 'Monaco',
      circuit: 'Circuit de Monaco',
      date: '2025-05-23',
      endDate: '2025-05-25',
      isCompleted: true,
      winner: 'Lando Norris'
    },
    {
      round: 9,
      name: 'Spanish Grand Prix',
      location: 'Barcelona',
      country: 'Spain',
      circuit: 'Circuit de Barcelona-Catalunya',
      date: '2025-05-30',
      endDate: '2025-06-01',
      isCompleted: true,
      winner: 'Oscar Piastri'
    },
    {
      round: 10,
      name: 'Canadian Grand Prix',
      location: 'Montreal',
      country: 'Canada',
      circuit: 'Circuit Gilles Villeneuve',
      date: '2025-06-13',
      endDate: '2025-06-15',
      isCompleted: true,
      winner: 'George Russell'
    },
    {
      round: 11,
      name: 'Austrian Grand Prix',
      location: 'Spielberg',
      country: 'Austria',
      circuit: 'Red Bull Ring',
      date: '2025-06-27',
      endDate: '2025-06-29',
      isCompleted: true,
      winner: 'Lando Norris'
    },
    {
      round: 12,
      name: 'British Grand Prix',
      location: 'Silverstone',
      country: 'United Kingdom',
      circuit: 'Silverstone Circuit',
      date: '2025-07-04',
      endDate: '2025-07-06',
      isCompleted: true,
      winner: 'Lando Norris'
    },
    {
      round: 13,
      name: 'Belgian Grand Prix',
      location: 'Spa-Francorchamps',
      country: 'Belgium',
      circuit: 'Circuit de Spa-Francorchamps',
      date: '2025-07-25',
      endDate: '2025-07-27',
      isCompleted: true,
      winner: 'Oscar Piastri',
      isSprint: true
    },
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
      isCompleted: true,
      winner: 'Oscar Piastri'
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
    },
    {
      round: 17,
      name: 'Azerbaijan Grand Prix',
      location: 'Baku',
      country: 'Azerbaijan',
      circuit: 'Baku City Circuit',
      date: '2025-09-19',
      endDate: '2025-09-21',
      isCompleted: false
    },
    {
      round: 18,
      name: 'Singapore Grand Prix',
      location: 'Singapore',
      country: 'Singapore',
      circuit: 'Marina Bay Street Circuit',
      date: '2025-10-03',
      endDate: '2025-10-05',
      isCompleted: false
    },
    {
      round: 19,
      name: 'United States Grand Prix',
      location: 'Austin',
      country: 'USA',
      circuit: 'Circuit of The Americas',
      date: '2025-10-17',
      endDate: '2025-10-19',
      isCompleted: false,
      isSprint: true
    },
    {
      round: 20,
      name: 'Mexico City Grand Prix',
      location: 'Mexico City',
      country: 'Mexico',
      circuit: 'Autodromo Hermanos Rodriguez',
      date: '2025-10-24',
      endDate: '2025-10-26',
      isCompleted: false
    },
    {
      round: 21,
      name: 'Brazilian Grand Prix',
      location: 'Sao Paulo',
      country: 'Brazil',
      circuit: 'Autodromo Jose Carlos Pace',
      date: '2025-11-07',
      endDate: '2025-11-09',
      isCompleted: false,
      isSprint: true
    },
    {
      round: 22,
      name: 'Las Vegas Grand Prix',
      location: 'Las Vegas',
      country: 'USA',
      circuit: 'Las Vegas Street Circuit',
      date: '2025-11-20',
      endDate: '2025-11-22',
      isCompleted: false
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
      isCompleted: false
    }
  ];

  // Find next race
  const getNextRace = () => {
    const now = new Date();
    return RACE_CALENDAR_2025.find(race => new Date(race.date) > now);
  };

  const nextRace = getNextRace();

  // Calculate countdown to next race
  const calculateTimeRemaining = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const difference = target.getTime() - now.getTime();

    if (difference <= 0) return 'Race Weekend';

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} days, ${hours} hours`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes`;
    return `${minutes} minutes`;
  };

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      if (nextRace) {
        setTimeToNextRace(calculateTimeRemaining(nextRace.date));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextRace]);

  // Get race status
  const getRaceStatus = (race: Race) => {
    const now = new Date();
    const raceDate = new Date(race.date);
    const endDate = new Date(race.endDate);

    if (now >= raceDate && now <= endDate) {
      return { status: 'live', text: 'LIVE', class: 'bg-red-600 text-white animate-pulse' };
    } else if (race.isCompleted) {
      return { status: 'completed', text: 'FINISHED', class: 'bg-green-900 text-white' };
    } else {
      return { status: 'upcoming', text: 'UPCOMING', class: 'bg-blue-800 text-white' };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            2025 FORMULA 1 <span className="text-red-600">CALENDAR</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            24 Races Around the World
          </p>
        </div>

        {/* Next Race Highlight */}
        {nextRace && (
          <Card className="mb-8 bg-red-900/20 text-white border-red-500 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flag className="h-8 w-8" />
                <CardTitle className="text-3xl font-bold">NEXT RACE</CardTitle>
              </div>
              <div className="text-5xl font-bold mb-2">
                {nextRace.name.toUpperCase()}
              </div>
              <p className="text-xl opacity-90 flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5" />
                {nextRace.location}, {nextRace.country}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="grid md:grid-cols-3 gap-4 text-lg">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-semibold">Race Weekend</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {new Date(nextRace.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })} - {new Date(nextRace.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Timer className="h-5 w-5" />
                    <span className="font-semibold">Time Remaining</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {timeToNextRace}
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="h-5 w-5" />
                    <span className="font-semibold">Circuit</span>
                  </div>
                  <div className="text-lg font-bold">
                    {nextRace.circuit}
                  </div>
                </div>
              </div>

              {nextRace.isSprint && (
                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
                  <Badge className="bg-orange-500 text-white">
                    Sprint Weekend
                  </Badge>
                  <p className="text-sm mt-1">
                    This weekend features a Sprint Qualifying and Sprint Race
                  </p>
                </div>
              )}

              <div className="text-lg font-semibold">
                Round {nextRace.round} of 24
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {RACE_CALENDAR_2025.map((race) => {
            const status = getRaceStatus(race);
            const isNextRace = nextRace?.round === race.round;
            
            return (
              <Card 
                key={race.round}
                className={`relative transition-all duration-300 hover:scale-105 ${
                  isNextRace 
                    ? 'border-red-500 shadow-md shadow-red-500/20 bg-red-900/20' 
                    : 'border-border'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-muted-foreground">
                      Round {race.round}
                    </div>
                    <Badge className={`text-xs ${status.class}`}>
                      {status.text}
                    </Badge>
                  </div>
                  
                  <CardTitle className={`text-lg leading-tight ${
                    isNextRace ? 'text-red-600' : ''
                  }`}>
                    {race.name}
                  </CardTitle>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {race.location}, {race.country}
                  </div>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(race.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })} - {new Date(race.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {race.circuit}
                    </div>

                    {race.isSprint && (
                      <Badge variant="outline" className="text-xs bg-yellow-500 text-white">
                        Sprint Weekend
                      </Badge>
                    )}

                    {race.winner && (
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-red-600">
                          Winner: {race.winner}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calendar Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {RACE_CALENDAR_2025.filter(race => race.isCompleted).length}
              </div>
              <div className="text-sm text-muted-foreground">Races Completed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {RACE_CALENDAR_2025.filter(race => !race.isCompleted).length}
              </div>
              <div className="text-sm text-muted-foreground">Races Remaining</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {RACE_CALENDAR_2025.filter(race => race.isSprint).length}
              </div>
              <div className="text-sm text-muted-foreground">Sprint Weekends</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RaceCalendar;
