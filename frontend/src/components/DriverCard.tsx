import React from 'react';
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
  'Red Bull Racing': { primary: 'bg-blue-800', secondary: 'bg-blue-900', accent: 'text-yellow-300' },
  'Ferrari': { primary: 'bg-red-600', secondary: 'bg-red-700', accent: 'text-white' },
  'McLaren': { primary: 'bg-orange-500', secondary: 'bg-orange-600', accent: 'text-white' },
  'Mercedes': { primary: 'bg-teal-400', secondary: 'bg-teal-500', accent: 'text-black' },
  'Aston Martin': { primary: 'bg-green-600', secondary: 'bg-green-700', accent: 'text-white' },
  'Alpine': { primary: 'bg-blue-500', secondary: 'bg-blue-600', accent: 'text-white' },
  'Kick Sauber': { primary: 'bg-green-500', secondary: 'bg-green-600', accent: 'text-white' },
  'Williams': { primary: 'bg-blue-600', secondary: 'bg-blue-700', accent: 'text-white' },
  'Racing Bulls': { primary: 'bg-blue-700', secondary: 'bg-blue-800', accent: 'text-white' },
  'Haas': { primary: 'bg-gray-600', secondary: 'bg-gray-700', accent: 'text-white' },
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

  return (
    <div className="cursor-pointer" style={flipCardStyle} onClick={onFlip}>
      <div style={flipCardInnerStyle}>
        
        {/* Front of card - Driver Info */}
        <div 
          className={`relative rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl ${colors.primary}`}
          style={flipCardFaceStyle}
        >
          {/* Driver Photo Background */}
          <div className="absolute inset-0">
            {photo ? (
              <img 
                src={photo} 
                alt={driverName}
                className="w-full h-full object-cover object-center opacity-80"
                style={{ objectPosition: 'center 20%' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-24 w-24 text-white/50" />
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 p-4 h-full flex flex-col justify-between">
            {/* Top section - Name and Number */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    {firstName}
                  </h3>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    {lastName}
                  </h3>
                  <p className="text-white/80 text-sm font-medium mt-1">
                    {team?.split(' ')[0] || 'Unknown'}
                  </p>
                  <p className="text-white/60 text-xs mt-1">{nationality}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white opacity-90">
                    {driverNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom section - Current Season Points */}
            <div className="mt-auto">
              <div className="text-center bg-black/40 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{currentSeasonPoints}</div>
                <div className="text-sm text-white/80">Points</div>
                <div className="text-xs text-white/60 mt-1">Position: P{position}</div>
              </div>
              <div className="text-center mt-2">
                <p className="text-xs text-white/60">Click to view stats</p>
              </div>
            </div>

            {/* Position indicator for podium positions */}
            {/* {position <= 3 && (
              <div className="absolute top-2 right-20">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  position === 1 ? 'bg-yellow-500 text-black' : 
                  position === 2 ? 'bg-gray-400 text-black' : 
                  'bg-amber-600 text-white'
                }`}>
                  {position}
                </div>
              </div>
            )} */}
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
