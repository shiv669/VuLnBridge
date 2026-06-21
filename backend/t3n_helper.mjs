#!/usr/bin/env node
/**
 * VulnBridge T3N SDK Helper - TenantClient Implementation
 * Uses @terminal3/t3n-sdk with TenantClient for KV map operations.
 *
 * Called by: node t3n_helper.mjs <json-args>
 * Args: { op: "grant"|"revoke"|"check"|"exec"|"log", action, case_id, granted_by, ... }
 *
 * NOTE: This file is managed directly — do NOT auto-regenerate it from Python.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  T3nClient,
  TenantClient,
  loadWasmComponent,
  createEthAuthInput,
  eth_get_address,
  metamask_sign,
  setEnvironment,
  getNodeUrl,
} from '@terminal3/t3n-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file — handles both UTF-8 and UTF-16 LE (Windows VS Code default)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const buffer = fs.readFileSync(envPath);
  let envContent;
  if ((buffer[0] === 0xFF && buffer[1] === 0xFE) || (buffer[0] === 0xFE && buffer[1] === 0xFF)) {
    envContent = buffer.toString('utf-16le');
  } else {
    envContent = buffer.toString('utf-8');
  }
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) return;
    const eqIdx = line.indexOf('=');
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  });
}

// Parse command line arguments
const args = JSON.parse(process.argv[2] || '{}');
const { op, action, case_id, granted_by, input_data, contract_id, contract_version } = args;

// Get agent credentials
const AGENT_KEY = process.env.TERMINAL3_AGENT_KEY || process.env.T3N_DEMO_KEY;
if (!AGENT_KEY) {
  console.log(JSON.stringify({
    success: false,
    error: 'TERMINAL3_AGENT_KEY not set. Add it to backend/.env (get it from https://terminal3.io)',
  }));
  process.exit(1);
}

// Connect to T3N testnet
setEnvironment('testnet');
const address = eth_get_address(AGENT_KEY);

async function getClient() {
  const wasmComponent = await loadWasmComponent();
  const t3nClient = new T3nClient({
    wasmComponent,
    handlers: {
      EthSign: metamask_sign(address, undefined, AGENT_KEY),
    },
  });
  await t3nClient.handshake();
  const authResult = await t3nClient.authenticate(createEthAuthInput(address));
  const did = authResult.value || authResult.toString();

  const tenantClient = new TenantClient({
    t3n: t3nClient,
    tenantDid: did,
    baseUrl: getNodeUrl(),
  });

  return { t3nClient, tenantClient, did };
}

async function ensureMapExists(tenantClient, mapName, contractId) {
  try {
    await tenantClient.maps.create({
      tail: mapName,
      visibility: 'private',
      writers: { only: contractId ? [parseInt(contractId)] : [] },
      readers: { only: contractId ? [parseInt(contractId)] : [] },
    });
  } catch (e) {
    // Ignore "already exists" — map is already created
    if (!e.message.includes('already exists') && !e.message.includes('MapAlreadyExists')) {
      // Silently ignore other errors too — map creation is best-effort
    }
  }
}

async function main() {
  try {
    const { t3nClient, tenantClient, did } = await getClient();

    // Use a per-case authority map if case_id is provided, otherwise fallback to global
    // T3N Map names MUST be <= 32 bytes. case_id is ~19 bytes, so "auth-" + case_id = 24 bytes.
    const contractMapName = case_id ? `auth-${case_id}` : `auth-${contract_id}`;

    // Ensure the authorities map exists (idempotent)
    if (['grant', 'revoke', 'check', 'exec'].includes(op)) {
      await ensureMapExists(tenantClient, contractMapName, contract_id);
    }
    if (op === 'exec' || op === 'log') {
      const logMapName = case_id ? `log-${case_id}` : `log-${contract_id}`;
      await ensureMapExists(tenantClient, logMapName, contract_id);
    }

    switch (op) {

      case 'grant': {
        const key = `authority:${action}`;
        const value = JSON.stringify({
          authorized: true,
          action,
          granted_by: granted_by || did,
          granted_at: new Date().toISOString(),
          agent_did: did,
        });

        await tenantClient.executeControl('map-entry-set', {
          map_name: tenantClient.canonicalName(contractMapName),
          key,
          value,
        });

        console.log(JSON.stringify({
          success: true,
          action,
          granted_by: granted_by || did,
          agent_did: did,
          storage_key: key,
          storage_map: tenantClient.canonicalName(contractMapName),
          t3n_proof: `t3n:${contractMapName}/${key}:granted`,
          timestamp: new Date().toISOString(),
        }));
        break;
      }

      case 'revoke': {
        const key = `authority:${action}`;
        const value = JSON.stringify({
          authorized: false,
          action,
          revoked_at: new Date().toISOString(),
          agent_did: did,
        });

        await tenantClient.executeControl('map-entry-set', {
          map_name: tenantClient.canonicalName(contractMapName),
          key,
          value,
        });

        console.log(JSON.stringify({
          success: true,
          action,
          revoked_at: new Date().toISOString(),
          agent_did: did,
          storage_key: key,
          storage_map: tenantClient.canonicalName(contractMapName),
          t3n_proof: `t3n:${contractMapName}/${key}:revoked`,
          immediate_effect: true,
        }));
        break;
      }

      case 'check': {
        const key = `authority:${action}`;

        if (!contract_id || !contract_version) {
          // No contract configured — cannot read from TEE map externally
          console.log(JSON.stringify({
            authorized: false,
            t3n_verified: false,
            action,
            storage_key: key,
            reason: 'contract_not_configured',
            note: 'Set T3N_AUTHORITY_CONTRACT_ID and T3N_AUTHORITY_CONTRACT_VERSION in .env',
            checked_at: new Date().toISOString(),
          }));
          break;
        }

        try {
          const tenantId = did.replace('did:t3n:', '');
          const scriptName = `z:${tenantId}:authority-checker`;

          const result = await t3nClient.executeAndDecode({
            script_name: scriptName,
            script_version: contract_version,
            function_name: 'check-authority',
            input: { action, map_tail: contractMapName },
          });

          let authorized = false;
          if (typeof result === 'object' && result !== null) {
            authorized = result.authorized === true;
          } else {
            authorized = result === true || result === 1 || result === 'true';
          }

          console.log(JSON.stringify({
            authorized,
            t3n_verified: true,
            action,
            storage_key: key,
            contract_id,
            contract_version,
            script_name: scriptName,
            agent_did: did,
            checked_at: new Date().toISOString(),
          }));
        } catch (contractErr) {
          console.log(JSON.stringify({
            success: false,
            authorized: false,
            t3n_verified: false,
            action,
            storage_key: key,
            error: contractErr.message,
            reason: 'contract_call_failed',
            checked_at: new Date().toISOString(),
          }));
          process.exit(0); // Exit 0 so Python parses the JSON error
        }
        break;
      }

      case 'exec': {
        const key = `authority:${action}`;

        if (!contract_id || !contract_version) {
          console.log(JSON.stringify({
            success: false,
            error: 'CONTRACT_NOT_CONFIGURED',
            message: 'Cannot execute: T3N contract not configured. Set T3N_AUTHORITY_CONTRACT_ID and VERSION in .env.',
          }));
          process.exit(1);
        }

        try {
          const tenantId = did.replace('did:t3n:', '');
          const scriptName = `z:${tenantId}:authority-checker`;

          // CRITICAL SECURITY ENFORCEMENT:
          // The agent MUST ask the TEE contract if it is authorized.
          // The contract reads the map via kv-store.get and returns true/false.
          const result = await t3nClient.executeAndDecode({
            script_name: scriptName,
            script_version: contract_version,
            function_name: 'check-authority',
            input: { action, map_tail: contractMapName },
          });

          let authorized = false;
          if (typeof result === 'object' && result !== null) {
            authorized = result.authorized === true;
          } else {
            authorized = result === true || result === 1 || result === 'true';
          }

          if (!authorized) {
            console.log(JSON.stringify({
              success: false,
              error: 'AUTHORITY_REVOKED',
              message: `TEE hardware rejected execution: Authority for '${action}' is revoked.`,
              t3n_verification: {
                checked_at: new Date().toISOString(),
                agent_did: did,
                authority_key: key,
                result: false,
                proof: `t3n:${key}:false`,
              }
            }));
            process.exit(0); // Exit 0 so Python can parse the JSON error
          }

          // If authorized, proceed with the dummy execution
          console.log(JSON.stringify({
            success: true,
            action,
            executed: true,
            agent_did: did,
            storage_key: key,
            storage_map: tenantClient.canonicalName('authorities'),
            proof_of_authority: `t3n:${key}:true`,
            executed_at: new Date().toISOString(),
          }));

        } catch (contractErr) {
          console.log(JSON.stringify({
            success: false,
            error: 'CONTRACT_EXECUTION_FAILED',
            message: contractErr.message,
          }));
          process.exit(1);
        }
        break;
      }

      case 'log': {
        console.log(JSON.stringify({
          success: true,
          case_id,
          logs: [],
          agent_did: did,
        }));
        break;
      }

      default:
        console.log(JSON.stringify({
          success: false,
          error: `Unknown operation: ${op}`,
        }));
        process.exit(1);
    }

  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: err.message,
      stack: err.stack,
    }));
    process.exit(1);
  }
}

main();
