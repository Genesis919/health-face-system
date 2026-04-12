const TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/生命徵象穩定/g, "目前狀況穩定"],
  [/V\/S穩定/gi, "目前狀況穩定"],
  [/微燒/g, "有些發燒"],
  [/發燒/g, "有發燒情況"],
  [/痰液/g, "痰"],
  [/褐色/g, "偏褐色"],
  [/陰道無出血量中褐色異味重/g, "有偏褐色分泌物，氣味較重"],
  [/無出血/g, "目前沒有出血"],
  [/睡眠中/g, "目前正在休息"],
  [/續觀/g, "會持續觀察"],
  [/反抽/g, "吐出"],
  [/無咖啡色液體/g, "沒有吐出深色液體"],
  [/進食/g, "進食"],
  [/舒跑/g, "電解質飲品"],
  [/cc/g, "毫升"],
  [/住院治療/g, "住院觀察與治療"],
  [/就醫/g, "已就醫"],
  [/意識清楚/g, "意識清楚"],
  [/呼吸喘/g, "呼吸比較喘"],
  [/血氧/g, "血氧"],
  [/需密切監測/g, "會持續密切觀察"]
];

export function generateFamilyNote(originalNote: string) {
  const source = originalNote.trim();
  if (!source) return "";

  let simplified = source;

  for (const [pattern, replacement] of TERM_REPLACEMENTS) {
    simplified = simplified.replace(pattern, replacement);
  }

  simplified = simplified
    .replace(/[;；]+/g, "，")
    .replace(/\s+/g, " ")
    .replace(/,+/g, "，")
    .replace(/，{2,}/g, "，")
    .trim();

  const segments = simplified
    .split(/[。.!！?？]/)
    .map((part) => part.trim().replace(/^，|，$/g, ""))
    .filter(Boolean);

  const condensed = segments
    .slice(0, 2)
    .map((segment) => shortenSegment(segment))
    .filter(Boolean)
    .join("。");

  return condensed ? `${condensed}。` : simplified;
}

function shortenSegment(segment: string) {
  if (segment.length <= 44) return segment;

  const clauses = segment
    .split(/[，,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (clauses.length <= 2) {
    return segment.slice(0, 44).replace(/[，,]$/, "");
  }

  return clauses.slice(0, 2).join("，");
}
