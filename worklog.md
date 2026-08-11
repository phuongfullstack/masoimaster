# Ma Sói Realtime - Work Log

---
Task ID: 1
Agent: Main
Task: Khởi tạo dự án Ma Sói Realtime Web App

Work Log:
- Installed socket.io-client and nanoid in main project
- Created mini-services/game-server with socket.io + nanoid
- Updated Prisma schema with Room, Player, NightAction, ChatMessage, GameLog models
- Pushed DB schema to SQLite

Stage Summary:
- Project initialized with Next.js 16 + TailwindCSS + Zustand
- Game server mini-service created on port 3003
- Database schema defined and pushed

---
Task ID: 2
Agent: Main
Task: Xây dựng Game Server (Socket.io) - Toàn bộ logic game

Work Log:
- Built complete game server in CommonJS (run.cjs) with all game logic
- Implemented room management (create/join/leave/kick)
- Implemented role system: werewolf, white_werewolf, villager, seer, witch, guard, hunter, cupid
- Implemented night phase with sequential wake-up (guard → wolves → seer → witch)
- Implemented night resolution: guard protect → wolf bite → witch save → witch poison → death
- Implemented day phase with chat and discussion timer
- Implemented voting phase with vote counting and tie detection
- Implemented win condition checking (wolves >= villagers or wolves = 0)
- Implemented hunter shoot mechanic on death
- Implemented 3 host modes: auto, direct, hybrid
- Implemented auto-pilot game flow: role_reveal → night → day → voting → repeat
- Added anti-cheat: role isolation in buildStateForPlayer (only see own role)

Stage Summary:
- Full game logic server running on port 3003 (Node.js)
- Supports all roles from the design doc (MVP: werewolf, villager, seer, witch, guard)
- Real-time state broadcasting via socket.io

---
Task ID: 3
Agent: Main
Task: Xây dựng Frontend Components

Work Log:
- Created shared types (src/lib/types.ts) with all game types, role info, phase config
- Created Zustand store (src/store/game-store.ts) with all game state
- Created SocketProvider (src/components/game/socket-provider.tsx) with all socket event handlers
- Created LoginScreen with username entry and localStorage persistence
- Created HomeScreen with room creation (host mode selection, role config), join room, logout
- Created LobbyScreen with player list, ready system, host controls (start, kick)
- Created GameScreen with sub-components:
  - Timer component (useSyncExternalStore based)
  - RoleReveal with 3D-style card animation
  - NightScreen with role-specific UIs (wolf chat+target, seer press-to-reveal, witch save/poison, guard protect, villager decoy)
  - DayScreen with public chat, death announcements, host phase controls
  - VotingScreen with target grid, vote counting, tie resolution display
  - HunterShoot with target selection
  - GameOverScreen with role reveal and winner announcement
- Updated layout.tsx with Ma Sói branding
- Updated next.config.ts with socket.io rewrite rule

Stage Summary:
- Complete UI for all game phases
- Dark theme with red/gray/purple color scheme
- Mobile-responsive design using TailwindCSS
- Vietnamese language throughout

---
Task ID: 4
Agent: Main
Task: Integration and Testing

Work Log:
- Verified game server handles requests correctly via curl
- Verified Caddy proxy forwards socket.io requests to game server
- Fixed SSR issues by using direct socket connection for development
- Fixed lint errors (excluded mini-services from ESLint)
- Clean build passes

Stage Summary:
- App compiles and renders correctly
- Game server is stable (pure CommonJS, no bundling issues)
- Socket connection works via direct localhost:3003 (dev) or XTransformPort (production)
