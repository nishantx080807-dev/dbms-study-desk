export function exampleQuery(example: string) {
  return (
    example.match(/\bSELECT\b[\s\S]*?;/i)?.[0] ??
    example.slice(0, example.indexOf(";") + 1)
  );
}
