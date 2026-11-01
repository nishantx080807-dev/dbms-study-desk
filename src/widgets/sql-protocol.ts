import type { SqlExecution } from "./sql-engine";

export type SqlWorkerRequest =
  | { type: "execute"; id: number; query: string }
  | { type: "reset"; id: number };

export type SqlWorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; execution: SqlExecution }
  | { type: "reset"; id: number }
  | { type: "error"; id?: number; message: string };

export interface SqlWorkerPort {
  postMessage(message: SqlWorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<SqlWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}
