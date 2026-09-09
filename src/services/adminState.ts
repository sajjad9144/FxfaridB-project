/**
 * وضعیت گفتگوی ادمین (FSM ساده در حافظه).
 * هر ادمین در هر لحظه یک اکشن باز دارد؛ ورودی متنی/فایلی بعدی به آن تعلق می‌گیرد.
 */
export type AdminAction =
  | { type: "section_title"; sectionId: number }
  | { type: "section_intro"; sectionId: number }
  | { type: "section_emoji"; sectionId: number }
  | { type: "item_title"; sectionId: number }
  | { type: "item_desc"; sectionId: number; title: string }
  | { type: "item_payload"; sectionId: number; title: string; desc: string }
  | { type: "consult_voice" }
  | { type: "consult_tariff" };

export const adminSessions = new Map<number, AdminAction>();

export function clearAdmin(userId: number) {
  adminSessions.delete(userId);
}
