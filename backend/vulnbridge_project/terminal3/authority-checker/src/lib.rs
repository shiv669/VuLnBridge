// Authority Checker Contract
// Reads authority records from the tenant KV store
// Must be added to the "authorities" map's readers ACL

use std::str;

// Import the host KV store capability via wit-bindgen
wit_bindgen::generate!({
    world: "host",
    exports: {
        "vulnbridge:authority/host": Host,
    }
});

struct Host;

impl vulnbridge::authority::Host for Host {
    /// Check if an authority record exists and is granted
    fn check_authority(action: String) -> bool {
        let key = format!("authority:{}", action);
        
        // Read from the authorities map via kv_store
        match read_kv("authorities", &key) {
            Some(value) => {
                // Parse JSON to check if authorized is true
                if let Ok(json_str) = str::from_utf8(&value) {
                    json_str.contains("\"authorized\":true")
                } else {
                    false
                }
            }
            None => false,
        }
    }

    /// Get the full authority record as a JSON string
    fn get_authority(action: String) -> Option<String> {
        let key = format!("authority:{}", action);
        
        // Read from the authorities map via kv_store
        match read_kv("authorities", &key) {
            Some(value) => {
                if let Ok(json_str) = str::from_utf8(&value) {
                    Some(json_str.to_string())
                } else {
                    None
                }
            }
            None => None,
        }
    }
}

/// Helper function to read from KV store
/// This would use the actual kv-store host interface
/// For now, this is a placeholder - the actual implementation
/// requires importing the kv-store interface from the T3N host
fn read_kv(map_name: &str, key: &str) -> Option<Vec<u8>> {
    // This calls the host's kv-store.get capability
    // The actual binding depends on the T3N ADK WIT definitions
    
    // Placeholder - would be implemented via WIT host imports
    // The host provides: kv-store.get(map_name: string, key: string) -> option<vector<u8>>
    None
}
