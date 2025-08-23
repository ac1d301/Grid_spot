require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const WebSocketServer = require('./websocket');
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const auth = require('./middlewares/auth');
const openf1Routes = require('./routes/openf1');

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer(server);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/forum', auth, forumRoutes); // Protect all forum endpoints
app.use('/api/openf1', openf1Routes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 