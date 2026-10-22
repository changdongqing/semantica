import type { TFunction } from "i18next";

import type { GraphLoadPhase, GraphLoadProgress, GraphLoadProgressKind, GraphLayoutSource, GraphLayoutState } from "./types";

export const GRAPH_LOAD_STAGE_SEQUENCE: Exclude<GraphLoadPhase, "ready">[] = [
  "bootstrapping",
  "fetching_nodes",
  "fetching_edges",
  "computing_styling",
  "hydrating_scene",
  "stabilizing_layout",
];

const TITLE_KEYS: Record<GraphLoadPhase, string> = {
  bootstrapping: "loadingTitle.bootstrapping",
  fetching_nodes: "loadingTitle.fetchingNodes",
  fetching_edges: "loadingTitle.fetchingEdges",
  computing_styling: "loadingTitle.computingStyling",
  hydrating_scene: "loadingTitle.hydratingScene",
  stabilizing_layout: "loadingTitle.stabilizingLayout",
  ready: "loadingTitle.ready",
};

const STAGE_KEYS: Record<Exclude<GraphLoadPhase, "ready">, string> = {
  bootstrapping: "loadingStage.prepare",
  fetching_nodes: "loadingStage.nodes",
  fetching_edges: "loadingStage.relations",
  computing_styling: "loadingStage.styling",
  hydrating_scene: "loadingStage.scene",
  stabilizing_layout: "loadingStage.layout",
};

export function getGraphLoadTitle(phase: GraphLoadPhase, t: TFunction): string {
  return t(TITLE_KEYS[phase] ?? TITLE_KEYS.ready);
}

export function getGraphLoadStageLabel(
  phase: Exclude<GraphLoadPhase, "ready">,
  t: TFunction,
): string {
  return t(STAGE_KEYS[phase] ?? "loadingStage.stage");
}

export function createGraphLoadProgress(input: {
  phase: GraphLoadPhase;
  message: string;
  progressKind: GraphLoadProgressKind;
  loaded?: number | null;
  total?: number | null;
  nodesLoaded?: number;
  nodesTotal?: number | null;
  edgesLoaded?: number;
  edgesTotal?: number | null;
  showGraphBehind?: boolean;
  layoutSource?: GraphLayoutSource;
  layoutState?: GraphLayoutState;
}, t: TFunction): GraphLoadProgress {
  const phaseIndex = GRAPH_LOAD_STAGE_SEQUENCE.indexOf(input.phase as Exclude<GraphLoadPhase, "ready">);

  return {
    phase: input.phase,
    title: getGraphLoadTitle(input.phase, t),
    message: input.message,
    progressKind: input.progressKind,
    loaded: input.loaded ?? null,
    total: input.total ?? null,
    nodesLoaded: input.nodesLoaded ?? 0,
    nodesTotal: input.nodesTotal ?? null,
    edgesLoaded: input.edgesLoaded ?? 0,
    edgesTotal: input.edgesTotal ?? null,
    showGraphBehind: input.showGraphBehind ?? false,
    stageIndex: phaseIndex >= 0 ? phaseIndex + 1 : GRAPH_LOAD_STAGE_SEQUENCE.length,
    stageCount: GRAPH_LOAD_STAGE_SEQUENCE.length,
    layoutSource: input.layoutSource,
    layoutState: input.layoutState,
  };
}
