import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  Trash2,
  FileJson,
  CheckCircle2,
  CloudOff,
  ArrowUpRight,
  MonitorDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Panel, Badge, Dialog } from "../components/ui";
import {
  useStudy,
  validateProgress,
  downloadBackup,
  chapterStats,
  type Progress,
} from "../lib/progress";
import "../data.css";
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
let installPrompt: InstallPrompt | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e as InstallPrompt;
});
export default function Data() {
  const progress = useStudy((s) => s.progress),
    saving = useStudy((s) => s.saving),
    setSaving = useStudy((s) => s.setSaving),
    replace = useStudy((s) => s.replace),
    reset = useStudy((s) => s.reset);
  const [pending, setPending] = useState<Progress | null>(null),
    [resetOpen, setResetOpen] = useState(false),
    [word, setWord] = useState(""),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false),
    [ready, setReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => setReady(true));
  }, []);
  async function preview(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2 * 1024 * 1024)
        throw Error(
          "This file is too large. Choose a DBMS JSON backup smaller than 2 MB.",
        );
      const p = validateProgress(JSON.parse(await file.text()));
      setPending(p);
    } catch (e) {
      const message =
        e instanceof SyntaxError
          ? "This file is not valid JSON. Choose a downloaded DBMS progress backup."
          : (e as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    } else
      toast(
        "To install, open your browser menu and choose “Install app” or “Add to Home Screen”.",
      );
  }
  return (
    <div className="data-page">
      <header className="data-heading">
        <Badge>
          <ShieldCheck size={12} />
          Private by default
        </Badge>
        <h1>
          Your desk.
          <br />
          Your data.
        </h1>
        <p>
          Your progress stays in this browser. Choose what to keep, take a
          backup with you, and come back on your terms.
        </p>
      </header>
      <div className="data-layout">
        <div className="stack">
          <Panel className="storage-panel">
            <div className="data-panel-icon">
              <HardDrive size={22} />
            </div>
            <div className="row between">
              <div>
                <h2>Progress saving</h2>
                <p className="small-copy">
                  {saving ? "On · saved on this device" : "Off, session only"}
                </p>
              </div>
              <button
                role="switch"
                aria-label="Save progress in this browser"
                aria-checked={saving}
                className={`large-switch ${saving ? "on" : ""}`}
                onClick={() => setSaving(!saving)}
              >
                <span />
              </button>
            </div>
            <p>
              When on, your checked tasks, notes, quiz answers, practice counts,
              activity, achievements and flashcards are saved locally. When off,
              they last for this session. Turning saving off removes the browser
              copy and keeps your current session.
            </p>
            <div className="storage-detail">
              <ShieldCheck size={16} />
              <span>
                No progress is sent to a server. Your theme preference is saved
                separately.
              </span>
            </div>
          </Panel>
          <Panel>
            <div className="row between">
              <div>
                <h2>Keep a copy.</h2>
                <p className="small-copy">Download progress backup</p>
              </div>
              <FileJson size={24} color="var(--accent)" />
            </div>
            <p className="data-body">
              A small JSON file containing your study progress. Keep it
              somewhere safe and restore it here later. Old Study Desk backups
              still work.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                downloadBackup();
                toast.success("Progress backup downloaded.");
              }}
            >
              <Download />
              Download progress backup
            </Button>
          </Panel>
          <Panel className="restore-panel">
            <h2>Pick up on another day.</h2>
            <p className="small-copy">Restore backup</p>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              id="backup-file"
              aria-label="Progress backup JSON file"
              className="sr-only"
              onChange={(e) => preview(e.target.files?.[0])}
            />
            <button
              className={`drop-zone ${dragging ? "dragging" : ""}`}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                preview(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={26} />
              <strong>Drop your backup here</strong>
              <span>or click to choose a JSON file · up to 2 MB</span>
            </button>
            <p className="small-copy">
              You’ll see a preview before anything changes. Restoring replaces
              the current session progress after you confirm.
            </p>
            {error && (
              <p role="alert" className="import-error">
                {error}
              </p>
            )}
          </Panel>
          <Panel className="reset-panel">
            <div>
              <h2>A fresh start.</h2>
              <p>
                Clear all checklist actions, notes, quizzes, review flags,
                practice counts, activity and flashcards. Download a backup
                first if you may want them later.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                setWord("");
                setResetOpen(true);
              }}
            >
              <Trash2 />
              Reset progress
            </Button>
          </Panel>
        </div>
        <aside className="data-aside">
          <Panel className="offline-panel">
            <CloudOff size={24} color="var(--cyan)" />
            <h3>Learning, wherever.</h3>
            <p>
              Lessons, quizzes and labs work offline after this app has finished
              downloading. External resource links need internet.
            </p>
            <div className="status-line">
              <span className="status-dot" />
              {ready
                ? "Offline app installed in this browser"
                : "Preparing offline files…"}
            </div>
            <Button onClick={install}>
              <MonitorDown />
              Install Study Desk
            </Button>
          </Panel>
          <div className="data-note">
            <ShieldCheck size={20} />
            <p>
              Browser settings, private browsing, or clearing site data can
              remove saved progress. A downloaded backup is your portable copy.
            </p>
          </div>
          <a
            className="data-source"
            href="https://github.com/nishantx080807-dev/dbms-study-desk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore the source <ArrowUpRight size={14} />
          </a>
        </aside>
      </div>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Restore this progress backup?"
        description="Review the backup before replacing your current study progress. Your saving preference will stay as it is."
      >
        {pending && (
          <>
            <div className="backup-preview">
              <CheckCircle2 size={22} color="var(--success)" />
              <div>
                <strong>Valid DBMS progress backup</strong>
                <p>
                  {chapterStats(pending, 0).done} checked actions ·{" "}
                  {Object.values(pending.notes).filter(Boolean).length} chapter
                  notes · {Object.keys(pending.quizzes).length} quiz answers
                </p>
              </div>
            </div>
            <p className="small-copy">
              Your current session has {chapterStats(progress, 0).done} checked
              actions. This will replace it.
            </p>
            <div className="dialog-actions">
              <Button onClick={() => setPending(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  replace(pending);
                  setPending(null);
                  toast.success("Progress backup restored.");
                }}
              >
                Confirm restore
              </Button>
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all study progress?"
        description="This clears your progress in the current session and its saved browser copy. A downloaded backup is the only way to restore it."
      >
        <label className="reset-label" htmlFor="reset-confirm">
          Type <strong>RESET</strong> to confirm.
        </label>
        <input
          id="reset-confirm"
          className="field"
          value={word}
          autoComplete="off"
          onChange={(e) => setWord(e.target.value)}
          placeholder="RESET"
        />
        <div className="dialog-actions">
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={word !== "RESET"}
            onClick={() => {
              reset();
              setResetOpen(false);
              toast.success("Study progress reset.");
            }}
          >
            Confirm reset
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
