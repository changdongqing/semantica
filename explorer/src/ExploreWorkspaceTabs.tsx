import { useTranslation } from "react-i18next";
export type ExploreView = 'graph' | 'memories' | 'vocabulary';

type ExploreWorkspaceTabsProps = {
  activeView: ExploreView;
  agentMemoryAvailable: boolean;
  onSelect: (view: ExploreView) => void;
};

export function ExploreWorkspaceTabs({
  activeView,
  agentMemoryAvailable,
  onSelect,
}: ExploreWorkspaceTabsProps) {
  const { t } = useTranslation("shell");
  return (
    <>
      <button className="workspace-tab" data-active={activeView === 'graph'} onClick={() => onSelect('graph')}>
        {t("exploreTabs.graph")}
      </button>
      {agentMemoryAvailable ? (
        <button className="workspace-tab" data-active={activeView === 'memories'} onClick={() => onSelect('memories')}>
          {t("exploreTabs.memories")}
        </button>
      ) : null}
      <button className="workspace-tab" data-active={activeView === 'vocabulary'} onClick={() => onSelect('vocabulary')}>
        {t("exploreTabs.vocabulary")}
      </button>
    </>
  );
}
