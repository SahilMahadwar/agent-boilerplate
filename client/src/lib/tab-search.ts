import type { ItemTab } from "@/features/item-tabs";

export const validateTabSearch = (
  search: Record<string, unknown>,
): { tab?: ItemTab } =>
  search.tab === "configure" ? { tab: "configure" } : {};
