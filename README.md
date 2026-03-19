# ZkCredit – Private Credit Scoring & Lending on Aleo

[![Aleo](https://img.shields.io/badge/Aleo-Built%20with%20Leo-blue)](https://developer.aleo.org/)

**Borrow without revealing your financial history. Lend with verifiable privacy.**

ZkCredit is a decentralized lending protocol that enables **undercollateralized loans** using zero-knowledge proofs of creditworthiness. Built on Aleo, it keeps all financial data private by default while allowing lenders to verify that borrowers meet credit thresholds.

---

## Table of Contents
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- 🔐 **Private Credit Verification** – Prove your credit score meets a threshold without revealing the score.
- 🤝 **Undercollateralized Loans** – Borrow based on trust, not just collateral.
- 🕵️ **Selective Disclosure** – Optionally reveal specific data to a lender or regulator with consent.
- 📦 **On‑Chain Private State** – Loan balances, terms, and repayment history are encrypted on Aleo.
- 🔗 **Oracle Integration** – Trusted credit bureaus sign credit data; the contract verifies signatures.
- 💻 **Simple dApp Interface** – Connect Aleo wallet, request proofs, and manage loans.

---

## How It Works

1. **Borrower** obtains a signed credit report from a participating oracle (e.g., a credit bureau). The oracle signs a hash of the credit data – it never sees the raw data.
2. **Borrower** runs a local Leo program to generate a zero-knowledge proof that their credit score is above a lender’s required threshold. The proof does not reveal the actual score.
3. **Borrower** submits the proof and a loan request to the ZkCredit smart contract on Aleo.
4. **Lender** views the loan request (only the proof and loan amount) and, if satisfied, funds the loan by creating a private `Loan` record.
5. **Borrower** repays the loan via a private transaction; the `Loan` record is updated or destroyed upon full repayment.
6. **If default** occurs, the lender can trigger a default function that may reveal minimal necessary data (e.g., a public flag) to initiate recovery.

All sensitive data remains encrypted; only the zk-proofs and public non‑sensitive metadata are visible on-chain.

---

## Architecture
```text
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Borrower │ │ Oracle │ │ Lender │
│ (Leo Wallet) │ │ (Credit Bureau) │ │ (Leo Wallet) │
└────────┬────────┘ └─────────┬────────┘ └────────┬────────┘
│ │ │
│ (1) Request signed │ │
│ credit hash │ │
│────────────────────────>│ │
│ │ │
│ (2) Return signature │ │
│<────────────────────────│ │
│ │ │
│ (3) Generate ZK proof │ │
│ ──────────────────────────────────────────────┐ │
│ │ │ │
│ (4) Submit loan request │ │ │
│ ──────────────────────────────────────────────┼─┘
│ │ │
│ │ (5) Fund loan
│ │ ┌──────────┐
│ │ │ │
│ (6) Repay / Default │ │ │
│ ─────────────────────────┼────────────────┘ │
│ │ │
v v v
┌─────────────────────────────────────────────────────────────────┐
│ Aleo Blockchain │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ZkCredit Smart Contract (Leo) │ │
│ │ - verify_credit(proof, public inputs) │ │
│ │ - request_loan(borrower, amount, proof) │ │
│ │ - fund_loan(lender, request_id) │ │
│ │ - repay_loan(loan_id, amount) │ │
│ │ - default_loan(loan_id) │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Private Records │ │
│ │ - Loan { borrower, lender, amount, due_date, ... } │ │
│ └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- [Leo](https://developer.aleo.org/leo/installation) – for building and testing smart contracts.
- [Aleo SDK](https://developer.aleo.org/sdk/) – for frontend integration.
- Node.js (v16+) and npm/yarn.
- An Aleo wallet (e.g., [Leo Wallet](https://www.leo.app/)).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zkcredit.git
   cd zkcredit
   ```
2. Install dependencies:
```bash
# For the smart contract
cd contract
leo build

# For the frontend
cd ../app
npm install
```

## Running Locally
1. Start a local Aleo network (or use Testnet):
```bash
snarkos start --nodisplay
```
2. Deploy the contract:
```bash
cd contract
leo deploy --network testnet
```
3. Run the frontend:
```bash
cd ../app
npm start
```
4. Open http://localhost:3000, connect your wallet, and interact with the dApp.

## Smart Contracts
The core logic is in `contract/src/main.leo`. Key components:
- `credit.leo` – Contains the circuit for verifying a signed credit score hash and generating a proof that the score meets a threshold.
- `loan.leo` – Defines the Loan record and functions for loan lifecycle.
- `oracle.leo` – Handles verification of oracle signatures (using a simple ed25519 check).

To run tests:
```bash
cd contract
leo test
```

## Frontend
The frontend (`/app`) is a React app built with:
- `@aleo/wallet-adapter-react` – wallet connection.
- `@aleo/wallet-adapter-react-ui` – UI components.
- `snarkjs` – for proof generation (if not using Leo’s built-in).
- Tailwind CSS – for styling.

Key pages:
- Dashboard – Overview of your loans and open requests.
- Borrow – Request a new loan after generating a credit proof.
- Lend – Browse anonymized loan requests and fund them.

## Testing
- Unit tests for Leo contracts: `leo test`
- Integration tests (coming soon) using `snarkos` and a test oracle.
- Manual testing on Aleo Testnet with the faucet.

## Deployment
The contract is currently deployed on Aleo Testnet.

To deploy your own instance:
1. Update `.env` with your private key.
2. Run `leo deploy --network testnet`.

The frontend is deployed via Vercel.

## Acknowledgments
- Aleo team for their amazing documentation and support.
- AKINDO for organizing the Privacy Buildathon.
- The open‑source ZK community.
