#!/usr/bin/env node
/**
 * T3N Authority Checker Contract Deployment Script
 * Uses the SDK's tenant.contracts.register() method for programmatic deployment
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

// Load .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  let envContent;
  const buffer = fs.readFileSync(envPath);

  if ((buffer[0] === 0xFF && buffer[1] === 0xFE) || (buffer[0] === 0xFE && buffer[1] === 0xFF)) {
    envContent = buffer.toString('utf-16le');
  } else {
    envContent = buffer.toString('utf-8');
  }

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      const trimmedKey = key.trim();
      const trimmedValue = valueParts.join('=').trim();
      if (!process.env[trimmedKey]) {
        process.env[trimmedKey] = trimmedValue;
      }
    }
  });
}

const AGENT_KEY = process.env.TERMINAL3_AGENT_KEY;
if (!AGENT_KEY) {
  console.error('❌ TERMINAL3_AGENT_KEY not found in .env');
  process.exit(1);
}

setEnvironment('testnet');
const address = eth_get_address(AGENT_KEY);

async function main() {
  console.log('🚀 T3N Authority Checker Contract Deployment');
  console.log('=============================================\n');

  try {
    // Step 1: Initialize T3N client
    console.log('1️⃣  Connecting to T3N testnet...');
    const wasmComponent = await loadWasmComponent();
    const t3nClient = new T3nClient({
      wasmComponent,
      handlers: {
        EthSign: metamask_sign(address, undefined, AGENT_KEY),
      },
    });

    await t3nClient.handshake();
    console.log('   ✅ Handshake complete');

    const authResult = await t3nClient.authenticate(createEthAuthInput(address));
    const did = authResult.value || authResult.toString();
    console.log(`   ✅ Authenticated as: ${did}\n`);

    // Step 2: Create TenantClient for contract operations
    console.log('2️⃣  Creating tenant client...');
    const tenant = new TenantClient({
      t3n: t3nClient,
      tenantDid: did,
      baseUrl: getNodeUrl(),
    });
    console.log('   ✅ Tenant client ready\n');

    // Step 3: Load WASM file
    console.log('3️⃣  Loading compiled WASM contract...');
    const wasmPath = path.join(__dirname, 'vulnbridge_project', 'terminal3', 'authority-checker', 'target', 'wasm32-wasip2', 'release', 'authority_checker.wasm');

    if (!fs.existsSync(wasmPath)) {
      console.error(`   ❌ WASM file not found at: ${wasmPath}`);
      console.error('   Run: cd backend/vulnbridge_project/terminal3/authority-checker && cargo build --target wasm32-wasip2 --release');
      process.exit(1);
    }

    const wasmBuffer = fs.readFileSync(wasmPath);
    console.log(`   ✅ WASM loaded (${wasmBuffer.length} bytes)\n`);

    // Step 4: Deploy contract via SDK
    console.log('4️⃣  Deploying contract to T3N testnet...');

    const deployResult = await tenant.contracts.register({
      tail: 'authority-checker',
      version: '3.0.0',
      wasm: wasmBuffer,
    });

    const contractId = deployResult.contract_id || deployResult.toString();
    const tenantId = did.slice('did:t3n:'.length);
    const scriptName = `z:${tenantId}:authority-checker`;

    console.log(`   ✅ Deployment successful!\n`);
    console.log(`   📋 Contract Information:`)
    console.log(`      Name: authority-checker`);
    console.log(`      Version: 3.0.0`);
    console.log(`      Contract ID: ${contractId}`);
    console.log(`      Script Name: ${scriptName}\n`);

    // Step 5: Update .env with contract details
    console.log('5️⃣  Updating .env configuration...');

    let envContent;
    const envBuffer = fs.readFileSync(envPath);

    if ((envBuffer[0] === 0xFF && envBuffer[1] === 0xFE) || (envBuffer[0] === 0xFE && envBuffer[1] === 0xFF)) {
      envContent = envBuffer.toString('utf-16le');
    } else {
      envContent = envBuffer.toString('utf-8');
    }

    const lines = envContent.split('\n');
    let contractIdFound = false;
    let contractVersionFound = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('T3N_AUTHORITY_CONTRACT_ID=')) {
        lines[i] = `T3N_AUTHORITY_CONTRACT_ID=${contractId}`;
        contractIdFound = true;
      }
      if (lines[i].startsWith('T3N_AUTHORITY_CONTRACT_VERSION=')) {
        lines[i] = `T3N_AUTHORITY_CONTRACT_VERSION=3.0.0`;
        contractVersionFound = true;
      }
    }

    if (!contractIdFound) {
      lines.push(`T3N_AUTHORITY_CONTRACT_ID=${contractId}`);
    }
    if (!contractVersionFound) {
      lines.push(`T3N_AUTHORITY_CONTRACT_VERSION=3.0.0`);
    }

    const updatedEnv = lines.join('\n');
    fs.writeFileSync(envPath, updatedEnv, 'utf-8');
    console.log(`   ✅ .env updated with contract details\n`);

    // Step 6: Display next steps
    console.log('6️⃣  ✅ DEPLOYMENT COMPLETE!\n');
    console.log('🎯 Next Steps - Full End-to-End Testing:\n');

    console.log('   Test 1: Grant Authority (T3N Write)');
    console.log(`      node t3n_helper.mjs '{"op":"grant","action":"validate","granted_by":"admin"}'`);
    console.log(`      Expected: {"success":true, "t3n_verified":true, ...}\n`);

    console.log('   Test 2: Check Authority (T3N Contract Read)');
    console.log(`      node t3n_helper.mjs '{"op":"check","action":"validate","contract_id":"${contractId}","contract_version":"0.5.0"}'`);
    console.log(`      Expected: {"authorized":true, "t3n_verified":true, ...}\n`);

    console.log('   Test 3: Execute with Authority');
    console.log(`      node t3n_helper.mjs '{"op":"exec","action":"validate","contract_id":"${contractId}","contract_version":"0.5.0"}'`);
    console.log(`      Expected: {"success":true, "t3n_verified":true, ...}\n`);

    console.log('   Test 4: Backend API');
    console.log(`      curl -X POST http://localhost:8000/api/authority/grant/ -H "Content-Type: application/json" -d '{"action":"validate","granted_by":"admin"}'`);
    console.log('      Expected: 200 OK with success response\n');

    console.log('=============================================');
    console.log('✅ Your Contract is LIVE on T3N Testnet!');
    console.log('   Restart t3n_helper subprocess to load new config');
    console.log('=============================================\n');

    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      agent_did: did,
      agent_address: address,
      contract_name: 'authority-checker',
      contract_id: contractId,
      script_name: scriptName,
      contract_version: '3.0.0',
      network: 'T3N Testnet',
      node_url: getNodeUrl(),
      status: 'DEPLOYED',
    };

    fs.writeFileSync(
      path.join(__dirname, 'DEPLOYMENT_INFO.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('✅ Deployment info saved to: DEPLOYMENT_INFO.json\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();



