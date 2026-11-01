import type { QueryExecResult, SqlJsStatic } from "sql.js";
import initializeSqlite from "sql.js";

export interface SqlExecution {
  results: QueryExecResult[];
  elapsedMs: number;
  rowsModified: number;
}
export interface SqlEngine {
  execute(query: string): SqlExecution;
  reset(): void;
  close(): void;
}

const SEED = `
PRAGMA foreign_keys = ON;
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  cgpa REAL CHECK (cgpa BETWEEN 0 AND 10)
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0)
);
CREATE TABLE enrollments (
  student_id INTEGER REFERENCES students(student_id),
  course_id INTEGER REFERENCES courses(course_id),
  grade TEXT,
  PRIMARY KEY (student_id, course_id)
);
CREATE TABLE salespeople (snum INTEGER PRIMARY KEY, sname TEXT NOT NULL, city TEXT, comm REAL);
CREATE TABLE customer (cnum INTEGER PRIMARY KEY, cname TEXT NOT NULL, city TEXT, rating INTEGER, snum INTEGER REFERENCES salespeople(snum));
CREATE TABLE orders (onum INTEGER PRIMARY KEY, amt REAL, odate TEXT, cnum INTEGER REFERENCES customer(cnum), snum INTEGER REFERENCES salespeople(snum));
INSERT INTO students VALUES
  (1, 'Aarav Shah', 'CSE', 4, 8.8),
  (2, 'Diya Patel', 'CSE', 4, 9.2),
  (3, 'Kabir Desai', 'ECE', 4, 8.1),
  (4, 'Meera Joshi', 'CSE', 6, 9.5),
  (5, 'Rohan Trivedi', 'ME', 4, 7.7),
  (6, 'Zoya Khan', 'ECE', 2, NULL);
INSERT INTO courses VALUES (101, 'DBMS', 4), (102, 'Operating Systems', 4), (103, 'Computer Networks', 3), (104, 'Discrete Mathematics', 3);
INSERT INTO enrollments VALUES (1,101,'A'), (1,102,'B'), (2,101,'A'), (2,103,'A'), (3,101,'B'), (3,104,'A'), (4,101,'A'), (4,102,'A'), (4,103,'B'), (4,104,'A'), (5,104,NULL);
INSERT INTO salespeople VALUES (1001,'Priya Shah','Ahmedabad',0.12), (1002,'Neel Patel','Surat',0.10), (1003,'Asha Rao','Vadodara',0.11);
INSERT INTO customer VALUES (1,'Gaurav Shah','Ahmedabad',200,1001), (2,'Nisha Patel','Surat',300,1002), (3,'Dev Joshi',NULL,100,1001), (4,'Gauri Mehta','Ahmedabad',NULL,1003);
INSERT INTO orders VALUES
  (3001,250,'2026-08-01',1,1001), (3002,800,'2026-08-01',1,1001),
  (3003,1200,'2026-08-02',3,1001), (3004,50,'2026-08-03',3,1001),
  (3005,450,'2026-08-02',2,1002), (3006,750,'2026-08-04',2,1002),
  (3007,100,'2026-08-04',2,1002), (3008,NULL,'2026-08-05',3,1003);
CREATE VIEW Student AS SELECT student_id, name, department FROM students;
CREATE VIEW Course AS SELECT course_id, title, credits FROM courses;
CREATE VIEW Enrollment AS SELECT student_id, course_id, grade FROM enrollments;
`;

let sqlite: Promise<SqlJsStatic> | undefined;

export async function createSqlEngine(
  options: { wasmUrl?: string } = {},
): Promise<SqlEngine> {
  if (!sqlite) {
    sqlite = initializeSqlite(
      options.wasmUrl ? { locateFile: () => options.wasmUrl! } : undefined,
    ).catch((error: unknown) => {
      sqlite = undefined;
      throw error;
    });
  }
  const SQL = await sqlite;
  let database = new SQL.Database();
  database.exec(SEED);
  return {
    execute(query) {
      if (!query.trim())
        throw new Error("Write a SQL query before running it.");
      const started = performance.now();
      const before = Number(
        database.exec("SELECT total_changes();")[0].values[0][0],
      );
      try {
        const results: QueryExecResult[] = [];
        // Preparing each statement preserves headings even when SELECT has no matches.
        for (const statement of database.iterateStatements(query)) {
          const columns = statement.getColumnNames();
          const values: QueryExecResult["values"] = [];
          while (statement.step()) values.push(statement.get());
          if (columns.length) results.push({ columns, values });
        }
        const after = Number(
          database.exec("SELECT total_changes();")[0].values[0][0],
        );
        return {
          results,
          elapsedMs: performance.now() - started,
          rowsModified: after - before,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        let hint = "";
        if (/no such table/i.test(message))
          hint =
            " Open the dataset schema to check table names, or reset the dataset if you dropped a table.";
        else if (/no such column/i.test(message))
          hint =
            " Check the column names in the dataset schema. Use table aliases when joining.";
        else if (/syntax error/i.test(message))
          hint = " Check keywords, commas, quotes, and the SQLite dialect.";
        else if (/FOREIGN KEY/i.test(message))
          hint =
            " The referenced row must exist; remove dependent rows before deleting a parent.";
        throw new Error(message + hint);
      }
    },
    reset() {
      database.close();
      database = new SQL.Database();
      database.exec(SEED);
    },
    close() {
      database.close();
    },
  };
}
