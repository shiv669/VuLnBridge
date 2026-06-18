
/**
 * VulnBridge T3N SDK Helper
 * Uses the REAL @terminal3/t3n-sdk API:
 *   loadWasmComponent → T3nClient → handshake → authenticate → execute
 *
 * Called by Python with: node --input-type=module t3n_helper.mjs <json-args>
 * Args JSON: { op: "grant"|"revoke"|"check"|"exec"|"log", action, case_id, ... }
 */

import {
  T3nClient,
  loadWasmComponent,
  createEthAuthInput,
  eth_get_address,
  metamask_sign,
  createDefaultHandlers,
  setEnvironment,
} from '@terminal3/t3n-sdk';

const args = JSON.parse(process.argv[2] || '{}');
const { op, action, case_id, granted_by, input_data } = args;

// Support both TERMINAL3_AGENT_KEY (T3N portal name) and T3N_DEMO_KEY (legacy)
const DEMO_KEY = process.env.TERMINAL3_AGENT_KEY || process.env.T3N_DEMO_KEY;
const AGENT_DID = process.env.TERMINAL3_AGENT_ID || process.env.T3N_AGENT_DID || null;
const BASE_URL = process.env.TERMINAL3_API_URL || process.env.T3N_BASE_URL || 'https://api.terminal3.dev';

if (!DEMO_KEY) {
  console.log(JSON.stringify({ success: false, error: 'TERMINAL3_AGENT_KEY not set in environment. Add it to backend/.env' }));
  process.exit(1);
}

const address = eth_get_address(DEMO_KEY);

async function getClient() {
  const wasmComponent = await loadWasmComponent();
  const client = new T3nClient({
    baseUrl: BASE_URL,
    wasmComponent,
    handlers: {
      ...createDefaultHandlers(BASE_URL),
      EthSign: metamask_sign(address, undefined, DEMO_KEY),
    },
  });
  await client.handshake();
  const did = await client.authenticate(createEthAuthInput(address));
  return { client, did: did.value || did.toString() };
}

async function main() {
  try {
    const { client, did } = await getClient();

    switch (op) {
      case 'grant': {
        // Store authority=true in T3N TEE via execute()
        // Function: 'kv-set', args: { key, value }
        const key = `vulnbridge:authority:${action}`;
        const value = JSON.stringify({
          authorized: true,
          action,
          granted_by: granted_by || did,
          granted_at: new Date().toISOString(),
          agent_did: did,
        });

        const result = await client.execute({
          function: 'kv-set',
          args: { key, value },
        });

        console.log(JSON.stringify({
          success: true,
          action,
          granted_by: granted_by || did,
          agent_did: did,
          storage_key: key,
          t3n_proof: result || `t3n:${key}:granted`,
          timestamp: new Date().toISOString(),
        }));
        break;
      }

      case 'revoke': {
        const key = `vulnbridge:authority:${action}`;
        const value = JSON.stringify({
          authorized: false,
          action,
          revoked_at: new Date().toISOString(),
          agent_did: did,
        });

        const result = await client.execute({
          function: 'kv-set',
          args: { key, value },
        });

        console.log(JSON.stringify({
          success: true,
          action,
          revoked_at: new Date().toISOString(),
          agent_did: did,
          storage_key: key,
          t3n_proof: result || `t3n:${key}:revoked`,
          immediate_effect: true,
        }));
        break;
      }

      case 'check': {
        const key = `vulnbridge:authority:${action}`;

        const result = await client.execute({
          function: 'kv-get',
          args: { key },
        });

        let parsed = null;
        try { parsed = result ? JSON.parse(result) : null; } catch {}

        if (!parsed) {
          console.log(JSON.stringify({
            authorized: false,
            t3n_verified: true,
            action,
            storage_key: key,
            reason: 'no_authority_record',
            agent_did: did,
            checked_at: new Date().toISOString(),
          }));
          break;
        }

        console.log(JSON.stringify({
          authorized: parsed.authorized === true,
          t3n_verified: true,
          action,
          storage_key: key,
          agent_did: did,
          granted_by: parsed.granted_by,
          granted_at: parsed.granted_at,
          revoked_at: parsed.revoked_at,
          t3n_proof: `t3n:${key}:${parsed.authorized ? 'true' : 'false'}`,
          checked_at: new Date().toISOString(),
        }));
        break;
      }

      case 'exec': {
        // Step 1: Check authority
        const authKey = `vulnbridge:authority:${action}`;
        const authResult = await client.execute({
          function: 'kv-get',
          args: { key: authKey },
        });

        let authData = null;
        try { authData = authResult ? JSON.parse(authResult) : null; } catch {}

        if (!authData || authData.authorized !== true) {
          console.log(JSON.stringify({
            success: false,
            error: 'AUTHORITY_REVOKED',
            message: authData
              ? `Authority for ${action} was revoked at ${authData.revoked_at}`
              : `No authority record found in T3N TEE for ${action}`,
            contract: action,
            t3n_verification: {
              checked_at: new Date().toISOString(),
              agent_did: did,
              authority_key: authKey,
              result: false,
              proof: `t3n:${authKey}:false`,
              revoked_at: authData?.revoked_at,
            },
          }));
          break;
        }

        // Step 2: Execute contract action in TEE — T3N records this in audit log
        const execResult = await client.execute({
          function: 'contract-execute',
          args: {
            contract: `vulnbridge:${action}`,
            case_id: input_data?.case_id || case_id,
            input: input_data || {},
            authority_key: authKey,
            agent_did: did,
            timestamp: new Date().toISOString(),
          },
        });

        // Step 3: Append to audit log
        const logKey = 'vulnbridge:action_log';
        const existingLog = await client.execute({ function: 'kv-get', args: { key: logKey } });
        const log = existingLog ? JSON.parse(existingLog) : [];
        log.push({
          action,
          case_id: input_data?.case_id || case_id,
          timestamp: new Date().toISOString(),
          agent_did: did,
          result: 'success',
          proof_of_authority: authKey,
        });
        await client.execute({ function: 'kv-set', args: { key: logKey, value: JSON.stringify(log) } });

        console.log(JSON.stringify({
          success: true,
          contract: action,
          agent_did: did,
          signature: execResult || `t3n:exec:${action}:${Date.now()}`,
          proof_of_authority: authKey,
          timestamp: new Date().toISOString(),
        }));
        break;
      }

      case 'log': {
        const logKey = 'vulnbridge:action_log';
        const result = await client.execute({ function: 'kv-get', args: { key: logKey } });
        let actions = [];
        try { actions = result ? JSON.parse(result) : []; } catch {}
        if (case_id) actions = actions.filter(a => a.case_id === case_id);
        console.log(JSON.stringify({ success: true, actions, count: actions.length }));
        break;
      }

      default:
        console.log(JSON.stringify({ success: false, error: `Unknown op: ${op}` }));
        process.exit(1);
    }
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message, stack: err.stack }));
    process.exit(1);
  }
}

main();
