import { useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import "@xyflow/react/dist/style.css";
import "./widgets.css";

type EntityNode = Node<
  { title: string; columns: string[]; highlighted?: boolean },
  "entity"
>;
function Entity({ data }: NodeProps<EntityNode>) {
  return (
    <div className={`er-entity ${data.highlighted ? "is-highlighted" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Left} id="source-left" />
      <strong>{data.title}</strong>
      {data.columns.map((column) => (
        <div className="mono" key={column}>
          {column}
        </div>
      ))}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Right} id="target-right" />
    </div>
  );
}
const nodeTypes = { entity: Entity };
const initialNodes: EntityNode[] = [
  {
    id: "students",
    type: "entity",
    position: { x: 10, y: 40 },
    data: { title: "Students", columns: ["PK student_id", "name", "email"] },
  },
  {
    id: "enrollments",
    type: "entity",
    position: { x: 280, y: 40 },
    data: {
      title: "Enrollments",
      columns: ["PK, FK student_id", "PK, FK course_id", "grade"],
    },
  },
  {
    id: "courses",
    type: "entity",
    position: { x: 550, y: 40 },
    data: {
      title: "Courses",
      columns: ["PK course_id", "FK instructor_id", "title"],
    },
  },
  {
    id: "instructors",
    type: "entity",
    position: { x: 280, y: 280 },
    data: {
      title: "Instructors",
      columns: ["PK instructor_id", "name", "office"],
    },
  },
];
const relationships = [
  {
    id: "student-enrollment",
    source: "students",
    target: "enrollments",
    label: "1 → many · enrolls",
    detail:
      "One student can have zero or many enrollments. Every enrollment belongs to exactly one student.",
  },
  {
    id: "course-enrollment",
    source: "courses",
    target: "enrollments",
    sourceHandle: "source-left",
    targetHandle: "target-right",
    label: "1 → many · contains",
    detail:
      "One course can have zero or many enrollments. The enrollment junction resolves the student–course many-to-many relationship.",
  },
  {
    id: "instructor-course",
    source: "instructors",
    target: "courses",
    label: "1 → many · teaches",
    detail:
      "One instructor can teach zero or many courses. Each course references exactly one instructor.",
  },
];
export default function ErDiagram() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<EntityNode>(initialNodes);
  const [selected, setSelected] = useState("students");
  const [active, setActive] = useState<string | null>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<EntityNode> | null>(null);
  const reducedMotion = useReducedMotion();
  const relationship = relationships.find((edge) => edge.id === active);
  const edges = relationships.map((edge) => ({
    ...edge,
    animated: active === edge.id && !reducedMotion,
    style: {
      stroke: active === edge.id ? "var(--cyan)" : "var(--accent)",
      strokeWidth: active === edge.id ? 3 : 1.5,
    },
    labelStyle: { fill: "var(--foreground)", fontSize: 11 },
    labelBgStyle: { fill: "var(--surface)", fillOpacity: 1 },
    labelBgPadding: [8, 5] as [number, number],
  }));
  const move = (x: number, y: number) =>
    setNodes((current) =>
      current.map((node) =>
        node.id === selected
          ? {
              ...node,
              position: { x: node.position.x + x, y: node.position.y + y },
            }
          : node,
      ),
    );
  return (
    <section
      className="widget"
      aria-label="Interactive entity relationship diagram"
    >
      <div className="widget-header">
        <div>
          <span className="eyebrow">RELATIONAL MODEL</span>
          <h2>Trace the relationships.</h2>
          <p className="muted">
            Drag an entity. Follow a foreign key. See how the schema connects.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setNodes(
              initialNodes.map((node) => ({
                ...node,
                position: { ...node.position },
              })),
            );
            setActive(null);
            setSelected("students");
            requestAnimationFrame(() => {
              void flow?.fitView({
                padding: 0.15,
                duration: reducedMotion ? 0 : 200,
              });
            });
          }}
        >
          <RotateCcw size={16} />
          Reset diagram
        </button>
      </div>
      <div className="er-canvas">
        <ReactFlow
          nodes={nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              highlighted:
                !!relationship &&
                (relationship.source === node.id ||
                  relationship.target === node.id),
            },
          }))}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onInit={setFlow}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.6}
          nodesConnectable={false}
          onNodeClick={(_, node) => setSelected(node.id)}
          onNodeMouseEnter={(_, node) =>
            setActive(
              relationships.find(
                (edge) => edge.source === node.id || edge.target === node.id,
              )?.id ?? null,
            )
          }
          onNodeMouseLeave={() => setActive(null)}
          onEdgeMouseEnter={(_, edge) => setActive(edge.id)}
          onEdgeMouseLeave={() => setActive(null)}
          onEdgeClick={(_, edge) => setActive(edge.id)}
          proOptions={{ hideAttribution: true }}
          aria-label="University schema. Select a node and use arrow keys to move it."
        >
          <Background color="var(--border)" gap={22} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="er-relationship-list" aria-label="Explore relationships">
        {relationships.map((edge) => (
          <button
            className={`button ${active === edge.id ? "is-active" : ""}`}
            key={edge.id}
            aria-pressed={active === edge.id}
            onFocus={() => setActive(edge.id)}
            onClick={() => setActive(edge.id)}
          >
            {edge.label}
          </button>
        ))}
      </div>
      <p className="diagram-explanation" aria-live="polite">
        {relationship?.detail ??
          "Students ↔ Courses is many-to-many, resolved through Enrollments. PK = primary key. FK = foreign key. Select a relationship to explore its cardinality."}
      </p>
      <div className="widget-toolbar">
        <label className="field">
          Move entity
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {initialNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.title}
              </option>
            ))}
          </select>
        </label>
        <div className="nudge-controls" aria-label="Move selected entity">
          <button
            className="button"
            aria-label="Move entity left"
            onClick={() => move(-25, 0)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="button"
            aria-label="Move entity up"
            onClick={() => move(0, -25)}
          >
            <ArrowUp size={18} />
          </button>
          <button
            className="button"
            aria-label="Move entity down"
            onClick={() => move(0, 25)}
          >
            <ArrowDown size={18} />
          </button>
          <button
            className="button"
            aria-label="Move entity right"
            onClick={() => move(25, 0)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <p className="muted">
          Keyboard: Tab to an entity, then use the arrow keys.
        </p>
      </div>
    </section>
  );
}
