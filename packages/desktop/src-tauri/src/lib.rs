use tauri::{Manager, Emitter};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_shell::process::CommandEvent;
use std::sync::atomic::{AtomicBool, Ordering};

static SIDECAR_READY: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn get_sidecar_status() -> &'static str {
    if SIDECAR_READY.load(Ordering::Relaxed) {
        "ready"
    } else {
        "starting"
    }
}

#[derive(serde::Serialize)]
struct UpdateInfo {
    version: String,
    date: String,
    body: String,
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    #[cfg(target_os = "macos")]
    {
        let update = app.updater_builder()
            .build()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?;

        Ok(update.map(|u| UpdateInfo {
            version: u.version,
            date: u.date.map(|d| d.to_string()).unwrap_or_default(),
            body: u.body.unwrap_or_default(),
        }))
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(None)
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let update = app.updater_builder()
            .build()
            .map_err(|e| e.to_string())?
            .check()
            .await
            .map_err(|e| e.to_string())?;

        if let Some(u) = update {
            u.download_and_install(|_downloaded, _total| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("No update available".to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Updates only supported on macOS".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_sidecar_status,
            check_for_updates,
            install_update
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Spawn Python sidecar
            let sidecar_command = app.shell()
                .sidecar("python-sidecar")
                .expect("failed to create sidecar command");

            let (mut rx, _child) = sidecar_command.spawn()
                .expect("failed to spawn sidecar");

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line_str = String::from_utf8_lossy(&line);
                            println!("[Sidecar] {}", line_str);
                            if line_str.contains("AXIOM_READY") {
                                SIDECAR_READY.store(true, Ordering::Relaxed);
                                let _ = app_handle.emit("sidecar-ready", ());
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[Sidecar Error] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Error(err) => {
                            eprintln!("[Sidecar Error] {}", err);
                            let _ = app_handle.emit("sidecar-error", err);
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
