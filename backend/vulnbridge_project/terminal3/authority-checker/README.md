# Authority Checker Contract

This is a T3N TEE contract that reads authority records from the tenant KV store.

## Purpose

The contract exposes two functions:
- `check_authority(action: string) -> bool` - Checks if authority is granted
- `get_authority(action: string) -> Option<string>` - Returns the full authority record as JSON

## Deployment

This contract needs to be:

1. **Compiled to WebAssembly**
   ```bash
   cargo build --target wasm32-wasip1 --release
   ```

2. **Registered with T3N testnet**
   ```bash
   # Use the T3N CLI or SDK to register this contract
   # Will receive a contract ID like: z:<tid>:<contract-name>
   ```

3. **Added to the "authorities" map's readers ACL**
   ```typescript
   await tenantClient.maps.create({
     tail: "authorities",
     visibility: "private",
     writers: { only: [] },           // Control ops bypass this
     readers: { only: [CONTRACT_ID] }, // Contract can read via kv-store
   });
   ```

4. **Invoked by agents via t3n_helper.mjs**
   ```typescript
   await agentClient.executeAndDecode({
     script_name: AUTHORITY_CONTRACT,
     script_version: contractVersion,
     function_name: "check-authority",
     input: { action: "validate" }
   });
   ```

## WIT Interface

The contract implements:
```wit
package vulnbridge:authority

world host {
  export check-authority: func(action: string) -> bool
  export get-authority: func(action: string) -> option<string>
}
```

## Current Status

- Rust code structure: ✅ Created (in src/lib.rs)
- WIT interface: ✅ Defined (in world.wit)
- Cargo config: ✅ Set up (in Cargo.toml)
- Compilation: ⏳ Needs T3N ADK setup
- Deployment: ⏳ Awaiting compilation
- Integration: ⏳ Awaiting contract ID

## Integration Steps

Once contract is deployed:

1. Get CONTRACT_ID from deployment
2. Update t3n_helper.mjs to use contract for reads:
   ```javascript
   case 'check': {
     const result = await t3nClient.executeAndDecode({
       script_name: `z:${tid}:authority-checker`,
       script_version: version,
       function_name: "check-authority",
       input: { action }
     });
     // result.authorized will be the boolean from contract
   }
   ```

3. Ensure map is created with contract in readers ACL (in ensureMapExists)

## References

- T3N ADK: https://docs.terminal3.io/developers/adk
- Tenant Demo: client/t3n-sdk/tenant-demo.ts (in @terminal3/t3n-sdk)
- KV Store Host Interface: https://docs.terminal3.io/t3n/how-t3n-works/host-api#kv-store
