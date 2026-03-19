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
        'http://localhost:3001/sign',
        'http://localhost:3002/sign',
        'http://localhost:3003/sign'
    ];

    const handleRequestLoan = async () => {
        // 2. Updated condition to use address
        if (!connected || !address) {
            alert('Please connect your wallet first.');
            return;
        }
        setLoading(true);
        setStatus('Generating score hash...');
        
        // 1. Hash the score locally
        const scoreBuffer = new TextEncoder().encode(score);
        const hashBuffer = await crypto.subtle.digest('SHA-256', scoreBuffer);
        const scoreHash = Buffer.from(hashBuffer).toString('hex');

        // 2. Get signatures from oracles
        setStatus('Requesting oracle signatures...');
        const sigs: any[] = [];
        const pks: any[] = [];
        for (let endpoint of oracleEndpoints) {
            try {
                const response = await axios.post(endpoint, { scoreHash });
                sigs.push(response.data.signature);
                pks.push(response.data.publicKey);
            } catch (error) {
                console.error(`Oracle at ${endpoint} failed:`, error);
            }
        }
        
        if (sigs.length < 2) {
            setStatus('Not enough oracle signatures');
            setLoading(false);
            return;
        }
        
        setSignatures(sigs);
        setOraclePKs(pks);

        // 3. Generate ZK proof in worker
        setStatus('Generating ZK proof...');
        const worker = new Worker('/worker.js');
        worker.postMessage({
            score: parseInt(score),
            threshold: parseInt(threshold),
            signatures: sigs.map(hexToUint8Array),
            oraclePKs: pks,
            requiredOracles: 2
        });

        worker.onmessage = async (e) => {
            if (e.data.success) {
                setProof(e.data.proof);
                setStatus('Submitting transaction...');
                
                // Construct the transaction
                const loanRequest = {
                    program: 'zkcredit.aleo', // Ensure this matches your deployed program ID
                    function: 'request_loan',
                    inputs: [
                        address, // 3. Updated to pass address instead of publicKey
                        `${amount}u64`,
                        `${threshold}u64`,
                        JSON.stringify(e.data.proof),
                        JSON.stringify(sigs),
                        JSON.stringify(pks),
                        '2u8'
                    ],
                    fee: 0.04406, // Adjust based on your feeCalculator logic if necessary
                };
                
                try {
                    // 4. Use executeTransaction and handle its return type
                    const txResult = await executeTransaction(loanRequest);
                    if (txResult?.transactionId) {
                        setStatus(`Transaction submitted! TX ID: ${txResult.transactionId}`);
                    } else {
                        setStatus(`Transaction failed or was canceled.`);
                    }
                } catch (err: any) {
                    setStatus(`Transaction failed: ${err.message}`);
                }
            } else {
                setStatus(`Proof generation failed: ${e.data.error}`);
            }
            setLoading(false);
            worker.terminate();
        };
    };

    return (
        <div className="max-w-2xl mx-auto bg-base-100 rounded-lg shadow-card p-6 mt-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Request a Private Loan</h1>
                <p className="text-gray-500 text-sm mt-1">Your credit score never leaves your device.</p>
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
                    className="w-full mt-4"
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