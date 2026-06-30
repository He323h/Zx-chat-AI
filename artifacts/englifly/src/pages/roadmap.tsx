import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, CheckCircle, BookOpen } from "lucide-react";
import { getTopicsWithStatus, completeTopic, type TopicStatus, type RoadmapTopic } from "@/lib/roadmapData";
import { addTopic, recordAnswer, logActivity } from "@/lib/dailyStats";

type TopicWithStatus = RoadmapTopic & { status: TopicStatus };
const GROUPS: RoadmapTopic["group"][] = ["Present Tense", "Past Tense", "Future Tense"];

export default function RoadmapPage() {
  const [, setLocation] = useLocation();
  const [topics, setTopics] = useState<TopicWithStatus[]>(() => getTopicsWithStatus());
  const [openId, setOpenId] = useState<string | null>(() => topics.find(t => t.status === "current")?.id ?? topics[0]?.id ?? null);
  const completedCount = topics.filter(t => t.status === "completed").length;

  function finish(topic: TopicWithStatus) {
    if (topic.status === "locked") return;
    const updated = completeTopic(topic.id);
    addTopic(topic.title);
    recordAnswer(true);
    logActivity("roadmap", `${topic.title} completed`);
    const next = getTopicsWithStatus().map(t => ({ ...t, status: updated[t.id] ?? t.status }));
    setTopics(next);
    setOpenId(next.find(t => t.status === "current")?.id ?? topic.id);
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "linear-gradient(135deg,#eefdf7,#eef6ff 55%,#f7efff)" }}>
      <div className="px-4 pt-10 pb-6" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
        <div className="flex items-center gap-3 mb-4"><button onClick={() => setLocation("/home")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}><ArrowLeft size={18} className="text-white" /></button><div className="flex-1"><p className="text-white font-bold text-lg leading-tight">Tense-Based Learning Path</p><p className="text-white/70 text-xs">Let's start with Present Tense before moving to Past and Future</p></div></div>
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.15)" }}><div className="flex items-center justify-between mb-2"><p className="text-white text-sm font-semibold">Overall Progress</p><p className="text-white font-bold">{completedCount}/{topics.length}</p></div><div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}><div className="h-2 rounded-full transition-all duration-500 bg-white" style={{ width: `${(completedCount / topics.length) * 100}%` }} /></div></div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {GROUPS.map(group => {
          const groupTopics = topics.filter(t => t.group === group);
          const done = groupTopics.filter(t => t.status === "completed").length;
          const locked = groupTopics.every(t => t.status === "locked");
          return <section key={group} className="rounded-3xl bg-white/82 backdrop-blur p-4 shadow-sm border border-white">
            <div className="flex items-center justify-between mb-3"><div><p className="font-black text-slate-800">{group} <span className="text-emerald-600">({done}/3 completed)</span></p><p className="text-xs text-slate-500">{locked ? `${group} locked until previous tense is done` : "Complete quizzes to unlock the next tense"}</p></div>{locked && <Lock size={18} className="text-slate-400" />}</div>
            <div className="space-y-3">{groupTopics.map((topic, i) => {
              const isOpen = openId === topic.id;
              const lockedTopic = topic.status === "locked";
              return <div key={topic.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: topic.status === "completed" ? "#22c55e" : topic.status === "current" ? "#38bdf8" : "#e2e8f0", background: lockedTopic ? "#f8fafc" : "white" }}>
                <button disabled={lockedTopic} onClick={() => setOpenId(isOpen ? null : topic.id)} className="w-full p-3 flex items-center gap-3 text-left active:scale-[0.99] transition-all" style={{ opacity: lockedTopic ? 0.55 : 1 }}><span className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: topic.status === "completed" ? "#dcfce7" : topic.status === "current" ? "#e0f2fe" : "#f1f5f9" }}>{topic.status === "completed" ? <CheckCircle size={18} className="text-green-600" /> : lockedTopic ? <Lock size={15} className="text-slate-400" /> : topic.emoji}</span><div className="flex-1"><p className="font-bold text-sm text-slate-800">{i + 1}. {topic.title}</p><p className="text-xs text-slate-500">{topic.description}</p></div></button>
                {isOpen && !lockedTopic && <div className="px-4 pb-4 space-y-3 fade-up"><Info title="1) Rule / Formula" body={topic.formula} /><Info title="2) Examples" body={topic.examples.join("\n")} /><Info title="3) Practice" body={topic.practice.join("\n")} /><Info title="4) Quiz to unlock next" body={topic.quiz} /><button onClick={() => finish(topic)} className="w-full py-3 rounded-2xl text-white font-bold btn-3d flex items-center justify-center gap-2" style={{ background: topic.status === "completed" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#0ea5e9,#10b981)" }}><BookOpen size={16} />{topic.status === "completed" ? "Completed" : "Pass Quiz & Complete"}</button></div>}
              </div>;
            })}</div>
          </section>;
        })}
      </div>
    </div>
  );
}

function Info({ title, body }: { title: string; body: string }) { return <div className="rounded-2xl p-3" style={{ background: "rgba(240,249,255,0.8)", border: "1px solid rgba(125,211,252,0.35)" }}><p className="text-xs font-black text-sky-700 mb-1">{title}</p><p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{body}</p></div>; }
