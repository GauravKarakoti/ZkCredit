import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrivateKey } from '@aleohq/sdk';
import 'dotenv/config'; // Modern way to load dotenv

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. Load the Aleo Private Key from the .env file
const privateKeyString = process.env.ORACLE_PRIVATE_KEY;

if (!privateKeyString || !privateKeyString.startsWith('APrivateKey1')) {
    console.error("❌ ERROR: Missing or invalid ORACLE_PRIVATE_KEY in .env");
    console.error("Please provide a valid Aleo private key starting with 'APrivateKey1'");
    process.exit(1);
}

// 2. Initialize the Aleo Keypair
let privateKey;
let oracleAddress;
try {
    privateKey = PrivateKey.from_string(privateKeyString);
    oracleAddress = privateKey.to_address().to_string();
    console.log("✅ Loaded Oracle Aleo private key from .env");
    console.log(`🔑 Oracle Address: ${oracleAddress}`);
} catch (error) {
    console.error("❌ Failed to parse Aleo Private Key:", error.message);
    process.exit(1);
}

app.post('/sign', (req, res) => {
    const { scoreHash } = req.body; 
    if (!scoreHash) {
        return res.status(400).json({ error: 'Missing scoreHash' });
    }
    
    try {
        // 3. Convert the string to bytes for signing
        const encoder = new TextEncoder();
        const messageBytes = encoder.encode(scoreHash);
        
        // 4. Sign the data using the Aleo SDK
        const signature = privateKey.sign(messageBytes);
        
        res.json({
            signature: signature.to_string(), // Returns an Aleo signature (sign1...)
            oracle_address: oracleAddress
        });
    } catch (error) {
        console.error("Signing error:", error);
        res.status(500).json({ error: "Failed to sign data" });
    }
});

app.listen(3001, () => {
    console.log('🚀 Aleo Oracle running on port 3001');
});