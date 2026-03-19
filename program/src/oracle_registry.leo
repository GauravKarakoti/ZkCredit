struct Oracle {
    address: address,
    stake: u64,
    active: bool,
}

mapping oracles: address => Oracle;

transition register_oracle(stake: u64) {
    let oracle = Oracle {
        address: self.caller,
        stake: stake,
        active: true,
    };
    Map::set(oracles, self.caller, oracle);
}

transition remove_oracle() {
    // Only the oracle itself or a governance mechanism can remove
    let current = Map::get(oracles, self.caller);
    assert(current.active, "Oracle not active");
    let updated = Oracle {
        address: current.address,
        stake: current.stake,
        active: false,
    };
    Map::set(oracles, self.caller, updated);
}

// Function to get active oracle addresses (could return a list)
function get_active_oracles() -> [address; 3] {
    // Simplified: return first three active oracles
    // In production, you'd have a more robust method
}