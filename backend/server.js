require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const nearbyRoutes = require("./routes/nearbyroutes");
const authRoutes = require("./routes/authRoutes");
const sosRoutes = require("./routes/sosRoutes");
const organizationRoutes = require("./routes/organizationRoutes");


const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);


// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors());

app.use(express.json());


// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/nearby", nearbyRoutes);
app.use("/api/organizations", organizationRoutes);


// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    server: "running",
    dbState: mongoose.connection.readyState,
  });
});


// --------------------------------------------------
// Socket.io
// --------------------------------------------------

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});


// --------------------------------------------------
// Server
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });