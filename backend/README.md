# F1 Portal Backend API

A RESTful API for the Formula 1 Fan Portal built with Node.js, Express, and MongoDB.

## Features

- 🔐 JWT-based Authentication
- 📊 Race Results & Driver Information
- ⭐ Driver Ratings System
- 💬 Forum with Threads & Comments
- 📝 Swagger API Documentation
- 🔄 Real-time Data Updates

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/f1portal
   JWT_SECRET=your_jwt_secret_key_here
   CORS_ORIGIN=http://localhost:3000
   ```

4. Seed the database with initial data:
   ```bash
   npm run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`
Swagger documentation will be available at `http://localhost:5000/api-docs`

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user (auth required)

### Races
- GET `/api/races` - Get all races
- GET `/api/races/:id` - Get race by ID
- POST `/api/races` - Create new race (admin only)
- PUT `/api/races/:id` - Update race (admin only)
- DELETE `/api/races/:id` - Delete race (admin only)

### Drivers
- GET `/api/drivers` - Get all drivers
- GET `/api/drivers/:id` - Get driver by ID
- POST `/api/drivers` - Create new driver (admin only)
- PUT `/api/drivers/:id` - Update driver (admin only)
- DELETE `/api/drivers/:id` - Delete driver (admin only)

### Results
- GET `/api/results/:raceId` - Get results for a race
- POST `/api/results` - Add race result (admin only)
- PUT `/api/results/:id` - Update result (admin only)
- DELETE `/api/results/:id` - Delete result (admin only)
- GET `/api/results/standings/drivers` - Get driver standings

### Ratings
- POST `/api/ratings` - Rate a driver (auth required)
- GET `/api/ratings/:driverId` - Get ratings for a driver
- GET `/api/ratings/user/me` - Get current user's ratings
- DELETE `/api/ratings/:id` - Delete rating (auth required)

### Forum
- GET `/api/forum/threads` - Get all threads
- POST `/api/forum/threads` - Create new thread (auth required)
- GET `/api/forum/threads/:id` - Get thread with comments
- POST `/api/forum/threads/:id/comments` - Add comment (auth required)
- PUT `/api/forum/threads/:id` - Update thread (author only)
- PUT `/api/forum/comments/:id` - Update comment (author only)
- POST `/api/forum/threads/:id/like` - Like/unlike thread (auth required)
- POST `/api/forum/comments/:id/like` - Like/unlike comment (auth required)

## Default Admin Account

After running the seed script, you can login with these credentials:
- Email: admin@f1portal.com
- Password: admin123

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Security

- Passwords are hashed using bcrypt
- JWT tokens expire in 7 days
- CORS is enabled for frontend origin only
- Admin routes are protected
- Input validation on all routes

## Development

To run the server in development mode with hot reload:
```bash
npm run dev
```

## Production

For production deployment:
1. Set appropriate environment variables
2. Build and optimize the application
3. Run with process manager (e.g., PM2)
```bash
npm start
``` 