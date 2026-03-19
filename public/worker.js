importScripts('https://cdn.jsdelivr.net/npm/snarkjs@0.7.0/build/snarkjs.min.js');

self.onmessage = async function (e) {
    const { score, threshold, signatures, oraclePKs, requiredOracles } = e.data;

    const input = {
        score: score.toString(),
        threshold: threshold.toString(),
        signature1: signatures[0],
        signature2: signatures[1],
        signature3: signatures[2],
        oracle_pk1: oraclePKs[0],
        oracle_pk2: oraclePKs[1],
        oracle_pk3: oraclePKs[2],
        required_oracles: requiredOracles.toString()
    };

    try {
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            '/circuits/generate_proof.wasm',
            '/circuits/circuit_final.zkey'
        );

        self.postMessage({ success: true, proof, publicSignals });
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};