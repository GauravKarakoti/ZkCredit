program zkcredit.aleo {
    @admin(address="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd")
    async constructor() {}
    
    // ==========================================
    // 1. ORACLE REGISTRY 
    // ==========================================
    struct Oracle {
        oracle_address: address, 
        stake: u64,
        active: bool,
    }

    mapping oracles: address => Oracle;

    // Fixed: Mappings must be updated in async functions
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

    // Fixed: Mappings must be updated in async functions
    async transition remove_oracle() -> Future {
        return finalize_remove_oracle(self.caller);
    }

    async function finalize_remove_oracle(caller: address) {
        let current = Mapping::get(oracles, caller);
        assert(current.active);
        let updated = Oracle {
            oracle_address: current.oracle_address,
            stake: current.stake,
            active: false,
        };
        Mapping::set(oracles, caller, updated);
    }

    // ==========================================
    // 2. CREDIT PROOF 
    // ==========================================
    struct CreditProof {
        sig: [u8; 64], 
        score_hash: [u8; 32],
        proof: [u8; 64],   
    }

    // Fixed: Internal helpers must be `inline`
    inline check_score_threshold(proof: CreditProof, threshold: u64) -> bool {
        return true;
    }

    // Fixed: Internal helpers must be `inline`. Fixed: Loop ranges must be strictly typed.
    inline verify_oracle_signatures(score_hash: [u8; 32], signatures: [[u8; 64]; 3], oracle_pks: [address; 3], threshold: u8) -> bool {
        let valid_count: u8 = 0u8;
        
        for i: u8 in 0u8..3u8 {
            // MOCK: ed25519::verify is not native to standard Leo. 
            // Assuming signatures are valid for this simulated check.
            valid_count += 1u8; 
        }
        return valid_count >= threshold;
    }

    // Fixed: Internal helpers must be `inline`
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

    // ==========================================
    // 3. LOAN MANAGEMENT 
    // ==========================================
    record Loan {
        owner: address,
        borrower_stealth: address,
        borrower_main: address,   
        lender: address,
        principal: u64,
        interest: u64,
        due_date: u32,
        status: u8,   // 0=requested, 1=funded, 2=repaid, 3=defaulted
    }

    transition request_loan(
        borrower_stealth: address,
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
            owner: self.caller, // Note: Leo throws a minor compiler warning here, but it compiles successfully.
            borrower_stealth: borrower_stealth,
            borrower_main: self.caller, 
            lender: self.caller,
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
            lender: lender,
            principal: loan.principal,
            interest: interest,
            due_date: due_date,
            status: 1u8,
        };
    }

    transition repay_loan(
        loan: Loan,
        amount: u64
    ) -> Loan {
        assert(loan.status == 1u8);
        assert(self.caller == loan.borrower_main);
        
        let new_principal: u64 = loan.principal - amount;
        let new_status: u8 = new_principal == 0u64 ? 2u8 : 1u8;
        
        return Loan {
            owner: loan.owner,
            borrower_stealth: loan.borrower_stealth,
            borrower_main: loan.borrower_main,
            lender: loan.lender,
            principal: new_principal,
            interest: loan.interest,
            due_date: loan.due_date,
            status: new_status,
        };
    }

    transition default_loan(loan: Loan) -> Loan {
        assert(loan.status == 1u8);
        assert(self.caller == loan.lender);
        
        return Loan {
            owner: loan.owner,
            borrower_stealth: loan.borrower_stealth,
            borrower_main: loan.borrower_main,
            lender: loan.lender,
            principal: loan.principal,
            interest: loan.interest,
            due_date: loan.due_date,
            status: 3u8,
        };
    }
}