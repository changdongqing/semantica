import assert from "node:assert/strict";
import test from "node:test";

import {
  focusedUnavailableReasonText,
  groupedViewReasonText,
} from "../src/workspaces/GraphWorkspace/graphViewCopy.ts";

test("groupedViewReasonText maps every reason code to a graph-namespace key", () => {
  assert.deepEqual(
    groupedViewReasonText({ code: "communities-undetected" }),
    { key: "views.grouped.communitiesUndetected" },
  );
  assert.deepEqual(
    groupedViewReasonText({ code: "community-nodes-missing" }),
    { key: "views.grouped.communityNodesMissing" },
  );
  assert.deepEqual(
    groupedViewReasonText({ code: "invalid-community-layout", nodeId: "community-a" }),
    { key: "views.grouped.invalidCommunityLayout", values: { nodeId: "community-a" } },
  );
  assert.deepEqual(
    groupedViewReasonText({ code: "missing-grouped-node", edgeId: "edge-1" }),
    { key: "views.grouped.missingGroupedNode", values: { edgeId: "edge-1" } },
  );
  assert.equal(groupedViewReasonText(null), null);
});

test("focusedUnavailableReasonText maps every reason code to a graph-namespace key", () => {
  assert.deepEqual(
    focusedUnavailableReasonText({ code: "no-selection" }),
    { key: "views.focused.noSelection" },
  );
  assert.deepEqual(
    focusedUnavailableReasonText({ code: "grouped-unresolvable" }),
    { key: "views.focused.groupedUnresolvable" },
  );
  assert.deepEqual(
    focusedUnavailableReasonText({ code: "not-in-graph" }),
    { key: "views.focused.notInGraph" },
  );
  assert.equal(focusedUnavailableReasonText(null), null);
});
