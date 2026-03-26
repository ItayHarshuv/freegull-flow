export const HIDDEN_MODULE_IDS = new Set<string>([
  'lessons',
  'events',
  'tasks',
  'leads',
  'knowledge',
  'club_info',
]);

export function isModuleHidden(id: string) {
  return HIDDEN_MODULE_IDS.has(id);
}
