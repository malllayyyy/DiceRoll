import * as StellarSdk from '@stellar/stellar-sdk';

// Configuration - UPDATE THESE VALUES IN PRODUCTION
const CONFIG = {
    contractId: 'CBMJCD7UY5UO5DJJ6WSI6EUMA4IYBKHK45CPA6KD7FJZZISQBAYIJHC2', // Updated: recompiled contract
    xlmTokenId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // Native XLM on testnet
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org',
    apiUrl: 'http://localhost:3001/api'
};

let connectedPublicKey = null;
let server = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Stellar Time Marketplace initialized');
    
    // Wait a bit for Freighter to load
    setTimeout(() => {
        checkFreighterInstalled();
    }, 100);
    
    // Event listeners
    document.getElementById('connectBtn').addEventListener('click', connectFreighter);
    document.getElementById('mintForm').addEventListener('submit', handleMint);
    document.getElementById('loadMyTokens').addEventListener('click', loadMyTokens);
    document.getElementById('loadAllTokens').addEventListener('click', loadAllTokens);
});

// Check if Freighter is installed
function checkFreighterInstalled() {
    console.log('Checking for Freighter...', window.freighterApi);
    if (window.freighterApi) {
        console.log('✅ Freighter detected');
        showStatus('Freighter detected! Click Connect to continue', 'success');
    } else {
        console.log('❌ Freighter not found');
        showStatus('Please install Freighter wallet extension from freighter.app', 'error');
    }
}

// Connect to Freighter wallet
async function connectFreighter() {
    try {
        // Check again at connection time
        if (!window.freighterApi) {
            showStatus('Freighter wallet not found. Please install it from https://www.freighter.app/ and refresh the page', 'error');
            window.open('https://www.freighter.app/', '_blank');
            return;
        }

        console.log('Requesting Freighter access...');
        const result = await window.freighterApi.requestAccess();
        console.log('Freighter response:', result);
        
        if (result.error) {
            showStatus('Failed to connect: ' + result.error, 'error');
            return;
        }
        
        connectedPublicKey = result.address;
        
        document.getElementById('walletAddress').textContent = `${result.address.substring(0, 8)}...${result.address.substring(result.address.length - 4)}`;
        document.getElementById('connectBtn').textContent = 'Connected ✓';
        document.getElementById('connectBtn').disabled = true;
        
        showStatus('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Freighter connection failed:', error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

// Mint new time token
async function handleMint(e) {
    e.preventDefault();
    
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const hourlyRate = document.getElementById('hourlyRate').value;
    const hoursAvailable = document.getElementById('hoursAvailable').value;
    const description = document.getElementById('description').value;

    try {
        showStatus('Minting token...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
        const hourlyRateStroops = Math.round(parseFloat(hourlyRate) * 10000000);
        
        // Convert parameters to ScVal
        const params = [
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.nativeToScVal(hourlyRateStroops, { type: 'i128' }),
            StellarSdk.nativeToScVal(parseInt(hoursAvailable), { type: 'u32' }),
            StellarSdk.nativeToScVal(description, { type: 'string' })
        ];
        
        // Build transaction
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('mint_time_token', ...params))
        .setTimeout(30)
        .build();

        // Prepare transaction (simulate)
        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        // Sign with Freighter
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        // Submit transaction
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        console.log('Transaction result:', result);
        
        // For PENDING status, show immediate feedback and refresh after delay
        if (result.status === 'PENDING') {
            showStatus('Transaction submitted! Waiting for confirmation...', 'info');
            console.log('Transaction hash:', result.hash);
            
            // Wait 5 seconds then reload
            console.log('Waiting 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('Wait complete, updating UI...');
            
            showStatus('Token minted successfully!', 'success');
            
            // Reload the lists
            console.log('Loading my tokens...');
            await loadMyTokens();
            console.log('Loading all tokens...');
            await loadAllTokens();
            console.log('All done!');
        } else {
            showStatus('Token minted successfully!', 'success');
        }
        
        document.getElementById('mintForm').reset();
        
    } catch (error) {
        console.error('Minting failed:', error);
        showStatus('Failed to mint token: ' + error.message, 'error');
    }
}

// Load user's tokens
async function loadMyTokens() {
    console.log('loadMyTokens called, connectedPublicKey:', connectedPublicKey);
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        console.log('Loading your tokens...');
        showStatus('Loading your tokens...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        // Get seller tokens
        const params = [new StellarSdk.Address(connectedPublicKey).toScVal()];
        
        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('get_seller_tokens', ...params))
        .setTimeout(30)
        .build();

        const prepared = await server.prepareTransaction(transaction);
        const result = await server.simulateTransaction(prepared);
        
        console.log('get_seller_tokens result:', result);
        console.log('result.result:', result.result);
        console.log('result.result.retval:', result.result?.retval);
        
        // Check for result.retval (correct SDK format)
        if (result.result && result.result.retval) {
            const tokenIds = StellarSdk.scValToNative(result.result.retval);
            console.log('Token IDs for my tokens:', tokenIds);
            
            if (tokenIds.length === 0) {
                console.log('No tokens found for this seller');
                document.getElementById('myTokensList').innerHTML = '<p>You have no tokens yet.</p>';
            } else {
                console.log(`Found ${tokenIds.length} tokens, displaying...`);
                await displayTokens(tokenIds, 'myTokensList', true);
            }
        } else {
            console.log('No result.retval from get_seller_tokens');
            document.getElementById('myTokensList').innerHTML = '<p>You have no tokens yet.</p>';
        }
        
        console.log('My tokens loaded successfully');
        showStatus('Tokens loaded', 'success');
        
    } catch (error) {
        console.error('Failed to load my tokens:', error);
        console.error('Error details:', error.message, error.stack);
        showStatus('Failed to load tokens: ' + error.message, 'error');
    }
}

// Load all tokens from marketplace using API (faster!)
async function loadAllTokens() {
    console.log('loadAllTokens called');
    try {
        console.log('Loading marketplace from API...');
        showStatus('Loading marketplace...', 'info');

        // Try to fetch from API first (faster)
        try {
            const response = await fetch(`${CONFIG.apiUrl}/tokens`);
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded from API:', data);
                
                if (data.data && data.data.length > 0) {
                    await displayTokensFromAPI(data.data, 'tokenList');
                    showStatus(`Loaded ${data.data.length} tokens from database`, 'success');
                    return;
                }
            }
        } catch (apiError) {
            console.log('API not available, falling back to blockchain:', apiError.message);
        }

        // Fallback to blockchain if API is unavailable
        console.log('Loading from blockchain...');
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await server.getAccount(connectedPublicKey || await getAnyAccount());
        
        // Get token count
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('get_token_count'))
        .setTimeout(30)
        .build();

        const prepared = await server.prepareTransaction(transaction);
        const result = await server.simulateTransaction(prepared);
        
        console.log('get_token_count result:', result);
        
        if (result.result && result.result.retval) {
            const count = StellarSdk.scValToNative(result.result.retval);
            console.log('Total token count:', count);
            
            const countNum = Number(count);
            
            if (countNum === 0) {
                console.log('No tokens in marketplace');
                document.getElementById('tokenList').innerHTML = '<p>No tokens in marketplace yet.</p>';
            } else {
                const tokenIds = Array.from({ length: countNum }, (_, i) => i + 1);
                console.log('Token IDs to load:', tokenIds);
                await displayTokens(tokenIds, 'tokenList', false);
            }
        } else {
            console.log('No result.retval from get_token_count');
            document.getElementById('tokenList').innerHTML = '<p>No tokens in marketplace yet.</p>';
        }
        
        console.log('Marketplace loaded successfully');
        showStatus('Marketplace loaded from blockchain', 'success');
        
    } catch (error) {
        console.error('Failed to load marketplace:', error);
        console.error('Error details:', error.message, error.stack);
        showStatus('Failed to load marketplace: ' + error.message, 'error');
    }
}

// Display tokens
async function displayTokens(tokenIds, containerId, isMyTokens) {
    console.log(`displayTokens called with ${tokenIds.length} tokens for ${containerId}`);
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const tokenId of tokenIds) {
        try {
            console.log(`Fetching token ${tokenId}...`);
            const tokenData = await getTokenDetails(tokenId);
            console.log(`Token ${tokenId} data:`, tokenData);
            if (tokenData) {
                const card = createTokenCard(tokenId, tokenData, isMyTokens);
                console.log(`Adding card for token ${tokenId}`);
                container.innerHTML += card;
            } else {
                console.log(`No data for token ${tokenId}`);
            }
        } catch (error) {
            console.error(`Failed to load token ${tokenId}:`, error);
        }
    }
    console.log(`Finished displaying ${tokenIds.length} tokens`);
}

// Get token details
async function getTokenDetails(tokenId) {
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await server.getAccount(connectedPublicKey || await getAnyAccount());
        
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call(
            'get_token',
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' })
        ))
        .setTimeout(30)
        .build();

        const prepared = await server.prepareTransaction(transaction);
        const result = await server.simulateTransaction(prepared);
        
        // Use result.retval (correct SDK format)
        if (result.result && result.result.retval) {
            return StellarSdk.scValToNative(result.result.retval);
        }
        return null;
        
    } catch (error) {
        console.error(`Error getting token ${tokenId}:`, error);
        return null;
    }
}

// Create token card HTML
function createTokenCard(tokenId, token, isMyTokens) {
    const actions = isMyTokens
        ? `<div class="actions">
            <button class="btn-danger" onclick="deleteToken(${tokenId})">Delete</button>
            <button class="btn-secondary" onclick="updateAvailability(${tokenId})">Update Hours</button>
           </div>`
        : `<div class="actions">
            <button class="btn-purchase" onclick="purchaseToken(${tokenId})">Purchase</button>
           </div>`;

    return `
        <div class="token-card">
            <h3>${token.description}</h3>
            <p><strong>Token ID:</strong> ${tokenId}</p>
            <p><strong>Hourly Rate:</strong> ${token.hourly_rate} stroops</p>
            <p><strong>Hours Available:</strong> ${token.hours_available}</p>
            <p><strong>Seller:</strong> ${token.seller.substring(0, 8)}...${token.seller.substring(token.seller.length - 4)}</p>
            ${actions}
        </div>
    `;
}

// Purchase token
window.purchaseToken = async function(tokenId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const hours = prompt('How many hours would you like to purchase?');
    if (!hours || hours <= 0) return;

    try {
        showStatus('Processing purchase...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const params = [
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.nativeToScVal(parseInt(hours), { type: 'u32' })
        ];
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('purchase_token', ...params))
        .setTimeout(30)
        .build();

        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        if (result.status === 'PENDING') {
            showStatus('Purchase submitted! Waiting for confirmation...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        showStatus('Purchase successful!', 'success');
        await loadMyTokens();
        await loadAllTokens();
        
    } catch (error) {
        console.error('Purchase failed:', error);
        showStatus('Purchase failed: ' + error.message, 'error');
    }
};

// Delete token
window.deleteToken = async function(tokenId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this token?')) return;

    try {
        showStatus('Deleting token...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const params = [
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal()
        ];
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('delete_token', ...params))
        .setTimeout(30)
        .build();

        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        if (result.status === 'PENDING') {
            showStatus('Token deletion submitted! Waiting for confirmation...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        showStatus('Token deleted!', 'success');
        await loadMyTokens();
        await loadAllTokens();
        
    } catch (error) {
        console.error('Delete failed:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
};

// Update availability
window.updateAvailability = async function(tokenId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const newHours = prompt('Enter new hours available:');
    if (!newHours || newHours < 0) return;

    try {
        showStatus('Updating availability...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const params = [
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.nativeToScVal(parseInt(newHours), { type: 'u32' })
        ];
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('update_availability', ...params))
        .setTimeout(30)
        .build();

        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        if (result.status === 'PENDING') {
            showStatus('Update submitted! Waiting for confirmation...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        showStatus('Availability updated!', 'success');
        await loadMyTokens();
        await loadAllTokens();
        
    } catch (error) {
        console.error('Update failed:', error);
        showStatus('Update failed: ' + error.message, 'error');
    }
};

// Poll transaction status
async function pollTransactionStatus(hash) {
    console.log('Polling transaction:', hash);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const getResponse = await server.getTransaction(hash);
            
            console.log('Poll attempt', attempts + 1, '- Status:', getResponse.status);
            
            if (getResponse.status === 'NOT_FOUND') {
                attempts++;
                continue;
            }
            
            if (getResponse.status === 'SUCCESS') {
                console.log('✅ Transaction succeeded!');
                return getResponse;
            } else if (getResponse.status === 'FAILED') {
                console.error('❌ Transaction failed');
                throw new Error(`Transaction failed`);
            }
        } catch (error) {
            // If we get an XDR parsing error, the transaction might still be pending
            if (error.message && error.message.includes('Bad union switch')) {
                console.log('XDR parsing error (transaction still processing), retrying...');
                attempts++;
                continue;
            }
            // For other errors, rethrow
            throw error;
        }
    }
    
    throw new Error('Transaction polling timeout - transaction may still be processing');
}

// Get any account for read-only operations
async function getAnyAccount() {
    // Use a known funded account for simulation
    const keypair = StellarSdk.Keypair.random();
    return keypair.publicKey();
}

// Show status message
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `show ${type}`;
    
    setTimeout(() => {
        status.classList.remove('show');
    }, 5000);
}

// ==================== SECONDARY MARKETPLACE FUNCTIONS ====================

// Get receipt details
async function getReceipt(receiptId) {
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await getAnyAccount();
        
        const tx = new StellarSdk.TransactionBuilder(
            new StellarSdk.Account(sourceAccount, '0'),
            {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: CONFIG.networkPassphrase,
            }
        )
        .addOperation(
            contract.call(
                'get_receipt',
                StellarSdk.nativeToScVal(receiptId, { type: 'u64' })
            )
        )
        .setTimeout(30)
        .build();
        
        const response = await server.simulateTransaction(tx);
        
        // Access the result correctly
        const result = response.result?.retval || (response.results && response.results.length > 0 ? response.results[0].retval : null);
        
        if (result) {
            return StellarSdk.scValToNative(result);
        }
        return null;
    } catch (error) {
        console.error('Error getting receipt:', error);
        return null;
    }
}

// Get user's receipts
async function getMyReceipts() {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        console.log('getMyReceipts called for:', connectedPublicKey);
        showStatus('Loading your receipts...', 'info');
        
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await getAnyAccount();
        
        const tx = new StellarSdk.TransactionBuilder(
            new StellarSdk.Account(sourceAccount, '0'),
            {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: CONFIG.networkPassphrase,
            }
        )
        .addOperation(
            contract.call(
                'get_owner_receipts',
                new StellarSdk.Address(connectedPublicKey).toScVal()
            )
        )
        .setTimeout(30)
        .build();
        
        const response = await server.simulateTransaction(tx);
        console.log('get_owner_receipts response:', response);
        
        // Access the result correctly
        const result = response.result?.retval || (response.results && response.results.length > 0 ? response.results[0].retval : null);
        
        if (result) {
            console.log('result.retval:', result);
            const receiptIds = StellarSdk.scValToNative(result);
            console.log('Receipt IDs:', receiptIds);
            
            if (receiptIds && receiptIds.length > 0) {
                console.log(`Found ${receiptIds.length} receipt(s)`);
                const receipts = [];
                for (const id of receiptIds) {
                    console.log(`Fetching receipt ${id}...`);
                    const receipt = await getReceipt(id);
                    console.log(`Receipt ${id} data:`, receipt);
                    if (receipt) {
                        receipts.push({ id, ...receipt });
                    }
                }
                console.log('All receipts:', receipts);
                displayReceipts(receipts);
                showStatus(`Loaded ${receipts.length} receipt(s)`, 'success');
            } else {
                console.log('No receipts found for this address');
                showStatus('No receipts found. Purchase some hours to get started!', 'info');
                displayReceipts([]);
            }
        } else {
            console.log('No results from get_owner_receipts');
            showStatus('No receipts found', 'info');
            displayReceipts([]);
        }
    } catch (error) {
        console.error('Error loading receipts:', error);
        showStatus('Error loading receipts: ' + error.message, 'error');
    }
}

// Get total receipt count (for debugging)
async function getReceiptCount() {
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await getAnyAccount();
        
        const tx = new StellarSdk.TransactionBuilder(
            new StellarSdk.Account(sourceAccount, '0'),
            {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: CONFIG.networkPassphrase,
            }
        )
        .addOperation(contract.call('get_receipt_count'))
        .setTimeout(30)
        .build();
        
        const response = await server.simulateTransaction(tx);
        
        // Access the result correctly
        const result = response.result?.retval || (response.results && response.results.length > 0 ? response.results[0].retval : null);
        
        if (result) {
            const count = StellarSdk.scValToNative(result);
            console.log('Total receipt count:', count);
            return count;
        }
        return 0;
    } catch (error) {
        console.error('Error getting receipt count:', error);
        return 0;
    }
}

// List receipt for sale
async function listReceipt(receiptId, price) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        console.log('listReceipt called with:', receiptId, price);
        showStatus('Creating secondary listing...', 'info');
        
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        // Manually create i128 ScVal
        const priceAmount = BigInt(price);
        const i128Value = new StellarSdk.xdr.Int128Parts({
            lo: StellarSdk.xdr.Uint64.fromString((priceAmount & BigInt('0xFFFFFFFFFFFFFFFF')).toString()),
            hi: StellarSdk.xdr.Int64.fromString((priceAmount >> BigInt(64)).toString())
        });
        
        const params = [
            StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.xdr.ScVal.scvI128(i128Value)
        ];
        
        console.log('Contract call params:', params);
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('list_on_secondary', ...params))
        .setTimeout(30)
        .build();

        console.log('Transaction built successfully');
        transaction = await server.prepareTransaction(transaction);
        console.log('Transaction prepared successfully');
        const preparedXDR = transaction.toXDR();
        console.log('XDR created successfully');
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
            signResult.signedTxXdr,
            CONFIG.networkPassphrase
        );

        const result = await server.sendTransaction(signedTx);
        console.log('List transaction result:', result);
        
        // Wait for transaction to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        showStatus('Receipt listed successfully!', 'success');
        
        // Reload receipts
        setTimeout(() => getMyReceipts(), 1000);
        
        return true;
    } catch (error) {
        console.error('Error listing receipt:', error);
        showStatus('Error listing receipt: ' + error.message, 'error');
        return false;
    }
}

// Buy from secondary market
async function buyFromSecondary(receiptId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        showStatus('Getting listing details...', 'info');
        
        // First get the listing to know the price
        const listing = await getListing(receiptId);
        if (!listing || !listing.is_active) {
            showStatus('This listing is no longer active', 'error');
            return false;
        }
        
        const priceXLM = (Number(listing.price) / 10000000).toFixed(7);
        if (!confirm(`Buy this receipt for ${priceXLM} XLM?`)) {
            return false;
        }
        
        showStatus('Purchasing from secondary market...', 'info');
        
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        // Contract expects: receipt_id, buyer, xlm_token (NOT payment_amount)
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: (200000).toString(),
            networkPassphrase: CONFIG.networkPassphrase,
        })
        .addOperation(
            contract.call(
                'buy_from_secondary',
                StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
                new StellarSdk.Address(connectedPublicKey).toScVal(),
                new StellarSdk.Address(CONFIG.xlmTokenId).toScVal()
            )
        )
        .setTimeout(30)
        .build();

        const prepareTx = await server.prepareTransaction(tx);
        const xdr = prepareTx.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(xdr, {
            networkPassphrase: CONFIG.networkPassphrase,
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
            signResult.signedTxXdr,
            CONFIG.networkPassphrase
        );

        const result = await server.sendTransaction(signedTx);
        console.log('Buy transaction result:', result);
        
        // Wait for transaction to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        showStatus('✅ Purchase successful! Receipt is now yours!', 'success');
        
        // Reload both views
        setTimeout(() => {
            loadSecondaryMarket();
            getMyReceipts();
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('Error buying from secondary:', error);
        showStatus('Error purchasing: ' + error.message, 'error');
        return false;
    }
}

// Display receipts in UI
function displayReceipts(receipts) {
    const container = document.getElementById('receiptsContainer');
    if (!container) return;
    
    if (!receipts || receipts.length === 0) {
        container.innerHTML = '<p>No receipts yet. Purchase some hours to get started!</p>';
        return;
    }
    
    container.innerHTML = receipts.map(receipt => `
        <div class="receipt-card">
            <h3>Receipt #${receipt.id}</h3>
            <p><strong>Hours:</strong> ${receipt.hours}</p>
            <p><strong>Original Rate:</strong> ${Number(receipt.original_rate) / 10000000} XLM/hour</p>
            <p><strong>Purchase Price:</strong> ${Number(receipt.purchase_price) / 10000000} XLM</p>
            <p><strong>Description:</strong> ${receipt.description}</p>
            <div class="receipt-actions">
                <input type="number" id="price_${receipt.id}" placeholder="Resale price (XLM)" min="0" step="any" />
                <button onclick="listReceipt(${receipt.id}, Math.round(Number(document.getElementById('price_${receipt.id}').value) * 10000000))">
                    List for Sale
                </button>
                <button onclick="redeemReceipt(${receipt.id})" class="btn-secondary" style="background: #e74c3c; margin-top: 10px;">
                    🔥 Redeem & Burn
                </button>
            </div>
        </div>
    `).join('');
}

// Load secondary market listings
async function loadSecondaryMarket() {
    try {
        showStatus('Loading secondary market...', 'info');
        console.log('Loading secondary market listings...');
        
        // Get total receipt count
        const receiptCount = await getReceiptCount();
        console.log('Total receipts:', receiptCount);
        
        if (receiptCount === 0) {
            document.getElementById('secondaryMarketList').innerHTML = '<p>No receipts exist yet. Be the first to purchase hours!</p>';
            showStatus('No secondary listings found', 'info');
            return;
        }
        
        // Check each receipt for active listings
        const listings = [];
        for (let i = 1; i <= receiptCount; i++) {
            const listing = await getListing(i);
            if (listing && listing.is_active) {
                const receipt = await getReceipt(i);
                if (receipt) {
                    listings.push({
                        receipt_id: i,
                        listing,
                        receipt
                    });
                }
            }
        }
        
        console.log('Active listings:', listings);
        displaySecondaryMarket(listings);
        showStatus(`Found ${listings.length} active listing(s)`, 'success');
        
    } catch (error) {
        console.error('Error loading secondary market:', error);
        showStatus('Error loading secondary market: ' + error.message, 'error');
    }
}

// Get listing details
async function getListing(receiptId) {
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await getAnyAccount();
        
        const tx = new StellarSdk.TransactionBuilder(
            new StellarSdk.Account(sourceAccount, '0'),
            {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: CONFIG.networkPassphrase,
            }
        )
        .addOperation(
            contract.call(
                'get_listing',
                StellarSdk.nativeToScVal(receiptId, { type: 'u64' })
            )
        )
        .setTimeout(30)
        .build();
        
        const response = await server.simulateTransaction(tx);
        const result = response.result?.retval || (response.results && response.results.length > 0 ? response.results[0].retval : null);
        
        if (result) {
            return StellarSdk.scValToNative(result);
        }
        return null;
    } catch (error) {
        console.error(`Error getting listing ${receiptId}:`, error);
        return null;
    }
}

// Display secondary market listings
function displaySecondaryMarket(listings) {
    const container = document.getElementById('secondaryMarketList');
    
    if (!listings || listings.length === 0) {
        container.innerHTML = '<p>No active secondary listings. List your receipts to start trading!</p>';
        return;
    }
    
    container.innerHTML = listings.map(item => {
        const priceXLM = (Number(item.listing.price) / 10000000).toFixed(7);
        const originalPriceXLM = (Number(item.receipt.purchase_price) / 10000000).toFixed(7);
        const markup = ((Number(item.listing.price) / Number(item.receipt.purchase_price) - 1) * 100).toFixed(1);
        
        return `
            <div class="token-card">
                <h3>🎫 Receipt #${item.receipt_id} - ${item.receipt.hours} Hours</h3>
                <p><strong>Service:</strong> ${item.receipt.description}</p>
                <p><strong>Original Rate:</strong> ${Number(item.receipt.original_rate) / 10000000} XLM/hour</p>
                <p><strong>Original Price:</strong> ${originalPriceXLM} XLM</p>
                <p style="color: #e74c3c; font-weight: bold;"><strong>Resale Price:</strong> ${priceXLM} XLM ${markup > 0 ? `(+${markup}% markup)` : ''}</p>
                <p><strong>Seller:</strong> ${item.listing.seller.substring(0, 8)}...${item.listing.seller.substring(item.listing.seller.length - 4)}</p>
                <p><strong>Original Seller Gets:</strong> ${(Number(item.listing.price) * 0.05 / 10000000).toFixed(7)} XLM (5% royalty)</p>
                <button onclick="buyFromSecondary(${item.receipt_id})" class="btn-primary">
                    Buy for ${priceXLM} XLM
                </button>
            </div>
        `;
    }).join('');
}

// Redeem receipt (burn the token hours)
async function redeemReceipt(receiptId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        if (!confirm('Are you sure you want to redeem this receipt? This will permanently burn the token and cannot be undone.')) {
            return;
        }

        showStatus('Redeeming receipt...', 'info');
        
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(
            contract.call(
                'redeem_receipt',
                StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
                new StellarSdk.Address(connectedPublicKey).toScVal()
            )
        )
        .setTimeout(30)
        .build();

        const prepareTx = await server.prepareTransaction(tx);
        const xdr = prepareTx.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(xdr, {
            networkPassphrase: CONFIG.networkPassphrase,
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
            signResult.signedTxXdr,
            CONFIG.networkPassphrase
        );

        const result = await server.sendTransaction(signedTx);
        console.log('Redeem transaction result:', result);
        
        // Wait for transaction to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        showStatus('✅ Receipt redeemed successfully! Token has been burned.', 'success');
        
        // Reload receipts
        setTimeout(() => getMyReceipts(), 1000);
        
        return true;
    } catch (error) {
        console.error('Error redeeming receipt:', error);
        showStatus('Error redeeming receipt: ' + error.message, 'error');
        return false;
    }
}

// Display tokens from API (enhanced with metadata)
async function displayTokensFromAPI(tokens, containerId) {
    console.log(`displayTokensFromAPI called with ${tokens.length} tokens`);
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (tokens.length === 0) {
        container.innerHTML = '<p>No tokens found. Try adjusting your filters.</p>';
        return;
    }

    for (const token of tokens) {
        const hourlyRateXLM = Number(token.hourly_rate) / 10000000;
        const card = `
            <div class="token-card">
                <h3>${token.title || `Time Token #${token.token_id}`}</h3>
                <p><strong>Seller:</strong> ${token.seller_address.substring(0, 8)}...${token.seller_address.substring(token.seller_address.length - 4)}</p>
                <p><strong>Hourly Rate:</strong> ${hourlyRateXLM} XLM</p>
                <p><strong>Available Hours:</strong> ${token.hours_available}</p>
                ${token.category ? `<p><strong>Category:</strong> ${token.category}</p>` : ''}
                ${token.description ? `<p>${token.description}</p>` : ''}
                ${token.tags && token.tags.length > 0 ? `<p><strong>Tags:</strong> ${token.tags.join(', ')}</p>` : ''}
                ${token.view_count ? `<p><small>👁️ ${token.view_count} views</small></p>` : ''}
                <button onclick="purchaseToken(${token.token_id})" class="btn-primary">Purchase Hours</button>
            </div>
        `;
        container.innerHTML += card;
    }
}

// Apply search and filters
async function applyFilters() {
    try {
        showStatus('Searching tokens...', 'info');
        
        const search = document.getElementById('searchInput')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const sort = document.getElementById('sortFilter')?.value || 'newest';
        const minPrice = document.getElementById('minPrice')?.value || '';
        const maxPrice = document.getElementById('maxPrice')?.value || '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category) params.append('category', category);
        if (sort) params.append('sort', sort);
        if (minPrice) params.append('min_price', Number(minPrice) * 10000000); // Convert XLM to stroops
        if (maxPrice) params.append('max_price', Number(maxPrice) * 10000000);
        
        // Fetch from API
        const response = await fetch(`${CONFIG.apiUrl}/tokens?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        console.log('Filtered tokens:', data);
        
        await displayTokensFromAPI(data.data, 'tokenList');
        showStatus(`Found ${data.data.length} tokens`, 'success');
        
    } catch (error) {
        console.error('Failed to apply filters:', error);
        showStatus('Failed to search. Make sure backend is running.', 'error');
        // Fallback to basic load
        loadAllTokens();
    }
}

// Profile Management
let userProfile = null;
let avatarDataUrl = null;

async function loadUserProfile() {
    if (!connectedPublicKey) return;
    
    try {
        const response = await fetch(`${CONFIG.apiUrl}/profiles/${connectedPublicKey}`);
        if (response.ok) {
            userProfile = await response.json();
            console.log('Profile loaded:', userProfile);
            
            // Pre-fill form if profile exists
            if (userProfile) {
                document.getElementById('displayName').value = userProfile.display_name || '';
                document.getElementById('username').value = userProfile.username || '';
                document.getElementById('bio').value = userProfile.bio || '';
                document.getElementById('twitter').value = userProfile.social_links?.twitter || '';
                document.getElementById('github').value = userProfile.social_links?.github || '';
                
                if (userProfile.avatar_url) {
                    document.getElementById('avatarPreview').src = userProfile.avatar_url;
                    document.getElementById('avatarPreview').style.display = 'block';
                    document.getElementById('uploadPlaceholder').style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.log('No profile found or API unavailable');
    }
}

window.openProfileModal = function() {
    document.getElementById('profileModal').classList.add('active');
    loadUserProfile();
};

window.closeProfileModal = function() {
    document.getElementById('profileModal').classList.remove('active');
};

window.previewAvatar = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarDataUrl = e.target.result;
            document.getElementById('avatarPreview').src = avatarDataUrl;
            document.getElementById('avatarPreview').style.display = 'block';
            document.getElementById('uploadPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

window.saveProfile = async function(event) {
    event.preventDefault();
    
    if (!connectedPublicKey) {
        showStatus('Please connect wallet first', 'error');
        return;
    }
    
    try {
        showStatus('Saving profile...', 'info');
        
        const profileData = {
            username: document.getElementById('username').value,
            display_name: document.getElementById('displayName').value,
            bio: document.getElementById('bio').value,
            avatar_url: avatarDataUrl || userProfile?.avatar_url || '',
            social_links: {
                twitter: document.getElementById('twitter').value,
                github: document.getElementById('github').value
            }
        };
        
        const response = await fetch(`${CONFIG.apiUrl}/profiles/${connectedPublicKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            userProfile = await response.json();
            showStatus('✅ Profile saved successfully!', 'success');
            closeProfileModal();
        } else {
            const error = await response.json();
            showStatus(`Error: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showStatus('Failed to save profile. Make sure backend is running.', 'error');
    }
};

// Update connect wallet to show profile button
const originalConnectFreighter = connectFreighter;
connectFreighter = async function() {
    await originalConnectFreighter();
    if (connectedPublicKey) {
        document.getElementById('profileBtn').style.display = 'inline-block';
        await loadUserProfile();
    }
};

// Make functions globally available
window.getMyReceipts = getMyReceipts;
window.getReceiptCount = getReceiptCount;
window.listReceipt = listReceipt;
window.buyFromSecondary = buyFromSecondary;
window.loadSecondaryMarket = loadSecondaryMarket;
window.getListing = getListing;
window.redeemReceipt = redeemReceipt;
window.applyFilters = applyFilters;

console.log('App loaded. Contract ID:', CONFIG.contractId);
console.log('Available global functions: getMyReceipts, getReceiptCount, listReceipt, buyFromSecondary, loadSecondaryMarket, redeemReceipt, applyFilters');
console.log('Profile features enabled!');