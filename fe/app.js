// Configuration - UPDATE THESE VALUES IN PRODUCTION
const CONFIG = {
    contractId: 'CBMJCD7UY5UO5DJJ6WSI6EUMA4IYBKHK45CPA6KD7FJZZISQBAYIJHC2', // Updated: with XLM payment functionality
    xlmTokenId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // Native XLM on testnet
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org',
    apiUrl: 'http://localhost:3001/api'
};

let connectedPublicKey = null;
let server = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== APP INITIALIZATION ===');
    console.log('Stellar Time Marketplace initialized');
    console.log('DOMContentLoaded fired at:', new Date().toISOString());
    console.log('Current URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    
    // Wait a bit for Freighter to load
    console.log('Setting timeout to check for Freighter...');
    setTimeout(() => {
        console.log('Timeout fired, checking Freighter now...');
        checkFreighterInstalled();
    }, 100);
    
    // Event listeners
    console.log('Attaching event listeners...');
    const connectBtn = document.getElementById('connectBtn');
    console.log('Connect button found:', !!connectBtn);
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            console.log('Connect button clicked!');
            connectFreighter();
        });
    }
    
    const createGameBtn = document.getElementById('createGameBtn');
    if (createGameBtn) {
        createGameBtn.addEventListener('click', createGame);
    }

    const joinGameBtn = document.getElementById('joinGameBtn');
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', joinGame);
    }

    // Add tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Set up modal close button
    const closeModal = document.querySelector('.close');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('gameModal').style.display = 'none';
        });
    }

    console.log('All event listeners attached');
    console.log('=== INITIALIZATION COMPLETE ===');
});

// Check if Freighter is installed
function checkFreighterInstalled() {
    console.log('=== CHECKING FREIGHTER INSTALLATION ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('window.freighterApi:', window.freighterApi);
    console.log('typeof window.freighterApi:', typeof window.freighterApi);
    console.log('window object keys containing "freight":', Object.keys(window).filter(k => k.toLowerCase().includes('freight')));
    console.log('Document readyState:', document.readyState);
    
    if (window.freighterApi) {
        console.log('✅ Freighter detected');
        console.log('Freighter API structure:', window.freighterApi);
        showStatus('Freighter detected! Click Connect to continue', 'success');
    } else {
        console.log('❌ Freighter not found');
        console.log('This could mean:');
        console.log('1. Freighter extension is not installed');
        console.log('2. Freighter is disabled');
        console.log('3. Page loaded before Freighter initialized');
        showStatus('Please install Freighter wallet extension from freighter.app', 'error');
    }
    console.log('=== CHECK COMPLETE ===');
}

// UI Helper Functions
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) {
        console.error('Status element not found');
        return;
    }
    
    console.log(`Status Update (${type}):`, message);
    statusElement.style.display = 'block';
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;

    // Set colors based on message type
    if (type === 'success') {
        statusElement.style.color = '#28a745';
    } else if (type === 'error') {
        statusElement.style.color = '#dc3545';
    } else {
        statusElement.style.color = '#000000';
    }

    // Auto-hide after 3 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

function showError(elementId, message) {
    console.error('Error:', message);
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Error element not found:', elementId);
        return;
    }
    element.className = 'result-message error';
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#dc3545';
}

function showSuccess(elementId, message) {
    console.log('Success:', message);
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Success element not found:', elementId);
        return;
    }
    element.className = 'result-message success';
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#28a745';
}

// Connect to Freighter wallet
async function connectFreighter() {
    try {
        console.log('=== CONNECT FREIGHTER CALLED ===');
        console.log('Window object exists:', !!window);
        console.log('window.freighterApi exists:', !!window.freighterApi);
        console.log('window.freighterApi value:', window.freighterApi);
        
        // Check again at connection time
        if (!window.freighterApi) {
            console.error('❌ Freighter API not found in window object');
            console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('freight')));
            showStatus('Freighter wallet not found. Please install it from https://www.freighter.app/ and refresh the page', 'error');
            window.open('https://www.freighter.app/', '_blank');
            return;
        }

        console.log('✅ Freighter API found!');
        console.log('Freighter API methods:', Object.keys(window.freighterApi));
        console.log('requestAccess method exists:', typeof window.freighterApi.requestAccess);
        console.log('Requesting Freighter access...');
        
        const result = await window.freighterApi.requestAccess();
        console.log('Freighter response received:', result);
        console.log('Response type:', typeof result);
        console.log('Response keys:', Object.keys(result || {}));
        
        if (result.error) {
            showStatus('Failed to connect: ' + result.error, 'error');
            return;
        }
        
        connectedPublicKey = result.address;
        
        document.getElementById('walletAddress').textContent = `${result.address.substring(0, 8)}...${result.address.substring(result.address.length - 4)}`;
        document.getElementById('connectBtn').textContent = 'Connected ✓';
        document.getElementById('connectBtn').disabled = true;
        
        showStatus('Wallet connected successfully!', 'success');
        // Load user's games after successful connection
        loadUserGames();
    } catch (error) {
        console.error('Freighter connection failed:', error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

// ======================
// GAME LOGIC
// ======================

// Create a new game
async function createGame() {
    if (!connectedPublicKey) {
        showError('createResult', 'Please connect your wallet first');
        return;
    }

    const stakeAmount = document.getElementById('stakeAmount').value;
    if (!stakeAmount || stakeAmount <= 0) {
        showError('createResult', 'Please enter a valid stake amount');
        return;
    }

    try {
        showStatus('Creating game...', 'info');

        // Simulate game creation with a random game ID
        const gameId = Math.floor(Math.random() * 1000) + 1;
        
        // Create a mock game object
        const game = {
            game_id: gameId,
            stake_amount: stakeAmount,
            player1: connectedPublicKey,
            player2: 'pending',
            player1_roll: 0,
            player2_roll: 0,
            is_completed: false
        };

        // Store the game in localStorage for demo purposes
        const games = JSON.parse(localStorage.getItem('diceGames') || '[]');
        games.push(game);
        localStorage.setItem('diceGames', JSON.stringify(games));

        showSuccess('createResult', `Game created successfully! Game ID: ${gameId}`);
        switchTab('games');
        loadUserGames();

    } catch (error) {
        console.error('Error creating game:', error);
        showError('createResult', `Failed to create game: ${error.message}`);
    }
}

// Join an existing game
async function joinGame() {
    if (!connectedPublicKey) {
        showError('joinResult', 'Please connect your wallet first');
        return;
    }

    const gameId = document.getElementById('joinGameId').value;
    if (!gameId || gameId <= 0) {
        showError('joinResult', 'Please enter a valid game ID');
        return;
    }

    try {
        showStatus('Joining game...', 'info');

        const publicKey = await window.freighterApi.getPublicKey();
        const account = await server.getAccount(publicKey);
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(StellarSdk.Operation.invokeHostFunction({
            function: 'join_game',
            parameters: [
                StellarSdk.xdr.ScVal.scvU64(gameId),
                StellarSdk.Address.fromString(publicKey).toScvVal()
            ],
            contractId: CONFIG.contractId
        }))
        .setTimeout(30)
        .build();

        const signedXDR = await window.freighterApi.signTransaction(
            transaction.toXDR(),
            CONFIG.networkPassphrase
        );

        const response = await server.sendTransaction(signedXDR);
        
        let result = await server.getTransaction(response.hash);
        while (result.status === "NOT_FOUND") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await server.getTransaction(response.hash);
        }

        if (result.status === "SUCCESS") {
            showSuccess('joinResult', 'Successfully joined the game!');
            switchTab('games');
            loadUserGames();
        } else {
            throw new Error(`Transaction failed: ${result.status}`);
        }

    } catch (error) {
        console.error('Error joining game:', error);
        showError('joinResult', `Failed to join game: ${error.message}`);
    }
}

// Play the game (roll dice)
async function playGame(gameId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        showStatus('Rolling dice...', 'info');
        
        // Show dice animation
        const diceAnimation = document.getElementById('diceAnimation');
        diceAnimation.style.display = 'flex';

        // Get the game from localStorage
        const games = JSON.parse(localStorage.getItem('diceGames') || '[]');
        const gameIndex = games.findIndex(g => g.game_id === parseInt(gameId));
        
        if (gameIndex === -1) {
            throw new Error('Game not found');
        }

        // Simulate dice rolls
        const player1Roll = Math.floor(Math.random() * 11) + 2; // 2-12
        const player2Roll = Math.floor(Math.random() * 11) + 2; // 2-12
        
        // Update game state
        games[gameIndex].player1_roll = player1Roll;
        games[gameIndex].player2_roll = player2Roll;
        games[gameIndex].is_completed = true;
        games[gameIndex].winner = player1Roll > player2Roll ? games[gameIndex].player1 : 
                                 player2Roll > player1Roll ? games[gameIndex].player2 : 'tie';
        
        localStorage.setItem('diceGames', JSON.stringify(games));
        
        // Hide dice animation and show result after 2 seconds
        setTimeout(() => {
            diceAnimation.style.display = 'none';
            showGameResult(gameId);
            loadUserGames();
        }, 2000);

    } catch (error) {
        console.error('Error playing game:', error);
        showStatus(`Failed to play game: ${error.message}`, 'error');
        document.getElementById('diceAnimation').style.display = 'none';
    }
}

// Load and display user's games
async function loadUserGames() {
    if (!connectedPublicKey) {
        document.getElementById('gamesList').innerHTML = 
            '<p class="empty-state">Please connect your wallet to view your games</p>';
        return;
    }

    try {
        // Load games from localStorage
        const games = JSON.parse(localStorage.getItem('diceGames') || '[]')
            .filter(game => game.player1 === connectedPublicKey || game.player2 === connectedPublicKey);

        if (games.length === 0) {
            document.getElementById('gamesList').innerHTML = 
                '<p class="empty-state">No games found. Create or join a game to get started!</p>';
            return;
        }

        const gamesHtml = games.map(createGameElement).join('');
        document.getElementById('gamesList').innerHTML = gamesHtml;
        
        // Add click handlers for game items
        document.querySelectorAll('.game-item').forEach(item => {
            item.addEventListener('click', () => showGameDetails(item.dataset.gameId));
        });

        showStatus('Games loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading games:', error);
        document.getElementById('gamesList').innerHTML = 
            `<p class="empty-state">Error loading games: ${error.message}</p>`;
    }
}

// Create HTML for a game item
function createGameElement(game) {
    const status = game.is_completed ? 'completed' : 
                  game.player2 === 'pending' ? 'pending' : 'active';
    
    return `
        <div class="game-item" data-game-id="${game.game_id}">
            <div class="game-status status-${status}">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
            <h3>Game #${game.game_id}</h3>
            <div class="game-info">
                <div>Stake: ${game.stake_amount} XLM</div>
                <div>Players: ${2 - (game.player2 === 'pending' ? 1 : 0)}/2</div>
            </div>
        </div>
    `;
}

// Show game details in modal
async function showGameDetails(gameId) {
    const modal = document.getElementById('gameModal');
    const modalBody = document.getElementById('modalBody');
    const playButton = document.getElementById('playGameBtn');
    
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        
        const transaction = new StellarSdk.TransactionBuilder(
            await server.getAccount(await window.freighterApi.getPublicKey()),
            {
                fee: '100000',
                networkPassphrase: CONFIG.networkPassphrase
            }
        )
        .addOperation(StellarSdk.Operation.invokeHostFunction({
            function: 'view_game',
            parameters: [StellarSdk.xdr.ScVal.scvU64(gameId)],
            contractId: CONFIG.contractId
        }))
        .setTimeout(30)
        .build();

        const response = await server.simulateTransaction(transaction);
        const gameData = response.result;
        
        let detailsHtml = `
            <div class="game-details">
                <p><strong>Game ID:</strong> ${gameData.game_id}</p>
                <p><strong>Stake Amount:</strong> ${gameData.stake_amount} XLM</p>
                <p><strong>Player 1:</strong> ${formatAddress(gameData.player1)}</p>
                <p><strong>Player 2:</strong> ${formatAddress(gameData.player2)}</p>
        `;
        
        if (gameData.is_completed) {
            detailsHtml += `
                <p><strong>Player 1 Roll:</strong> ${gameData.player1_roll}</p>
                <p><strong>Player 2 Roll:</strong> ${gameData.player2_roll}</p>
                <p><strong>Winner:</strong> ${formatAddress(gameData.winner)}</p>
            `;
            playButton.style.display = 'none';
        } else if (gameData.player2 === 'pending') {
            detailsHtml += `<p>Waiting for Player 2 to join...</p>`;
            playButton.style.display = 'none';
        } else {
            playButton.style.display = 'block';
            playButton.onclick = () => playGame(gameId);
        }
        
        detailsHtml += '</div>';
        modalBody.innerHTML = detailsHtml;
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error showing game details:', error);
        showStatus(`Failed to load game details: ${error.message}`, 'error');
    }
}

// Show game result after playing
async function showGameResult(gameId) {
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const transaction = new StellarSdk.TransactionBuilder(
            await server.getAccount(await window.freighterApi.getPublicKey()),
            {
                fee: '100000',
                networkPassphrase: CONFIG.networkPassphrase
            }
        )
        .addOperation(StellarSdk.Operation.invokeHostFunction({
            function: 'view_game',
            parameters: [StellarSdk.xdr.ScVal.scvU64(gameId)],
            contractId: CONFIG.contractId
        }))
        .setTimeout(30)
        .build();

        const response = await server.simulateTransaction(transaction);
        const gameData = response.result;
        
        const modalBody = document.getElementById('modalBody');
        const resultHtml = `
            <div class="game-result">
                <h3>Game Result</h3>
                <p><strong>Player 1 Roll:</strong> ${gameData.player1_roll}</p>
                <p><strong>Player 2 Roll:</strong> ${gameData.player2_roll}</p>
                <p><strong>Winner:</strong> ${formatAddress(gameData.winner)}</p>
            </div>
        `;
        
        modalBody.innerHTML = resultHtml;
    } catch (error) {
        console.error('Error showing game result:', error);
        showStatus('Failed to load game result', 'error');
    }
}

// Helper function to format addresses
function formatAddress(address) {
    if (address === 'pending' || address === 'none' || address === 'tie') {
        return address;
    }
    return `${address.substring(0, 8)}...${address.substring(address.length - 4)}`;
}

// Tab switching functionality
function switchTab(tabId) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab panel
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // Activate selected tab button
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // If switching to games tab, refresh the games list
    if (tabId === 'games') {
        loadUserGames();
    }
}