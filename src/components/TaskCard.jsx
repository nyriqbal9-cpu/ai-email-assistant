export default function TaskCard({ task, active, onSelect }) {
  return (
    <button
      type="button"
      className={`task-card ${active ? "active" : ""}`}
      onClick={() => onSelect(task.id)}
      aria-pressed={active}
    >
      <span className="task-icon" aria-hidden="true">
        {task.icon}
      </span>
      <span className="task-title">{task.title}</span>
      <span className="task-desc">{task.desc}</span>
    </button>
  );
}
