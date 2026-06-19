// Shim used when @tauri-apps/api/core is not available (e.g. Capacitor/Android builds).
// Exports the same API surface but stubs everything as a no-op so the bundle
// can be parsed without crashing in non-Tauri environments.
export const isTauri = () => false;
export const invoke = async (_cmd: string, _args?: any): Promise<any> => {
  throw new Error('Tauri is not available in this environment');
};
