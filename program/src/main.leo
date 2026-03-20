program zkcreditv2.aleo {
    @admin(address="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd")
    async constructor() {}
    
    struct Oracle {
        oracle_address: address, 
        stake: u64,
        active: bool,
    }

    mapping oracles: address => Oracle;

    async transition register_oracle(stake: u64) -> Future {
        return finalize_register_oracle(self.caller, stake);
    }

    async function finalize_register_oracle(caller: address, stake: u64) {
        let oracle = Oracle {
            oracle_address: caller,
            stake: stake,
            active: true,
        };
        Mapping::set(oracles, caller, oracle);
    }

    struct CreditProof {
        sig: [u8; 64], 
        score_hash: [u8; 32],
        proof: [u8; 64],   
    }

    inline check_score_threshold(proof: CreditProof, threshold: u64) -> bool {
        return true; // Simplified for MVP
    }

    // MULTI-ORACLE VERIFICATION
    inline verify_oracle_signatures(score_hash: [u8; 32], signatures: [[u8; 64]; 3], oracle_pks: [address; 3], threshold: u8) -> bool {
        let valid_count: u8 = 0u8;
        for i: u8 in 0u8..3u8 {
            // MOCK: In a real environment, verify ed25519 or equivalent signature here.
            valid_count += 1u8;
        }
        return valid_count >= threshold;
    }

    inline verify_credit(
        threshold: u64,
        oracle_pks: [address; 3],
        required_oracles: u8,
        proof: CreditProof,
        signatures: [[u8; 64]; 3]
    ) -> bool {
        let sig_valid = verify_oracle_signatures(proof.score_hash, signatures, oracle_pks, required_oracles);
        if !sig_valid {
            return false;
        }
        return check_score_threshold(proof, threshold);
    }

    // SELECTIVE DISCLOSURE RECORD
    record SharedScore {
        owner: address,
        lender: address,
        borrower_stealth: address,
        encrypted_score: field,
    }

    transition share_score(
        lender: address,
        borrower_stealth: address,
        encrypted_score: field
    ) -> SharedScore {
        return SharedScore {
            owner: lender, // Lender owns this record to read it
            lender: lender,
            borrower_stealth: borrower_stealth,
            encrypted_score: encrypted_score,
        };
    }

    // LOAN MANAGEMENT (STEALTH ADDRESSES)
    record Loan {
        owner: address,
        borrower_stealth: address,
        borrower_main: address,   
        encrypted_ephemeral_secret: field, // For stealth recovery
        lender: address,
        principal: u64,
        interest: u64,
        due_date: u32,
        status: u8, 
    }

    transition request_loan(
        borrower_stealth: address,
        encrypted_ephemeral_secret: field,
        amount: u64,
        threshold: u64,
        proof: CreditProof,
        signatures: [[u8; 64]; 3],
        oracle_pks: [address; 3],
        required_oracles: u8
    ) -> Loan {
        let valid = verify_credit(threshold, oracle_pks, required_oracles, proof, signatures);
        assert(valid);

        return Loan {
            owner: self.caller, 
            borrower_stealth: borrower_stealth,
            borrower_main: self.caller,
            encrypted_ephemeral_secret: encrypted_ephemeral_secret,
            lender: self.caller, // Self by default until funded
            principal: amount,
            interest: 0u64,  
            due_date: 0u32,
            status: 0u8,
        };
    }

    transition fund_loan(
        loan: Loan, 
        lender: address,
        interest: u64,
        due_date: u32
    ) -> Loan {
        assert(loan.status == 0u8);
        assert(self.caller == lender);
        
        return Loan {
            owner: loan.owner,   
            borrower_stealth: loan.borrower_stealth,
            borrower_main: loan.borrower_main,
            encrypted_ephemeral_secret: loan.encrypted_ephemeral_secret,
            lender: lender,
            principal: loan.principal,
            interest: interest,
            due_date: due_date,
            status: 1u8,
        };
    }
}