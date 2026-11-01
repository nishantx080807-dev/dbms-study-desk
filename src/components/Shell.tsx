import {
  useEffect,
  useState,
  useRef,
  Suspense,
  lazy,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { flushSync } from "react-dom";
import { Drawer } from "vaul";
import { Toaster, toast } from "sonner";
import {
  Database,
  Home,
  ChartNoAxesCombined,
  HardDrive,
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  ChevronRight,
  Command,
  WifiOff,
  HelpCircle,
  ArrowUpRight,
  X,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { chapters, chapterStats, useStudy } from "../lib/progress";
import { useTheme } from "../lib/theme";
const CommandMenu = lazy(() => import("./CommandMenu"));
import { Button, Dialog, Ring } from "./ui";
import "../shell.css";
export default function Shell({ children }: { children: ReactNode }) {
  const nav = useNavigate(),
    location = useLocation(),
    reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false),
    [drawer, setDrawer] = useState(false),
    [command, setCommand] = useState(false),
    [help, setHelp] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine);
  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
  }, []);
  const { theme, toggle } = useTheme();
  const progress = useStudy((s) => s.progress),
    saving = useStudy((s) => s.saving),
    setSaving = useStudy((s) => s.setSaving),
    error = useStudy((s) => s.error);
  const stats = chapterStats(progress, 0);
  const id = Number(location.pathname.match(/chapter\/(\d+)/)?.[1]);
  const current = chapters.find((c) => c.id === id);
  function go(path: string) {
    setDrawer(false);
    if (document.startViewTransition && !reduced)
      document.startViewTransition(() => flushSync(() => nav(path)));
    else nav(path);
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = current
      ? `${current.title} — DBMS Study Desk`
      : "DBMS Study Desk — Nishant’s interactive handbook";
  }, [location.pathname, current]);
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (error) {
      toast.error(error);
      useStudy.getState().clearError();
    }
  }, [error]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
        return;
      }
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat)
        return;
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,button,a,summary,[contenteditable=true],.cm-editor,[role=dialog],[role=button],[tabindex="0"],.widget',
        )
      )
        return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp((v) => !v);
      }
      if (e.key === "t") toggle();
      if (e.key === "p") go("/progress");
      if (e.key === "h") go("/");
      if (current && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const next = current.id + (e.key === "ArrowRight" ? 1 : -1);
        if (next >= 1 && next <= 13) {
          e.preventDefault();
          go(`/chapter/${next}/checklist`);
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const navContents = (
    <>
      <div className="sidebar-brand">
        <Database size={24} />
        <div>
          <strong>
            Study desk<span className="brand-dot">.</span>
          </strong>
          <small>Nirma CSE / DBMS</small>
        </div>
      </div>
      <button className="sidebar-search" onClick={() => setCommand(true)}>
        <Search size={16} />
        <span>Search handbook</span>
        <kbd>⌘ K</kbd>
      </button>
      <nav className="primary-nav" aria-label="Workspace">
        <NavLink to="/" end>
          <Home size={17} />
          <span>Overview</span>
        </NavLink>
        <NavLink to="/progress">
          <ChartNoAxesCombined size={17} />
          <span>My progress</span>
        </NavLink>
      </nav>
      <div className="sidebar-chapters-label">
        <span>Your learning path</span>
        <span>13</span>
      </div>
      <nav className="chapter-nav" aria-label="Chapters">
        {chapters.map((c) => {
          const s = chapterStats(progress, c.id);
          return (
            <button
              key={c.id}
              className={id === c.id ? "active" : ""}
              onClick={() => go(`/chapter/${c.id}/checklist`)}
              aria-current={id === c.id ? "page" : undefined}
              title={c.title}
            >
              <span className="chapter-index">
                {String(c.id).padStart(2, "0")}
              </span>
              <span className="chapter-name">{c.title}</span>
              <Ring
                value={s.percent}
                size={23}
                label={`${c.title}: ${s.percent}% complete`}
              />
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-data" onClick={() => go("/data")}>
          <HardDrive size={16} />
          <span>Data & backups</span>
          <ChevronRight size={14} />
        </button>
        <div className="creator">
          <span className="avatar">N</span>
          <div>
            <strong>Created by Nishant</strong>
            <a
              href="https://github.com/nishantx080807-dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <ArrowUpRight size={12} />
            </a>
          </div>
          <button
            className="icon-button ghost"
            onClick={() => setHelp(true)}
            aria-label="Keyboard shortcuts"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>
    </>
  );
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to study content
      </a>
      <aside className="desktop-sidebar" aria-label="Handbook navigation">
        {navContents}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button ghost collapse-button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {current
                ? `Chapter ${String(id).padStart(2, "0")}`
                : location.pathname === "/progress"
                  ? "My progress"
                  : location.pathname === "/data"
                    ? "Data & privacy"
                    : "Overview"}
            </strong>
          </div>
          <div className="topbar-actions">
            {offline && (
              <span className="offline-chip">
                <WifiOff size={14} />
                Offline
              </span>
            )}
            <button
              className="save-toggle"
              role="switch"
              aria-checked={saving}
              aria-label="Save progress in this browser"
              onClick={() => {
                setSaving(!saving);
                toast(
                  saving
                    ? "Browser saving off. Your session progress is still here."
                    : "Progress saving enabled on this device.",
                );
              }}
            >
              <span className={`switch-track ${saving ? "on" : ""}`}>
                <span />
              </span>
              <span>
                {saving ? "Saving on" : "Session only"}
                <small>
                  {saving ? "Saved on this device" : "Progress saving off"}
                </small>
              </span>
            </button>
            <span className="completion-chip">
              <Ring value={stats.percent} size={24} />
              {stats.percent}%
            </span>
            <button
              className="icon-button ghost"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button ghost mobile-search"
              onClick={() => setCommand(true)}
              aria-label="Search handbook"
            >
              <Search size={18} />
            </button>
          </div>
        </header>
        <motion.main
          id="main"
          tabIndex={-1}
          className="main-content"
          key={location.pathname}
          initial={
            reduced || firstRender.current ? false : { opacity: 0, y: 5 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {children}
        </motion.main>
        <footer className="site-footer">
          <span>
            <ShieldCheck size={14} /> Your progress belongs to you.
          </span>
          <span>
            Nirma B.Tech CSE ·{" "}
            <a
              href="https://github.com/nishantx080807-dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Created by Nishant
            </a>
          </span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile workspace">
        <NavLink to="/" end>
          <Home size={20} />
          Overview
        </NavLink>
        <button
          onClick={() => setDrawer(true)}
          className={current ? "active" : ""}
        >
          <BookOpen size={20} />
          Chapters
        </button>
        <NavLink to="/progress">
          <ChartNoAxesCombined size={20} />
          Progress
        </NavLink>
        <NavLink to="/data">
          <HardDrive size={20} />
          Data
        </NavLink>
      </nav>
      <Drawer.Root open={drawer} onOpenChange={setDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="dialog-overlay" />
          <Drawer.Content className="chapter-drawer">
            <div className="drawer-handle" />
            <Drawer.Title className="sr-only">Choose a chapter</Drawer.Title>
            <Drawer.Description className="sr-only">
              All 13 handbook chapters and your completion.
            </Drawer.Description>
            <Drawer.Close
              className="icon-button ghost drawer-close"
              aria-label="Close chapters"
            >
              <X size={18} />
            </Drawer.Close>
            {navContents}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      {command && (
        <Suspense fallback={null}>
          <CommandMenu
            open={command}
            setOpen={setCommand}
            go={go}
            toggleTheme={toggle}
          />
        </Suspense>
      )}
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="A little faster, with keys"
        description="Shortcuts are disabled while you type in a field."
      >
        <dl className="shortcut-list">
          {[
            ["Ctrl / ⌘ K", "Search anything"],
            ["?", "Show this help"],
            ["H", "Go to overview"],
            ["P", "Open my progress"],
            ["T", "Toggle theme"],
            ["← / →", "Previous / next chapter"],
            ["1–4, Enter", "Answer and advance a quiz"],
          ].map(([key, label]) => (
            <div key={key}>
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <Button onClick={() => setHelp(false)}>Got it</Button>
      </Dialog>
      <Toaster
        theme={theme === "dark" ? "dark" : "light"}
        richColors
        closeButton
        position="bottom-right"
      />
    </div>
  );
}
