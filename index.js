const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (change for production)
  },
});

app.use(cors());
app.use(express.json());

// Store game sessions
let games = {};

// TODO: make state for player turens strategy

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  const userId = socket.id;

  // Create a new game
  socket.on("create-game", (gameId) => {
    if (!games[gameId]) {
      games[gameId] = {
        players: [socket.id],
        turns: [],
        currentTurn: socket.id,
      };
      socket.join(gameId);
      io.to(gameId).emit("update-game", games[gameId]);
      console.log(`Game ${gameId} created by ${socket.id}`);
    }
  });

  // Join an existing game
  socket.on("join-game", (gameId) => {
    if (games[gameId] && games[gameId].players.length < 2) {
      games[gameId].players.push(socket.id);
      socket.join(gameId);
      io.to(gameId).emit("update-game", games[gameId]);
      console.log(`User ${socket.id} joined game ${gameId}`);
    }
  });

  // Handle turn-taking
  socket.on("play-turn", ({ gameId, move }) => {
    const game = games[gameId];
    if (game && socket.id === game.currentTurn) {
      game.turns.push(move);

      game.currentTurn = game.players.find((p) => p !== socket.id);

      function pick() {
        if (!game.pickedHeroes) {
          game.pickedHeroes = {};
        }

        if (game.pickedHeroes[userId]) {
          game.pickedHeroes[userId].push(move.hero);
        } else {
          game.pickedHeroes[userId] = [move.hero];
        }
      }

      pick();

      io.to(gameId).emit("update-game", game);
      console.log(`Turn played by ${socket.id} in game ${gameId}:`, move);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    Object.keys(games).forEach((gameId) => {
      games[gameId].players = games[gameId].players.filter(
        (p) => p !== socket.id
      );
      if (games[gameId].players.length === 0) delete games[gameId]; // Remove empty games
    });
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
