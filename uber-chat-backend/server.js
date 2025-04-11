// Import necessary libraries
const express = require('express');
const http = require('http'); // Required to create an HTTP server for Socket.IO
const { Server } = require("socket.io"); // Import the Server class from socket.io
const cors = require('cors'); // Import cors middleware

// Create an Express application
const app = express();

// Use CORS middleware - IMPORTANT for allowing frontend connection from a different origin (like localhost:3000)
app.use(cors());

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Integrate Socket.IO with the HTTP server
// We configure CORS for Socket.IO here as well
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin (adjust in production!)
    methods: ["GET", "POST"]
  }
});

// Define a simple route for testing the HTTP server
app.get('/', (req, res) => {
  res.send('<h1>Chat Server Backend Running</h1>');
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id); // Log when a user connects

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id); // Log when a user disconnects
  });

  // More event handlers will go here (like receiving messages)
});

// --- Start the Server ---
const PORT = process.env.PORT || 4000; // Use port 4000 or environment variable
server.listen(PORT, () => {
  console.log(`Server listening on *: ${PORT}`);
});