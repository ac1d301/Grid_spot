
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface RaceCardProps {
  race: {
    round: number;
    raceName: string;
    Circuit: {
      circuitId: string;
      circuitName: string;
      Location: {
        locality: string;
        country: string;
      };
    };
    date: string;
    time: string;
    sessions: {
      fp1?: { date: string; time: string };
      fp2?: { date: string; time: string };
      fp3?: { date: string; time: string };
      qualifying?: { date: string; time: string };
      sprint?: { date: string; time: string };
      race?: { date: string; time: string };
    };
  };
  isPast?: boolean;
}

const RaceCard = ({ race, isPast = false }: RaceCardProps) => {
  const raceDate = new Date(`${race.date}T${race.time}`);
  const isUpcoming = raceDate > new Date();

  const getNextSession = () => {
    const now = new Date();
    const sessions = [
      { name: 'FP1', ...race.sessions.fp1 },
      { name: 'FP2', ...race.sessions.fp2 },
      { name: 'FP3', ...race.sessions.fp3 },
      { name: 'Qualifying', ...race.sessions.qualifying },
      { name: 'Sprint', ...race.sessions.sprint },
      { name: 'Race', ...race.sessions.race }
    ].filter(session => session.date && session.time);

    for (const session of sessions) {
      const sessionDate = new Date(`${session.date}T${session.time}`);
      if (sessionDate > now) {
        return {
          name: session.name,
          date: sessionDate
        };
      }
    }
    return null;
  };

  const nextSession = getNextSession();

  return (
    <Card className="f1-card hover:bg-card/70 transition-all duration-300 group racing-stripe">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {race.raceName}
            </CardTitle>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span>{race.Circuit.Location.locality}, {race.Circuit.Location.country}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono text-primary">Round {race.round}</div>
            {isUpcoming && !isPast && nextSession && (
              <div className="inline-block px-2 py-1 bg-accent/20 text-accent text-xs rounded-full mt-1">
                Next: {nextSession.name}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <Calendar className="h-3 w-3" />
              <span>{raceDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{raceDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZoneName: 'short'
              })}</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-2">
              {race.Circuit.circuitName}
            </div>
            <div className="flex space-x-2">
              <Link to={`/races/${race.round}`} className="flex-1">
                <Button 
                  variant={isPast ? "default" : "outline"} 
                  size="sm" 
                  className="w-full"
                >
                  {isPast ? 'View Results' : 'Race Details'}
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RaceCard;
