// In-memory cache for uploaded file bytes. Not persisted — reloading the page
// will drop bytes and the user will need to re-upload to re-run the Excel engine.

const store = new Map<string, ArrayBuffer>();

const key = (projectId: string, fileName: string) => `${projectId}::${fileName}`;

export function putFileBytes(projectId: string, fileName: string, buf: ArrayBuffer) {
  store.set(key(projectId, fileName), buf);
}

export function getFileBytes(projectId: string, fileName: string): ArrayBuffer | undefined {
  return store.get(key(projectId, fileName));
}

export function hasFileBytes(projectId: string, fileName: string): boolean {
  return store.has(key(projectId, fileName));
}

export function dropFileBytes(projectId: string, fileName: string) {
  store.delete(key(projectId, fileName));
}
