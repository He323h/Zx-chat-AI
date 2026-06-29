export type TopicStatus = "completed" | "current" | "locked";

export interface RoadmapTopic {
  id: string;
  title: string;
  emoji: string;
  description: string;
  defaultStatus: TopicStatus;
}

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  { id: "greetings",    title: "Greetings",        emoji: "👋", description: "Hello, Hi, Good morning — basic intros", defaultStatus: "completed" },
  { id: "numbers",      title: "Numbers & Time",   emoji: "🔢", description: "1 to 100, days, months, telling time",  defaultStatus: "current"   },
  { id: "colors",       title: "Colors & Shapes",  emoji: "🎨", description: "Describe things around you",            defaultStatus: "locked"    },
  { id: "family",       title: "Family & People",  emoji: "👨‍👩‍👧", description: "Mother, father, brother, sister...",    defaultStatus: "locked"    },
  { id: "food",         title: "Food & Drinks",    emoji: "🍕", description: "Order food, describe meals",            defaultStatus: "locked"    },
  { id: "directions",   title: "Directions",       emoji: "🗺️", description: "Left, right, near, far — navigate!",   defaultStatus: "locked"    },
  { id: "shopping",     title: "Shopping",         emoji: "🛍️", description: "Buy things, ask prices, bargain",      defaultStatus: "locked"    },
  { id: "travel",       title: "Travel English",   emoji: "✈️", description: "Airport, hotel, sightseeing",          defaultStatus: "locked"    },
  { id: "jobs",         title: "Jobs & Work",      emoji: "💼", description: "Interview, describe your job",         defaultStatus: "locked"    },
  { id: "health",       title: "Health & Body",    emoji: "🏥", description: "Doctor visit, symptoms, medicine",     defaultStatus: "locked"    },
  { id: "emotions",     title: "Emotions",         emoji: "😊", description: "Express feelings in English",          defaultStatus: "locked"    },
  { id: "tenses",       title: "Past & Future",    emoji: "⏰", description: "Past, present, future tenses",         defaultStatus: "locked"    },
  { id: "idioms",       title: "Idioms",           emoji: "💡", description: "Common English phrases & idioms",      defaultStatus: "locked"    },
  { id: "fluency",      title: "Fluency Practice", emoji: "🗣️", description: "Full conversations without pausing",  defaultStatus: "locked"    },
  { id: "advanced",     title: "Advanced English", emoji: "🏆", description: "Formal writing, presentations, GD",   defaultStatus: "locked"    },
];

const PROGRESS_KEY = "ef_roadmap_v1";

export type RoadmapProgress = Record<string, TopicStatus>;

export function getRoadmapProgress(): RoadmapProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return buildDefaultProgress();
    return JSON.parse(raw) as RoadmapProgress;
  } catch {
    return buildDefaultProgress();
  }
}

function buildDefaultProgress(): RoadmapProgress {
  const p: RoadmapProgress = {};
  ROADMAP_TOPICS.forEach(t => { p[t.id] = t.defaultStatus; });
  return p;
}

export function saveRoadmapProgress(p: RoadmapProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function completeTopic(topicId: string): RoadmapProgress {
  const p = getRoadmapProgress();
  p[topicId] = "completed";

  const idx = ROADMAP_TOPICS.findIndex(t => t.id === topicId);
  if (idx >= 0 && idx + 1 < ROADMAP_TOPICS.length) {
    const nextId = ROADMAP_TOPICS[idx + 1].id;
    if (p[nextId] === "locked") {
      p[nextId] = "current";
    }
  }
  saveRoadmapProgress(p);
  return p;
}

export function getTopicsWithStatus(): (RoadmapTopic & { status: TopicStatus })[] {
  const p = getRoadmapProgress();
  return ROADMAP_TOPICS.map(t => ({ ...t, status: p[t.id] ?? t.defaultStatus }));
}
