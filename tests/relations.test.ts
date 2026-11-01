import test from "node:test";
import assert from "node:assert/strict";
import {
  relationalJoin,
  attributeClosure,
  normalizationTables,
  reconstructEnrollment,
} from "../src/widgets/relations.ts";

const left = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Lin" },
  { id: null, name: "No key" },
];
const right = [
  { id: 1, team: "DB" },
  { id: 1, team: "Web" },
  { id: 3, team: "AI" },
  { id: null, team: "Unknown" },
];

// Independent schema specification. Validate implied projected dependencies rather
// than guessing keys from the small data sample or trusting displayed PK metadata.
const scenarioFDs: [string[], string[]][] = [
  [["student"], ["name"]],
  [
    ["student", "course"],
    ["instructor", "grade"],
  ],
  [["instructor"], ["course", "office"]],
  [["office"], ["building"]],
];
function impliedAttributes(determinant: string[]): Set<string> {
  const reached = new Set(determinant);
  for (;;) {
    const before = reached.size;
    for (const [from, to] of scenarioFDs)
      if (from.every((attribute) => reached.has(attribute)))
        to.forEach((attribute) => reached.add(attribute));
    if (reached.size === before) return reached;
  }
}
function inspectNormalForms(columns: string[]) {
  const subsets = Array.from({ length: 2 ** columns.length }, (_, mask) =>
    columns.filter((_, bit) => mask & (1 << bit)),
  );
  const isSuperkey = (set: string[]) =>
    columns.every((column) => impliedAttributes(set).has(column));
  const keys = subsets.filter(
    (set) =>
      isSuperkey(set) &&
      !set.some((_, index) =>
        isSuperkey(set.filter((_, other) => index !== other)),
      ),
  );
  const prime = new Set(keys.flat());
  const second = keys.every((key) =>
    subsets
      .filter(
        (subset) =>
          subset.length < key.length &&
          subset.every((attribute) => key.includes(attribute)),
      )
      .every((subset) =>
        columns.every(
          (column) =>
            prime.has(column) ||
            subset.includes(column) ||
            !impliedAttributes(subset).has(column),
        ),
      ),
  );
  const third = subsets.every(
    (subset) =>
      isSuperkey(subset) ||
      columns.every(
        (column) =>
          subset.includes(column) ||
          prime.has(column) ||
          !impliedAttributes(subset).has(column),
      ),
  );
  const bcnf = subsets.every(
    (subset) =>
      isSuperkey(subset) ||
      columns.every(
        (column) =>
          subset.includes(column) || !impliedAttributes(subset).has(column),
      ),
  );
  return {
    keys: keys.map((key) => [...key].sort().join(",")).sort(),
    second,
    third,
    bcnf,
  };
}

test("2NF removes partial dependencies on every candidate key, including student–instructor", () => {
  const enrollment = normalizationTables(2).find(
    (table) => table.name === "Enrollments",
  )!;
  const forms = inspectNormalForms(enrollment.columns);
  assert.deepEqual(forms.keys, ["course,student", "instructor,student"]);
  assert.equal(
    forms.second,
    true,
    "instructor → office is partial on alternate key (student,instructor) and must leave Enrollments at 2NF",
  );
  for (const table of normalizationTables(2))
    assert.equal(
      inspectNormalForms(table.columns).second,
      true,
      `${table.name} must satisfy 2NF`,
    );
});

test("every stage earns its claimed normal form under all implied functional dependencies", () => {
  assert.equal(
    inspectNormalForms(normalizationTables(1)[0].columns).second,
    false,
  );
  assert.ok(
    normalizationTables(2).some(
      (table) => !inspectNormalForms(table.columns).third,
    ),
    "2NF retains a real transitive non-prime dependency for the next step",
  );
  for (const table of normalizationTables(3))
    assert.equal(
      inspectNormalForms(table.columns).third,
      true,
      `${table.name} must satisfy 3NF`,
    );
  assert.ok(
    normalizationTables(3).some(
      (table) => !inspectNormalForms(table.columns).bcnf,
    ),
    "3NF retains the prime-attribute dependency instructor → course",
  );
  for (const table of normalizationTables(4))
    assert.equal(
      inspectNormalForms(table.columns).bcnf,
      true,
      `${table.name} must satisfy BCNF`,
    );
  for (const stage of [1, 2, 3, 4])
    for (const table of normalizationTables(stage))
      assert.ok(
        inspectNormalForms(table.columns).keys.includes(
          [...table.keys].sort().join(","),
        ),
        `${table.name} displays a genuine candidate key`,
      );
});

test("inner join preserves duplicate matches and never matches SQL null keys", () => {
  assert.deepEqual(relationalJoin(left, right, "id", "id", "INNER"), [
    { left: left[0], right: right[0] },
    { left: left[0], right: right[1] },
  ]);
});

test("outer joins retain precisely their unmatched side with explicit null rows", () => {
  assert.deepEqual(relationalJoin(left, right, "id", "id", "LEFT"), [
    { left: left[0], right: right[0] },
    { left: left[0], right: right[1] },
    { left: left[1], right: null },
    { left: left[2], right: null },
  ]);
  assert.deepEqual(relationalJoin(left, right, "id", "id", "RIGHT"), [
    { left: left[0], right: right[0] },
    { left: left[0], right: right[1] },
    { left: null, right: right[2] },
    { left: null, right: right[3] },
  ]);
  assert.equal(relationalJoin(left, right, "id", "id", "FULL").length, 6);
  assert.deepEqual(
    relationalJoin([], right, "id", "id", "FULL"),
    right.map((row) => ({ left: null, right: row })),
  );
});

test("functional dependency closure resolves transitive chains without claiming a non-key is a superkey", () => {
  const dependencies = [
    { from: ["S", "C"], to: ["I", "G"] },
    { from: ["I"], to: ["C"] },
  ];
  assert.deepEqual([...attributeClosure(["S", "I"], dependencies)].sort(), [
    "C",
    "G",
    "I",
    "S",
  ]);
  assert.deepEqual([...attributeClosure(["I"], dependencies)].sort(), [
    "C",
    "I",
  ]);
});

test("normalization creates atomic values and removes partial and transitive duplication", () => {
  assert.equal(normalizationTables(1)[0].rows.length, 6);
  assert.equal(
    normalizationTables(2).find((table) => table.name === "Students")?.rows
      .length,
    3,
  );
  assert.deepEqual(
    normalizationTables(2).find((table) => table.name === "Enrollments")
      ?.columns,
    ["student", "course", "instructor", "grade"],
  );
  assert.deepEqual(
    normalizationTables(2).find((table) => table.name === "Instructors")
      ?.columns,
    ["instructor", "office", "building"],
  );
  assert.deepEqual(inspectNormalForms(["instructor", "office", "building"]), {
    keys: ["instructor"],
    second: true,
    third: false,
    bcnf: false,
  });
  assert.deepEqual(
    normalizationTables(3).find((table) => table.name === "Enrollments")
      ?.columns,
    ["student", "course", "instructor", "grade"],
  );
  assert.deepEqual(
    normalizationTables(3).find((table) => table.name === "Instructors")
      ?.columns,
    ["instructor", "office"],
  );
  assert.deepEqual(
    normalizationTables(3).find((table) => table.name === "Offices")?.columns,
    ["office", "building"],
  );
  assert.deepEqual(
    normalizationTables(4).find((table) => table.name === "Enrollments")
      ?.columns,
    ["student", "instructor", "grade"],
  );
});

test("each decomposition reconstructs every original atomic enrollment without spurious rows", () => {
  const expected = [
    ["S1", "Ada", "DBMS", "I1", "B201", "East", "A"],
    ["S1", "Ada", "Networks", "I2", "B202", "East", "B"],
    ["S2", "Lin", "DBMS", "I1", "B201", "East", "B"],
    ["S2", "Lin", "Networks", "I3", "B203", "West", "A"],
    ["S3", "Mira", "DBMS", "I1", "B201", "East", "A"],
    ["S3", "Mira", "Networks", "I2", "B202", "East", "A"],
  ];
  for (const stage of [1, 2, 3, 4])
    assert.deepEqual(reconstructEnrollment(stage), expected);
});
