const { Web3 } = require('web3');

const web3 = new Web3(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/');

const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955".toLowerCase();
const ADMIN_WALLET = "0x185018c5f26B2cE105e0B80b231178CE5913b621".toLowerCase(); // Matches frontend

const verifyTransaction = async (txHash, expectedAmount) => {
  try {
    // In development or when using mock hashes, bypass strict Web3 validation
    if (process.env.NODE_ENV === 'development' && txHash.startsWith('mock_')) {
      console.log('Skipping real Web3 verification for mock/dev transaction:', txHash);
      return { status: true, message: 'Mock transaction verified' };
    }

    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (!receipt) return { status: false, message: 'Transaction not found. Please wait for a few seconds.' };
    if (!receipt.status) return { status: false, message: 'Transaction failed on blockchain' };

    // Verify correct Token Contract
    if (receipt.to.toLowerCase() !== USDT_CONTRACT) {
      return { status: false, message: 'Invalid token contract used for payment' };
    }

    // Look for the Transfer event log
    // Topic[0] for Transfer is 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const log = receipt.logs.find(l => l.topics[0] === transferEventSignature);

    if (!log) return { status: false, message: 'No transfer event found in transaction' };

    // Decode Recipient (Topic[2])
    const recipient = "0x" + log.topics[2].slice(26).toLowerCase();
    if (recipient !== ADMIN_WALLET) {
      return { status: false, message: 'Payment sent to incorrect wallet' };
    }

    // Decode Amount (Data)
    // USDT on BSC uses 18 decimals
    const amountHex = log.data;
    const amountInWei = web3.utils.toBigInt(amountHex);
    const amountInUSDT = Number(amountInWei / 10n ** 18n);

    if (Math.abs(amountInUSDT - expectedAmount) > 0.1) {
      return { status: false, message: `Incorrect payment amount. Expected: ${expectedAmount}, Found: ${amountInUSDT}` };
    }

    return { status: true, message: 'Transaction verified successfully' };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    return { status: false, message: 'Error verifying transaction on blockchain' };
  }
};

module.exports = { verifyTransaction };
