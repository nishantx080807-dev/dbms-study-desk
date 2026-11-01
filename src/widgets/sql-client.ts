import type { SqlExecution } from "./sql-engine";
import type {
  SqlWorkerPort,
  SqlWorkerRequest,
  SqlWorkerResponse,
} from "./sql-protocol";

interface SqlClientOptions {
  workerFactory?: () => SqlWorkerPort;
  timeoutMs?: number;
  startupTimeoutMs?: number;
  onReadyChange?: (ready: boolean) => void;
  onFailure?: (message: string) => void;
}

export interface SqlWorkerClient {
  whenReady(): Promise<void>;
  execute(query: string): Promise<SqlExecution>;
  reset(): Promise<void>;
  close(): void;
}

export function createSqlWorkerClient(
  options: SqlClientOptions = {},
): SqlWorkerClient {
  const factory =
    options.workerFactory ??
    (() =>
      new Worker(new URL("./sql-worker.ts", import.meta.url), {
        type: "module",
      }));
  const pending = new Map<
    number,
    {
      resolve: (message: SqlWorkerResponse) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let worker: SqlWorkerPort | null = null;
  let nextId = 1;
  let closed = false;
  let ready = false;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let readyPromise: Promise<void>;
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};

  function stop(error: Error) {
    if (startupTimer) clearTimeout(startupTimer);
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      worker = null;
    }
    ready = false;
    rejectReady(error);
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  }

  function fail(error: Error, restart: boolean) {
    stop(error);
    options.onFailure?.(error.message);
    if (restart && !closed) boot();
    else options.onReadyChange?.(false);
  }

  function boot() {
    options.onReadyChange?.(false);
    readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    // A replacement worker can initialize before a consumer awaits whenReady().
    void readyPromise.catch(() => {});
    try {
      worker = factory();
      worker.onmessage = ({ data }) => {
        if (data.type === "ready") {
          if (startupTimer) clearTimeout(startupTimer);
          ready = true;
          resolveReady();
          options.onReadyChange?.(true);
          return;
        }
        if (data.type === "error" && data.id === undefined) {
          fail(new Error(data.message), false);
          return;
        }
        if (!("id" in data) || data.id === undefined) return;
        const request = pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        pending.delete(data.id);
        if (data.type === "error") request.reject(new Error(data.message));
        else request.resolve(data);
      };
      worker.onerror = (event) => {
        event.preventDefault?.();
        fail(
          new Error(
            ready
              ? "The local SQL engine stopped. It is restarting with the sample dataset restored. Run your query again."
              : "The local SQL engine could not start. Retry loading SQLite.",
          ),
          ready,
        );
      };
      startupTimer = setTimeout(
        () =>
          fail(
            new Error(
              "SQLite took too long to load. Retry loading the local SQL engine.",
            ),
            false,
          ),
        options.startupTimeoutMs ?? 15_000,
      );
    } catch {
      fail(
        new Error(
          "The local SQL worker could not start. Retry loading SQLite.",
        ),
        false,
      );
    }
  }

  async function request(
    message: { type: "execute"; query: string } | { type: "reset" },
  ): Promise<SqlWorkerResponse> {
    if (closed) throw new Error("The SQL playground has closed.");
    await readyPromise;
    if (closed || !worker || !ready)
      throw new Error(
        "SQLite is restarting. Wait a moment, then retry your query.",
      );
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        fail(
          new Error(
            "Your query took too long. The SQL engine is restarting with the sample dataset restored. Try a smaller query, or reset the dataset.",
          ),
          true,
        );
      }, options.timeoutMs ?? 5_000);
      pending.set(id, { resolve, reject, timer });
      try {
        worker!.postMessage({ ...message, id } as SqlWorkerRequest);
      } catch {
        fail(
          new Error(
            "The SQL engine could not receive the query. It is restarting with the sample dataset restored.",
          ),
          true,
        );
      }
    });
  }

  boot();
  return {
    whenReady: () => readyPromise,
    async execute(query) {
      const response = await request({ type: "execute", query });
      if (response.type !== "result")
        throw new Error(
          "SQLite returned an unexpected response. Try your query again.",
        );
      return response.execution;
    },
    async reset() {
      const response = await request({ type: "reset" });
      if (response.type !== "reset")
        throw new Error(
          "SQLite could not reset its dataset. Retry loading the engine.",
        );
    },
    close() {
      closed = true;
      stop(new Error("The SQL playground has closed."));
      options.onReadyChange?.(false);
    },
  };
}
