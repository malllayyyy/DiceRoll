# PvP Dice Game - Frontend

Web interface for the Soroban-based PvP Dice Game smart contract.

## Features

- 🎨 Beautiful, responsive UI with animations
- 🔗 Freighter wallet integration
- 🎮 Create and join games interface
- 📊 View game history and results
- ⚡ Real-time dice roll animations
- 📱 Mobile-friendly design

## Setup

### 1. Install Freighter Wallet
- Install the [Freighter browser extension](https://www.freighter.app/)
- Create or import a wallet
- Switch to Testnet network

### 2. Configure the Contract
Open `app.js` and update the configuration:
```javascript
var CONFIG = {
    contractId: "YOUR_ACTUAL_CONTRACT_ID",
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: "https://soroban-testnet.stellar.org:443"
};
```

### 3. Run the Application

**Option A: Simple (Direct File)**
- Just open `index.html` in your browser

**Option B: Local Server (Recommended)**
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and approve in Freighter
2. **Create Game**: 
   - Go to "Create Game" tab
   - Enter stake amount
   - Click "Create Game"
   - Share the Game ID with another player
3. **Join Game**:
   - Go to "Join Game" tab
   - Enter the Game ID
   - Click "Join Game"
4. **Play Game**:
   - Go to "My Games" tab
   - Click on a game with both players
   - Click "Roll Dice!"
   - View the results

## Integration with Smart Contract

Currently, this frontend uses simulated data. To connect to your actual contract:

### Update app.js
```javascript
// 1. Import necessary Stellar SDK components
// 2. Implement contract interaction:

function callContractFunction(functionName, args) {
    // Build contract invocation
    var contract = new StellarSdk.Contract(CONFIG.contractId);
    
    // Create operation
    var operation = contract.call(functionName, ...args);
    
    // Build transaction
    var transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: CONFIG.networkPassphrase
    })
    .addOperation(operation)
    .setTimeout(30)
    .build();
    
    // Sign with Freighter
    return window.freighterApi.signTransaction(transaction.toXDR())
        .then(function(signedXDR) {
            // Submit to network
            return server.sendTransaction(signedXDR);
        });
}
```

### Replace Simulated Calls

Replace these sections in `app.js`:
- `createGame()` function - line ~135
- `joinGame()` function - line ~165
- `playGame()` function - line ~245

## File Structure
```
dice_game_frontend/
├── index.html      # Main HTML structure
├── styles.css      # Styling and animations
├── app.js          # Application logic
└── README.md       # This file
```

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling and animations
- **JavaScript (ES5)** - Logic and interactivity
- **Stellar SDK** - Blockchain interaction
- **Freighter API** - Wallet integration

## Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires Freighter wallet extension

## Troubleshooting

### Wallet won't connect
- Make sure Freighter is installed
- Check that you're on the correct network (Testnet)
- Try refreshing the page

### Contract calls failing
- Verify your contract ID is correct
- Ensure you have testnet XLM for gas fees
- Check browser console for errors

### Games not showing
- Games are stored in browser memory
- Refreshing the page will clear the list
- Implement backend storage for persistence

## Next Steps

1. ✅ Deploy your smart contract
2. ✅ Update contract ID in app.js
3. ✅ Implement actual contract calls
4. ⬜ Add transaction confirmation UI
5. ⬜ Add loading states
6. ⬜ Implement error handling
7. ⬜ Add backend for game persistence
8. ⬜ Deploy to hosting (Vercel, Netlify, etc.)

## License

MIT

## Support

For issues or questions:
- Check the browser console for errors
- Verify Freighter is properly installed
- Ensure contract is deployed and ID is correct
```

---

Now you have all 4 files! Create a folder structure like this:
```
dice_game_frontend/
├── index.html
├── styles.css
├── app.js
└── README.md