import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AuthorityStatus {
  action: string;
  authorized: boolean;
  last_grant?: string;
  active: boolean;
}

interface AuthorityPanelProps {
  caseId?: string;
}

export const AuthorityPanel: React.FC<AuthorityPanelProps> = ({ caseId }) => {
  const [authorities, setAuthorities] = useState<AuthorityStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [grantingAction, setGrantingAction] = useState<string | null>(null);
  const [revokingAction, setRevokingAction] = useState<string | null>(null);

  const ACTIONS = ['validate', 'remediate', 'disclose', 'publish'];

  // Fetch authority status on mount and on interval
  useEffect(() => {
    fetchAuthorityStatus();
    const interval = setInterval(fetchAuthorityStatus, 5000);
    return () => clearInterval(interval);
  }, [caseId]);

  const fetchAuthorityStatus = async () => {
    try {
      const statusPromises = ACTIONS.map(action =>
        axios.get(`/api/authority/status/?action=${action}`)
      );
      const responses = await Promise.all(statusPromises);
      setAuthorities(responses.map(r => r.data));
    } catch (error) {
      console.error('Failed to fetch authority status:', error);
    }
  };

  const handleGrantAuthority = async (action: string) => {
    setGrantingAction(action);
    try {
      const response = await axios.post('/api/authority/grant/', {
        action,
        granted_by: 'admin@vulnbridge.dev'
      });
      console.log('Authority granted:', response.data);
      await fetchAuthorityStatus();
    } catch (error) {
      console.error('Failed to grant authority:', error);
    } finally {
      setGrantingAction(null);
    }
  };

  const handleRevokeAuthority = async (action: string) => {
    setRevokingAction(action);
    try {
      const response = await axios.post('/api/authority/revoke/', {
        action,
        revoked_by: 'admin@vulnbridge.dev',
        reason: 'Manual revocation'
      });
      console.log('Authority revoked:', response.data);
      await fetchAuthorityStatus();
    } catch (error) {
      console.error('Failed to revoke authority:', error);
    } finally {
      setRevokingAction(null);
    }
  };

  return (
    <div className="authority-panel bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Authority Management</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchAuthorityStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACTIONS.map(action => {
          const status = authorities.find(a => a.action === action);
          const isAuthorized = status?.authorized ?? false;

          return (
            <div
              key={action}
              className={`p-4 rounded-lg border-2 transition-colors ${
                isAuthorized
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <h3 className="font-bold text-gray-900 capitalize mb-2">{action}</h3>
              
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isAuthorized ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {isAuthorized ? 'Authorized' : 'Not Authorized'}
                  </span>
                </div>
              </div>

              {status?.last_grant && (
                <p className="text-xs text-gray-500 mb-3">
                  Granted: {new Date(status.last_grant).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                {!isAuthorized ? (
                  <button
                    onClick={() => handleGrantAuthority(action)}
                    disabled={grantingAction === action}
                    className="flex-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {grantingAction === action ? 'Granting...' : 'Grant'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevokeAuthority(action)}
                    disabled={revokingAction === action}
                    className="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {revokingAction === action ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-2">How it works</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Grant:</strong> Authorize agent for an action in T3N TEE</li>
          <li>• <strong>Revoke:</strong> Immediately revoke authority (hardware-enforced)</li>
          <li>• <strong>Status:</strong> Real-time authority state from Terminal 3</li>
        </ul>
      </div>
    </div>
  );
};

export default AuthorityPanel;
