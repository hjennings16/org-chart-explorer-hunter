import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, X, Linkedin, ExternalLink, Star, Menu, GripVertical } from "lucide-react";

type Status = "star" | "champion" | "influencer" | undefined;

type Person = {
  id: string;
  name: string;
  title: string;
  dept: string;
  initials: string;
  status?: Status;
  engaged?: boolean;
  email?: string;
  lastActivity?: string;
  nextStep?: string;
  linkedin?: string;
  reports?: number;
  placeholder?: boolean;
  children?: Person[];
};

const STATUS_OPTIONS: { value: Status; label: string; symbol: React.ReactNode }[] = [
  { value: "star",       label: "Decision Maker", symbol: <Star size={11} fill="currentColor" /> },
  { value: "champion",   label: "Champion",            symbol: <span style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1 }}>C</span> },
  { value: "influencer", label: "Influencer",          symbol: <span style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1 }}>I</span> },
];

type ChartRecord = {
  id: string;
  company: string;
  website: string;
  dateRange: string;
  orgData: Person;
  createdAt: string;
};

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  "Sales Leader":          { bg: "#0ea5e9", text: "#ffffff" },
  "Solutions Architect":   { bg: "#818cf8", text: "#ffffff" },
  "Account Team":          { bg: "#34d399", text: "#052e16" },
  Specialist:              { bg: "#fbbf24", text: "#1c1100" },
  "Partner Sales Manager": { bg: "#f472b6", text: "#ffffff" },
  Vertical: { bg: "#a78bfa", text: "#ffffff" },
};

const DEFAULT_ORG: Person = {
  id: "ceo",
  name: "Sarah Chen",
  title: "Chief Executive Officer",
  dept: "Sales Leader",
  initials: "SC",
  reports: 340,
  children: [
    { id: "cto", name: "Marcus Webb",   title: "Head of R&D",              dept: "Solutions Architect",       initials: "MW", reports: 140 },
    { id: "cro", name: "Carlos Rivera", title: "Chief Revenue Officer",    dept: "Account Team",   initials: "CR", reports: 114 },
    { id: "cmo", name: "Oliver Grant",  title: "Chief Marketing Officer",  dept: "Specialist", initials: "OG", reports: 86 },
  ],
};

function updateNode(tree: Person, id: string, patch: Partial<Person>): Person {
  if (tree.id === id) return { ...tree, ...patch };
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => updateNode(c, id, patch)) };
}

function addChild(tree: Person, parentId: string, child: Person): Person {
  if (tree.id === parentId) return { ...tree, children: [...(tree.children ?? []), child] };
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map((c) => addChild(c, parentId, child)) };
}

function findNode(tree: Person, id: string): Person | undefined {
  if (tree.id === id) return tree;
  for (const child of tree.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
}

type DropPos = "before" | "after" | "child";

function isAncestorOf(tree: Person, ancestorId: string, nodeId: string): boolean {
  const anc = findNode(tree, ancestorId);
  return !!anc && !!findNode(anc, nodeId);
}

function extractNode(tree: Person, id: string): { tree: Person; extracted: Person | null } {
  if (!tree.children) return { tree, extracted: null };
  const idx = tree.children.findIndex((c) => c.id === id);
  if (idx !== -1) {
    return {
      tree: { ...tree, children: tree.children.filter((_, i) => i !== idx) },
      extracted: tree.children[idx],
    };
  }
  let extracted: Person | null = null;
  const newChildren = tree.children.map((child) => {
    if (extracted) return child;
    const r = extractNode(child, id);
    if (r.extracted) { extracted = r.extracted; return r.tree; }
    return child;
  });
  return { tree: { ...tree, children: newChildren }, extracted };
}

function insertNode(tree: Person, node: Person, targetId: string, pos: DropPos): Person {
  if (pos === "child" && tree.id === targetId)
    return { ...tree, children: [...(tree.children ?? []), node] };
  if (!tree.children) return tree;
  const idx = tree.children.findIndex((c) => c.id === targetId);
  if (idx !== -1) {
    if (pos === "before") return { ...tree, children: [...tree.children.slice(0, idx), node, ...tree.children.slice(idx)] };
    if (pos === "after")  return { ...tree, children: [...tree.children.slice(0, idx + 1), node, ...tree.children.slice(idx + 1)] };
  }
  return { ...tree, children: tree.children.map((c) => insertNode(c, node, targetId, pos)) };
}

function moveNode(tree: Person, nodeId: string, targetId: string, pos: DropPos): Person {
  const { tree: without, extracted } = extractNode(tree, nodeId);
  if (!extracted) return tree;
  return insertNode(without, extracted, targetId, pos);
}

function removeNode(tree: Person, id: string): Person {
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children
      .filter((c) => c.id !== id)
      .map((c) => removeNode(c, id)),
  };
}

function businessDaysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const end = new Date();
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function toInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}


const DEPARTMENTS = ["Sales Leader", "Solutions Architect", "Account Team", "Specialist", "Partner Sales Manager", "Vertical"] as const;
// ── Edit Drawer ────────────────────────────────────────────────────────────────

function EditDrawer({
  node,
  onSave,
  onDelete,
  onClose,
}: {
  node: Person;
  onSave: (id: string, patch: Partial<Person>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(node.name);
  const [title, setTitle] = useState(node.title);
  const [dept, setDept] = useState(node.dept);
  const [email, setEmail] = useState(node.email ?? "");
  const [lastActivity, setLastActivity] = useState(node.lastActivity ?? "");
  const [nextStep, setNextStep] = useState(node.nextStep ?? "");
  const [linkedin, setLinkedin] = useState(node.linkedin ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
const color = DEPT_COLORS[dept] ?? DEPT_COLORS["Sales Leader"];
  useEffect(() => {
    setName(node.name);
    setTitle(node.title);
    setDept(node.dept);
    setEmail(node.email ?? "");
    setLastActivity(node.lastActivity ?? "");
    setNextStep(node.nextStep ?? "");
    setLinkedin(node.linkedin ?? "");
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [node.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSave() {
    const patch: Partial<Person> = { name: name.trim(), title: title.trim(), dept };
    patch.email = email.trim() || undefined;
    patch.lastActivity = lastActivity || undefined;
    patch.nextStep = nextStep.trim() || undefined;
    if (lastActivity) patch.engaged = true;
    if (!lastActivity) patch.engaged = false;
    const li = linkedin.trim();
    patch.linkedin = li || undefined;
    onSave(node.id, patch);
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#27272a",
    border: "1px solid #3f3f46",
    borderRadius: "6px",
    color: "#fafafa",
    fontSize: "13px",
    padding: "8px 10px",
    fontFamily: "'Geist', sans-serif",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontFamily: "'Geist Mono', monospace",
    color: "#71717a",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "320px",
          backgroundColor: "#18181b",
          borderLeft: "1px solid #3f3f46",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "#27272a" }}
        >
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fafafa", fontFamily: "'Geist', sans-serif" }}>
              Edit member
            </div>
            <div style={{ fontSize: "11px", color: "#52525b", fontFamily: "'Geist Mono', monospace", marginTop: "2px" }}>
              {node.id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#52525b",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fafafa")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview chip */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#27272a" }}>
          <div
            className="flex items-center gap-3 p-3"
            style={{ backgroundColor: "#09090b", borderRadius: "8px", border: "1px solid #27272a" }}
          >
            <div
              className="w-8 h-8 flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ backgroundColor: color.bg, color: color.text, borderRadius: "6px", fontFamily: "'Geist Mono', monospace" }}
            >
              {node.initials}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#fafafa", fontFamily: "'Geist', sans-serif", lineHeight: 1.3 }}>
                {name || <span style={{ color: "#3f3f46" }}>Name</span>}
              </div>
              <div style={{ fontSize: "11px", color: "#71717a", fontFamily: "'Geist', sans-serif", lineHeight: 1.3 }}>
                {title || <span style={{ color: "#3f3f46" }}>Title</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Name</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="Full name"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div>
            <label style={labelStyle}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="Job title"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div>
            <label style={labelStyle}>Department</label>
            <div className="flex flex-col gap-1.5">
              {Object.keys(DEPT_COLORS).map((d) => {
                const c = DEPT_COLORS[d];
                const active = dept === d;
                return (
                  <button key={d} onClick={() => setDept(d)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                      fontFamily: "'Geist', sans-serif", fontSize: "13px", textAlign: "left",
                      backgroundColor: active ? `${c.bg}18` : "transparent",
                      border: active ? `1px solid ${c.bg}55` : "1px solid transparent",
                      color: active ? "#fafafa" : "#71717a",
                      transition: "all 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "#27272a"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <div style={{ width: "8px", height: "8px", borderRadius: "3px", backgroundColor: c.bg, flexShrink: 0 }} />
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="name@company.com"
              type="email"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <div style={{ position: "relative" }}>
              <Linkedin
                size={13}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#52525b",
                  pointerEvents: "none",
                }}
              />
              <input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "30px" }}
                onFocus={(e) => (e.target.style.borderColor = color.bg)}
                onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
                placeholder="https://linkedin.com/in/..."
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Last Activity</label>
            <input
              value={lastActivity}
              onChange={(e) => setLastActivity(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              type="date"
            />
          </div>

          <div>
            <label style={labelStyle}>Next Step</label>
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              style={{ ...inputStyle, resize: "none", lineHeight: "1.5" }}
              rows={4}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="e.g. Schedule follow-up call"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="px-5 py-4 border-t flex gap-2"
          style={{ borderColor: "#27272a" }}
        >
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              backgroundColor: color.bg,
              color: color.text,
              border: "none",
              borderRadius: "6px",
              padding: "8px 0",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "'Geist', sans-serif",
              cursor: "pointer",
            }}
          >
            Save changes
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#27272a",
              color: "#a1a1aa",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "13px",
              fontFamily: "'Geist', sans-serif",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
        <div className="px-5 pb-4">
          <button
            onClick={() => { onDelete(node.id); onClose(); }}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "#ef4444",
              border: "1px solid #3f3f4620",
              borderRadius: "6px",
              padding: "7px 0",
              fontSize: "12px",
              fontFamily: "'Geist', sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "background-color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#ef444418"; e.currentTarget.style.borderColor = "#ef444440"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "#3f3f4620"; }}
          >
            <Trash2 size={12} />
            Delete member
          </button>
        </div>
      </div>
    </>
  );
}

// ── Add Report Drawer ─────────────────────────────────────────────────────────

function AddDrawer({
  parent,
  onAdd,
  onClose,
}: {
  parent: Person;
  onAdd: (parentId: string, child: Person) => void;
  onClose: () => void;
}) {
  const [name, setName]               = useState("");
  const [title, setTitle]             = useState("");
  const [dept, setDept]               = useState(parent.dept === "Executive" ? "R&D" : parent.dept);
  const [email, setEmail]               = useState("");
  const [lastActivity, setLastActivity] = useState("");
  const [nextStep, setNextStep]         = useState("");
  const [linkedin, setLinkedin]         = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const parentColor = DEPT_COLORS[parent.dept] ?? DEPT_COLORS.Executive;

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 50); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const color = DEPT_COLORS[dept] ?? DEPT_COLORS.Executive;
  const initials = toInitials(name) || "?";
  const canSave = name.trim().length > 0 && title.trim().length > 0;

  function handleAdd() {
    if (!canSave) return;
    const child: Person = {
      id: `node-${Date.now()}`,
      name: name.trim(),
      title: title.trim(),
      dept,
      initials: toInitials(name),
      email: email.trim() || undefined,
      lastActivity: lastActivity || undefined,
      nextStep: nextStep.trim() || undefined,
      engaged: lastActivity ? true : undefined,
      linkedin: linkedin.trim() || undefined,
    };
    onAdd(parent.id, child);
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "#27272a", border: "1px solid #3f3f46",
    borderRadius: "6px", color: "#fafafa", fontSize: "13px", padding: "8px 10px",
    fontFamily: "'Geist', sans-serif", outline: "none", transition: "border-color 0.15s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontFamily: "'Geist Mono', monospace",
    color: "#71717a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em",
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col" style={{ width: "320px", backgroundColor: "#18181b", borderLeft: "1px solid #3f3f46", boxShadow: "-8px 0 32px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#27272a" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fafafa", fontFamily: "'Geist', sans-serif" }}>Add direct report</div>
            <div style={{ fontSize: "11px", color: "#52525b", fontFamily: "'Geist Mono', monospace", marginTop: "2px" }}>
              under {parent.name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: "4px", borderRadius: "4px", display: "flex" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fafafa")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}>
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#27272a" }}>
          <div style={{ fontSize: "10px", fontFamily: "'Geist Mono', monospace", color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Preview</div>
          <div className="flex items-center gap-3 p-3" style={{ backgroundColor: "#09090b", borderRadius: "8px", border: "1px solid #27272a" }}>
            <div className="w-8 h-8 flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ backgroundColor: color.bg, color: color.text, borderRadius: "6px", fontFamily: "'Geist Mono', monospace" }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: name ? "#fafafa" : "#3f3f46", fontFamily: "'Geist', sans-serif", lineHeight: 1.3 }}>
                {name || "Full name"}
              </div>
              <div style={{ fontSize: "11px", color: title ? "#71717a" : "#3f3f46", fontFamily: "'Geist', sans-serif", lineHeight: 1.3 }}>
                {title || "Job title"}
              </div>
              <div style={{ marginTop: "6px" }}>
                <span style={{ fontSize: "9px", fontFamily: "'Geist Mono', monospace", backgroundColor: `${color.bg}22`, color: color.bg, borderRadius: "4px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  {dept}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Name</label>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="Full name"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
          </div>

          <div>
            <label style={labelStyle}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="Job title"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
          </div>

          <div>
            <label style={labelStyle}>Department</label>
            <div className="flex flex-col gap-1.5">
              {Object.keys(DEPT_COLORS).map((d) => {
                const c = DEPT_COLORS[d];
                const active = dept === d;
                return (
                  <button key={d} onClick={() => setDept(d)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                      fontFamily: "'Geist', sans-serif", fontSize: "13px", textAlign: "left",
                      backgroundColor: active ? `${c.bg}18` : "transparent",
                      border: active ? `1px solid ${c.bg}55` : "1px solid transparent",
                      color: active ? "#fafafa" : "#71717a",
                      transition: "all 0.1s",
                    }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "3px", backgroundColor: c.bg, flexShrink: 0 }} />
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email <span style={{ color: "#3f3f46", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="name@company.com"
              type="email"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>

          <div>
            <label style={labelStyle}>LinkedIn URL <span style={{ color: "#3f3f46", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <div style={{ position: "relative" }}>
              <Linkedin size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#52525b", pointerEvents: "none" }} />
              <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} style={{ ...inputStyle, paddingLeft: "30px" }}
                onFocus={(e) => (e.target.style.borderColor = color.bg)}
                onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
                placeholder="https://linkedin.com/in/..."
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Last Activity <span style={{ color: "#3f3f46", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <input
              value={lastActivity}
              onChange={(e) => setLastActivity(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              type="date"
            />
          </div>

          <div>
            <label style={labelStyle}>Next Step <span style={{ color: "#3f3f46", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              style={{ ...inputStyle, resize: "none", lineHeight: "1.5" }}
              rows={4}
              onFocus={(e) => (e.target.style.borderColor = color.bg)}
              onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
              placeholder="e.g. Schedule follow-up call"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: "#27272a" }}>
          <button onClick={handleAdd} disabled={!canSave}
            style={{
              flex: 1, backgroundColor: canSave ? parentColor.bg : "#27272a",
              color: canSave ? parentColor.text : "#52525b",
              border: "none", borderRadius: "6px", padding: "8px 0",
              fontSize: "13px", fontWeight: 500, fontFamily: "'Geist', sans-serif",
              cursor: canSave ? "pointer" : "not-allowed", transition: "background-color 0.15s",
            }}>
            Add report
          </button>
          <button onClick={onClose}
            style={{ backgroundColor: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46", borderRadius: "6px", padding: "8px 14px", fontSize: "13px", fontFamily: "'Geist', sans-serif", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Role Badge ────────────────────────────────────────────────────────────────

function StatusBadge({ status, color, onSet }: { status: Status; color: { bg: string; text: string }; onSet: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const current = STATUS_OPTIONS.find((o) => o.value === status);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Set role"
        style={{
          width: "32px", height: "32px", borderRadius: "6px", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: status ? color.bg : `${color.bg}28`,
          color: status ? color.text : color.bg,
          transition: "background-color 0.15s",
        }}
      >
        {current ? current.symbol : <span style={{ fontSize: "14px", fontWeight: 300, opacity: 0.5 }}>+</span>}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
            backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)", padding: "4px", minWidth: "168px",
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onSet(status === opt.value ? undefined : opt.value); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px", width: "100%",
                padding: "7px 10px", borderRadius: "5px", border: "none", cursor: "pointer",
                backgroundColor: status === opt.value ? `${color.bg}22` : "transparent",
                color: status === opt.value ? "#fafafa" : "#a1a1aa",
                fontFamily: "'Geist', sans-serif", fontSize: "12px", textAlign: "left",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => { if (status !== opt.value) e.currentTarget.style.backgroundColor = "#27272a"; }}
              onMouseLeave={(e) => { if (status !== opt.value) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <span style={{ width: "16px", display: "flex", justifyContent: "center", color: color.bg }}>{opt.symbol}</span>
              {opt.label}
            </button>
          ))}
          {status && (
            <>
              <div style={{ height: "1px", backgroundColor: "#27272a", margin: "3px 0" }} />
              <button
                onClick={() => { onSet(undefined); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "7px 10px", borderRadius: "5px", border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#52525b", fontFamily: "'Geist', sans-serif", fontSize: "12px" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#27272a")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ width: "16px" }} />
                Clear role
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Engaged Pill ──────────────────────────────────────────────────────────────

function EngagedPill({ node, color, onToggleEngaged }: {
  node: Person;
  color: { bg: string; text: string };
  onToggleEngaged: (id: string, lastActivity?: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [dateVal, setDateVal] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picking) return;
    setDateVal(new Date().toISOString().slice(0, 10));
    setTimeout(() => dateRef.current?.focus(), 50);
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setPicking(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [picking]);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setPicking(true);
  }

  function confirm(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleEngaged(node.id, dateVal.trim() || undefined);
    setPicking(false);
  }

  const days = node.lastActivity ? businessDaysSince(node.lastActivity) : null;
  const label = node.lastActivity
    ? new Date(node.lastActivity + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No Activity";

  // Derive pill and fill state from business days
  const pillColor  = days === null ? "#3f3f46" : days > 10  ? "#ef4444" : color.bg;
  const hasFill    = days !== null && days <= 20;
  const pillBorder = days === null ? "1px solid #3f3f46" : days > 10 ? "1px solid #ef444466" : `1px solid ${color.bg}66`;
  const pillBg     = hasFill ? (days! > 10 ? "#ef444422" : `${color.bg}22`) : "transparent";

  return (
    <div ref={popoverRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={handleClick}
        title={node.nextStep ? node.nextStep : node.lastActivity ? `Last Activity: ${node.lastActivity}` : "Set last activity"}
        style={{
          fontSize: "9px", fontFamily: "'Geist Mono', monospace",
          padding: "2px 6px", borderRadius: "4px", cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.12em",
          display: "flex", alignItems: "center", gap: "4px",
          border: pillBorder, backgroundColor: pillBg, color: pillColor,
          transition: "all 0.15s",
        }}
      >
        {label}
      </button>

      {picking && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 200,
            backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)", padding: "10px",
            display: "flex", flexDirection: "column", gap: "8px", minWidth: "180px",
          }}
        >
          <div style={{ fontSize: "10px", fontFamily: "'Geist Mono', monospace", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Last Activity
          </div>
          <input
            ref={dateRef}
            type="date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            style={{
              backgroundColor: "#27272a", border: `1px solid ${color.bg}55`, borderRadius: "6px",
              color: "#fafafa", fontSize: "12px", padding: "6px 8px",
              fontFamily: "'Geist', sans-serif", outline: "none", colorScheme: "dark", width: "100%",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") confirm(e as any); if (e.key === "Escape") setPicking(false); }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={confirm}
              style={{
                flex: 1, backgroundColor: color.bg, color: color.text, border: "none",
                borderRadius: "5px", padding: "5px 0", fontSize: "11px", fontFamily: "'Geist', sans-serif",
                fontWeight: 500, cursor: "pointer",
              }}>
              Confirm
            </button>
            <button onClick={(e) => { e.stopPropagation(); setPicking(false); }}
              style={{
                backgroundColor: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46",
                borderRadius: "5px", padding: "5px 8px", fontSize: "11px", fontFamily: "'Geist', sans-serif", cursor: "pointer",
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Node Card ─────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  expanded,
  onToggle,
  hasChildren,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleEngaged,
  isDragging,
  isDropTarget,
  dropPos,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  node: Person;
  expanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  onEdit: (node: Person) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: Status) => void;
  onToggleEngaged: (id: string, lastActivity?: string) => void;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPos: DropPos | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, pos: DropPos) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const color = DEPT_COLORS[node.dept] ?? DEPT_COLORS.Executive;

  if (node.placeholder) {
    return (
      <div
        className="relative w-52 group/card"
        style={{ border: "1px dashed #3f3f46", borderRadius: "8px", backgroundColor: "transparent" }}
      >
        <div style={{ height: "2px", backgroundColor: `${color.bg}40`, borderRadius: "8px 8px 0 0" }} />
        <div className="p-3">
          <div className="mb-2.5">
            <StatusBadge status={node.status} color={{ bg: color.bg, text: color.text }} onSet={(s) => onUpdateStatus(node.id, s)} />
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#52525b", fontFamily: "'Geist', sans-serif", lineHeight: 1.3, marginBottom: "2px" }}>
            {node.linkedin ? (
              <a href={node.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#52525b", textDecoration: "underline" }}>{node.name}</a>
            ) : node.name}
          </div>
          <div style={{ fontSize: "11px", color: "#3f3f46", fontFamily: "'Geist', sans-serif", lineHeight: 1.3 }}>
            {node.title}
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span style={{ fontSize: "9px", fontFamily: "'Geist Mono', monospace", backgroundColor: `${color.bg}18`, color: `${color.bg}99`, borderRadius: "4px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Board
            </span>
            {node.linkedin && (
              <a href={node.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                <Linkedin size={11} style={{ color: "#52525b" }} />
              </a>
            )}
          </div>
        </div>
        {/* Edit button */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(node); }}
          className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
          style={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "4px", padding: "3px", cursor: "pointer", display: "flex", alignItems: "center", color: "#71717a" }}
        >
          <Pencil size={9} />
        </button>
      </div>
    );
  }

  const btnBase: React.CSSProperties = { background: "#27272a", border: "1px solid #3f3f46", borderRadius: "4px", padding: "3px", cursor: "pointer", display: "flex", alignItems: "center", color: "#71717a" };
  const effectiveEngaged = !!node.lastActivity && businessDaysSince(node.lastActivity) <= 20;
  const cardBg = effectiveEngaged ? `color-mix(in srgb, ${color.bg} 32%, #09090b)` : "#18181b";
  const canDrag = node.id !== "board" && !node.placeholder;

  const dropRingColor = isDropTarget && dropPos === "child" ? "#0ea5e9" : undefined;

  return (
    <div style={{ position: "relative" }}>
      {isDropTarget && dropPos === "before" && (
        <div style={{ position: "absolute", top: "-2px", left: 0, right: 0, height: "3px", backgroundColor: "#0ea5e9", borderRadius: "2px", zIndex: 20, pointerEvents: "none" }} />
      )}
    <div
      className="relative w-52 border group/card transition-all duration-150"
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(node.id); } : undefined}
      onDragOver={canDrag ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; const r = e.currentTarget.getBoundingClientRect(); const rel = (e.clientY - r.top) / r.height; onDragOver(node.id, rel < 0.28 ? "before" : rel > 0.72 ? "after" : "child"); } : undefined}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      style={{
        backgroundColor: cardBg,
        borderColor: dropRingColor ?? (effectiveEngaged ? `${color.bg}55` : "#3f3f46"),
        borderRadius: "8px", boxShadow: dropRingColor ? `0 0 0 2px ${dropRingColor}` : "0 1px 3px rgba(0,0,0,0.4)",
        transition: "background-color 0.2s, border-color 0.2s",
        opacity: isDragging ? 0.4 : 1,
        cursor: canDrag ? "grab" : undefined,
      }}
      onMouseEnter={(e) => { if (!isDragging) { (e.currentTarget as HTMLDivElement).style.borderColor = color.bg; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${color.bg}, 0 4px 16px rgba(0,0,0,0.5)`; } }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = dropRingColor ?? (effectiveEngaged ? `${color.bg}55` : "#3f3f46"); (e.currentTarget as HTMLDivElement).style.boxShadow = dropRingColor ? `0 0 0 2px ${dropRingColor}` : "0 1px 3px rgba(0,0,0,0.4)"; }}
    >
      <div style={{ height: "2px", backgroundColor: color.bg, borderRadius: "8px 8px 0 0" }} />

      <div
        className="p-3"
        style={{ cursor: hasChildren ? "pointer" : "default" }}
        onClick={hasChildren ? onToggle : undefined}
      >
        <div className="mb-2.5">
          <StatusBadge status={node.status} color={{ bg: color.bg, text: color.text }} onSet={(s) => onUpdateStatus(node.id, s)} />
        </div>

        <div style={{ fontSize: "13px", fontWeight: 500, color: "#fafafa", fontFamily: "'Geist', sans-serif", lineHeight: 1.3, marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.linkedin ? (
              <a href={node.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#fafafa", textDecoration: "underline" }}>{node.name}</a>
            ) : node.name}
          </span>
          {hasChildren && (
            <span style={{ flexShrink: 0, color: "#52525b", display: "flex", alignItems: "center" }}>
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </span>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#71717a", fontFamily: "'Geist', sans-serif", lineHeight: 1.3 }}>
          {node.title}
        </div>

        <div className="flex items-center mt-2.5" style={{ gap: "8px", flexWrap: "nowrap" }}>
          <span style={{ fontSize: "9px", fontFamily: "'Geist Mono', monospace", backgroundColor: `${color.bg}22`, color: color.bg, borderRadius: "4px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.12em", flexShrink: 0 }}>
            {node.dept}
          </span>
          <div className="flex items-center gap-1.5" style={{ marginLeft: "auto" }}>
            {node.linkedin && (
              <a href={node.linkedin} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                <ExternalLink size={10} style={{ color: "#52525b" }} />
              </a>
            )}
            <EngagedPill node={node} color={color} onToggleEngaged={onToggleEngaged} />
          </div>
        </div>
      </div>

      {/* Action buttons — hover revealed */}
      <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity flex gap-1">
        {canDrag && (
          <div style={{ ...btnBase, cursor: "grab", pointerEvents: "none" }} title="Drag to move">
            <GripVertical size={9} />
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} style={btnBase}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fafafa"; e.currentTarget.style.borderColor = "#52525b"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.borderColor = "#3f3f46"; }}
          title="Edit">
          <Pencil size={9} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} style={btnBase}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef444455"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.borderColor = "#3f3f46"; }}
          title="Delete">
          <Trash2 size={9} />
        </button>
      </div>

    </div>
      {isDropTarget && dropPos === "after" && (
        <div style={{ position: "absolute", bottom: "-2px", left: 0, right: 0, height: "3px", backgroundColor: "#0ea5e9", borderRadius: "2px", zIndex: 20, pointerEvents: "none" }} />
      )}
    </div>
  );
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

type DragHandlers = {
  draggingId: string | null;
  dropTarget: { id: string; pos: DropPos } | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, pos: DropPos) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

function TreeNode({
  node, depth = 0,
  onEdit, onDelete, onAddReport, onUpdateStatus, onToggleEngaged,
  expandId, onExpanded, drag,
}: {
  node: Person; depth?: number;
  onEdit: (node: Person) => void;
  onDelete: (id: string) => void;
  onAddReport: (node: Person) => void;
  onUpdateStatus: (id: string, status: Status) => void;
  onToggleEngaged: (id: string, lastActivity?: string) => void;
  expandId?: string | null;
  onExpanded?: () => void;
  drag: DragHandlers;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = !!node.children?.length;

  useEffect(() => {
    if (expandId === node.id) { setExpanded(true); onExpanded?.(); }
  }, [expandId, node.id]);

  const isDropTarget = drag.dropTarget?.id === node.id;
  const dropPos = isDropTarget ? drag.dropTarget!.pos : null;

  return (
    <div className="org-node">
      <NodeCard
        node={node} expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        hasChildren={hasChildren}
        onEdit={onEdit} onDelete={onDelete}
        onUpdateStatus={onUpdateStatus} onToggleEngaged={onToggleEngaged}
        isDragging={drag.draggingId === node.id}
        isDropTarget={isDropTarget}
        dropPos={dropPos}
        onDragStart={drag.onDragStart}
        onDragOver={drag.onDragOver}
        onDragLeave={drag.onDragLeave}
        onDrop={drag.onDrop}
        onDragEnd={drag.onDragEnd}
      />
      {!node.placeholder && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "1px", height: "10px", backgroundColor: "#3f3f46" }} />
          <button onClick={() => onAddReport(node)} title="Add direct report" className="org-add-btn"
            style={{ width: "18px", height: "18px", borderRadius: "50%", border: "1px solid #3f3f46", backgroundColor: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#52525b", padding: 0, fontSize: "14px", lineHeight: 1, flexShrink: 0 }}>
            +
          </button>
          {hasChildren && expanded && <div style={{ width: "1px", height: "10px", backgroundColor: "#3f3f46" }} />}
        </div>
      )}
      {hasChildren && expanded && (
        <div className="org-children-wrap">
          <ul className="org-children">
            {node.children!.map((child) => (
              <li key={child.id} className="org-child">
                <TreeNode node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onAddReport={onAddReport} onUpdateStatus={onUpdateStatus} onToggleEngaged={onToggleEngaged} expandId={expandId} onExpanded={onExpanded} drag={drag} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Editable Text ─────────────────────────────────────────────────────────────

function EditableText({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function activate() { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 20); }
  function commit() { onChange(draft.trim() || value); setEditing(false); }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{
          ...style,
          background: "transparent",
          border: "none",
          borderBottom: "1px solid #3f3f46",
          outline: "none",
          padding: "0",
          width: `${Math.max(draft.length, 4)}ch`,
          caretColor: "#0ea5e9",
        }}
      />
    );
  }

  return (
    <span
      onClick={activate}
      style={{ ...style, cursor: "text", borderBottom: "1px solid transparent", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = "#3f3f46")}
      onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
    >
      {value}
    </span>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────

type FlatRow = { node: Person; parentName: string };

function flattenTree(node: Person, parentName = "", out: FlatRow[] = []): FlatRow[] {
  if (!node.placeholder) out.push({ node, parentName });
  for (const child of node.children ?? [])
    flattenTree(child, node.placeholder ? parentName : node.name, out);
  return out;
}

const ROLE_OPTIONS: { value: Status; label: string }[] = [
  { value: undefined,     label: "—" },
  { value: "star",        label: "Decision Maker" },
  { value: "champion",    label: "Champion" },
  { value: "influencer",  label: "Influencer" },
];

function TableView({ orgData, onUpdate }: { orgData: Person; onUpdate: (id: string, patch: Partial<Person>) => void }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const COLS = [
    { key: "name",         label: "Name",          width: "160px" },
    { key: "title",        label: "Title",         width: "160px" },
    { key: "dept",         label: "Department",    width: "120px" },
    { key: "status",       label: "Role",          width: "140px" },
    { key: "email",        label: "Email",         width: "180px" },
    { key: "linkedin",     label: "LinkedIn",      width: "180px" },
    { key: "lastActivity", label: "Last Activity", width: "130px" },
    { key: "nextStep",     label: "Next Step",     width: "200px" },
    { key: "parentName",   label: "Reports To",    width: "140px" },
  ];

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function getValue(row: FlatRow, key: string): string {
    if (key === "parentName") return row.parentName ?? "";
    if (key === "status") {
      const map: Record<string, string> = { star: "Decision Maker", champion: "Champion", influencer: "Influencer" };
      return map[row.node.status ?? ""] ?? "";
    }
    return String((row.node as Record<string, unknown>)[key] ?? "");
  }

  const rawRows = flattenTree(orgData);
  const rows = sortKey
    ? [...rawRows].sort((a, b) => {
        const av = getValue(a, sortKey).toLowerCase();
        const bv = getValue(b, sortKey).toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : rawRows;

  const cellInput: React.CSSProperties = {
    width: "100%", background: "transparent", border: "none", outline: "none",
    color: "#fafafa", fontSize: "12px", fontFamily: "'Geist', sans-serif",
    padding: "0", lineHeight: "1.4",
  };
  const cellSelect: React.CSSProperties = {
    ...cellInput, cursor: "pointer", appearance: "none", WebkitAppearance: "none",
  };

  return (
    <div style={{ overflowX: "auto", height: "100%" }} className="org-scroll">
      <table style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: "12px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #3f3f46", position: "sticky", top: 0, zIndex: 10, backgroundColor: "#09090b" }}>
            {COLS.map((col) => {
              const active = sortKey === col.key;
              return (
              <th key={col.key}
                onClick={() => handleSort(col.key)}
                style={{
                  padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap",
                  minWidth: col.width, color: active ? "#fafafa" : "#52525b",
                  fontFamily: "'Geist Mono', monospace", fontSize: "10px",
                  fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em",
                  borderRight: "1px solid #27272a", cursor: "pointer", userSelect: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "#52525b"; }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  {col.label}
                  <span style={{ fontSize: "9px", opacity: active ? 1 : 0.3 }}>
                    {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </span>
              </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, parentName }, i) => {
            const color = DEPT_COLORS[node.dept] ?? DEPT_COLORS.Executive;
            return (
              <tr key={node.id} style={{ borderBottom: "1px solid #27272a", backgroundColor: i % 2 === 0 ? "#09090b" : "#18181b22" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#18181b")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#09090b" : "#18181b22")}
              >
                {/* Name */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <input style={cellInput} value={node.name} onChange={(e) => onUpdate(node.id, { name: e.target.value })}
                    onFocus={(e) => (e.target.style.color = color.bg)} onBlur={(e) => (e.target.style.color = "#fafafa")} />
                </td>
                {/* Title */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <input style={cellInput} value={node.title} onChange={(e) => onUpdate(node.id, { title: e.target.value })}
                    onFocus={(e) => (e.target.style.color = color.bg)} onBlur={(e) => (e.target.style.color = "#fafafa")} />
                </td>
                {/* Department */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <select style={{ ...cellSelect, color: color.bg }} value={node.dept} onChange={(e) => onUpdate(node.id, { dept: e.target.value })}>
                    {Object.keys(DEPT_COLORS).map((d) => <option key={d} value={d} style={{ backgroundColor: "#18181b", color: "#fafafa" }}>{d}</option>)}
                  </select>
                </td>
                {/* Role */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <select style={{ ...cellSelect, color: node.status ? color.bg : "#52525b" }}
                    value={node.status ?? ""}
                    onChange={(e) => onUpdate(node.id, { status: (e.target.value as Status) || undefined })}>
                    {ROLE_OPTIONS.map((o) => <option key={String(o.value)} value={o.value ?? ""} style={{ backgroundColor: "#18181b", color: "#fafafa" }}>{o.label}</option>)}
                  </select>
                </td>
                {/* Email */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <input style={{ ...cellInput, color: "#a1a1aa" }} value={node.email ?? ""} placeholder="—"
                    onChange={(e) => onUpdate(node.id, { email: e.target.value || undefined })}
                    onFocus={(e) => (e.target.style.color = "#fafafa")} onBlur={(e) => (e.target.style.color = "#a1a1aa")} />
                </td>
                {/* LinkedIn */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <input style={{ ...cellInput, color: "#a1a1aa" }} value={node.linkedin ?? ""} placeholder="—"
                    onChange={(e) => onUpdate(node.id, { linkedin: e.target.value || undefined })}
                    onFocus={(e) => (e.target.style.color = "#fafafa")} onBlur={(e) => (e.target.style.color = "#a1a1aa")} />
                </td>
                {/* Last Activity */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a" }}>
                  <input type="date" style={{ ...cellInput, colorScheme: "dark", color: node.lastActivity && businessDaysSince(node.lastActivity) > 20 ? "#ef4444" : "#a1a1aa" }} value={node.lastActivity ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdate(node.id, { lastActivity: val || undefined, engaged: val ? true : false });
                    }}
                    onFocus={(e) => (e.target.style.color = "#fafafa")} onBlur={(e) => (e.target.style.color = "#a1a1aa")} />
                </td>
                {/* Next Step */}
                <td style={{ padding: "8px 12px", borderRight: "1px solid #27272a", verticalAlign: "top" }}>
                  <textarea style={{ ...cellInput, color: "#a1a1aa", resize: "none", lineHeight: "1.4", overflow: "hidden" }}
                    value={node.nextStep ?? ""} placeholder="—" rows={1}
                    onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; onUpdate(node.id, { nextStep: e.target.value || undefined }); }}
                    onFocus={(e) => { e.currentTarget.style.color = "#fafafa"; e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                    onBlur={(e) => (e.target.style.color = "#a1a1aa")} />
                </td>
                {/* Reports To */}
                <td style={{ padding: "8px 12px", color: "#52525b", fontFamily: "'Geist', sans-serif", whiteSpace: "nowrap" }}>
                  {parentName || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  function lsGet<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }

  // ── Multi-chart state ──────────────────────────────────────────────────────
  const [charts, setCharts] = useState<ChartRecord[]>(() => {
    const saved = lsGet<ChartRecord[] | null>("orgCharts", null);
    if (saved?.length) return saved;
    // Migrate from old single-chart keys
    const migrated: ChartRecord = {
      id: crypto.randomUUID(),
      company:   lsGet("company", "Meridian Group"),
      website:   lsGet("website", "meridiangroup.com"),
      dateRange: lsGet("dateRange", "Q2 2026"),
      orgData:   lsGet("orgData", DEFAULT_ORG),
      createdAt: new Date().toISOString(),
    };
    return [migrated];
  });

  const [currentId, setCurrentId] = useState<string>(() => {
    // Prefer URL hash, then localStorage, then first chart
    const hashId = window.location.hash.slice(1);
    const saved = lsGet<ChartRecord[] | null>("orgCharts", null);
    const allIds = new Set(saved?.map((c) => c.id) ?? []);
    if (hashId && allIds.has(hashId)) return hashId;
    return localStorage.getItem("currentChartId") ?? (saved?.[0]?.id ?? "");
  });

  const current = charts.find((c) => c.id === currentId) ?? charts[0];

  const [orgData, setOrgData]     = useState<Person>(() => current?.orgData   ?? DEFAULT_ORG);
  const [company, setCompany]     = useState<string>(() => current?.company   ?? "Meridian Group");
  const [website, setWebsite]     = useState<string>(() => current?.website   ?? "meridiangroup.com");
  const [dateRange, setDateRange] = useState<string>(() => current?.dateRange ?? "Q2 2026");

  const [view, setView]       = useState<"chart" | "table">("chart");
  const [editing, setEditing] = useState<Person | null>(null);
  const [addingTo, setAddingTo] = useState<Person | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Persist on any data change
  useEffect(() => {
    setCharts((prev) => prev.map((c) => c.id === currentId ? { ...c, orgData, company, website, dateRange } : c));
  }, [orgData, company, website, dateRange]);

  useEffect(() => { localStorage.setItem("orgCharts", JSON.stringify(charts)); }, [charts]);
  useEffect(() => {
    localStorage.setItem("currentChartId", currentId);
    window.history.replaceState(null, "", `#${currentId}`);
  }, [currentId]);

  // Respond to browser back/forward
  useEffect(() => {
    function onHashChange() {
      const hashId = window.location.hash.slice(1);
      const record = charts.find((c) => c.id === hashId);
      if (record && record.id !== currentId) switchTo(record);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [charts, currentId]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); setShowOpen(false); } }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  // ── Chart management ───────────────────────────────────────────────────────
  function switchTo(record: ChartRecord) {
    setOrgData(record.orgData);
    setCompany(record.company);
    setWebsite(record.website);
    setDateRange(record.dateRange);
    setCurrentId(record.id);
    window.history.pushState(null, "", `#${record.id}`);
    setMenuOpen(false);
    setShowOpen(false);
  }

  function handleNew() {
    const rec: ChartRecord = {
      id: crypto.randomUUID(),
      company: "New Company",
      website: "example.com",
      dateRange: "Q3 2026",
      orgData: DEFAULT_ORG,
      createdAt: new Date().toISOString(),
    };
    setCharts((prev) => [...prev, rec]);
    switchTo(rec);
  }

  function handleClone() {
    const rec: ChartRecord = {
      id: crypto.randomUUID(),
      company: company + " (Copy)",
      website,
      dateRange,
      orgData: JSON.parse(JSON.stringify(orgData)),
      createdAt: new Date().toISOString(),
    };
    setCharts((prev) => [...prev, rec]);
    switchTo(rec);
  }

  function handleDeleteChart() {
    if (charts.length === 1) { handleNew(); return; }
    const remaining = charts.filter((c) => c.id !== currentId);
    setCharts(remaining);
    switchTo(remaining[remaining.length - 1]);
  }

  function handleSave(id: string, patch: Partial<Person>) {
    setOrgData((prev) => updateNode(prev, id, patch));
  }

  const [expandId, setExpandId] = useState<string | null>(null);

  function handleAdd(parentId: string, child: Person) {
    setOrgData((prev) => addChild(prev, parentId, child));
    setExpandId(parentId);
  }

  function handleUpdateStatus(id: string, status: Status) {
    setOrgData((prev) => updateNode(prev, id, { status }));
  }

  function handleDelete(id: string) {
    setOrgData((prev) => removeNode(prev, id));
  }

  function handleToggleEngaged(id: string, lastActivity?: string) {
    setOrgData((prev) => {
      const patch: Partial<Person> = lastActivity
        ? { engaged: true, lastActivity }
        : { engaged: false, lastActivity: undefined };
      return updateNode(prev, id, patch);
    });
  }

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: DropPos } | null>(null);

  function handleDragStart(id: string) { setDraggingId(id); }
  function handleDragOver(id: string, pos: DropPos) {
    if (!draggingId || id === draggingId || isAncestorOf(orgData, draggingId, id)) return;
    setDropTarget({ id, pos });
  }
  function handleDragLeave() { setDropTarget(null); }
  function handleDrop() {
    if (draggingId && dropTarget) setOrgData((prev) => moveNode(prev, draggingId, dropTarget.id, dropTarget.pos));
    setDraggingId(null);
    setDropTarget(null);
  }
  function handleDragEnd() { setDraggingId(null); setDropTarget(null); }

  const STATUS_LABELS: Record<string, string> = {
    star: "Decision Maker",
    champion: "Champion",
    influencer: "Influencer",
  };

  function exportCSV() {
    const rows: string[][] = [];
    const headers = ["Account Name", "Account Website", "Contact Name", "Contact Title", "Reports To", "Contact Role"];
    rows.push(headers);

    function walk(node: Person, parentName: string) {
      if (!node.placeholder) {
        rows.push([
          company,
          website,
          node.name,
          node.title,
          parentName,
          node.status ? (STATUS_LABELS[node.status] ?? "") : "",
        ]);
      }
      for (const child of node.children ?? []) {
        walk(child, node.placeholder ? parentName : node.name);
      }
    }
    walk(orgData, "");

    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.replace(/\s+/g, "_")}_org_chart.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');
        body { font-family: 'Geist', system-ui, sans-serif; }

        .org-node { display: flex; flex-direction: column; align-items: center; }
        .org-children-wrap { display: flex; flex-direction: column; align-items: center; }

        .org-vline { width: 1px; height: 24px; background: #3f3f46; flex-shrink: 0; }
        .org-add-btn:hover { border-color: #0ea5e9 !important; color: #0ea5e9 !important; background: rgba(14,165,233,0.1) !important; }

        .org-children { display: flex; align-items: flex-start; list-style: none; padding: 0; margin: 0; }

        .org-child {
          display: flex; flex-direction: column; align-items: center;
          position: relative; padding: 24px 14px 0 14px;
        }
        .org-child::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 0; border-top: 1px solid #3f3f46;
        }
        .org-child:first-child::before { left: 50%; }
        .org-child:last-child::before  { right: 50%; }
        .org-child:only-child::before  { display: none; }
        .org-child::after {
          content: ''; position: absolute; top: 0; left: 50%;
          transform: translateX(-50%); width: 1px; height: 24px; background: #3f3f46;
        }

        .org-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
        .org-scroll::-webkit-scrollbar-track { background: transparent; }
        .org-scroll::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 99px; }
        .org-scroll:hover::-webkit-scrollbar-thumb { background: #52525b; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#09090b", fontFamily: "'Geist', system-ui, sans-serif" }}>
        {/* Header */}
        <header className="flex items-end justify-between flex-wrap gap-4 px-8 py-5 border-b" style={{ borderColor: "#27272a" }}>

          {/* Hamburger menu */}
          <div ref={menuRef} style={{ position: "relative", alignSelf: "center", flexShrink: 0 }}>
            <button
              onClick={() => { setMenuOpen((v) => !v); setShowOpen(false); }}
              style={{ background: "none", border: "1px solid #3f3f46", borderRadius: "6px", padding: "6px 8px", cursor: "pointer", color: menuOpen ? "#fafafa" : "#71717a", display: "flex", alignItems: "center", transition: "all 0.15s", backgroundColor: menuOpen ? "#27272a" : "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fafafa"; e.currentTarget.style.borderColor = "#52525b"; }}
              onMouseLeave={(e) => { if (!menuOpen) { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.borderColor = "#3f3f46"; } }}
            >
              <Menu size={15} />
            </button>

            {menuOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 300, backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.6)", minWidth: "160px", padding: "4px", overflow: "hidden" }}>
                {[
                  { label: "New",   action: () => { handleNew(); setMenuOpen(false); } },
                  { label: "Clone", action: () => { handleClone(); setMenuOpen(false); } },
                  { label: "Open",  action: () => setShowOpen((v) => !v) },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: "5px", color: "#a1a1aa", fontSize: "13px", fontFamily: "'Geist', sans-serif", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#27272a"; e.currentTarget.style.color = "#fafafa"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#a1a1aa"; }}
                  >
                    {label}
                    {label === "Open" && <span style={{ fontSize: "10px", color: "#52525b" }}>›</span>}
                  </button>
                ))}

                {showOpen && charts.length > 0 && (
                  <div style={{ borderTop: "1px solid #27272a", marginTop: "4px", paddingTop: "4px" }}>
                    {charts.map((c) => (
                      <button key={c.id} onClick={() => switchTo(c)}
                        style={{ display: "flex", flexDirection: "column", width: "100%", padding: "8px 12px", background: c.id === currentId ? "#27272a" : "transparent", border: "none", borderRadius: "5px", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#27272a"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = c.id === currentId ? "#27272a" : "transparent"; }}
                      >
                        <span style={{ fontSize: "12px", color: c.id === currentId ? "#fafafa" : "#a1a1aa", fontFamily: "'Geist', sans-serif" }}>{c.company}</span>
                        <span style={{ fontSize: "10px", color: "#52525b", fontFamily: "'Geist Mono', monospace", marginTop: "2px" }}>{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ borderTop: "1px solid #27272a", marginTop: "4px", paddingTop: "4px" }}>
                  <button onClick={() => { handleDeleteChart(); setMenuOpen(false); }}
                    style={{ display: "flex", width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: "5px", color: "#ef4444", fontSize: "13px", fontFamily: "'Geist', sans-serif", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#ef444418"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "#52525b", fontFamily: "'Geist Mono', monospace", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              <EditableText
                value={company}
                onChange={setCompany}
                style={{ color: "#52525b", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "11px", fontFamily: "'Geist Mono', monospace" }}
              />
              <span style={{ color: "#3f3f46" }}>/</span>
              <EditableText
                value={website}
                onChange={setWebsite}
                style={{ color: "#71717a", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "11px", fontFamily: "'Geist Mono', monospace" }}
              />
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#fafafa", fontFamily: "'Geist', sans-serif", letterSpacing: "-0.02em" }}>
              Org Chart
            </h1>
            <div style={{ fontSize: "11px", color: "#52525b", fontFamily: "'Geist Mono', monospace", marginTop: "2px" }}>
              <EditableText
                value={dateRange}
                onChange={setDateRange}
                style={{ color: "#52525b", fontSize: "11px", fontFamily: "'Geist Mono', monospace" }}
              />
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <div className="flex flex-wrap gap-3">
              {DEPARTMENTS.map((dept) => {
                const c = DEPT_COLORS[dept];
                return (
                  <div key={dept} className="flex items-center gap-1.5">
                    <div style={{ width: "8px", height: "8px", backgroundColor: c.bg, borderRadius: "3px" }} />
                    <span style={{ fontSize: "10px", color: "#71717a", fontFamily: "'Geist Mono', monospace" }}>{dept}</span>
                  </div>
                );
              })}
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid #3f3f46", borderRadius: "6px", overflow: "hidden" }}>
              {(["chart", "table"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  style={{
                    padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 500,
                    fontFamily: "'Geist', sans-serif", border: "none", transition: "all 0.15s",
                    backgroundColor: view === v ? "#3f3f46" : "transparent",
                    color: view === v ? "#fafafa" : "#71717a",
                  }}
                  onMouseEnter={(e) => { if (view !== v) e.currentTarget.style.color = "#a1a1aa"; }}
                  onMouseLeave={(e) => { if (view !== v) e.currentTarget.style.color = "#71717a"; }}
                >
                  {v === "chart" ? "Chart" : "Table"}
                </button>
              ))}
            </div>

            <button
              onClick={exportCSV}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                backgroundColor: "#27272a", border: "1px solid #3f3f46", borderRadius: "6px",
                padding: "6px 12px", cursor: "pointer", color: "#a1a1aa",
                fontSize: "12px", fontFamily: "'Geist', sans-serif", fontWeight: 500,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#52525b"; e.currentTarget.style.color = "#fafafa"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3f3f46"; e.currentTarget.style.color = "#a1a1aa"; }}
            >
              Export CSV
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto org-scroll" style={{ padding: view === "table" ? "0" : "2rem 3rem" }}>
          {view === "chart" ? (
            <div className="min-w-max mx-auto">
              <TreeNode node={orgData} depth={0} onEdit={setEditing} onDelete={handleDelete} onAddReport={setAddingTo} onUpdateStatus={handleUpdateStatus} onToggleEngaged={handleToggleEngaged} expandId={expandId} onExpanded={() => setExpandId(null)} drag={{ draggingId, dropTarget, onDragStart: handleDragStart, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onDragEnd: handleDragEnd }} />
            </div>
          ) : (
            <TableView orgData={orgData} onUpdate={handleSave} />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t px-8 py-3" style={{ borderColor: "#27272a" }}>
          <span style={{ fontSize: "10px", color: "#3f3f46", fontFamily: "'Geist Mono', monospace" }}>
            Hover a card to edit · Click to expand / collapse
          </span>
        </footer>
      </div>

      {editing && (
        <EditDrawer node={editing} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />
      )}
      {addingTo && (
        <AddDrawer parent={addingTo} onAdd={handleAdd} onClose={() => setAddingTo(null)} />
      )}
    </>
  );
}
