import type { FocusedUnavailableReason, GroupedViewUnavailableReason } from "./types";

/**
 * A translatable message: the caller resolves `key` against the `graph`
 * namespace and passes `values` as interpolation options. Keeping this module
 * free of i18next keeps the reason mapping pure and testable.
 */
export type CopyMessage = {
  key: string;
  values?: Record<string, string>;
};

export function groupedViewReasonText(
  reason: GroupedViewUnavailableReason | null | undefined,
): CopyMessage | null {
  if (!reason) {
    return null;
  }

  switch (reason.code) {
    case "communities-undetected":
      return { key: "views.grouped.communitiesUndetected" };
    case "community-nodes-missing":
      return { key: "views.grouped.communityNodesMissing" };
    case "invalid-community-layout":
      return { key: "views.grouped.invalidCommunityLayout", values: { nodeId: reason.nodeId } };
    case "missing-grouped-node":
      return { key: "views.grouped.missingGroupedNode", values: { edgeId: reason.edgeId } };
  }
}

export function focusedUnavailableReasonText(
  reason: FocusedUnavailableReason | null | undefined,
): CopyMessage | null {
  if (!reason) {
    return null;
  }

  switch (reason.code) {
    case "no-selection":
      return { key: "views.focused.noSelection" };
    case "grouped-unresolvable":
      return { key: "views.focused.groupedUnresolvable" };
    case "not-in-graph":
      return { key: "views.focused.notInGraph" };
  }
}
