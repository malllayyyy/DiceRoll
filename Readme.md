# PvP Dice Game - Soroban Smart Contract

A simple Player vs Player dice game built on Stellar Soroban blockchain.

## 🎮 Game Rules

- Two players participate in each game
- Each player rolls 2 dice (values 1-6 each)
- The player with the higher total (2-12) wins the staked amount
- In case of a tie, both players are refunded

## 📋 Smart Contract Functions

### 1. create_game(player1: Address, stake_amount: i128) -> u64
Creates a new game with a stake amount. Returns the game ID.

### 2. join_game(game_id: u64, player2: Address)
Allows a second player to join an existing game.

### 3. play_game(game_id: u64) -> Address
Executes the game - rolls dice for both players and determines the winner.

### 4. view_game(game_id: u64) -> Game
Returns the complete game details including rolls and winner.

## 🛠️ Build Instructions
```bash
cd contracts/dice_game
soroban contract build
cargo test
```

## 🚀 Deployment
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/dice_game.wasm \
  --network testnet
```

## 📝 License

MIT
```

## File 5: `.gitignore`
```
target/
Cargo.lock
*.wasm
.soroban/
.DS_Store