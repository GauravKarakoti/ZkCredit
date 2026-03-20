import React, { useState, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import Layout from '@/layouts/dashboard/_dashboard';
import { ZKCREDIT_PROGRAM_ID, type NextPageWithLayout } from '@/types';
import Button from '@/components/ui/button';

const LendPage: NextPageWithLayout = () => {
    const { address, connected, requestRecords, executeTransaction } = useWallet();
    const [loans, setLoans] = useState<any[]>([]);
    const [sharedScores, setSharedScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchRecords = async () => {
        if (!connected) return;
        setLoading(true);
        try {
            // Fetch all records owned by this address for the program
            const records = await requestRecords(ZKCREDIT_PROGRAM_ID);
            
            // Filter records by struct name 
            const loanRecords = records.filter((r: any) => r.recordName === 'Loan' && !r.spent);
            const scoreRecords = records.filter((r: any) => r.recordName === 'SharedScore' && !r.spent);

            setLoans(loanRecords);
            setSharedScores(scoreRecords);
        } catch (error) {
            console.error("Error fetching records:", error);
        }
        setLoading(false);
    };

    const fundLoan = async (loanRecord: any) => {
        try {
            const fundRequest = {
                program: ZKCREDIT_PROGRAM_ID,
                function: 'fund_loan',
                inputs: [
                    loanRecord,
                    address,
                    '50000u64', // 5% Interest Mock
                    '1000u32'   // Block height deadline mock
                ],
                fee: 50_000
            };
            const tx = await executeTransaction(fundRequest);
            alert(`Loan Funded! TX: ${tx!.transactionId}`);
        } catch(e: any) {
            alert(`Failed: ${e.message}`);
        }
    }

    return (
        <div className="max-w-4xl mx-auto bg-base-100 rounded-lg shadow-card p-6 mt-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Lender Dashboard</h1>
                <Button onClick={fetchRecords} isLoading={loading} disabled={!connected}>Refresh Records</Button>
            </div>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-4">Available Loans to Fund</h2>
                    {loans.length === 0 ? <p className="text-gray-500">No loan requests found.</p> : (
                        <div className="grid gap-4">
                            {loans.map((loan, idx) => (
                                <div key={idx} className="border p-4 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p><strong>Principal:</strong> {loan.data.principal}</p>
                                        <p><strong>Stealth Borrower:</strong> {loan.data.borrower_stealth.substring(0, 15)}...</p>
                                    </div>
                                    <Button onClick={() => fundLoan(loan.ciphertext)}>Fund Loan</Button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4">Disclosed Credit Scores</h2>
                    {sharedScores.length === 0 ? <p className="text-gray-500">No borrowers have shared scores with you.</p> : (
                        <div className="grid gap-4">
                            {sharedScores.map((score, idx) => (
                                <div key={idx} className="border p-4 rounded-lg bg-base-200">
                                    <p><strong>Borrower:</strong> {score.data.borrower_stealth}</p>
                                    <p><strong>Decrypted Score:</strong> <span className="text-green-600 font-bold">{score.data.encrypted_score.replace('field', '')}</span></p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

LendPage.getLayout = (page) => <Layout>{page}</Layout>;
export default LendPage;