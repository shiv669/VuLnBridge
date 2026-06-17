import React, { useState } from 'react';
import { AuthorityPanel } from './components/AuthorityPanel';
import { VulnerabilityForm } from './components/VulnerabilityForm';

function App() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-2">VulnBridge</h1>
          <p className="text-blue-100">
            Agent-in-TEE Vulnerability Coordination on Terminal 3
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Authority Management Panel */}
        <section className="mb-8">
          <AuthorityPanel caseId={selectedCaseId} />
        </section>

        {/* Vulnerability Submission Form */}
        <section className="mb-8">
          <VulnerabilityForm
            onSubmitSuccess={(caseId) => {
              setSelectedCaseId(caseId);
              console.log('New case submitted:', caseId);
            }}
          />
        </section>

        {/* Information Panel */}
        <section className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How VulnBridge Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">🔐 TEE Security</h3>
              <p className="text-gray-700">
                All vulnerability processing happens inside Terminal 3's Trusted Execution Environment. 
                The agent operates with cryptographic proof and hardware-enforced revocation.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">✅ Authority Control</h3>
              <p className="text-gray-700">
                Fine-grained authority for each action: validate, remediate, disclose, and publish. 
                Stakeholders can grant or revoke permissions in real-time.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">🔍 Audit Trail</h3>
              <p className="text-gray-700">
                Every action is logged immutably in Terminal 3. Get cryptographic proofs of what 
                the agent did and when, even if the agent goes offline.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">⚡ Workflow Automation</h3>
              <p className="text-gray-700">
                WASM contracts execute in the TEE to validate vulnerabilities, coordinate patches, 
                prepare disclosures, and publish advisories.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-bold text-gray-900 mb-2">🚀 Quick Start</h3>
            <ol className="text-gray-700 space-y-2 list-decimal list-inside">
              <li>Grant Authority: Use the panel above to grant permissions to the agent</li>
              <li>Submit Vulnerability: Fill out the form with vulnerability details</li>
              <li>Execute Actions: The agent validates, remediates, discloses, and publishes</li>
              <li>Monitor: All actions are cryptographically signed and audit-logged</li>
            </ol>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>
            VulnBridge © 2024 • Powered by Terminal 3 Confidential Computing Network
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
