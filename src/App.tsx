import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Shell from "./components/Shell";
import Home from "./pages/Home";
const Lesson = lazy(() => import("./pages/Lesson"));
const Progress = lazy(() => import("./pages/Progress"));
const Data = lazy(() => import("./pages/Data"));
const legacy = location.hash.match(/^#chapter-(\d+)$/);
if (legacy) location.hash = `/chapter/${legacy[1]}/checklist`;
export default function App() {
  return (
    <HashRouter>
      <Shell>
        <Suspense
          fallback={
            <div className="skeleton" aria-label="Loading study desk" />
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chapter/:id/:tab?" element={<Lesson />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/data" element={<Data />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Shell>
    </HashRouter>
  );
}
