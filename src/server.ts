// // server.ts - Express + WebSocket
// import express from 'express';
// import { WebSocketServer } from 'ws';
// import { createServer } from 'http';
// import { v4 as uuidv4 } from 'uuid';
// import { GameState, GameStatus, CellState } from './types/bongotypes';
//
// const app = express();
// const server = createServer(app);
// const wss = new WebSocketServer({ server });
//
// // Store multiple game rooms
// const games = new Map<string, GameState>();
//
// // Generate initial cells (4x3 grid)
// function generateInitialCells(): CellState[] {
//     const cells: CellState[] = [];
//     let id = 1;
//
//     // Create 12 cells with values 1-12
//     for (let y = 0; y < 3; y++) {
//         for (let x = 0; x < 4; x++) {
//             cells.push({
//                 id: id,
//                 x: x,
//                 y: y,
//                 value: id, // Or randomize: Math.floor(Math.random() * 12) + 1
//                 isRevealed: false
//             });
//             id++;
//         }
//     }
//     return cells;
// }
//
// // Generate unique IDs
// function generatePlayerId(): string {
//     return `player_${uuidv4().slice(0, 8)}`;
// }
//
// function generateGameId(): string {
//     return uuidv4().slice(0, 6).toUpperCase();
// }
//
// wss.on('connection', (ws) => {
//     console.log('New client connected');
//
//     ws.on('message', (message: string) => {
//         try {
//             const data = JSON.parse(message.toString());
//             console.log('Received:', data);
//
//             switch(data.type) {
//                 case 'CREATE_GAME':
//                     const newGameId = generateGameId();
//                     const initialCells = generateInitialCells();
//
//                     const newGame: GameState = {
//                         id: newGameId,
//                         cells: initialCells,
//                         players: [],
//                         gameStatus: 'waiting',
//                         createdAt: new Date(),
//                         hostId: data.playerId || 'host'
//                     };
//
//                     games.set(newGameId, newGame);
//
//                     ws.send(JSON.stringify({
//                         type: 'GAME_CREATED',
//                         gameId: newGameId,
//                         gameState: newGame
//                     }));
//                     break;
//
//                 case 'JOIN_GAME':
//                     const { gameId, playerId } = data;
//                     const game = games.get(gameId);
//
//                     if (game) {
//                         // Add player if not already in list
//                         if (!game.players.find(p => p.id === playerId)) {
//                             game.players.push({
//                                 id: playerId,
//                                 joinedAt: new Date()
//                             });
//
//                             // Update game in storage
//                             games.set(gameId, game);
//                         }
//
//                         // Send current game state to the joining player
//                         ws.send(JSON.stringify({
//                             type: 'GAME_STATE',
//                             gameState: game
//                         }));
//
//                         // Broadcast to all players in the room
//                         broadcastToGame(gameId, {
//                             type: 'PLAYER_JOINED',
//                             playerId,
//                             players: game.players
//                         });
//                     } else {
//                         ws.send(JSON.stringify({
//                             type: 'ERROR',
//                             message: 'Game not found'
//                         }));
//                     }
//                     break;
//
//                 case 'CELL_CLICK':
//                     const { gameId: clickGameId, playerId: clickPlayerId, cellId } = data;
//                     const clickGame = games.get(clickGameId);
//
//                     if (clickGame) {
//                         // Update the cell
//                         clickGame.cells = clickGame.cells.map(cell =>
//                             cell.id === cellId && !cell.isRevealed
//                                 ? {
//                                     ...cell,
//                                     isRevealed: true,
//                                     revealedBy: clickPlayerId,
//                                     revealedAt: new Date()
//                                 }
//                                 : cell
//                         );
//
//                         // Update game status if needed
//                         const allRevealed = clickGame.cells.every(cell => cell.isRevealed);
//                         if (allRevealed) {
//                             clickGame.gameStatus = 'completed';
//                         } else {
//                             clickGame.gameStatus = 'playing';
//                         }
//
//                         // Save updated game
//                         games.set(clickGameId, clickGame);
//
//                         // Broadcast updated game state
//                         broadcastToGame(clickGameId, {
//                             type: 'GAME_UPDATE',
//                             gameState: clickGame
//                         });
//                     }
//                     break;
//
//                 case 'LEAVE_GAME':
//                     const { gameId: leaveGameId, playerId: leavePlayerId } = data;
//                     const leaveGame = games.get(leaveGameId);
//
//                     if (leaveGame) {
//                         leaveGame.players = leaveGame.players.filter(p => p.id !== leavePlayerId);
//                         games.set(leaveGameId, leaveGame);
//
//                         broadcastToGame(leaveGameId, {
//                             type: 'PLAYER_LEFT',
//                             playerId: leavePlayerId,
//                             players: leaveGame.players
//                         });
//                     }
//                     break;
//             }
//         } catch (error) {
//             console.error('Error processing message:', error);
//             ws.send(JSON.stringify({
//                 type: 'ERROR',
//                 message: 'Invalid message format'
//             }));
//         }
//     });
//
//     ws.on('close', () => {
//         console.log('Client disconnected');
//     });
// });
//
// // Helper function to broadcast to all clients in a specific game
// function broadcastToGame(gameId: string, message: any) {
//     wss.clients.forEach(client => {
//         if (client.readyState === 1) {
//             client.send(JSON.stringify(message));
//         }
//     });
// }
//
// // Enable CORS for Express
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     next();
// });
//
// // Health check endpoint
// app.get('/health', (req, res) => {
//     res.json({ status: 'ok', activeGames: games.size });
// });
// // In your server.ts
// const wss = new WebSocketServer({
//     server,
//     clientTracking: true,
//     perMessageDeflate: {
//         zlibDeflateOptions: {
//             chunkSize: 1024,
//             memLevel: 7,
//             level: 3
//         },
//         zlibInflateOptions: {
//             chunkSize: 10 * 1024
//         },
//         // Other options
//         clientNoContextTakeover: true,
//         serverNoContextTakeover: true,
//         serverMaxWindowBits: 10,
//         concurrencyLimit: 10,
//         threshold: 1024 // Only compress messages > 1KB
//     }
// });
//
// // Add ping/pong to keep connection alive
// wss.on('connection', (ws) => {
//     const pingInterval = setInterval(() => {
//         if (ws.readyState === 1) {
//             ws.ping();
//         }
//     }, 30000);
//
//     ws.on('pong', () => {
//         // Connection is alive
//     });
//
//     ws.on('close', () => {
//         clearInterval(pingInterval);
//     });
// });
//
// server.listen(3001, () => {
//     console.log('WebSocket server running on port 3001');
// });