#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_create_game() {
    let env = Env::default();
    let contract_id = env.register_contract(None, DiceGameContract);
    let client = DiceGameContractClient::new(&env, &contract_id);

    let player1 = Address::generate(&env);
    let stake = 1000;

    let game_id = client.create_game(&player1, &stake);
    
    assert_eq!(game_id, 1);
    
    let game = client.view_game(&game_id);
    assert_eq!(game.stake_amount, stake);
    assert_eq!(game.is_completed, false);
}

#[test]
fn test_join_game() {
    let env = Env::default();
    let contract_id = env.register_contract(None, DiceGameContract);
    let client = DiceGameContractClient::new(&env, &contract_id);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let stake = 1000;

    let game_id = client.create_game(&player1, &stake);
    client.join_game(&game_id, &player2);
    
    let game = client.view_game(&game_id);
    assert_eq!(game.player2, player2);
}

#[test]
fn test_full_game() {
    let env = Env::default();
    let contract_id = env.register_contract(None, DiceGameContract);
    let client = DiceGameContractClient::new(&env, &contract_id);

    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);
    let stake = 1000;

    // Create game
    let game_id = client.create_game(&player1, &stake);
    
    // Join game
    client.join_game(&game_id, &player2);
    
    // Play game
    let winner = client.play_game(&game_id);
    
    // Check game is completed
    let game = client.view_game(&game_id);
    assert_eq!(game.is_completed, true);
    assert!(game.player1_roll >= 2 && game.player1_roll <= 12);
    assert!(game.player2_roll >= 2 && game.player2_roll <= 12);
}

#[test]
#[should_panic(expected = "Game not found!")]
fn test_play_nonexistent_game() {
    let env = Env::default();
    let contract_id = env.register_contract(None, DiceGameContract);
    let client = DiceGameContractClient::new(&env, &contract_id);

    client.play_game(&999);
}