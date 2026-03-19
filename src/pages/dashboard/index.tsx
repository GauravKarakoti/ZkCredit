import React, { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import axios from 'axios';
import { Buffer } from 'buffer';
import Layout from '@/layouts/dashboard/_dashboard';
import type { NextPageWithLayout } from '@/types';
import Button from '@/components/ui/button';

// Helper to convert hex to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
    return new Uint8Array(Buffer.from(hex, 'hex'));
}

const DashboardPage: NextPageWithLayout = () => {
    // 1. Changed publicKey -> address, requestTransaction -> executeTransaction
    const { address, connected, executeTransaction } = useWallet();
    const [amount, setAmount] = useState('');
    const [threshold, setThreshold] = useState('');
    const [score, setScore] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [proof, setProof] = useState<any>(null);
    const [signatures, setSignatures] = useState<string[]>([]);
    const [oraclePKs, setOraclePKs] = useState<string[]>([]);

    // Oracle endpoints (run multiple instances)
    const oracleEndpoints = [
        `${process.env.ORACLE_URL}/sign`
    ];

    const handleRequestLoan = async () => {
        if (!connected || !address) {
            alert('Please connect your wallet first.');
            return;
        }
        setLoading(true);
        setStatus('Generating score hash and fetching signatures...');
        
        // 1. Hash the score locally
        const scoreBuffer = new TextEncoder().encode(score);
        const hashBuffer = await crypto.subtle.digest('SHA-256', scoreBuffer);
        const scoreHash = Buffer.from(hashBuffer).toString('hex');

        // 2. Get signatures from your Oracle backend
        const sigs: any[] = [];
        const pks: any[] = [];
        for (let endpoint of oracleEndpoints) {
            try {
                const response = await axios.post(endpoint, { scoreHash });
                sigs.push(response.data.signature);
                pks.push(response.data.oracle_address); // Ensure this matches what your backend sends
            } catch (error) {
                console.error(`Oracle at ${endpoint} failed:`, error);
            }
        }
        
        // NOTE: Because your main.leo contract currently mocks the proof verification 
        // and expects specific array sizes like [u8; 64], you will need to format your 
        // variables into Leo string representations before passing them. 
        // For example, generating dummy arrays just to satisfy the contract's expected types:
        
        const dummySigArray = `[${Array(64).fill('0u8').join(', ')}]`;
        const dummyScoreHashArray = `[${Array(32).fill('0u8').join(', ')}]`;
        const dummyProofArray = `[${Array(64).fill('0u8').join(', ')}]`;

        // Constructing the CreditProof struct expected by request_loan
        const creditProofStruct = `{
            sig: ${dummySigArray},
            score_hash: ${dummyScoreHashArray},
            proof: ${dummyProofArray}
        }`;

        // Formatting arrays expected by the contract
        const formattedSignatures = `[${dummySigArray}, ${dummySigArray}, ${dummySigArray}]`;
        const formattedOraclePks = `[${address}, ${address}, ${address}]`; // Fallback to user address for testing

        setStatus('Prompting wallet to generate proof and submit transaction...');
        
        // 3. Construct the transaction
        const loanRequest = {
            program: 'zkcredit.aleo', // Make sure this matches your deployed program ID
            function: 'request_loan',
            inputs: [
                address, 
                `${amount}u64`,
                `${threshold}u64`,
                creditProofStruct,
                formattedSignatures,
                formattedOraclePks,
                '2u8'
            ],
            fee: 0.04406, 
        };
        
        try {
            // The wallet automatically generates the ZK Proof here! No snarkjs needed.
            const txResult = await executeTransaction(loanRequest);
            if (txResult?.transactionId) {
                setStatus(`Transaction submitted! TX ID: ${txResult.transactionId}`);
            } else {
                setStatus(`Transaction failed or was canceled.`);
            }
        } catch (err: any) {
            setStatus(`Transaction failed: ${err.message}`);
        }
        
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto bg-base-100 rounded-lg shadow-card p-6 mt-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-center">Request a Private Loan</h1>
                <p className="text-gray-500 text-sm mt-1 text-center">Your credit score never leaves your device.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Loan Amount (in microcredits)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="e.g. 1000000"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Credit Score Threshold</label>
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="e.g. 700"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Your Credit Score</label>
                    <input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="e.g. 750"
                    />
                </div>
                
                <Button
                    onClick={handleRequestLoan}
                    isLoading={loading}
                    disabled={!connected || loading}
                    className="w-full mt-4 btn-secondary"
                >
                    {loading ? 'Processing...' : 'Request Loan'}
                </Button>

                {status && (
                    <div className="mt-4 p-4 bg-base-200 text-base-content rounded-md text-sm break-all">
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
};

// Wrap the page in the dashboard layout
DashboardPage.getLayout = (page) => <Layout>{page}</Layout>;

export default DashboardPage;