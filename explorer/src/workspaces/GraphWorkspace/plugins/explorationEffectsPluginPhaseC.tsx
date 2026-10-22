import type { CSSProperties } from "react";

import { buildGraphColorLegend } from "../graphColorLegend";
import type {
  GraphAnalyticsSnapshot,
  GraphDiagnosticsSnapshot,
  GraphEffectAvailability,
  GraphEffectToggle,
} from "../types";
import type { GraphPlugin } from "./types";

const EFFECTS_PANEL_ID = "effects-panel";

type EffectRowConfig = {
  key: GraphEffectToggle;
  labelKey: string;
  descriptionKey: string;
};

const SCENE_EFFECT_ROWS: EffectRowConfig[] = [
  {
    key: "pathPulseEnabled",
    labelKey: "plugins.effects.rows.pathPulse.label",
    descriptionKey: "plugins.effects.rows.pathPulse.description",
  },
  {
    key: "pathFlowEnabled",
    labelKey: "plugins.effects.rows.pathFlow.label",
    descriptionKey: "plugins.effects.rows.pathFlow.description",
  },
  {
    key: "lensEnabled",
    labelKey: "plugins.effects.rows.neighborhoodLens.label",
    descriptionKey: "plugins.effects.rows.neighborhoodLens.description",
  },
  {
    key: "temporalEmphasisEnabled",
    labelKey: "plugins.effects.rows.temporalEmphasis.label",
    descriptionKey: "plugins.effects.rows.temporalEmphasis.description",
  },
  {
    key: "semanticRegionsEnabled",
    labelKey: "plugins.effects.rows.semanticRegions.label",
    descriptionKey: "plugins.effects.rows.semanticRegions.description",
  },
  {
    key: "contoursEnabled",
    labelKey: "plugins.effects.rows.contours.label",
    descriptionKey: "plugins.effects.rows.contours.description",
  },
  {
    key: "edgeLabelsEnabled",
    labelKey: "plugins.effects.rows.edgeLabels.label",
    descriptionKey: "plugins.effects.rows.edgeLabels.description",
  },
  {
    key: "legendEnabled",
    labelKey: "plugins.effects.rows.regionsSummary.label",
    descriptionKey: "plugins.effects.rows.regionsSummary.description",
  },
];

const INTELLIGENCE_EFFECT_ROWS: EffectRowConfig[] = [
  {
    key: "pathfindingEnabled",
    labelKey: "plugins.effects.rows.directedPathfinding.label",
    descriptionKey: "plugins.effects.rows.directedPathfinding.description",
  },
  {
    key: "communitiesEnabled",
    labelKey: "plugins.effects.rows.communityRegions.label",
    descriptionKey: "plugins.effects.rows.communityRegions.description",
  },
  {
    key: "centralityEnabled",
    labelKey: "plugins.effects.rows.centralityRanking.label",
    descriptionKey: "plugins.effects.rows.centralityRanking.description",
  },
];

const AVAILABILITY_KEYS: Record<GraphEffectToggle, keyof GraphDiagnosticsSnapshot["effectAvailability"]> = {
  pathPulseEnabled: "pathPulse",
  pathFlowEnabled: "pathFlow",
  lensEnabled: "lens",
  temporalEmphasisEnabled: "temporalEmphasis",
  semanticRegionsEnabled: "semanticRegions",
  contoursEnabled: "contours",
  pathfindingEnabled: "pathfinding",
  communitiesEnabled: "communities",
  centralityEnabled: "centrality",
  legendEnabled: "legend",
  edgeLabelsEnabled: "edgeLabels",
  diagnosticsEnabled: "diagnostics",
};

function renderAvailabilityText(
  availability: GraphEffectAvailability,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (availability.available) {
    if (typeof availability.visibleSegments === "number" && typeof availability.segmentCap === "number") {
      return `${availability.reason} - ${t("plugins.effects.segments", {
        visible: availability.visibleSegments,
        cap: availability.segmentCap,
      })}`;
    }
    return availability.reason;
  }

  return availability.detail ? `${availability.reason} - ${availability.detail}` : availability.reason;
}

function collectFallbackLegendItems(context: Parameters<NonNullable<GraphPlugin["renderPanel"]>>[0]) {
  return buildGraphColorLegend(context.graph, context.theme)
    .sort((left, right) => right.count - left.count)
    .slice(0, context.theme.effects.legend.maxGroups);
}

function resolveAvailability(
  availabilityMap: GraphDiagnosticsSnapshot["effectAvailability"] | undefined,
  key: GraphEffectToggle,
  enabled: boolean,
  t: (key: string) => string,
): GraphEffectAvailability {
  return availabilityMap?.[AVAILABILITY_KEYS[key]] ?? {
    enabled,
    available: false,
    reason: t("plugins.effects.waitingRuntime"),
  };
}

function EffectToggleRow({
  label,
  description,
  checked,
  availability,
  onToggle,
  t,
}: {
  label: string;
  description: string;
  checked: boolean;
  availability: GraphEffectAvailability;
  onToggle: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div style={toggleRowStyle}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={rowTitleStyle}>{label}</div>
        <div style={rowDescriptionStyle}>{description}</div>
        <div style={rowMetaStyle}>{renderAvailabilityText(availability, t)}</div>
      </div>
      <button type="button" onClick={onToggle} style={checked ? toggleButtonActiveStyle : toggleButtonStyle}>
        {checked ? t("plugins.effects.on") : t("plugins.effects.off")}
      </button>
    </div>
  );
}

function renderRegionsAndSignals(
  context: Parameters<NonNullable<GraphPlugin["renderPanel"]>>[0],
  analytics: GraphAnalyticsSnapshot | null,
) {
  const fallbackLegendItems = collectFallbackLegendItems(context);
  const semanticRegions = analytics?.semanticRegions.summaries ?? [];
  const communities = analytics?.communities.summaries ?? [];
  const centrality = analytics?.centrality.topNodes ?? [];
  const directedPath = analytics?.directedPath ?? null;

  if (!semanticRegions.length && !communities.length && !centrality.length && !fallbackLegendItems.length && !directedPath) {
    return <div style={emptyTextStyle}>{context.t("plugins.effects.emptyRegions")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {semanticRegions.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={subsectionTitleStyle}>{context.t("plugins.effects.regions.semanticRegions")}</div>
          {semanticRegions.map((region) => (
            <div key={region.semanticGroup} style={legendRowStyle}>
              <span
                style={{
                  ...legendSwatchStyle,
                  background: region.color,
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 14px ${region.color}40`,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={rowTitleStyle}>{region.semanticGroup}</div>
                <div style={rowMetaStyle}>
                  {context.t("plugins.effects.regions.visibleTotal", {
                    visible: region.visibleNodeCount.toLocaleString(),
                    total: region.nodeCount.toLocaleString(),
                  })}
                </div>
              </div>
              <div style={signalBadgeStyle}>{region.anchorLabel || context.t("analytics.communityAnchor")}</div>
            </div>
          ))}
        </div>
      ) : null}

      {communities.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={subsectionTitleStyle}>{context.t("plugins.effects.regions.communityAnchors")}</div>
          {communities.slice(0, 3).map((community) => (
            <div key={community.communityId} style={signalRowStyle}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={rowTitleStyle}>{community.anchorLabel || context.t("analytics.communityAnchor")}</div>
                <div style={rowMetaStyle}>
                  {context.t("plugins.effects.regions.communityMeta", {
                    id: community.communityId,
                    visible: community.visibleNodeCount,
                    total: community.nodeCount,
                  })}
                </div>
              </div>
              <div style={signalBadgeStyle}>{community.dominantSemanticGroup}</div>
            </div>
          ))}
        </div>
      ) : null}

      {centrality.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={subsectionTitleStyle}>{context.t("plugins.effects.regions.centralityLeaders")}</div>
          {centrality.slice(0, 3).map((node) => (
            <div key={node.id} style={signalRowStyle}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={rowTitleStyle}>{node.label}</div>
                <div style={rowMetaStyle}>
                  {context.t("plugins.effects.regions.score", {
                    group: node.semanticGroup,
                    score: node.score.toFixed(3),
                  })}
                </div>
              </div>
              <div style={signalBadgeStyle}>{context.t("plugins.effects.regions.degree", { value: node.degree.toFixed(3) })}</div>
            </div>
          ))}
        </div>
      ) : null}

      {directedPath ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={subsectionTitleStyle}>{context.t("plugins.effects.regions.directedPathfinding")}</div>
          <div style={signalRowStyle}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={rowTitleStyle}>{directedPath.ready
                ? context.t("plugins.effects.regions.pathReady")
                : context.t("plugins.effects.regions.pathWaiting")}</div>
              <div style={rowMetaStyle}>{context.t(directedPath.reason)}</div>
            </div>
            {directedPath.ready ? (
              <div style={signalBadgeStyle}>
                {directedPath.verifiedAgainstActivePath
                  ? context.t("plugins.effects.regions.hopsMatch", { count: directedPath.length })
                  : context.t("plugins.effects.regions.hops", { count: directedPath.length })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!semanticRegions.length && !communities.length && !centrality.length && fallbackLegendItems.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={subsectionTitleStyle}>{context.t("plugins.effects.regions.fallbackLegend")}</div>
          {fallbackLegendItems.map((item) => (
            <div key={item.id} style={legendRowStyle}>
              <span
                style={{
                  ...legendSwatchStyle,
                  background: item.color,
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 14px ${item.color}40`,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={rowTitleStyle}>{item.group}</div>
                <div style={rowMetaStyle}>{context.t("plugins.effects.regions.nodes", { count: item.count.toLocaleString() })}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const explorationEffectsPluginPhaseC: GraphPlugin = {
  id: "exploration-effects",
  mount: () => {},
  unmount: () => {},
  onStateChange: () => {},
  toolbarItems: (context) => [
    {
      id: "effects-toggle",
      label: context.t("plugins.effects.label"),
      title: context.t("plugins.effects.title"),
      active: context.isPanelOpen(EFFECTS_PANEL_ID),
      order: 18,
      onClick: () => context.dispatchAction({ type: "togglePanel", panelId: EFFECTS_PANEL_ID }),
    },
  ],
  renderPanel: (context) => {
    if (!context.isPanelOpen(EFFECTS_PANEL_ID)) {
      return null;
    }

    const effectsState = context.getEffectsState();
    const diagnosticsSnapshot = context.getDiagnosticsSnapshot();
    const analyticsSnapshot = context.getAnalyticsSnapshot();
    const availability = diagnosticsSnapshot?.effectAvailability;
    const showSignalsSection =
      effectsState.legendEnabled
      || effectsState.semanticRegionsEnabled
      || effectsState.communitiesEnabled
      || effectsState.centralityEnabled
      || effectsState.pathfindingEnabled;

    return {
      id: EFFECTS_PANEL_ID,
      title: context.t("plugins.effects.panelTitle"),
      placement: "bottom",
      order: 8,
      defaultOpen: false,
      preferredWidth: 460,
      preferredHeight: 360,
      content: (
        <div style={panelBodyStyle}>
          <div style={panelEyebrowStyle}>{context.t("plugins.effects.eyebrow")}</div>

          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{context.t("plugins.effects.sceneEffects")}</div>
            {SCENE_EFFECT_ROWS.map((row) => (
              <EffectToggleRow
                key={row.key}
                label={context.t(row.labelKey)}
                description={context.t(row.descriptionKey)}
                checked={effectsState[row.key]}
                availability={resolveAvailability(availability, row.key, effectsState[row.key], context.t)}
                t={context.t}
                onToggle={() => context.dispatchAction({ type: "toggleEffect", effect: row.key })}
              />
            ))}
          </div>

          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{context.t("plugins.effects.graphIntelligence")}</div>
            {INTELLIGENCE_EFFECT_ROWS.map((row) => (
              <EffectToggleRow
                key={row.key}
                label={context.t(row.labelKey)}
                description={context.t(row.descriptionKey)}
                checked={effectsState[row.key]}
                availability={resolveAvailability(availability, row.key, effectsState[row.key], context.t)}
                t={context.t}
                onToggle={() => context.dispatchAction({ type: "toggleEffect", effect: row.key })}
              />
            ))}
          </div>

          {showSignalsSection ? (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>{context.t("plugins.effects.regionsAndSignals")}</div>
              {renderRegionsAndSignals(context, analyticsSnapshot)}
            </div>
          ) : null}

          {import.meta.env.DEV ? (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>{context.t("plugins.effects.diagnostics")}</div>
              <EffectToggleRow
                label={context.t("plugins.effects.devDiagnostics")}
                description={context.t("plugins.effects.devDiagnosticsDescription")}
                checked={effectsState.diagnosticsEnabled}
                availability={resolveAvailability(availability, "diagnosticsEnabled", effectsState.diagnosticsEnabled, context.t)}
                t={context.t}
                onToggle={() => context.dispatchAction({ type: "toggleEffect", effect: "diagnosticsEnabled" })}
              />
              {effectsState.diagnosticsEnabled && diagnosticsSnapshot ? (
                <details style={detailsStyle}>
                  <summary style={summaryStyle}>{context.t("plugins.effects.runtimeSnapshot")}</summary>
                  <pre style={diagnosticsPreStyle}>
                    {JSON.stringify({ diagnostics: diagnosticsSnapshot, analytics: analyticsSnapshot }, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    };
  },
};

const panelBodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const panelEyebrowStyle: CSSProperties = {
  color: "#8ea4be",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.025)",
};

const sectionTitleStyle: CSSProperties = {
  color: "#dce9f8",
  fontSize: 12,
  fontWeight: 700,
};

const subsectionTitleStyle: CSSProperties = {
  color: "#9cc4ec",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const toggleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 0",
};

const rowTitleStyle: CSSProperties = {
  color: "#f3f7fd",
  fontSize: 13,
  fontWeight: 600,
};

const rowDescriptionStyle: CSSProperties = {
  color: "#a1b7cf",
  fontSize: 12,
  lineHeight: 1.45,
};

const rowMetaStyle: CSSProperties = {
  color: "#7fc6ff",
  fontSize: 11,
  lineHeight: 1.45,
};

const toggleButtonStyle: CSSProperties = {
  minWidth: 52,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "#cfe0f4",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const toggleButtonActiveStyle: CSSProperties = {
  ...toggleButtonStyle,
  background: "rgba(31, 111, 235, 0.24)",
  border: "1px solid rgba(127, 208, 255, 0.28)",
  color: "#eef6ff",
};

const legendRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.025)",
};

const legendSwatchStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  flexShrink: 0,
};

const signalRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.05)",
  background: "rgba(255,255,255,0.02)",
};

const signalBadgeStyle: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(31, 111, 235, 0.16)",
  border: "1px solid rgba(127, 208, 255, 0.16)",
  color: "#dce9f8",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const detailsStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.05)",
  background: "rgba(0,0,0,0.14)",
  overflow: "hidden",
};

const summaryStyle: CSSProperties = {
  cursor: "pointer",
  padding: "10px 12px",
  color: "#c6d4e3",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const diagnosticsPreStyle: CSSProperties = {
  margin: 0,
  padding: "0 12px 12px",
  color: "#dce9f8",
  fontSize: 11,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const emptyTextStyle: CSSProperties = {
  color: "#8ea4be",
  fontSize: 12,
  lineHeight: 1.5,
};
