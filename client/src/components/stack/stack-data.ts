export type StackLayerId = "languages" | "backend" | "frontend" | "data" | "tooling";

export type StackFilterId = "all" | StackLayerId;

export interface StackTool {
  name: string;
}

export interface StackLayer {
  id: StackLayerId;
  title: string;
  summary: string;
  tools: StackTool[];
  layout: "wide" | "half" | "compact";
}

export const STACK_LAYERS: StackLayer[] = [
  {
    id: "languages",
    title: "Languages",
    summary: "Where types and runtimes meet the problem.",
    layout: "wide",
    tools: [
      { name: "Rust" },
      { name: "TypeScript" },
      { name: "Java" },
      { name: "Python" },
      { name: "C#" },
      { name: "VB.NET" },
      { name: "JavaScript" },
      { name: "SQL" },
    ],
  },
  {
    id: "backend",
    title: "Backend",
    summary: "APIs, services, and the glue between systems.",
    layout: "half",
    tools: [
      { name: "Spring Boot" },
      { name: ".NET" },
      { name: "Node.js" },
      { name: "Resilience4j" },
      { name: "Kafka" },
    ],
  },
  {
    id: "frontend",
    title: "Frontend",
    summary: "Components, bundlers, and UI that stays fast.",
    layout: "half",
    tools: [
      { name: "Lit 3" },
      { name: "Vue 3" },
      { name: "Web Components" },
      { name: "Vite" },
      { name: "Tailwind" },
    ],
  },
  {
    id: "data",
    title: "Data",
    summary: "Storage shapes that match the query, not the hype.",
    layout: "wide",
    tools: [
      { name: "PostgreSQL" },
      { name: "Redis" },
      { name: "Neo4j" },
      { name: "SQL Server" },
    ],
  },
  {
    id: "tooling",
    title: "Tooling",
    summary: "Editor and version control. Nothing exotic.",
    layout: "compact",
    tools: [{ name: "Git" }, { name: "VS Code" }],
  },
];

export const STACK_FILTERS: { id: StackFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "languages", label: "Languages" },
  { id: "backend", label: "Backend" },
  { id: "frontend", label: "Frontend" },
  { id: "data", label: "Data" },
  { id: "tooling", label: "Tools" },
];

export const STACK_TOOL_COUNT = STACK_LAYERS.reduce((sum, layer) => sum + layer.tools.length, 0);
