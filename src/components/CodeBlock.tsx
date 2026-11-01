import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui";
let highlighterPromise:
  Promise<import("shiki/core").HighlighterCore> | undefined;
async function highlight(code: string, lang: string) {
  highlighterPromise ??= Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
    import("shiki/themes/github-dark.mjs"),
    import("shiki/themes/github-light.mjs"),
    import("shiki/langs/sql.mjs"),
    import("shiki/langs/javascript.mjs"),
    import("shiki/langs/json.mjs"),
  ]).then(([core, engine, dark, light, sql, js, json]) =>
    core.createHighlighterCore({
      themes: [dark.default, light.default],
      langs: [sql.default, js.default, json.default],
      engine: engine.createJavaScriptRegexEngine(),
    }),
  );
  const h = await highlighterPromise;
  return h.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
export default function CodeBlock({
  code,
  language = "text",
  highlightLines = [],
}: {
  code: string;
  language?: string;
  highlightLines?: number[];
}) {
  const [html, setHtml] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    highlight(code, language).then((result) => {
      if (active) setHtml(result);
    });
    return () => {
      active = false;
    };
  }, [code, language]);
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>
          {language === "text"
            ? "Worked example"
            : language === "sql"
              ? "SQL / study example"
              : language}
        </span>
        <Button
          variant="ghost"
          aria-label="Copy example"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {html ? (
        <div
          className="highlighted-code"
          data-lines={highlightLines.join(",")}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
