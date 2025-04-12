// server.js (Complete Updated Code)

// Import necessary libraries
const express = require('express');
const http = require('http'); // Required to create an HTTP server for Socket.IO
const { Server } = require("socket.io"); // Import the Server class from socket.io
const cors = require('cors'); // Import cors middleware

// Create an Express application
const app = express();

// --- CORS Configuration --- MUST allow your GitHub Pages URL! ---
const allowedOrigins = [
  'http://localhost:8080', // Default Vite port, adjust if needed for local testing
  'https://shopy-engineering.github.io/ride-text-connect/',
  // Add any other origins if needed (e.g., another frontend dev's localhost)
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl) OR if origin is in allowedOrigins
    // Useful for testing, but you might want to restrict !origin in production depending on use case
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`); // Log blocked origins
      callback(new Error('This origin is not allowed by CORS policy'));
    }
  },
  methods: ["GET", "POST"] // Methods needed by your app
};

// Apply CORS middleware to Express
// This affects standard HTTP requests, if you add any API routes later
app.use(cors(corsOptions));

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Integrate Socket.IO with the HTTP server using the same CORS options
const io = new Server(server, {
  cors: corsOptions
});

// Define a simple route for testing if the HTTP server is running
app.get('/', (req, res) => {
  // You could potentially restrict this route with CORS too if needed
  // but it's often fine as a simple health check
  res.send('<h1>Chat Server Backend Running</h1>');
});

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log(`[${socket.id}] A user connected.`);

  // --- Room Management ---
  socket.on('join_conversation', ({ conversationId }) => {
    // Basic validation
    if (!conversationId || typeof conversationId !== 'string') {
      console.error(`[${socket.id}] Attempted to join invalid conversationId: ${conversationId}`);
      // Optional: emit an error back to the client
      // socket.emit('error_joining', { message: 'Invalid conversation ID provided.' });
      return;
    }
    console.log(`[${socket.id}] Joining conversation: ${conversationId}`);
    socket.join(conversationId);
    // You could emit a confirmation back to the client if needed
    // socket.emit('joined_conversation', { conversationId });
  });

  socket.on('leave_conversation', ({ conversationId }) => {
     // Basic validation
    if (!conversationId || typeof conversationId !== 'string') {
      console.error(`[${socket.id}] Attempted to leave invalid conversationId: ${conversationId}`);
      return;
    }
    console.log(`[${socket.id}] Leaving conversation: ${conversationId}`);
    socket.leave(conversationId);
     // You could emit a confirmation back to the client if needed
    // socket.emit('left_conversation', { conversationId });
  });

  // --- Message Handling ---
  socket.on('send_message', ({ conversationId, message }) => {
    // Basic validation
    if (!conversationId || typeof conversationId !== 'string' || !message || typeof message !== 'object' || !message.id || !message.text) {
       console.error(`[${socket.id}] Invalid send_message payload:`, { conversationId, message });
       // Optional: Notify sender of the error
       // socket.emit('message_error', { messageId: message?.id, error: 'Invalid message format or missing conversation ID.' });
       return;
    }
    console.log(`[${socket.id}] Received message for conv [${conversationId}]: "${message.text}"`);

    // Add server timestamp? Or trust client's? Server is often more reliable.
    message.serverTimestamp = new Date().toISOString(); // Add server timestamp

    // Broadcast the message to everyone else *in the specified room (conversation)*
    // 'socket.to(room)' sends to everyone in the room *except* the sender
    socket.to(conversationId).emit('new_message', message);

    // Optional: Implement 'delivered' status. This is complex.
    // A simple approach is to assume delivery if emitted.
    // A better approach involves acknowledgment from the recipient client.
    // For now, we rely on the optimistic 'sending' status and 'read' status later.
  });

  // --- Status Updates ---
  socket.on('message_read', ({ messageId, conversationId }) => {
    // Basic validation
    if (!conversationId || typeof conversationId !== 'string' || !messageId || typeof messageId !== 'string') {
       console.error(`[${socket.id}] Invalid message_read payload:`, { messageId, conversationId });
       return;
    }
    console.log(`[${socket.id}] Message read in conv [${conversationId}]: ${messageId}`);

    // Broadcast the read status to others in the room (primarily the original sender)
    socket.to(conversationId).emit('message_status', { messageId: messageId, status: 'read' });
  });


  // --- Disconnection ---
  // The 'disconnect' event automatically handles leaving rooms the socket was in.
  socket.on('disconnect', (reason) => {
    console.log(`[${socket.id}] User disconnected. Reason: ${reason}`);
    // You might add logic here if you need to track user presence explicitly,
    // e.g., query socket.rooms and notify other users if needed.
  });

  // --- Generic Error Handling ---
  // Catch errors related to this specific socket connection
  socket.on('error', (err) => {
      console.error(`[${socket.id}] Socket Error:`, err.message);
      // Depending on the error, you might want to disconnect the socket
      // or notify the client.
  });

});

// --- Global Server Error Handling (Example) ---
// Catch errors that might occur during server startup or IO setup
io.engine.on("error", (err) => {
  console.error("Socket.IO Engine Error:", err);
  // Potentially shutdown gracefully?
});

// --- Start the Server ---
const PORT = process.env.PORT || 4000; // Render provides PORT env var automatically
server.listen(PORT, () => {
  console.log(`Server listening successfully on port ${PORT}`);
});

// Optional: Graceful shutdown handling (more advanced)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  io.close(() => {
    console.log('Socket.IO server closed');
  });
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});