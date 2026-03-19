import credit.Leo;

record Loan {
    owner: address,
    borrower_stealth: address,
    borrower_main: address,   // Encrypted; only used for disputes
    lender: address,
    principal: u64,
    interest: u64,
    due_date: u32,
    status: u8,   // 0=requested, 1=funded, 2=repaid, 3=defaulted
}

// Request a loan (using a stealth address)
transition request_loan(
    borrower_stealth: address,
    amount: u64,
    threshold: u64,
    proof: CreditProof,
    signatures: [[u8; 64]; 3],
    oracle_pks: [address; 3],
    required_oracles: u8
) -> Loan {
    // Verify credit proof
    let valid = credit::verify_credit(threshold, oracle_pks, required_oracles, proof, signatures);
    assert(valid, "Credit verification failed");

    // Create a new loan record with status 0 (requested)
    return Loan {
        owner: self.caller,
        borrower_stealth: borrower_stealth,
        borrower_main: self.caller,   // In production, encrypt this
        lender: 0,
        principal: amount,
        interest: 0u64,   // To be set by lender
        due_date: 0u32,
        status: 0u8,
    };
}

// Fund a loan (lender calls this)
transition fund_loan(
    loan_id: field,
    lender: address,
    interest: u64,
    due_date: u32
) -> Loan {
    // Get the current loan record (must be consumed)
    let loan = Loan::get(loan_id);
    assert(loan.status == 0u8, "Loan not in requested state");
    assert(self.caller == lender, "Only the intended lender can fund");

    // Update the loan
    return Loan {
        owner: loan.owner,   // remains borrower's address
        borrower_stealth: loan.borrower_stealth,
        borrower_main: loan.borrower_main,
        lender: lender,
        principal: loan.principal,
        interest: interest,
        due_date: due_date,
        status: 1u8,
    };
}

// Repay a loan (borrower calls)
transition repay_loan(
    loan_id: field,
    amount: u64
) -> Loan {
    let loan = Loan::get(loan_id);
    assert(loan.status == 1u8, "Loan not active");
    assert(self.caller == loan.borrower_main, "Only borrower can repay");

    // In a real implementation, you would transfer credits from borrower to lender
    // For simplicity, we just update the principal
    let new_principal = loan.principal - amount;
    let new_status = if new_principal == 0u64 { 2u8 } else { 1u8 };

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

// Default loan (lender calls after due date)
transition default_loan(loan_id: field) -> Loan {
    let loan = Loan::get(loan_id);
    assert(loan.status == 1u8, "Loan not active");
    assert(self.caller == loan.lender, "Only lender can default");
    // Check that current block time > due_date (requires `block.height` or similar)
    // assert(block.timestamp > loan.due_date, "Loan not yet due");

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