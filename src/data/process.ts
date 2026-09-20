/**
 * HANDMADE PROCESS — the scroll timeline (Yarn → You).
 * Icons are hand-drawn SVG doodles rendered by the ProcessTimeline component.
 */

export type ProcessStep = {
  id: string;
  title: string;
  line: string;
  icon: "yarn" | "pencil" | "hook" | "flower" | "gift" | "heart";
};

export const processSteps: ProcessStep[] = [
  {
    id: "yarn",
    title: "Yarn",
    line: "Soft, quality yarn in every shade you can imagine.",
    icon: "yarn",
  },
  {
    id: "design",
    title: "Design",
    line: "We sketch and plan your piece, petal by petal.",
    icon: "pencil",
  },
  {
    id: "stitch",
    title: "Stitch",
    line: "Hours of gentle hand-crocheting begin.",
    icon: "hook",
  },
  {
    id: "detail",
    title: "Detail",
    line: "Leaves, ribbons, little faces — the touches that bring it to life.",
    icon: "flower",
  },
  {
    id: "pack",
    title: "Pack",
    line: "Wrapped sweetly, ready for its journey.",
    icon: "gift",
  },
  {
    id: "you",
    title: "You",
    line: "A little handmade joy, made just for you.",
    icon: "heart",
  },
];
