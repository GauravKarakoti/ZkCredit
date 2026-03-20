import React, { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import axios from 'axios';
import { Buffer } from 'buffer';
import Layout from '@/layouts/dashboard/_dashboard';
import type { NextPageWithLayout } from '@/types';
import Button from '@/components/ui/button';

const DashboardPage: NextPageWithLayout = () => {
    const { address, connected, executeTransaction } = useWallet();
    const [amount, setAmount] = useState('');
    const [threshold, setThreshold] = useState('');
    const [score, setScore] = useState('');
    const [shareScore, setShareScore] = useState(false);
    const [lenderAddress, setLenderAddress] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const oracleEndpoints = [`${process.env.ORACLE_URL || 'http://localhost:3001'}/sign`];

    const handleRequestLoan = async () => {
        if (!connected || !address) return alert('Please connect your wallet first.');
        setLoading(true);
        setStatus('Generating stealth address and fetching signatures...');

        // 1. Stealth Address Generation (Mocked for UI purposes)
        const ephemeralSecret = Math.floor(Math.random() * 1000000).toString() + "field";
        const stealthAddress = address; // Mocking with main address

        const scoreBuffer = new TextEncoder().encode(score);
        const hashBuffer = await crypto.subtle.digest('SHA-256', scoreBuffer);
        const scoreHash = Buffer.from(hashBuffer).toString('hex');

        const sigs: any[] = [];
        const pks: any[] = [];
        for (let endpoint of oracleEndpoints) {
            try {
                const response = await axios.post(endpoint, { scoreHash });
                sigs.push(response.data.signature);
                pks.push(response.data.oracle_address);
            } catch (error) {
                console.error(`Oracle at ${endpoint} failed:`, error);
            }
        }

        const dummySigArray = `[${Array(64).fill('0u8').join(', ')}]`;
        const dummyScoreHashArray = `[${Array(32).fill('0u8').join(', ')}]`;
        const dummyProofArray = `[${Array(64).fill('0u8').join(', ')}]`;

        const creditProofStruct = `{ sig: ${dummySigArray}, score_hash: ${dummyScoreHashArray}, proof: ${dummyProofArray} }`;
        const formattedSignatures = `[${dummySigArray}, ${dummySigArray}, ${dummySigArray}]`;
        const formattedOraclePks = `[${address}, ${address}, ${address}]`;

        setStatus('Submitting loan request via ZK...');
        
        try {
            const loanRequest = {
                program: 'zkcreditv2.aleo',
                function: 'request_loan',
                inputs: [
                    stealthAddress, 
                    ephemeralSecret, // Encrypted Ephemeral Secret
                    `${amount}u64`,
                    `${threshold}u64`,
                    creditProofStruct,
                    formattedSignatures,
                    formattedOraclePks,
                    '2u8' // threshold
                ],
                fee: 0.05, 
            };
            const txResult = await executeTransaction(loanRequest);
            
            // If Selective Disclosure is enabled, send a second transaction to share the score
            if (shareScore && lenderAddress && txResult?.transactionId) {
                setStatus('Sharing encrypted score with lender...');
                const encryptedScore = `${score}field`; // Mock encryption
                const shareRequest = {
                    program: 'zkcreditv2.aleo',
                    function: 'share_score',
                    inputs: [lenderAddress, stealthAddress, encryptedScore],
                    fee: 0.02
                };
                await executeTransaction(shareRequest);
            }

            setStatus(`Transaction complete! TX ID: ${txResult!.transactionId}`);
        } catch (err: any) {
            setStatus(`Transaction failed: ${err.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto bg-base-100 rounded-lg shadow-card p-6 mt-10">
            <h1 className="text-2xl font-bold mb-6 text-center">Request a Private Loan</h1>
            <div className="space-y-4">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input input-bordered w-full" placeholder="Loan Amount (microcredits)" />
                <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="input input-bordered w-full" placeholder="Credit Score Threshold" />
                <input type="number" value={score} onChange={(e) => setScore(e.target.value)} className="input input-bordered w-full" placeholder="Your Actual Credit Score" />
                
                <div className="flex items-center space-x-2 mt-4">
                    <input type="checkbox" id="shareScore" checked={shareScore} onChange={(e) => setShareScore(e.target.checked)} className="checkbox checkbox-primary" />
                    <label htmlFor="shareScore">Enable Selective Disclosure to a specific Lender</label>
                </div>

                {shareScore && (
                    <input type="text" value={lenderAddress} onChange={(e) => setLenderAddress(e.target.value)} className="input input-bordered w-full" placeholder="Lender Aleo Address" />
                )}

                <Button onClick={handleRequestLoan} isLoading={loading} disabled={!connected || loading} className="w-full mt-4 btn-secondary">
                    {loading ? 'Processing...' : 'Request Loan'}
                </Button>
                {status && <div className="mt-4 p-4 bg-base-200 rounded-md text-sm">{status}</div>}
            </div>
        </div>
    );
};

DashboardPage.getLayout = (page) => <Layout>{page}</Layout>;
export default DashboardPage;