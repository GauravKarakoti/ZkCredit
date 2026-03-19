import { TransactionOptions } from '@provablehq/aleo-types';
import { getFeeForFunction } from '@/utils/feeCalculator';

export const CREDITS_PROGRAM_ID = 'credits.aleo';
export const TRANSFER_PUBLIC_FUNCTION = 'transfer_public';

/**
 * Executes a public transfer of credits to a target address.
 *
 * @param wallet - The wallet adapter instance (can be LeoWalletAdapter or ShieldWalletAdapter).
 * @param publicKey - The public key of the user performing the transfer.
 * @param recipientAddress - The address to receive the public transfer.
 * @param amount - The amount (in credits) to be transferred.
 * @param setTxStatus - Function to update the transaction status in the UI.
 * @returns The transaction ID of the submitted public transfer.
 */
export async function publicTransfer(
  wallet: any,
  publicKey: string,
  recipientAddress: string,
  amount: number,
  setTxStatus: (status: string | null) => void,
): Promise<string> {
  // Format the transfer amount (e.g. if amount = 5, then "5000000u64")
  const formattedAmount = `${amount}000000u64`;

  setTxStatus('Initiating public transfer...');

  // 1. Create the transaction input
  const transferInput = [recipientAddress, formattedAmount];
  
  const fee = getFeeForFunction(TRANSFER_PUBLIC_FUNCTION);
  console.log('Calculated fee (in micro credits):', fee);

  const transaction: TransactionOptions = {
    program: CREDITS_PROGRAM_ID,
    function: TRANSFER_PUBLIC_FUNCTION,
    inputs: transferInput as string[],
    fee: fee,
  };

  const result = await wallet.executeTransaction(transaction);
  const txId = result.transactionId || result;
  
  setTxStatus(`Public transfer submitted: ${txId}`);

  // 2. Poll for finalization
  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const statusResponse = await wallet.transactionStatus(txId);
    const status = String(statusResponse); 

    if (status === 'Finalized') {
      finalized = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (!finalized) {
    throw new Error('Public transfer not finalized in time.');
  }

  setTxStatus('Public transfer finalized.');
  
  return txId;
}