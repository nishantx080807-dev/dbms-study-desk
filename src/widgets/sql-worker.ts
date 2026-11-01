import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { createSqlEngine } from "./sql-engine";
import type { SqlWorkerRequest, SqlWorkerResponse } from "./sql-protocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<SqlWorkerRequest>) => void) | null;
  postMessage(message: SqlWorkerResponse): void;
};

// Vite emits both this module Worker and the WASM as local build assets.
const database = createSqlEngine({ wasmUrl });
void database
  .then(() => scope.postMessage({ type: "ready" }))
  .catch(() => {
    scope.postMessage({
      type: "error",
      message:
        "SQLite could not load its local offline files. Retry loading the SQL engine.",
    });
  });

scope.onmessage = async ({ data }) => {
  try {
    const engine = await database;
    if (data.type === "execute")
      scope.postMessage({
        type: "result",
        id: data.id,
        execution: engine.execute(data.query),
      });
    else if (data.type === "reset") {
      engine.reset();
      scope.postMessage({ type: "reset", id: data.id });
    }
  } catch (error) {
    scope.postMessage({
      type: "error",
      id: data.id,
      message:
        error instanceof Error
          ? error.message
          : "The SQL statement could not run.",
    });
  }
};
