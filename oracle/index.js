const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ed25519 } = require('@noble/ed25519');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Generate or load a keypair (in production, store securely)
const privateKey = crypto.randomBytes(32);
const publicKey = Buffer.from(ed25519.getPublicKey(privateKey)).toString('hex');

console.log(`Oracle public key: ${publicKey}`);

app.post('/sign', (req, res) => {
    const { scoreHash } = req.body; // scoreHash is a hex string of 32 bytes
    if (!scoreHash) {
        return res.status(400).json({ error: 'Missing scoreHash' });
    }
    // Sign the hash
    const hashBuffer = Buffer.from(scoreHash, 'hex');
    const signature = ed25519.sign(hashBuffer, privateKey);
    res.json({
        signature: Buffer.from(signature).toString('hex'),
        publicKey: publicKey
    });
});

app.listen(3001, () => {
    console.log('Oracle running on port 3001');
});