const BAD_WORDS = [
  "fuck", "shit", "asshole", "bitch", "cunt", "dick", "pussy", "bastard",
  "nigger", "nigga", "faggot", "slut", "whore", "motherfucker", "damn",
  "hell", "ass", "cock", "piss", "rape", "kill yourself", "kys",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, "");
}

export function containsProfanity(text: string): boolean {
  const norm = normalize(text);
  const words = norm.split(/\s+/);
  for (const bad of BAD_WORDS) {
    if (bad.includes(" ")) {
      if (norm.includes(bad)) return true;
    } else {
      if (words.includes(bad)) return true;
    }
  }
  return false;
}

export function filterProfanity(text: string): string {
  let result = text;
  for (const bad of BAD_WORDS) {
    const pattern = new RegExp(`\\b${bad.replace(/\s+/g, "\\s+")}\\b`, "gi");
    result = result.replace(pattern, "*".repeat(bad.length));
  }
  return result;
}
