import { test } from "node:test";
import assert from "node:assert/strict";
import { createSqlEngine } from "../src/widgets/sql-engine";
import { createSqlWorkerClient } from "../src/widgets/sql-client";
import type {
  SqlWorkerPort,
  SqlWorkerRequest,
  SqlWorkerResponse,
} from "../src/widgets/sql-protocol";

class TestWorker implements SqlWorkerPort {
  messages: SqlWorkerRequest[] = [];
  terminated = false;
  onmessage: SqlWorkerPort["onmessage"] = null;
  onerror: SqlWorkerPort["onerror"] = null;
  postMessage(message: SqlWorkerRequest) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  respond(message: SqlWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<SqlWorkerResponse>);
  }
}

test("the practice database answers a real join across students and enrollments", async () => {
  const engine = await createSqlEngine();
  try {
    const result = engine.execute(`SELECT s.name, c.title FROM students s
      JOIN enrollments e ON e.student_id = s.student_id
      JOIN courses c ON c.course_id = e.course_id
      WHERE s.student_id = 1 ORDER BY c.course_id;`);
    assert.deepEqual(result.results[0].columns, ["name", "title"]);
    assert.deepEqual(result.results[0].values, [
      ["Aarav Shah", "DBMS"],
      ["Aarav Shah", "Operating Systems"],
    ]);
    assert.ok(result.elapsedMs >= 0);
  } finally {
    engine.close();
  }
});

test("the chapter four GROUP BY and HAVING example executes against orders", async () => {
  const engine = await createSqlEngine();
  try {
    const result =
      engine.execute(`SELECT snum, COUNT(*) AS order_count, SUM(amt) AS total_sales
      FROM orders WHERE amt > 100 GROUP BY snum HAVING SUM(amt) > 500 ORDER BY total_sales DESC;`);
    assert.deepEqual(result.results[0].values, [
      [1001, 3, 2250],
      [1002, 2, 1200],
    ]);
  } finally {
    engine.close();
  }
});

test("SQL errors explain missing tables without corrupting the working database", async () => {
  const engine = await createSqlEngine();
  try {
    assert.throws(
      () => engine.execute("SELECT * FROM missing_table;"),
      /table.*missing_table/i,
    );
    assert.equal(
      engine.execute("SELECT COUNT(*) AS count FROM students;").results[0]
        .values[0][0],
      6,
    );
    assert.throws(() => engine.execute("   "), /write|query|statement/i);
  } finally {
    engine.close();
  }
});

test("reset restores seed rows and removes user-created tables after edits", async () => {
  const engine = await createSqlEngine();
  try {
    engine.execute(
      "DELETE FROM enrollments; DELETE FROM students; CREATE TABLE scratch (id INTEGER);",
    );
    assert.equal(
      engine.execute("SELECT COUNT(*) FROM students;").results[0].values[0][0],
      0,
    );
    engine.reset();
    assert.equal(
      engine.execute("SELECT COUNT(*) FROM students;").results[0].values[0][0],
      6,
    );
    assert.throws(() => engine.execute("SELECT * FROM scratch;"), /scratch/);
    assert.equal(
      engine.execute(
        "SELECT cname FROM customer WHERE NOT EXISTS (SELECT 1 FROM orders WHERE orders.cnum = customer.cnum);",
      ).results[0].values[0][0],
      "Gauri Mehta",
    );
  } finally {
    engine.close();
  }
});

test("a query with no matches still returns its column headings", async () => {
  const engine = await createSqlEngine();
  try {
    assert.deepEqual(
      engine.execute("SELECT name, cgpa FROM students WHERE student_id = -1;")
        .results,
      [{ columns: ["name", "cgpa"], values: [] }],
    );
  } finally {
    engine.close();
  }
});

test("multi-statement scripts return each result and rollback changes", async () => {
  const engine = await createSqlEngine();
  try {
    const result =
      engine.execute(`BEGIN; UPDATE students SET cgpa = 9 WHERE student_id = 1;
      SELECT cgpa FROM students WHERE student_id = 1; ROLLBACK;
      SELECT cgpa FROM students WHERE student_id = 1;`);
    assert.deepEqual(
      result.results.map((table) => table.values),
      [[[9]], [[8.8]]],
    );
    assert.equal(result.rowsModified, 1);
  } finally {
    engine.close();
  }
});

test("worker requests wait for initialization and match responses by request ID", async () => {
  const worker = new TestWorker();
  const client = createSqlWorkerClient({ workerFactory: () => worker });
  try {
    const query = client.execute("SELECT 1;");
    assert.equal(worker.messages.length, 0);
    worker.respond({ type: "ready" });
    await client.whenReady();
    await Promise.resolve();
    assert.equal(worker.messages[0]?.type, "execute");
    const id = worker.messages[0].id;
    worker.respond({
      type: "result",
      id: id + 1,
      execution: { results: [], elapsedMs: 99, rowsModified: 0 },
    });
    worker.respond({
      type: "result",
      id,
      execution: {
        results: [{ columns: ["1"], values: [[1]] }],
        elapsedMs: 2,
        rowsModified: 0,
      },
    });
    assert.equal((await query).results[0].values[0][0], 1);
    const reset = client.reset();
    await Promise.resolve();
    const resetMessage = worker.messages[1];
    assert.equal(resetMessage.type, "reset");
    assert.notEqual(resetMessage.id, id);
    worker.respond({ type: "reset", id: resetMessage.id });
    await reset;
  } finally {
    client.close();
  }
  assert.equal(worker.terminated, true);
});

test("a stalled query terminates its worker, restores a fresh engine, and allows retry", async () => {
  const workers: TestWorker[] = [];
  const readiness: boolean[] = [];
  const client = createSqlWorkerClient({
    workerFactory: () => {
      const worker = new TestWorker();
      workers.push(worker);
      return worker;
    },
    timeoutMs: 20,
    onReadyChange: (ready) => readiness.push(ready),
  });
  try {
    workers[0]?.respond({ type: "ready" });
    await client.whenReady();
    await assert.rejects(
      client.execute("SELECT an_expensive_query;"),
      /too long.*restored/i,
    );
    assert.equal(workers[0].terminated, true);
    assert.equal(workers.length, 2);
    workers[1].respond({ type: "ready" });
    await client.whenReady();
    const retried = client.execute("SELECT 2;");
    await Promise.resolve();
    workers[1].respond({
      type: "result",
      id: workers[1].messages[0].id,
      execution: {
        results: [{ columns: ["2"], values: [[2]] }],
        elapsedMs: 1,
        rowsModified: 0,
      },
    });
    assert.equal((await retried).results[0].values[0][0], 2);
    assert.deepEqual(readiness, [false, true, false, true]);
  } finally {
    client.close();
  }
});
import course from "../src/data/course.json";
import { exampleQuery } from "../src/lib/lesson-tools";
test("chapter nine Try this query loads a runnable query against the seeded lab", async () => {
  const engine = await createSqlEngine();
  try {
    const result = engine.execute(exampleQuery(course.chapters[8].example));
    assert.deepEqual(result.results[0].columns, ["cname", "sname"]);
    assert.ok(result.results[0].values.length > 0);
  } finally {
    engine.close();
  }
});
