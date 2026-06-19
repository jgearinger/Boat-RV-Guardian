use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;
use tauri::command;

#[command]
fn raw_linktap_post(ip: String, payload: String) -> Result<String, String> {
    let mut stream = TcpStream::connect(format!("{}:80", ip))
        .map_err(|e| format!("Failed to connect: {}", e))?;
    
    stream.set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| e.to_string())?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| e.to_string())?;

    let request = format!(
        "POST /api.shtml HTTP/1.0\r\n\
         Host: {}\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\
         \r\n\
         {}",
        ip,
        payload.len(),
        payload
    );

    stream.write_all(request.as_bytes())
        .map_err(|e| format!("Failed to write: {}", e))?;

    let mut response = String::new();
    stream.read_to_string(&mut response)
        .map_err(|e| format!("Failed to read: {}", e))?;

    if let Some(body_start) = response.find("\r\n\r\n") {
        Ok(response[body_start + 4..].trim().to_string())
    } else if let Some(body_start) = response.find("\n\n") {
        Ok(response[body_start + 2..].trim().to_string())
    } else {
        Ok(response)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![raw_linktap_post])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
