# Formula 1 GridSpot🏁

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Click%20Here-red?style=for-the-badge&logo=vercel)](https://grid-spot-web.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/ac1d301/Grid-spot-web?style=for-the-badge)](https://github.com/ac1d301/Grid-spot-web)

A modern web application for Formula 1 enthusiasts featuring live driver statistics, race information, and community discussions.  
Live Demo: [https://grid-spot-web.vercel.app](https://grid-spot-web.vercel.app)


## Features

- **Race Results** - Real-time F1 race results calculated from OpenF1 API
- **Race Information** - Live race schedules and weekend countdowns  
- **Driver Statistics** - Current Season driver stats and also their carrer stats
- **Discussion Forum** - Real-time community discussions with WebSocket
- **2025 Season Calender View** - View the calender to know the Race dates and other stuff

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/formula1-hub.git
cd formula1-hub
```

2. **Backend setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

3. **Frontend setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Open your browser**
```
http://localhost:3000
```

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router

**Backend**
- Node.js + Express
- MongoDB + Mongoose  
- JWT Authentication
- WebSocket Server

**External APIs**
- OpenF1 API for live F1 data

## Environment Variables

Create a `.env` file in the backend directory:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=5001
```

## Usage

1. **Register/Login** to access all features
2. **View Driver Stats** - Toggle between season and career statistics  
3. **Join Discussions** - Participate in community forums
4. **Track Races** - Get live updates on race weekends

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request


## Acknowledgments

- [OpenF1 API](https://openf1.org/) for providing F1 data
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- Formula 1 community for inspiration

 Support

Having issues? [Open an issue](https://github.com/ac1d301/Grid-spot-web/issues) or reach out to [diffv27l@gmail.com](mailto:diffv27@gmail.com.com)

<div align="center">
Made with passion for F1 fans INDIA
</div>
