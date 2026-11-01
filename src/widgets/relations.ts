export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
export type JoinedRow<L, R> = { left: L | null; right: R | null };
export function relationalJoin<L, R>(
  left: L[],
  right: R[],
  leftKey: keyof L,
  rightKey: keyof R,
  type: JoinType,
): JoinedRow<L, R>[] {
  const rows: JoinedRow<L, R>[] = [];
  const matchedRight = new Set<number>();
  for (const row of left) {
    let matched = false;
    right.forEach((other, index) => {
      if (
        row[leftKey] != null &&
        other[rightKey] != null &&
        Object.is(row[leftKey], other[rightKey])
      ) {
        rows.push({ left: row, right: other });
        matchedRight.add(index);
        matched = true;
      }
    });
    if (!matched && (type === "LEFT" || type === "FULL"))
      rows.push({ left: row, right: null });
  }
  if (type === "RIGHT" || type === "FULL")
    right.forEach((row, index) => {
      if (!matchedRight.has(index)) rows.push({ left: null, right: row });
    });
  return rows;
}
export type Dependency = { from: string[]; to: string[] };
export function attributeClosure(
  attributes: string[],
  dependencies: Dependency[],
): Set<string> {
  const result = new Set(attributes);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dependency of dependencies)
      if (dependency.from.every((attribute) => result.has(attribute))) {
        for (const attribute of dependency.to)
          if (!result.has(attribute)) {
            result.add(attribute);
            changed = true;
          }
      }
  }
  return result;
}
export type RelationTable = {
  name: string;
  columns: string[];
  rows: string[][];
  keys: string[];
};
const source = [
  {
    student: "S1",
    name: "Ada",
    courses: [
      {
        course: "DBMS",
        instructor: "I1",
        office: "B201",
        building: "East",
        grade: "A",
      },
      {
        course: "Networks",
        instructor: "I2",
        office: "B202",
        building: "East",
        grade: "B",
      },
    ],
  },
  {
    student: "S2",
    name: "Lin",
    courses: [
      {
        course: "DBMS",
        instructor: "I1",
        office: "B201",
        building: "East",
        grade: "B",
      },
      {
        course: "Networks",
        instructor: "I3",
        office: "B203",
        building: "West",
        grade: "A",
      },
    ],
  },
  {
    student: "S3",
    name: "Mira",
    courses: [
      {
        course: "DBMS",
        instructor: "I1",
        office: "B201",
        building: "East",
        grade: "A",
      },
      {
        course: "Networks",
        instructor: "I2",
        office: "B202",
        building: "East",
        grade: "A",
      },
    ],
  },
];
const atomic = source.flatMap(({ student, name, courses }) =>
  courses.map((course) => ({ student, name, ...course })),
);
const allColumns = [
  "student",
  "name",
  "course",
  "instructor",
  "office",
  "building",
  "grade",
];
function project(
  name: string,
  columns: (keyof (typeof atomic)[number])[],
  keys: string[],
): RelationTable {
  const rows = atomic.map((row) => columns.map((column) => row[column]));
  return {
    name,
    columns,
    rows: rows.filter(
      (row, index) =>
        rows.findIndex(
          (other) => JSON.stringify(other) === JSON.stringify(row),
        ) === index,
    ),
    keys,
  };
}
export function normalizationTables(stage: number): RelationTable[] {
  if (stage === 0)
    return [
      {
        name: "Registration sheet",
        columns: ["student", "name", "courses (repeating group)"],
        keys: ["student"],
        rows: source.map((row) => [
          row.student,
          row.name,
          row.courses
            .map(
              (course) =>
                `${course.course} / ${course.instructor} / ${course.office} / ${course.building} / ${course.grade}`,
            )
            .join("; "),
        ]),
      },
    ];
  if (stage === 1)
    return [
      project(
        "Enrollments",
        [
          "student",
          "name",
          "course",
          "instructor",
          "office",
          "building",
          "grade",
        ],
        ["student", "course"],
      ),
    ];
  const students = project("Students", ["student", "name"], ["student"]);
  const enrollments = project(
    "Enrollments",
    ["student", "course", "instructor", "grade"],
    ["student", "course"],
  );
  if (stage === 2)
    return [
      students,
      enrollments,
      project(
        "Instructors",
        ["instructor", "office", "building"],
        ["instructor"],
      ),
    ];
  const offices = project("Offices", ["office", "building"], ["office"]);
  if (stage === 3)
    return [
      students,
      enrollments,
      project("Instructors", ["instructor", "office"], ["instructor"]),
      offices,
    ];
  return [
    students,
    project(
      "Enrollments",
      ["student", "instructor", "grade"],
      ["student", "instructor"],
    ),
    project("Teaching", ["instructor", "course", "office"], ["instructor"]),
    offices,
  ];
}
export function reconstructEnrollment(stage: number): string[][] {
  const tables = normalizationTables(stage);
  let rows: Record<string, string>[] = tables[0].rows.map((row) =>
    Object.fromEntries(
      tables[0].columns.map((column, index) => [column, row[index]]),
    ),
  );
  for (const table of tables.slice(1)) {
    const otherRows = table.rows.map((row) =>
      Object.fromEntries(
        table.columns.map((column, index) => [column, row[index]]),
      ),
    );
    rows = rows.flatMap((row) =>
      otherRows
        .filter((other) =>
          Object.keys(row)
            .filter((key) => key in other)
            .every((key) => row[key] === other[key]),
        )
        .map((other) => ({ ...row, ...other })),
    );
  }
  return rows
    .map((row) => allColumns.map((column) => row[column]))
    .sort((a, b) => a.join("|").localeCompare(b.join("|")));
}
