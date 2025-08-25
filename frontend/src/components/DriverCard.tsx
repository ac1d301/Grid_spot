import React, { useEffect } from 'react';
import { User, Trophy, Award, Star, TrendingUp } from 'lucide-react';

interface DriverCardProps {
  driverNumber: number;
  driverName: string;
  photo: string | null;
  team: string | null;
  careerRacesWon: number;
  careerPodiums: number;
  currentSeasonPoints: number;
  position: number;
  nationality: string;
  isFlipped: boolean;
  onFlip: () => void;
}

// Team colors mapping
const TEAM_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  'Red Bull Racing': { primary: 'bg-blue-950', secondary: 'bg-blue-900', accent: 'text-blue-300' },
  'Ferrari': { primary: 'bg-red-900', secondary: 'bg-red-950', accent: 'text-red-300' },
  'McLaren': { primary: 'bg-orange-900', secondary: 'bg-orange-950', accent: 'text-orange-300' },
  'Mercedes': { primary: 'bg-teal-900', secondary: 'bg-teal-950', accent: 'text-teal-300' },
  'Aston Martin': { primary: 'bg-green-900', secondary: 'bg-green-950', accent: 'text-green-300' },
  'Alpine': { primary: 'bg-blue-900', secondary: 'bg-blue-950', accent: 'text-blue-300' },
  'Kick Sauber': { primary: 'bg-green-800', secondary: 'bg-green-900', accent: 'text-green-300' },
  'Williams': { primary: 'bg-blue-900', secondary: 'bg-blue-950', accent: 'text-blue-300' },
  'Racing Bulls': { primary: 'bg-blue-950', secondary: 'bg-blue-900', accent: 'text-blue-300' },
  'Haas': { primary: 'bg-gray-800', secondary: 'bg-gray-900', accent: 'text-gray-300' },
};

const getTeamColors = (team: string | null) => {
  if (!team) return { primary: 'bg-gray-800', secondary: 'bg-gray-900', accent: 'text-white' };
  return TEAM_COLORS[team] || { primary: 'bg-gray-800', secondary: 'bg-gray-900', accent: 'text-white' };
};

export const DriverCard: React.FC<DriverCardProps> = ({
  driverNumber,
  driverName,
  photo,
  team,
  careerRacesWon,
  careerPodiums,
  currentSeasonPoints,
  position,
  nationality,
  isFlipped,
  onFlip
}) => {
  const colors = getTeamColors(team);
  const [firstName, lastName] = driverName.split(' ');

  // CSS styles as objects
  const flipCardStyle: React.CSSProperties = {
    perspective: '1000px',
    height: '320px'
  };

  const flipCardInnerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    transition: 'transform 0.6s',
    transformStyle: 'preserve-3d',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
  };

  const flipCardFaceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden'
  };

  const flipCardBackStyle: React.CSSProperties = {
    ...flipCardFaceStyle,
    transform: 'rotateY(180deg)'
  };

  // Auto-flip back after 2 seconds
  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        onFlip();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, onFlip]);

  return (
    <div className="cursor-pointer" style={flipCardStyle} onClick={onFlip}>
      <div style={flipCardInnerStyle}>
        
        {/* Front of card - Driver Info */}
        <div 
          className={`relative rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl flex flex-col justify-center items-center ${colors.primary}`}
          style={flipCardFaceStyle}
        >
          {/* Centered Driver Name with Team Color */}
          <div className="flex flex-col items-center justify-center h-full w-full">
            <h3 className={`font-bold text-2xl mb-2 ${colors.accent}`}>{firstName} {lastName}</h3>
            <span className={`font-semibold text-lg mb-1 ${colors.accent}`}>{team}</span>
            <span className="text-white/80 text-sm font-medium mb-2">{nationality}</span>
            <div className="text-3xl font-bold text-white opacity-90 mb-2">
              #{driverNumber}
            </div>
            <div className="text-center bg-black/40 rounded-lg p-3 w-40 mx-auto mb-2">
              <div className="text-2xl font-bold text-white">{currentSeasonPoints}</div>
              <div className="text-sm text-white/80">Points</div>
              <div className="text-xs text-white/60 mt-1">Position: P{position}</div>
            </div>
            <span className="inline-block bg-gray-200 text-black text-xs font-semibold px-3 py-1 rounded-full shadow mt-2">
              Click to view stats
            </span>
          </div>
        </div>

        {/* Back of card - Statistics */}
        <div 
          className={`relative rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl ${colors.secondary} text-white`}
          style={flipCardBackStyle}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40"></div>
          
          <div className="relative z-10 p-4 h-full flex flex-col">
            {/* Header */}
            <div className="text-center mb-4 border-b border-white/20 pb-3">
              <h3 className="font-bold text-lg">{firstName} {lastName}</h3>
              <p className="text-sm opacity-80">#{driverNumber} • {team}</p>
              <p className="text-xs opacity-60">{nationality}</p>
            </div>
            
            {/* Career Statistics */}
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  <Trophy className="h-4 w-4 mr-2" />
                  Career Statistics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-400">{careerRacesWon}</div>
                    <div className="text-xs opacity-80">Race Wins</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-orange-400">{careerPodiums}</div>
                    <div className="text-xs opacity-80">Podiums</div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-white/20 pt-3">
                <h4 className="font-semibold text-sm mb-3 flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  Season Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white/10 rounded p-2">
                    <span className="text-sm">Championship Points:</span>
                    <span className="font-bold text-lg text-green-400">{currentSeasonPoints}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded p-2">
                    <span className="text-sm">Current Position:</span>
                    <span className="font-bold text-lg">P{position}</span>
                  </div>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="border-t border-white/20 pt-3">
                <h4 className="font-semibold text-sm mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-sm">{careerPodiums > 0 ? ((careerRacesWon / careerPodiums) * 100).toFixed(0) + '%' : '0%'}</div>
                    <div className="opacity-60">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">{position <= 10 ? 'Points' : 'No Points'}</div>
                    <div className="opacity-60">Status</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-auto pt-3 text-center border-t border-white/20">
              <p className="text-xs opacity-60">Click to flip back</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
