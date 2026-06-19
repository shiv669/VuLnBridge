# Terminal3 Authority Checker Integration Guide

## Current Status

✅ **Working:**
- Agent writes authority to T3N KV via `executeControl("map-entry-set")` 
- Authority records persist in T3N immutable storage
- Revoke operations update authority state

⏳ **Pending:**
- Contract deployment to T3N testnet
- Contract read integration for authority checks

## Architecture

### Write Path (✅ Working Now)
```
t3n_helper.mjs 
  → executeControl("map-entry-set")  
  → T3N Map "authorities" 
  → Immutable KV Store
```

### Read Path (⏳ Requires Contract)
```
t3n_helper.mjs 
  → executeAndDecode("check-authority")  
  → Authority Checker Contract 
  → kv-store.get("authorities", key)  
  → T3N TEE Enclave 
  → Immutable Read
```

## Deployment Steps

### 1. Compile the Contract

```bash
cd backend/vulnbridge_project/terminal3/authority-checker

# Install Rust toolchain (if needed)
rustup target add wasm32-wasip1

# Build to WebAssembly
cargo build --target wasm32-wasip1 --release

# Output: target/wasm32-wasip1/release/authority_checker.wasm
```

### 2. Register with T3N Testnet

```bash
# Using T3N CLI (install from https://docs.terminal3.io)
# Or use the SDK to register programmatically

# Via CLI:
t3n contract register \
  --wasm-path target/wasm32-wasip1/release/authority_checker.wasm \
  --name authority-checker \
  --visibility private \
  --environment testnet

# Save the returned CONTRACT_ID (format: z:<tid>:<contract-name>)
```

### 3. Create the Authorities Map with Contract Reader

```typescript
// In Python Django management command or initialization script
import { TenantClient } from '@terminal3/t3n-sdk';

const CONTRACT_ID = "123456"; // Contract ID from step 2
await tenantClient.maps.create({
  tail: "authorities",
  visibility: "private",
  writers: { only: [] },        // Control ops bypass anyway
  readers: { only: [CONTRACT_ID] }, // Contract can read via kv-store
});
```

### 4. Update Django Settings

Add to `backend/.env`:
```
T3N_AUTHORITY_CONTRACT_ID=123456
T3N_AUTHORITY_CONTRACT_VERSION=1
```

Update `backend/settings_local.py` or configuration:
```python
T3N_AUTHORITY_CONTRACT_ID = os.getenv('T3N_AUTHORITY_CONTRACT_ID')
T3N_AUTHORITY_CONTRACT_VERSION = os.getenv('T3N_AUTHORITY_CONTRACT_VERSION', '1')
```

### 5. Integrate with Django Backend

Update `backend/vulnbridge/integrations/terminal3_client.py`:

```python
import json
import os

class Terminal3Client:
    def __init__(self):
        self.contract_id = os.getenv('T3N_AUTHORITY_CONTRACT_ID')
        self.contract_version = os.getenv('T3N_AUTHORITY_CONTRACT_VERSION', '1')
    
    def check_authority(self, action):
        """Check if action is authorized via T3N contract"""
        args = {
            "op": "check",
            "action": action,
            "contract_id": self.contract_id,
            "contract_version": self.contract_version,
        }
        # Call t3n_helper with contract info
        result = self._call_helper(args)
        return result.get('authorized', False)
```

### 6. Update t3n_helper.mjs Call

From Django:
```python
# Include contract ID and version
result = subprocess.run(
    ["node", "t3n_helper.mjs", json.dumps({
        "op": "check",
        "action": action,
        "contract_id": self.contract_id,        # ← Add this
        "contract_version": self.contract_version, # ← Add this
    })],
    capture_output=True,
    text=True,
)
```

## Testing After Deployment

### Test Grant
```bash
node t3n_helper.mjs '{"op":"grant","action":"validate","granted_by":"admin@example.com"}'
# Returns: {"success":true, ...}
```

### Test Check (with contract)
```bash
node t3n_helper.mjs '{"op":"check","action":"validate","contract_id":"123456","contract_version":"1"}'
# Returns: {"authorized":true, "t3n_verified":true, ...}
```

### Test Execute
```bash
node t3n_helper.mjs '{"op":"exec","action":"validate","contract_id":"123456","contract_version":"1"}'
# Returns: {"success":true, "proof_of_authority":"...", ...}
```

## Contract API Reference

### `check-authority(action: string) -> bool`
- Checks if authority is granted for an action
- Returns: `true` if `authorized=true`, `false` otherwise
- Called by: `t3n_helper.mjs` 'check' operation

### `get-authority(action: string) -> Option<string>`
- Retrieves the full authority record as JSON
- Returns: Full record or None if not found
- Can be used for detailed authority inspection

## References

- Contract source: `backend/vulnbridge_project/terminal3/authority-checker/`
- Integration client: `backend/vulnbridge/integrations/terminal3_client.py`
- Helper script: `backend/t3n_helper.mjs`
- T3N ADK docs: https://docs.terminal3.io/developers/adk/
- Live example: https://docs.terminal3.io/developers/adk/get-started/walkthrough/invoke-contract.md
