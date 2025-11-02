#![allow(non_snake_case)]
#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, log, Env, Address, Symbol, String, symbol_short};

// Game structure to store game state
#[contracttype]
#[derive(Clone)]
pub struct Game {
    pub game_id: u64,
    pub player1: Address,
    pub player2: Address,
    pub stake_amount: i128,
    pub player1_roll: u64,
    pub player2_roll: u64,
    pub winner: Address,
    pub is_completed: bool,
}

// For tracking total games
const GAME_COUNT: Symbol = symbol_short!("G_COUNT");

// Mapping game_id to Game
#[contracttype]
pub enum GameBook {
    Game(u64)
}

#[contract]
pub struct DiceGameContract;

#[contractimpl]
impl DiceGameContract {

    /// Create a new game with stake amount
    /// Player 1 creates the game and stakes tokens
    pub fn create_game(env: Env, player1: Address, stake_amount: i128) -> u64 {
        player1.require_auth();
        
        let mut game_count: u64 = env.storage().instance().get(&GAME_COUNT).unwrap_or(0);
        game_count += 1;

        let game = Game {
            game_id: game_count,
            player1: player1.clone(),
            player2: Address::from_string(&String::from_str(&env, "pending")),
            stake_amount,
            player1_roll: 0,
            player2_roll: 0,
            winner: Address::from_string(&String::from_str(&env, "none")),
            is_completed: false,
        };

        env.storage().instance().set(&GameBook::Game(game_count), &game);
        env.storage().instance().set(&GAME_COUNT, &game_count);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Game Created! Game ID: {}", game_count);
        game_count
    }

    /// Player 2 joins the game by matching the stake
    pub fn join_game(env: Env, game_id: u64, player2: Address) {
        player2.require_auth();

        let mut game = Self::view_game(env.clone(), game_id);
        
        if game.game_id == 0 {
            panic!("Game not found!");
        }
        
        if game.is_completed {
            panic!("Game already completed!");
        }

        game.player2 = player2.clone();
        
        env.storage().instance().set(&GameBook::Game(game_id), &game);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Player 2 joined Game ID: {}", game_id);
    }

    /// Play the game - both players roll dice
    /// For simplicity, using timestamp-based randomness
    /// In production, use proper randomness oracles
    pub fn play_game(env: Env, game_id: u64) -> Address {
        let mut game = Self::view_game(env.clone(), game_id);
        
        if game.game_id == 0 {
            panic!("Game not found!");
        }
        
        if game.is_completed {
            panic!("Game already completed!");
        }

        // Generate dice rolls (1-6 for each die, 2 dice per player)
        let timestamp = env.ledger().timestamp();
        
        // Player 1 rolls: two dice
        let p1_die1 = ((timestamp % 6) + 1) as u64;
        let p1_die2 = (((timestamp / 7) % 6) + 1) as u64;
        game.player1_roll = p1_die1 + p1_die2;
        
        // Player 2 rolls: two dice
        let p2_die1 = (((timestamp / 13) % 6) + 1) as u64;
        let p2_die2 = (((timestamp / 17) % 6) + 1) as u64;
        game.player2_roll = p2_die1 + p2_die2;

        // Determine winner
        if game.player1_roll > game.player2_roll {
            game.winner = game.player1.clone();
        } else if game.player2_roll > game.player1_roll {
            game.winner = game.player2.clone();
        } else {
            // Tie - refund both
            game.winner = Address::from_string(&String::from_str(&env, "tie"));
        }

        game.is_completed = true;
        
        env.storage().instance().set(&GameBook::Game(game_id), &game);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Game {} completed! P1: {}, P2: {}", 
             game_id, game.player1_roll, game.player2_roll);

        game.winner
    }

    /// View game details by game_id
    pub fn view_game(env: Env, game_id: u64) -> Game {
        let key = GameBook::Game(game_id);
        
        env.storage().instance().get(&key).unwrap_or(Game {
            game_id: 0,
            player1: Address::from_string(&String::from_str(&env, "none")),
            player2: Address::from_string(&String::from_str(&env, "none")),
            stake_amount: 0,
            player1_roll: 0,
            player2_roll: 0,
            winner: Address::from_string(&String::from_str(&env, "none")),
            is_completed: false,
        })
    }
}

#[cfg(test)]
mod test;