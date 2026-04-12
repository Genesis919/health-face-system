export const ROLE_LABELS = {
  nurse: "護理師",
  social_worker: "社工",
  supervisor: "主管"
} as const;

export const STATUS_LABELS = {
  normal: "正常",
  unwell: "健康不佳",
  hospital: "住院"
} as const;

export const STATUS_FACE = {
  normal: "😊",
  unwell: "😢",
  hospital: "🏥"
} as const;

export const REVIEW_LABELS = {
  pending: "待審核",
  approved: "已通過",
  rejected: "退回修改"
} as const;
