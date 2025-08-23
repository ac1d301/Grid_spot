import axios from 'axios';

const BASE_URL = '/api/openf1';

export const f1Service = {
  async getDrivers() {
    const res = await axios.get(`${BASE_URL}/drivers`);
    return res.data;
  },
  async getDriverResults(driverNumber: number) {
    const res = await axios.get(`${BASE_URL}/results`, { params: { driver_number: driverNumber } });
    return res.data;
  },
  async getDriverSessions(driverNumber: number, year?: number) {
    const params: any = { driver_number: driverNumber };
    if (year) params.year = year;
    const res = await axios.get(`${BASE_URL}/sessions`, { params });
    return res.data;
  },
  async getDriverStats(driverNumber: number, year?: number) {
    // Get all results for the driver (optionally filter by year)
    const params: any = { driver_number: driverNumber };
    if (year) params.year = year;
    const res = await axios.get(`${BASE_URL}/results`, { params });
    const results = res.data;
    const racesPlayed = new Set(results.map((r: any) => r.session_key)).size;
    const racesWon = results.filter((r: any) => r.position === 1).length;
    return { racesPlayed, racesWon };
  },
  async getDriverPhoto(driverNumber: number) {
    // OpenF1 API may not have direct photo, but try to get it from drivers endpoint
    const drivers = await f1Service.getDrivers();
    const driver = drivers.find((d: any) => d.driver_number === driverNumber);
    return driver?.headshot_url || null;
  },
  async getDriverTeam(driverNumber: number) {
    // Get latest team from results
    const results = await f1Service.getDriverResults(driverNumber);
    if (results.length === 0) return null;
    // Get the most recent result
    const latest = results[0];
    return latest.team_name || null;
  },
  async getAvailableYears() {
    // Example: 2020 to current year
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const years = [];
    for (let y = startYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years.reverse(); // Most recent first
  },
  async getRaceCalendar(year: number) {
    // Fetch all sessions for the year from OpenF1 API
    const res = await fetch(`https://api.openf1.org/v1/sessions?year=${year}`);
    const sessions = await res.json();
    // Group sessions by meeting_key (race weekend)
    const meetingsMap: Record<string, any> = {};
    sessions.forEach((session: any) => {
      if (!meetingsMap[session.meeting_key]) {
        meetingsMap[session.meeting_key] = {
          round: null, // OpenF1 does not provide round, can infer by order
          raceName: session.country_name + ' Grand Prix',
          Circuit: {
            circuitId: session.circuit_key?.toString() || '',
            circuitName: session.circuit_short_name || session.location || '',
            Location: {
              locality: session.location || '',
              country: session.country_name || '',
            },
          },
          date: session.date_start,
          time: session.date_start,
          endTime: session.date_end,
          year: session.year,
          status: '',
          sessions: {},
          circuitDetails: {
            name: session.circuit_short_name || '',
            shortName: session.circuit_short_name || '',
            location: session.location || '',
            country: session.country_name || '',
            type: '',
            length: '',
            lapRecord: '',
            turns: 0,
            capacity: 0,
            firstGP: '',
            direction: '',
            elevation: '',
            surfaceType: '',
            drsZones: 0,
          },
        };
      }
      // Add session to sessions object
      const sessionKey = session.session_name?.toLowerCase().replace(/\s/g, '') || session.session_type?.toLowerCase() || 'unknown';
      meetingsMap[session.meeting_key].sessions[sessionKey] = {
        name: session.session_name || session.session_type,
        date: session.date_start?.split('T')[0] || '',
        time: session.date_start?.split('T')[1]?.slice(0,5) || '',
        endTime: session.date_end || '',
        status: '',
        session_key: session.session_key,
      };
      // Use the earliest session as the race date
      if (session.session_type === 'Race') {
        meetingsMap[session.meeting_key].date = session.date_start;
        meetingsMap[session.meeting_key].time = session.date_start;
      }
    });
    // Convert to array and sort by date
    let races = Object.values(meetingsMap);
    races = races.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Assign round numbers
    races.forEach((race: any, idx: number) => { race.round = idx + 1; });
    return races;
  },
  // Add these methods to your existing f1Service object

async getNextRaceMeeting() {
  try {
    const currentYear = new Date().getFullYear();
    const response = await fetch(`https://api.openf1.org/v1/sessions?year=${currentYear}`);
    const sessions = await response.json();
    
    if (!sessions || sessions.length === 0) return null;
    
    // Find next upcoming meeting
    const now = new Date();
    const upcomingSessions = sessions
      .filter((session: any) => new Date(session.date_start) > now)
      .sort((a: any, b: any) => 
        new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
      );
    
    if (upcomingSessions.length === 0) return null;
    
    const nextMeetingKey = upcomingSessions[0].meeting_key;
    return sessions.filter((session: any) => session.meeting_key === nextMeetingKey);
  } catch (error) {
    console.error('Error fetching next race meeting:', error);
    return null;
  }
},

async getSessionResults(sessionKey: number, topPositions = 3) {
  try {
    const response = await fetch(
      `https://api.openf1.org/v1/session_result?session_key=${sessionKey}&position<=${topPositions}`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching session results:', error);
    return [];
  }
}

}; 