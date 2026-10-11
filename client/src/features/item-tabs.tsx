import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ViewSet } from "./registry";

export type ItemTab = "interact" | "configure";

/** Interact / Configure tabs: the registered custom view, else the generic one. */
export function ItemTabs({
  id,
  custom,
  generic,
  tab,
  onTabChange,
}: {
  id: string;
  custom: ViewSet | undefined;
  generic: Required<ViewSet>;
  tab: ItemTab;
  onTabChange: (tab: ItemTab) => void;
}) {
  const Interact = custom?.interact ?? generic.interact;
  const Configure = custom?.configure ?? generic.configure;

  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as ItemTab)}>
      <TabsList>
        <TabsTrigger value="interact">Interact</TabsTrigger>
        <TabsTrigger value="configure">Configure</TabsTrigger>
      </TabsList>
      {/* `key` remounts views when navigating between items of the same type. */}
      <TabsContent value="interact" className="mt-2">
        <Interact key={id} id={id} />
      </TabsContent>
      <TabsContent value="configure" className="mt-2">
        <Configure key={id} id={id} />
      </TabsContent>
    </Tabs>
  );
}
