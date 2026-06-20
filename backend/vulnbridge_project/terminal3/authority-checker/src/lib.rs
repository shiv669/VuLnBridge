wit_bindgen::generate!({
    world: "authority-checker",
    path: "wit",
    additional_derives: [
        serde::Deserialize,
        serde::Serialize,
    ],
    generate_all,
});

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct ActionInput {
    action: String,
    map_tail: String,
}

#[derive(Serialize)]
struct AuthResponse {
    authorized: bool,
}

struct Component;

impl exports::z::vulnbridge_authority::contracts::Guest for Component {
    fn check_authority(req: exports::z::vulnbridge_authority::contracts::GenericInput) -> Result<Vec<u8>, String> {
        let input_bytes = req.input.ok_or("check-authority: missing input")?;
        
        let input: ActionInput = serde_json::from_slice(&input_bytes)
            .map_err(|e| format!("failed to parse input: {}", e))?;
            
        let tid = host::tenant::tenant_context::tenant_did();
        let map_name = format!("z:{}:{}", hex::encode(&tid), input.map_tail);
        let key_str = format!("authority:{}", input.action);
        
        let bytes_opt = host::interfaces::kv_store::get(&map_name, key_str.as_bytes())
            .map_err(|e| format!("kv read error: {}", e))?;
            
        match bytes_opt {
            Some(bytes) => {
                let value_str = String::from_utf8_lossy(&bytes);
                let authorized = value_str.contains("\"authorized\":true") || value_str.contains("\"authorized\": true");
                
                let response = AuthResponse { authorized };
                let resp_bytes = serde_json::to_vec(&response).map_err(|e| e.to_string())?;
                Ok(resp_bytes)
            }
            None => {
                let response = AuthResponse { authorized: false };
                let resp_bytes = serde_json::to_vec(&response).map_err(|e| e.to_string())?;
                Ok(resp_bytes)
            }
        }
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
