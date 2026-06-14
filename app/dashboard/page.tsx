'use client';

import { useEffect, useState, useRef, KeyboardEvent } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type CalEventCategory = 'work' | 'personal' | 'health';
type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  description: string | null;
  category: CalEventCategory;
};

type TaskCategory = 'work' | 'personal' | 'health' | 'other';
type Task = { id: string; text: string; done: boolean; category: TaskCategory };

type ReminderCategory = 'business' | 'health' | 'life' | 'payment' | 'travel';
type Reminder = { id: string; title: string; datetime: string; category: ReminderCategory };

type NewsItem = { title: string; link: string; pubDate: string; sourceLabel: string };
type NewsGroup = 'japan' | 'world' | 'economy';

type NavSection = 'compass' | 'calendar' | 'tasks' | 'reminders' | 'news';

type Wisdom = { tradition: string; author: string; quote: string; source: string; dateStr: string };

// ── Color tokens ───────────────────────────────────────────────────────────────
const BG      = '#0d0d0d';
const SIDEBAR = '#111111';
const CARD    = '#171717';
const BORDER  = '#242424';
const TEXT    = '#e0e0e0';
const MUTED   = '#6b7280';
const ACCENT  = '#6366f1';
const GOLD    = '#c9993a';

// ── Category metadata ──────────────────────────────────────────────────────────
const TASK_CATS: TaskCategory[] = ['work', 'personal', 'health', 'other'];
const TASK_LABELS: Record<TaskCategory, string> = { work: '仕事', personal: '個人', health: '健康', other: 'その他' };
const TASK_COLORS: Record<TaskCategory, string> = { work: '#6366f1', personal: '#ec4899', health: '#10b981', other: '#f59e0b' };

const CAL_CAT_LABELS: Record<CalEventCategory, string> = { work: '仕事', personal: '個人', health: '健康' };

const BADGE_BASE = 'inline-flex items-center text-[0.65rem] px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 font-medium leading-none';

const CAL_CAT_BADGE: Record<CalEventCategory, string> = {
  work:     'bg-amber-50 text-amber-800 border-amber-200',
  personal: 'bg-sky-50 text-sky-800 border-sky-200',
  health:   'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const TASK_CAT_BADGE: Record<TaskCategory, string> = {
  work:     'bg-amber-50 text-amber-800 border-amber-200',
  personal: 'bg-sky-50 text-sky-800 border-sky-200',
  health:   'bg-emerald-50 text-emerald-800 border-emerald-200',
  other:    'bg-stone-100 text-stone-600 border-stone-200',
};

const WEEK_CHIP: Record<CalEventCategory, string> = {
  work:     'bg-amber-900/50 text-amber-200',
  personal: 'bg-sky-900/50 text-sky-200',
  health:   'bg-emerald-900/50 text-emerald-200',
};

const REM_CATS: ReminderCategory[] = ['business', 'health', 'life', 'payment', 'travel'];
const REM_LABELS: Record<ReminderCategory, string> = { business: 'ビジネス', health: '健康', life: 'ライフ', payment: '支払い', travel: '旅行' };
const REM_COLORS: Record<ReminderCategory, string> = { business: '#6366f1', health: '#10b981', life: '#8b5cf6', payment: '#ef4444', travel: '#06b6d4' };

const WEEK_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

const NEWS_GROUP_LABELS: Record<NewsGroup, string> = {
  japan:   '日本',
  world:   '世界',
  economy: '経済',
};

const FEED_META: Record<string, { label: string; group: NewsGroup }> = {
  nikkei:   { label: 'NHK',       group: 'japan'   },
  guardian: { label: 'Guardian',  group: 'world'   },
  bbc:      { label: 'BBC',       group: 'world'   },
  nyt:      { label: 'NYT',       group: 'world'   },
  wsj:      { label: 'WSJ',       group: 'economy' },
  ft:       { label: 'FT',        group: 'economy' },
  economist:{ label: 'Economist', group: 'economy' },
  cnbc:     { label: 'CNBC',      group: 'economy' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const HEALTH_RE = /病院|歯科|デンタル|クリニック|検診|健診|ジム|ランニング|筋トレ|治療|診察|カウンセリング|マッサージ|整体/i;
const PERSONAL_RE = /プライベート|家族|旅行|買い物|ショッピング|映画|友人|休み|休暇|デート|習い事|美容|ヘアサロン|散髪/i;

function categorizeEvent(summary: string, description: string | null): CalEventCategory {
  const text = [summary, description ?? ''].join(' ').normalize('NFKC').toLowerCase();
  if (HEALTH_RE.test(text)) return 'health';
  if (PERSONAL_RE.test(text)) return 'personal';
  return 'work';
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmtTime(iso: string): string {
  if (!iso.includes('T')) return '終日';
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1);
  let startDow = firstDay.getDay() - 1; // 0=Mon … 6=Sun
  if (startDow < 0) startDow = 6;
  const totalDays = new Date(year, month, 0).getDate();
  const cells: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push(new Date(year, month - 1, -i));
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month - 1, d));
  const rem = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= rem; d++) cells.push(new Date(year, month, d));
  const weeks: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: WEEK_LABELS[i],
      date: d,
      dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: d.toDateString() === today.toDateString(),
      isSat: i === 5,
      isSun: i === 6,
    };
  });
}

function relativeTime(pubDate: string): string {
  if (!pubDate) return '';
  const ms = Date.now() - new Date(pubDate).getTime();
  if (isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)  return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: CARD,
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  border: `1px solid ${BORDER}`,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#0a0a0a',
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  color: TEXT,
  padding: '0.5rem 0.75rem',
  fontSize: '0.85rem',
  outline: 'none',
  fontFamily: 'inherit',
  minWidth: 0,
};

function btnStyle(bg: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    background: bg,
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.82rem',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit',
    flexShrink: 0,
  };
}

function pillStyle(color: string): React.CSSProperties {
  return {
    fontSize: '0.63rem',
    padding: '2px 8px',
    borderRadius: 12,
    background: color + '22',
    color,
    border: `1px solid ${color}44`,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: TEXT, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.01em' }}>
        {icon} {title}
      </h2>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: MUTED }}>{sub}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.82rem', padding: '1.25rem 0', margin: 0 }}>{msg}</p>;
}

function EventRow({ event }: { event: CalEvent }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.6rem 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 95, fontSize: '0.75rem', color: MUTED, paddingTop: 2, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {fmtTime(event.start)}{event.start.includes('T') ? ` – ${fmtTime(event.end)}` : ''}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', color: TEXT, fontWeight: 500 }}>{event.summary}</div>
        {event.location && (
          <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {event.location}
          </div>
        )}
      </div>
      <span className={`${BADGE_BASE} ${CAL_CAT_BADGE[event.category]}`}>{CAL_CAT_LABELS[event.category]}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [now, setNow]               = useState(new Date());
  const [activeNav, setActiveNav]   = useState<NavSection>('calendar');

  // Calendar — week view
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [weekEvents, setWeekEvents]   = useState<CalEvent[]>([]);
  const [calLoading, setCalLoading]   = useState(true);
  const [calError, setCalError]       = useState<string | null>(null);
  const [calSending, setCalSending]   = useState(false);
  const [calSent, setCalSent]         = useState(false);

  // Calendar — month view
  const [calView, setCalView]             = useState<'week' | 'month'>('week');
  const [monthViewDate, setMonthViewDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [monthEvents, setMonthEvents]     = useState<CalEvent[]>([]);
  const [monthLoading, setMonthLoading]   = useState(false);
  const [monthError, setMonthError]       = useState<string | null>(null);

  // Tasks
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCat, setNewTaskCat]   = useState<TaskCategory>('work');
  const [taskFilter, setTaskFilter]   = useState<TaskCategory | 'all'>('all');

  // Reminders
  const [reminders, setReminders]     = useState<Reminder[]>([]);
  const [remTitle, setRemTitle]       = useState('');
  const [remDatetime, setRemDatetime] = useState('');
  const [remCat, setRemCat]           = useState<ReminderCategory>('business');
  const [remSending, setRemSending]   = useState(false);
  const [remSent, setRemSent]         = useState(false);

  // News
  const [newsData, setNewsData]         = useState<Record<string, Array<{ title: string; link: string; pubDate: string }>>>({});
  const [newsGroup, setNewsGroup]       = useState<NewsGroup>('japan');
  const [newsLoading, setNewsLoading]   = useState(true);
  const [newsErrors, setNewsErrors]     = useState<string[]>([]);

  // Compass
  const [wisdom, setWisdom]               = useState<Wisdom | null>(null);
  const [wisdomLoading, setWisdomLoading] = useState(true);
  const [wisdomDate, setWisdomDate]       = useState('');

  const compassRef = useRef<HTMLDivElement>(null);
  const calRef     = useRef<HTMLDivElement>(null);
  const taskRef    = useRef<HTMLDivElement>(null);
  const remRef     = useRef<HTMLDivElement>(null);
  const newsRef    = useRef<HTMLDivElement>(null);
  const loadedRef        = useRef(false);
  const lastFetchDateRef = useRef('');

  // ── Fetchers ──────────────────────────────────────────────────────────────
  function fetchWisdom() {
    setWisdomLoading(true);
    fetch('/api/compass')
      .then(r => r.json())
      .then((data: Wisdom) => {
        setWisdom(data);
        setWisdomDate(data.dateStr ?? '');
        lastFetchDateRef.current = new Date().toDateString();
      })
      .catch(() => {})
      .finally(() => setWisdomLoading(false));
  }

  function fetchCalendar() {
    const days = getWeekDays();
    const from = days[0].date.toISOString();
    const endDate = new Date(days[6].date);
    endDate.setDate(endDate.getDate() + 1);
    const to = endDate.toISOString();
    setCalLoading(true);
    setCalError(null);
    fetch(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        type RawEvent = Omit<CalEvent, 'category'>;
        const allEvents: CalEvent[] = (data.events as RawEvent[]).map(e => ({
          ...e,
          category: categorizeEvent(e.summary, e.description),
        }));
        const todayStr = new Date().toDateString();
        setTodayEvents(allEvents.filter(e => {
          const d = new Date(e.start.includes('T') ? e.start : e.start + 'T00:00:00');
          return d.toDateString() === todayStr;
        }));
        setWeekEvents(allEvents);
      })
      .catch((e: Error) => setCalError(e.message))
      .finally(() => setCalLoading(false));
  }

  // Clock + date-change detection
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNow(n);
      const today = n.toDateString();
      if (lastFetchDateRef.current && lastFetchDateRef.current !== today) {
        fetchWisdom();
        fetchCalendar();
      }
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch today's wisdom
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchWisdom(); }, []);

  // Persist — server-side JSON files
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.tasks))     setTasks(data.tasks);
        if (Array.isArray(data.reminders)) setReminders(data.reminders);
        loadedRef.current = true;
      });
  }, []);
  useEffect(() => {
    if (!loadedRef.current) return;
    fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) });
  }, [tasks]);
  useEffect(() => {
    if (!loadedRef.current) return;
    fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reminders }) });
  }, [reminders]);

  // Fetch calendar (month view)
  useEffect(() => {
    if (calView !== 'month') return;
    const { year, month } = monthViewDate;
    setMonthLoading(true);
    setMonthError(null);
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();
    fetch(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        type RawEvent = Omit<CalEvent, 'category'>;
        setMonthEvents((data.events as RawEvent[]).map(e => ({
          ...e, category: categorizeEvent(e.summary, e.description),
        })));
      })
      .catch((e: Error) => setMonthError(e.message))
      .finally(() => setMonthLoading(false));
  }, [calView, monthViewDate]);

  // Fetch calendar (this week) + 30-min auto-refresh
  useEffect(() => {
    fetchCalendar();
    const t = setInterval(fetchCalendar, 30 * 60 * 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch News + 60-min auto-refresh
  useEffect(() => {
    function fetchNews() {
      setNewsLoading(true);
      fetch('/api/news')
        .then(r => r.json())
        .then(data => {
          setNewsData(data.results ?? {});
          if (data.errors) setNewsErrors(data.errors);
        })
        .catch((e: Error) => setNewsErrors([e.message]))
        .finally(() => setNewsLoading(false));
    }
    fetchNews();
    const t = setInterval(fetchNews, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  function navTo(section: NavSection) {
    setActiveNav(section);
    const refMap: Record<NavSection, React.RefObject<HTMLDivElement>> = {
      compass:   compassRef,
      calendar:  calRef,
      tasks:     taskRef,
      reminders: remRef,
      news:      newsRef,
    };
    refMap[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addTask() {
    if (!newTaskText.trim()) return;
    setTasks(p => [...p, { id: uid(), text: newTaskText.trim(), done: false, category: newTaskCat }]);
    setNewTaskText('');
  }

  function addReminder() {
    if (!remTitle.trim() || !remDatetime) return;
    setReminders(p => [...p, { id: uid(), title: remTitle.trim(), datetime: remDatetime, category: remCat }]);
    setRemTitle('');
    setRemDatetime('');
  }

  function navigateMonth(delta: number) {
    setMonthViewDate(prev => {
      let { year, month } = prev;
      month += delta;
      if (month > 12) { month = 1; year++; }
      if (month < 1)  { month = 12; year--; }
      return { year, month };
    });
  }

  async function sendCalEmail() {
    setCalSending(true);
    try {
      const res = await fetch('/api/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: todayEvents }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setCalSent(true);
    } catch (e: unknown) {
      alert('送信失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCalSending(false);
    }
  }

  async function sendRemEmail() {
    setRemSending(true);
    try {
      const events = reminders.map(r => ({
        summary: `[${REM_LABELS[r.category]}] ${r.title}`,
        start: new Date(r.datetime).toISOString(),
        end: new Date(r.datetime).toISOString(),
      }));
      const res = await fetch('/api/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setRemSent(true);
      setTimeout(() => setRemSent(false), 3000);
    } catch (e: unknown) {
      alert('送信失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRemSending(false);
    }
  }

  const hour = now.getHours();
  const greeting   = hour < 5 ? '深夜です' : hour < 12 ? 'おはようございます' : hour < 17 ? 'こんにちは' : 'こんばんは';
  const greetEmoji = hour < 5 ? '🌙' : hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌆';
  const weekDays   = getWeekDays();
  const filteredTasks = taskFilter === 'all' ? tasks : tasks.filter(t => t.category === taskFilter);
  const doneTasks = tasks.filter(t => t.done).length;

  const NAV_ITEMS: { key: NavSection; icon: string; label: string }[] = [
    { key: 'compass',   icon: '🧭', label: 'Compass' },
    { key: 'calendar',  icon: '📅', label: 'カレンダー' },
    { key: 'tasks',     icon: '✅', label: 'タスク' },
    { key: 'reminders', icon: '🔔', label: 'リマインダー' },
    { key: 'news',      icon: '📰', label: 'ニュース' },
  ];

  const currentNews: NewsItem[] = Object.entries(newsData)
    .filter(([key]) => FEED_META[key]?.group === newsGroup)
    .flatMap(([key, items]) => items.map(item => ({
      ...item,
      sourceLabel: FEED_META[key]?.label ?? key,
    })))
    .sort((a, b) => {
      const ta = new Date(a.pubDate).getTime();
      const tb = new Date(b.pubDate).getTime();
      if (isNaN(ta) && isNaN(tb)) return 0;
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      return tb - ta;
    });

  return (
    <div style={{
      display: 'flex', height: '100vh', background: BG, color: TEXT, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
      fontSize: '14px',
    }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: 240, background: SIDEBAR, borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', padding: '1.25rem 0.75rem',
        gap: '0.65rem', flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{ padding: '0.25rem 0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', color: TEXT }}>
            🧭 Life Compass
          </span>
        </div>

        {/* Clock */}
        <div style={{ ...cardStyle, padding: '0.85rem 1rem' }}>
          <div style={{
            fontSize: '1.85rem', fontWeight: 200, letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: TEXT,
          }}>
            {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.67rem', color: MUTED, marginTop: '0.45rem', lineHeight: 1.5 }}>
            {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
        </div>

        {/* Status */}
        <div style={{ ...cardStyle, padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '1.35rem', lineHeight: 1, marginBottom: '0.35rem' }}>{greetEmoji}</div>
          <div style={{ fontSize: '0.8rem', color: TEXT, fontWeight: 500 }}>{greeting}</div>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: '0.67rem', color: MUTED }}>
              📅 今日の予定&nbsp;
              <span style={{ color: calLoading ? MUTED : TEXT, fontWeight: 600 }}>
                {calLoading ? '…' : todayEvents.length}
              </span> 件
            </div>
            <div style={{ fontSize: '0.67rem', color: MUTED }}>
              ✅ 未完了タスク&nbsp;
              <span style={{ color: TEXT, fontWeight: 600 }}>{tasks.filter(t => !t.done).length}</span> 件
            </div>
            <div style={{ fontSize: '0.67rem', color: MUTED }}>
              🔔 リマインダー&nbsp;
              <span style={{ color: TEXT, fontWeight: 600 }}>{reminders.length}</span> 件
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ marginTop: '0.25rem' }}>
          <div style={{ fontSize: '0.58rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0.5rem', marginBottom: '0.4rem' }}>
            Navigation
          </div>
          {NAV_ITEMS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => navTo(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', fontSize: '0.85rem',
                background: activeNav === key ? ACCENT + '18' : 'transparent',
                color: activeNav === key ? '#818cf8' : MUTED,
                fontWeight: activeNav === key ? 600 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', minWidth: 0 }}>

        {/* ── Compass ──────────────────────────────────────────────────── */}
        <div ref={compassRef} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
          <SectionHeader icon="🧭" title="今日のCompass" sub={wisdomDate || '毎日変わる知恵の言葉'} />
          {wisdomLoading && (
            <div style={{ ...cardStyle, color: MUTED, fontSize: '0.82rem' }}>読み込み中...</div>
          )}
          {!wisdomLoading && wisdom && (
            <div style={{
              ...cardStyle,
              border: `1px solid ${GOLD}33`,
              position: 'relative',
              overflow: 'hidden',
              padding: '2rem 2.5rem',
            }}>
              {/* Gold top accent line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${GOLD}, transparent)`,
              }} />

              {/* Tradition badge */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                <span style={{
                  fontSize: '0.68rem', padding: '3px 12px', borderRadius: 20,
                  background: GOLD + '18', color: GOLD, border: `1px solid ${GOLD}44`,
                  fontWeight: 600, letterSpacing: '0.04em',
                }}>
                  {wisdom.tradition}
                </span>
              </div>

              {/* Quote */}
              <blockquote style={{
                margin: '0 0 1.5rem',
                padding: '0 0 0 1.5rem',
                borderLeft: `3px solid ${GOLD}`,
                fontFamily: "Georgia, 'Times New Roman', 'Hiragino Mincho ProN', serif",
                fontSize: '1.15rem',
                lineHeight: 2,
                color: '#e8e8e8',
                fontWeight: 300,
                letterSpacing: '0.02em',
              }}>
                「{wisdom.quote}」
              </blockquote>

              {/* Author + source */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: GOLD, fontSize: '0.85rem', fontWeight: 500 }}>
                  — {wisdom.author}
                </span>
                <span style={{ color: MUTED, fontSize: '0.75rem', fontStyle: 'italic' }}>
                  {wisdom.source}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Calendar ─────────────────────────────────────────────────── */}
        <div ref={calRef} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
          <SectionHeader icon="📅" title="Googleカレンダー" sub="今日・今週・月表示で確認" />

          {/* View tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
            {(['week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setCalView(v)}
                style={{
                  padding: '4px 16px', borderRadius: 20, fontSize: '0.75rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${calView === v ? ACCENT : BORDER}`,
                  background: calView === v ? ACCENT + '20' : 'transparent',
                  color: calView === v ? '#818cf8' : MUTED,
                  fontWeight: calView === v ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {v === 'week' ? '今週' : '月表示'}
              </button>
            ))}
          </div>

          {/* ── Week view ── */}
          {calView === 'week' && (
            <>
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    今日の予定
                    <span style={{ background: ACCENT + '22', color: '#818cf8', fontSize: '0.65rem', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>
                      {calLoading ? '…' : todayEvents.length}
                    </span>
                  </div>
                  <button
                    onClick={sendCalEmail}
                    disabled={calSending || calSent || calLoading}
                    style={btnStyle(calSent ? '#10b981' : ACCENT, calSending || calSent || calLoading)}
                  >
                    {calSent ? '✓ 送信済み' : calSending ? '送信中...' : 'Gmail に送信'}
                  </button>
                </div>

                {calLoading && <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>読み込み中...</p>}
                {calError  && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>⚠ {calError}</p>}
                {!calLoading && !calError && todayEvents.length === 0 && <Empty msg="今日の予定はありません" />}
                {todayEvents.map(e => <EventRow key={e.id} event={e} />)}
              </div>

              <div style={{ ...cardStyle, marginTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.85rem' }}>今週の予定</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                  {weekDays.map(day => {
                    const evs = weekEvents.filter(e => {
                      const d = new Date(e.start.includes('T') ? e.start : e.start + 'T00:00:00');
                      return d.toDateString() === day.date.toDateString();
                    });
                    const dayColor = day.isSun ? '#ef4444' : day.isSat ? '#06b6d4' : MUTED;
                    return (
                      <div key={day.label} style={{
                        background: day.isToday ? ACCENT + '12' : '#111',
                        border: `1px solid ${day.isToday ? ACCENT + '55' : BORDER}`,
                        borderRadius: 8, padding: '0.55rem 0.45rem', minHeight: 76,
                      }}>
                        <div style={{ fontSize: '0.67rem', fontWeight: 700, color: day.isToday ? '#818cf8' : dayColor }}>{day.label}</div>
                        <div style={{ fontSize: '0.62rem', color: MUTED, marginBottom: '0.35rem' }}>{day.dateStr}</div>
                        {evs.slice(0, 2).map(e => (
                          <div key={e.id} className={`text-[0.59rem] rounded-sm px-1 mb-0.5 truncate ${WEEK_CHIP[e.category]}`}>
                            {e.summary}
                          </div>
                        ))}
                        {evs.length > 2 && (
                          <div style={{ fontSize: '0.57rem', color: MUTED }}>+{evs.length - 2} 件</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Month view ── */}
          {calView === 'month' && (
            <div style={cardStyle}>
              {/* Month navigation header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button
                  onClick={() => navigateMonth(-1)}
                  style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, cursor: 'pointer', fontSize: '0.85rem', padding: '3px 10px', fontFamily: 'inherit', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = TEXT; }}
                  onMouseLeave={e => { e.currentTarget.style.color = MUTED; }}
                >◀</button>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>
                  {monthViewDate.year}年{monthViewDate.month}月
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, cursor: 'pointer', fontSize: '0.85rem', padding: '3px 10px', fontFamily: 'inherit', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = TEXT; }}
                  onMouseLeave={e => { e.currentTarget.style.color = MUTED; }}
                >▶</button>
              </div>

              {/* Day-of-week header row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
                {WEEK_LABELS.map((lbl, i) => (
                  <div key={lbl} style={{
                    textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, padding: '4px 0',
                    color: i === 6 ? '#ef4444' : i === 5 ? '#06b6d4' : MUTED,
                  }}>
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Loading / error */}
              {monthLoading && <p style={{ color: MUTED, fontSize: '0.82rem', margin: '1rem 0', textAlign: 'center' }}>読み込み中...</p>}
              {monthError  && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: '1rem 0' }}>⚠ {monthError}</p>}

              {/* Month grid */}
              {!monthLoading && !monthError && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {getMonthGrid(monthViewDate.year, monthViewDate.month).flat().map((date, idx) => {
                    const isCurrentMonth = date.getMonth() === monthViewDate.month - 1;
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSat = idx % 7 === 5;
                    const isSun = idx % 7 === 6;
                    const dateColor = isSun ? '#ef4444' : isSat ? '#06b6d4' : (isToday ? '#818cf8' : (isCurrentMonth ? TEXT : MUTED));
                    const evs = monthEvents.filter(e => {
                      const d = new Date(e.start.includes('T') ? e.start : e.start + 'T00:00:00');
                      return d.toDateString() === date.toDateString();
                    });
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isToday ? ACCENT + '12' : isCurrentMonth ? '#111' : '#0a0a0a',
                          border: `1px solid ${isToday ? ACCENT + '55' : BORDER}`,
                          borderRadius: 6,
                          padding: '5px 5px 4px',
                          minHeight: 72,
                          opacity: isCurrentMonth ? 1 : 0.4,
                        }}
                      >
                        <div style={{
                          fontSize: '0.67rem', fontWeight: isToday ? 700 : 500,
                          color: dateColor,
                          marginBottom: '3px',
                          lineHeight: 1,
                        }}>
                          {date.getDate()}
                        </div>
                        {evs.slice(0, 2).map(e => (
                          <div key={e.id} className={`text-[0.59rem] rounded-sm px-1 mb-0.5 truncate ${WEEK_CHIP[e.category]}`}>
                            {e.summary}
                          </div>
                        ))}
                        {evs.length > 2 && (
                          <div style={{ fontSize: '0.55rem', color: MUTED }}>+{evs.length - 2} 件</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tasks ────────────────────────────────────────────────────── */}
        <div ref={taskRef} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
          <SectionHeader icon="✅" title="タスクリスト" sub="日々のタスクをチェックリストで管理" />
          <div style={cardStyle}>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <input
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addTask()}
                placeholder="新しいタスクを追加... (Enter で追加)"
                style={inputStyle}
              />
              <select
                value={newTaskCat}
                onChange={e => setNewTaskCat(e.target.value as TaskCategory)}
                style={{ ...inputStyle, flex: 'none', width: 88 }}
              >
                {TASK_CATS.map(c => <option key={c} value={c}>{TASK_LABELS[c]}</option>)}
              </select>
              <button onClick={addTask} style={btnStyle(ACCENT, false)}>追加</button>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {(['all', ...TASK_CATS] as Array<'all' | TaskCategory>).map(c => (
                <button
                  key={c}
                  onClick={() => setTaskFilter(c)}
                  style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: taskFilter === c ? 600 : 400,
                    border: `1px solid ${taskFilter === c ? (c === 'all' ? ACCENT : TASK_COLORS[c]) : BORDER}`,
                    background: taskFilter === c ? (c === 'all' ? ACCENT + '22' : TASK_COLORS[c] + '22') : 'transparent',
                    color: taskFilter === c ? (c === 'all' ? '#818cf8' : TASK_COLORS[c]) : MUTED,
                  }}
                >
                  {c === 'all' ? 'すべて' : TASK_LABELS[c]}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 && <Empty msg="タスクがありません" />}
            {filteredTasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.55rem 0', borderBottom: `1px solid ${BORDER}`,
              }}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: ACCENT, flexShrink: 0 }}
                />
                <span style={{
                  flex: 1, fontSize: '0.875rem', minWidth: 0,
                  textDecoration: t.done ? 'line-through' : 'none',
                  color: t.done ? MUTED : TEXT,
                  transition: 'color 0.2s',
                }}>
                  {t.text}
                </span>
                <span className={`${BADGE_BASE} ${TASK_CAT_BADGE[t.category]}`}>{TASK_LABELS[t.category]}</span>
                <button
                  onClick={() => setTasks(p => p.filter(x => x.id !== t.id))}
                  style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}

            {tasks.length > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ height: 4, flex: 1, background: BORDER, borderRadius: 4, marginRight: '1rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${tasks.length ? (doneTasks / tasks.length) * 100 : 0}%`, background: '#10b981', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: MUTED, flexShrink: 0 }}>
                  {doneTasks} / {tasks.length} 完了
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Reminders ────────────────────────────────────────────────── */}
        <div ref={remRef} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
          <SectionHeader icon="🔔" title="リマインダー" sub="Gmailでメール通知するリマインダーを管理" />
          <div style={cardStyle}>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                value={remTitle}
                onChange={e => setRemTitle(e.target.value)}
                placeholder="リマインダーのタイトル"
                style={{ ...inputStyle, flex: '2 1 180px' }}
              />
              <input
                type="datetime-local"
                value={remDatetime}
                onChange={e => setRemDatetime(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 160px', colorScheme: 'dark' } as React.CSSProperties}
              />
              <select
                value={remCat}
                onChange={e => setRemCat(e.target.value as ReminderCategory)}
                style={{ ...inputStyle, flex: '1 1 110px' }}
              >
                {REM_CATS.map(c => <option key={c} value={c}>{REM_LABELS[c]}</option>)}
              </select>
              <button onClick={addReminder} style={btnStyle(ACCENT, false)}>登録</button>
            </div>

            {reminders.length === 0 && <Empty msg="リマインダーがありません" />}
            {reminders
              .slice()
              .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
              .map(r => {
                const isPast = new Date(r.datetime) < new Date();
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0', borderBottom: `1px solid ${BORDER}`,
                    opacity: isPast ? 0.55 : 1,
                  }}>
                    <span style={pillStyle(REM_COLORS[r.category])}>{REM_LABELS[r.category]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', color: TEXT }}>{r.title}</div>
                      <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 2 }}>
                        {new Date(r.datetime).toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        {isPast && <span style={{ marginLeft: 6, color: '#ef4444' }}>期限切れ</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setReminders(p => p.filter(x => x.id !== r.id))}
                      style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}

            {reminders.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={sendRemEmail}
                  disabled={remSending || remSent}
                  style={btnStyle(remSent ? '#10b981' : ACCENT, remSending || remSent)}
                >
                  {remSent ? '✓ 送信済み' : remSending ? '送信中...' : `Gmail に一括送信 (${reminders.length}件)`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── News ─────────────────────────────────────────────────────── */}
        <div ref={newsRef} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
          <SectionHeader icon="📰" title="ニュース" sub="NHK・Guardian・BBC・NYT・WSJ・FT・Economist・CNBC" />
          <div style={cardStyle}>

            {/* Group tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem', borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.75rem' }}>
              {(['japan', 'world', 'economy'] as NewsGroup[]).map(g => (
                <button
                  key={g}
                  onClick={() => setNewsGroup(g)}
                  style={{
                    padding: '4px 20px', borderRadius: 20, fontSize: '0.78rem',
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${newsGroup === g ? ACCENT : BORDER}`,
                    background: newsGroup === g ? ACCENT + '20' : 'transparent',
                    color: newsGroup === g ? '#818cf8' : MUTED,
                    fontWeight: newsGroup === g ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {NEWS_GROUP_LABELS[g]}
                </button>
              ))}
            </div>

            {newsLoading && (
              <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>読み込み中...</p>
            )}
            {!newsLoading && newsErrors.length > 0 && (
              <p style={{ color: '#f59e0b', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
                ⚠ 一部フィードの取得に失敗しました
              </p>
            )}
            {!newsLoading && currentNews.length === 0 && (
              <Empty msg="記事を取得できませんでした" />
            )}
            {currentNews.map((item, i) => {
              const rel = relativeTime(item.pubDate);
              return (
                <div
                  key={i}
                  style={{
                    padding: '0.65rem 0',
                    borderBottom: i < currentNews.length - 1 ? `1px solid ${BORDER}` : 'none',
                    display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                  }}
                >
                  <span style={{
                    flexShrink: 0, marginTop: '3px',
                    fontSize: '0.62rem', padding: '2px 7px', borderRadius: 10,
                    background: ACCENT + '18', color: '#818cf8',
                    border: `1px solid ${ACCENT}33`,
                    whiteSpace: 'nowrap', fontWeight: 600,
                  }}>
                    {item.sourceLabel}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block', color: TEXT, textDecoration: 'none',
                        fontSize: '0.875rem', lineHeight: 1.55,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
                    >
                      {item.title}
                    </a>
                    {rel && (
                      <span style={{ fontSize: '0.67rem', color: MUTED, marginTop: '2px', display: 'block' }}>
                        {rel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
