import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Moon,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Square,
  Sun,
  Trash2,
  UserRound
} from "lucide-react";
import { apiRequest, downloadCsv } from "./api.js";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "time", label: "Time", icon: Clock3 },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings }
];

const priorityRank = { high: 3, medium: 2, low: 1 };

function todayInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatSeconds(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

function formatHours(seconds = 0) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatDateTime(value) {
  if (!value) return "Running";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getTask(entry) {
  if (!entry) return null;
  return entry.taskId && typeof entry.taskId === "object" ? entry.taskId : null;
}

function dateTimeLocalValue(date) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("timeapp-token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("timeapp-user");
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [message, setMessage] = useState("");
  const [timerTick, setTimerTick] = useState(Date.now());
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { from: todayInput(from), to: todayInput(to) };
  });

  const api = (path, options = {}) => apiRequest(path, { ...options, token });

  const activeTimer = useMemo(() => entries.find((entry) => !entry.endTime && entry.source === "timer"), [entries]);
  const activeTasks = useMemo(() => tasks.filter((task) => !task.isCompleted), [tasks]);
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return priorityRank[b.priority] - priorityRank[a.priority] || new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      }),
    [tasks]
  );

  const todaySeconds = useMemo(() => {
    const start = startOfDay().getTime();
    return entries
      .filter((entry) => new Date(entry.startTime).getTime() >= start && entry.endTime)
      .reduce((sum, entry) => sum + entry.durationSeconds, 0);
  }, [entries]);

  const activeElapsed = activeTimer ? Math.floor((timerTick - new Date(activeTimer.startTime).getTime()) / 1000) : 0;

  async function refreshData() {
    if (!token) return;
    setLoading(true);
    try {
      const params = `from=${range.from}&to=${range.to}T23:59:59.999Z`;
      const [me, taskPayload, entryPayload, reportPayload] = await Promise.all([
        api("/auth/me"),
        api("/tasks"),
        api("/time-entries?limit=300"),
        api(`/reports/summary?${params}`)
      ]);
      setUser(me.user);
      setTasks(taskPayload.tasks);
      setEntries(entryPayload.entries);
      setSummary(reportPayload);
      localStorage.setItem("timeapp-user", JSON.stringify(me.user));
    } catch (error) {
      setMessage(error.message);
      if (error.message.toLowerCase().includes("token")) logout();
    } finally {
      setLoading(false);
    }
  }

  function saveSession(nextUser, nextToken) {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("timeapp-token", nextToken);
    localStorage.setItem("timeapp-user", JSON.stringify(nextUser));
  }

  function logout() {
    setToken("");
    setUser(null);
    setTasks([]);
    setEntries([]);
    setSummary(null);
    localStorage.removeItem("timeapp-token");
    localStorage.removeItem("timeapp-user");
  }

  useEffect(() => {
    refreshData();
  }, [token, range.from, range.to]);

  useEffect(() => {
    const interval = window.setInterval(() => setTimerTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme || "light";
  }, [user?.theme]);

  if (!token || !user) {
    return <AuthScreen onSession={saveSession} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TF</div>
          <div>
            <strong>TempoFlow</strong>
            <span>Time management</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setView(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="user-tile">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.timezone}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
            <h1>{navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={refreshData} title="Refresh data">
              <RefreshCw size={18} />
            </button>
            <button className="icon-button" onClick={logout} title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {message && (
          <div className="notice">
            <span>{message}</span>
            <button onClick={() => setMessage("")}>Dismiss</button>
          </div>
        )}

        {loading ? <div className="loading-panel">Loading workspace...</div> : null}

        {view === "dashboard" && (
          <Dashboard
            user={user}
            tasks={tasks}
            activeTasks={activeTasks}
            entries={entries}
            summary={summary}
            todaySeconds={todaySeconds}
            activeTimer={activeTimer}
            activeElapsed={activeElapsed}
          />
        )}
        {view === "tasks" && <TasksView tasks={sortedTasks} api={api} refreshData={refreshData} setMessage={setMessage} />}
        {view === "time" && (
          <TimeView
            tasks={activeTasks}
            entries={entries}
            activeTimer={activeTimer}
            activeElapsed={activeElapsed}
            api={api}
            refreshData={refreshData}
            setMessage={setMessage}
          />
        )}
        {view === "reports" && (
          <ReportsView
            summary={summary}
            range={range}
            setRange={setRange}
            token={token}
            api={api}
            setMessage={setMessage}
          />
        )}
        {view === "settings" && <SettingsView user={user} api={api} onUser={setUser} logout={logout} setMessage={setMessage} />}
      </main>
    </div>
  );
}

function AuthScreen({ onSession }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await apiRequest(`/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: mode === "login" ? { email: form.email, password: form.password } : form
      });
      onSession(payload.user, payload.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand compact">
          <div className="brand-mark">TF</div>
          <div>
            <strong>TempoFlow</strong>
            <span>MERN productivity workspace</span>
          </div>
        </div>
        <h1>Plan, track, and report every focused hour.</h1>
        <p>Run timers, log manual sessions, organize tasks by project, and export clean reports from one responsive workspace.</p>
        <div className="hero-grid">
          <Metric label="Weekly focus" value="32.5h" />
          <Metric label="Active tasks" value="14" />
          <Metric label="Billable share" value="78%" />
        </div>
      </section>

      <section className="auth-panel">
        <div className="segmented">
          <button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>Register</button>
        </div>

        <form onSubmit={submit} className="form-stack">
          {mode === "register" && (
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Alex Morgan" required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Minimum 6 characters" required />
          </label>
          {mode === "register" && (
            <label>
              Timezone
              <input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} required />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ user, tasks, activeTasks, entries, summary, todaySeconds, activeTimer, activeElapsed }) {
  const completionRate = tasks.length ? Math.round((tasks.filter((task) => task.isCompleted).length / tasks.length) * 100) : 0;
  const targetSeconds = (user.defaultWorkHours || 8) * 3600;
  const todayPercent = Math.min(100, Math.round((todaySeconds / targetSeconds) * 100));
  const recent = entries.slice(0, 5);

  return (
    <div className="dashboard-grid">
      <section className="focus-band">
        <div>
          <p className="eyebrow">Today focus</p>
          <h2>{formatHours(todaySeconds)} logged</h2>
          <p>{todayPercent}% of your {user.defaultWorkHours}h work target is complete.</p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${todayPercent * 3.6}deg` }}>
          <span>{todayPercent}%</span>
        </div>
      </section>

      <MetricCard icon={Clock3} label="Running timer" value={activeTimer ? formatSeconds(activeElapsed) : "Idle"} detail={getTask(activeTimer)?.title || "No active session"} />
      <MetricCard icon={ListTodo} label="Open tasks" value={activeTasks.length} detail={`${completionRate}% complete overall`} />
      <MetricCard icon={CalendarDays} label="Range total" value={`${summary?.totals?.hours || 0}h`} detail={`${summary?.totals?.entries || 0} logged entries`} />

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Daily trend</p>
            <h2>Weekly rhythm</h2>
          </div>
        </div>
        <div className="bar-row">
          {(summary?.daily?.length ? summary.daily : [{ date: todayInput(), hours: 0 }]).map((day) => (
            <div className="bar-item" key={day.date}>
              <div className="bar-track"><span style={{ height: `${Math.min(100, (day.hours / Math.max(user.defaultWorkHours, 1)) * 100)}%` }} /></div>
              <small>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</small>
              <strong>{day.hours}h</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Allocation</h2>
          </div>
        </div>
        <ProjectList projects={summary?.byProject || []} />
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Latest entries</p>
            <h2>Timeline</h2>
          </div>
        </div>
        <Timeline entries={recent} />
      </section>
    </div>
  );
}

function TasksView({ tasks, api, refreshData, setMessage }) {
  const [form, setForm] = useState({ title: "", project: "General", priority: "medium", dueDate: "", tags: "", description: "" });

  async function createTask(event) {
    event.preventDefault();
    try {
      await api("/tasks", { method: "POST", body: form });
      setForm({ title: "", project: "General", priority: "medium", dueDate: "", tags: "", description: "" });
      await refreshData();
      setMessage("Task created");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateTask(task, updates) {
    try {
      await api(`/tasks/${task._id}`, { method: "PUT", body: updates });
      await refreshData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteTask(task) {
    try {
      await api(`/tasks/${task._id}`, { method: "DELETE" });
      await refreshData();
      setMessage("Task deleted");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">New task</p>
            <h2>Capture work</h2>
          </div>
          <Plus size={20} />
        </div>
        <form className="form-stack" onSubmit={createTask}>
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Design sprint review" required /></label>
          <label>Project<input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="Client, course, or team" /></label>
          <div className="form-row">
            <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
          </div>
          <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="invoice, deep work" /></label>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" /></label>
          <button className="primary-button" type="submit"><Plus size={18} /> Add task</button>
        </form>
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Task queue</h2>
          </div>
          <span className="count-pill">{tasks.length} tasks</span>
        </div>
        <div className="task-list">
          {tasks.map((task) => (
            <article className={task.isCompleted ? "task-card done" : "task-card"} key={task._id}>
              <button className="status-button" onClick={() => updateTask(task, { isCompleted: !task.isCompleted })} title="Toggle completed">
                <CheckCircle2 size={20} />
              </button>
              <div className="task-main">
                <div className="task-title-row">
                  <h3>{task.title}</h3>
                  <span className={`priority ${task.priority}`}>{task.priority}</span>
                </div>
                <p>{task.description || "No description added."}</p>
                <div className="meta-row">
                  <span>{task.project || "General"}</span>
                  {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                  {task.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              </div>
              <button className="icon-button danger" onClick={() => deleteTask(task)} title="Delete task"><Trash2 size={18} /></button>
            </article>
          ))}
          {!tasks.length && <EmptyState title="No tasks yet" text="Create your first task to start logging time." />}
        </div>
      </section>
    </div>
  );
}

function TimeView({ tasks, entries, activeTimer, activeElapsed, api, refreshData, setMessage }) {
  const now = new Date();
  const [selectedTask, setSelectedTask] = useState("");
  const [manual, setManual] = useState({
    taskId: "",
    startTime: dateTimeLocalValue(new Date(now.getTime() - 60 * 60 * 1000)),
    endTime: dateTimeLocalValue(now),
    note: ""
  });

  useEffect(() => {
    if (!selectedTask && tasks[0]) setSelectedTask(tasks[0]._id);
    if (!manual.taskId && tasks[0]) setManual((prev) => ({ ...prev, taskId: tasks[0]._id }));
  }, [tasks, selectedTask, manual.taskId]);

  async function startTimer() {
    try {
      await api("/time-entries/timer/start", { method: "POST", body: { taskId: selectedTask } });
      await refreshData();
      setMessage("Timer started");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function stopTimer() {
    try {
      await api(`/time-entries/timer/stop/${activeTimer._id}`, { method: "PUT" });
      await refreshData();
      setMessage("Timer stopped and logged");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addManual(event) {
    event.preventDefault();
    try {
      await api("/time-entries", {
        method: "POST",
        body: {
          ...manual,
          startTime: new Date(manual.startTime).toISOString(),
          endTime: new Date(manual.endTime).toISOString()
        }
      });
      await refreshData();
      setMessage("Manual time entry added");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteEntry(entry) {
    try {
      await api(`/time-entries/${entry._id}`, { method: "DELETE" });
      await refreshData();
      setMessage("Time entry deleted");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="content-grid">
      <section className="panel timer-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Timer mode</p>
            <h2>{activeTimer ? formatSeconds(activeElapsed) : "Ready"}</h2>
          </div>
          {activeTimer ? <Pause size={22} /> : <Play size={22} />}
        </div>
        <label>Task<select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)} disabled={Boolean(activeTimer)}>{tasks.map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}</select></label>
        {activeTimer && <p className="timer-task">Tracking {getTask(activeTimer)?.title}</p>}
        <div className="timer-actions">
          {!activeTimer ? (
            <button className="primary-button" onClick={startTimer} disabled={!selectedTask}><Play size={18} /> Start</button>
          ) : (
            <button className="stop-button" onClick={stopTimer}><Square size={18} /> Stop</button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Manual mode</p>
            <h2>Add past work</h2>
          </div>
          <Clock3 size={20} />
        </div>
        <form className="form-stack" onSubmit={addManual}>
          <label>Task<select value={manual.taskId} onChange={(event) => setManual({ ...manual, taskId: event.target.value })}>{tasks.map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}</select></label>
          <label>Start<input type="datetime-local" value={manual.startTime} onChange={(event) => setManual({ ...manual, startTime: event.target.value })} required /></label>
          <label>End<input type="datetime-local" value={manual.endTime} onChange={(event) => setManual({ ...manual, endTime: event.target.value })} required /></label>
          <label>Note<input value={manual.note} onChange={(event) => setManual({ ...manual, note: event.target.value })} placeholder="Meeting, draft, coding..." /></label>
          <button className="primary-button" type="submit" disabled={!manual.taskId}><Plus size={18} /> Add entry</button>
        </form>
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Logbook</p>
            <h2>Recent sessions</h2>
          </div>
        </div>
        <Timeline entries={entries} onDelete={deleteEntry} />
      </section>
    </div>
  );
}

function ReportsView({ summary, range, setRange, token, api, setMessage }) {
  async function exportJson() {
    try {
      const payload = await api("/users/me/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "time-management-data.json";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function exportCsv() {
    try {
      await downloadCsv(`/reports/export/csv?from=${range.from}&to=${range.to}T23:59:59.999Z`, token);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="reports-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Date range</h2>
          </div>
        </div>
        <div className="form-stack">
          <label>From<input type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} /></label>
          <label>To<input type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} /></label>
          <button className="primary-button" onClick={exportCsv}><Download size={18} /> Export CSV</button>
          <button className="secondary-button" onClick={exportJson}><Download size={18} /> Export JSON</button>
        </div>
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h2>{summary?.totals?.hours || 0} hours tracked</h2>
          </div>
          <span className="count-pill">{summary?.totals?.entries || 0} entries</span>
        </div>
        <ProjectList projects={summary?.byProject || []} />
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2>Weekly view</h2>
          </div>
        </div>
        <div className="week-grid">
          {(summary?.daily || []).map((day) => (
            <div className="day-column" key={day.date}>
              <strong>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</strong>
              <span>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              <div className="day-fill" style={{ height: `${Math.min(160, day.hours * 24)}px` }}>{day.hours}h</div>
            </div>
          ))}
          {!summary?.daily?.length && <EmptyState title="No report data" text="Log time in this date range to populate charts." />}
        </div>
      </section>
    </div>
  );
}

function SettingsView({ user, api, onUser, logout, setMessage }) {
  const [form, setForm] = useState(user);

  async function saveSettings(event) {
    event.preventDefault();
    try {
      const payload = await api("/users/me", { method: "PUT", body: form });
      onUser(payload.user);
      localStorage.setItem("timeapp-user", JSON.stringify(payload.user));
      setMessage("Settings saved");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteAccount() {
    try {
      await api("/users/me", { method: "DELETE" });
      logout();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>Preferences</h2>
          </div>
          <UserRound size={20} />
        </div>
        <form className="form-stack" onSubmit={saveSettings}>
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email<input value={form.email} disabled /></label>
          <label>Timezone<input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label>
          <label>Daily work target<input type="number" min="1" max="24" value={form.defaultWorkHours} onChange={(event) => setForm({ ...form, defaultWorkHours: Number(event.target.value) })} /></label>
          <div className="theme-toggle">
            <button type="button" className={form.theme === "light" ? "selected" : ""} onClick={() => setForm({ ...form, theme: "light" })}><Sun size={18} /> Light</button>
            <button type="button" className={form.theme === "dark" ? "selected" : ""} onClick={() => setForm({ ...form, theme: "dark" })}><Moon size={18} /> Dark</button>
          </div>
          <button className="primary-button" type="submit">Save settings</button>
        </form>
      </section>
      <section className="panel danger-zone">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Data control</h2>
          </div>
          <Trash2 size={20} />
        </div>
        <p>Delete your account, tasks, and time entries from MongoDB.</p>
        <button className="stop-button" onClick={deleteAccount}><Trash2 size={18} /> Delete account</button>
      </section>
    </div>
  );
}

function ProjectList({ projects }) {
  const max = Math.max(...projects.map((project) => project.seconds), 1);
  return (
    <div className="project-list">
      {projects.map((project) => (
        <div className="project-row" key={project.project}>
          <div>
            <strong>{project.project}</strong>
            <span>{project.entries} entries</span>
          </div>
          <div className="project-meter"><span style={{ width: `${(project.seconds / max) * 100}%` }} /></div>
          <strong>{project.hours}h</strong>
        </div>
      ))}
      {!projects.length && <EmptyState title="No time logged" text="Project allocation appears after completed sessions." />}
    </div>
  );
}

function Timeline({ entries, onDelete }) {
  return (
    <div className="timeline">
      {entries.map((entry) => {
        const task = getTask(entry);
        return (
          <article className="timeline-item" key={entry._id}>
            <div className="timeline-dot" />
            <div>
              <div className="task-title-row">
                <h3>{task?.title || "Deleted task"}</h3>
                <span className="source-pill">{entry.source}</span>
              </div>
              <p>{task?.project || "General"} · {formatDateTime(entry.startTime)} - {formatDateTime(entry.endTime)}</p>
              {entry.note && <small>{entry.note}</small>}
            </div>
            <strong>{entry.endTime ? formatSeconds(entry.durationSeconds) : "Running"}</strong>
            {onDelete && entry.endTime && <button className="icon-button danger" onClick={() => onDelete(entry)} title="Delete entry"><Trash2 size={17} /></button>}
          </article>
        );
      })}
      {!entries.length && <EmptyState title="No sessions yet" text="Start a timer or add manual time to build your timeline." />}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <section className="metric-card">
      <div className="metric-icon"><Icon size={20} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="hero-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export default App;
