/**
 * BagUI —— 背包主界面控制器
 *
 * 挂在背包 UI 的根节点上，负责：
 * - 从 core/PlayerDataService 获取玩家已拥有的甲骨文卡牌 ID
 * - 根据 areaId 分区筛选并渲染卡牌
 * - 提供图鉴学习 / 占卜答题两种模式的切换
 * - 在答题模式下维护选中卡牌列表，供外部系统查询
 *
 * ◸ 需在 Cocos Creator 属性面板绑定的组件：
 *   - cardPrefab      → CardItem 挂载的 Prefab 资源
 *   - scrollView      → 背包界面的 ScrollView 组件
 *   - contentNode     → ScrollView 的 content 节点（已设为 GRID 布局）
 *   - btnStudyMode     → 图鉴学习按钮（Button 组件）
 *   - btnExamMode      → 占卜答题按钮（Button 组件）
 *   - lblModeTitle     → 显示当前模式标题的 Label
 *
 * ◸ 分类按钮需在 Cocos Editor 通过 ClickEvents 绑定到 onTabClicked 方法，
 *   customEventData 填入对应的 areaId （如 'huan-river' / 'suburbs'）
 */

import { _decorator, Component, Node, Label, Button, Prefab, ScrollView, instantiate, SpriteFrame, resources } from 'cc';
import { CardItem } from './CardItem';
import { PlayerDataService } from './core/PlayerDataService';
import { oracleCards } from './core/data';
import type { OracleCard } from './core/models';

const { ccclass, property } = _decorator;

/** 按卡片 ID 建立只读索引，避免刷新背包时反复遍历完整字库。 */
const ORACLE_CARD_BY_ID: ReadonlyMap<string, OracleCard> = new Map(
    oracleCards.map(card => [card.id, card])
);

// ======================== 背包控制器组件 ========================

@ccclass('BagUI')
export class BagUI extends Component {

    // ======================== @property 引用区 ========================

    @property({ type: Prefab, displayName: '卡牌 Prefab', tooltip: 'CardItem 挂载的 Prefab 资源' })
    public cardPrefab: Prefab | null = null;

    @property({ type: ScrollView, displayName: 'ScrollView', tooltip: '背包界面的 ScrollView 组件' })
    public scrollView: ScrollView | null = null;

    @property({ type: Node, displayName: '卡片容器节点', tooltip: 'ScrollView 的 content 节点（已设为 GRID 布局）' })
    public contentNode: Node | null = null;

    @property({ type: Button, displayName: '图鉴学习按钮', tooltip: '切换到图鉴学习模式的 Button 组件' })
    public btnStudyMode: Button | null = null;

    @property({ type: Button, displayName: '占卜答题按钮', tooltip: '切换到占卜答题模式的 Button 组件' })
    public btnExamMode: Button | null = null;

    @property({ type: Label, displayName: '模式标题 Label', tooltip: '显示当前模式标题的 Label 组件' })
    public lblModeTitle: Label | null = null;

    // ======================== 运行时状态 ========================

    private _currentMode: string = 'STUDY_MODE';
    private _currentAreaId: string = 'huan-river';
    private _cardItems: CardItem[] = [];
    private _cardService: PlayerDataService | null = null;
    private _selectedCardIds: string[] = [];

    // ======================== 数据服务访问器 ========================

    public get cardService(): PlayerDataService {
        if (!this._cardService) {
            throw new Error('[BagUI] PlayerDataService 尚未注入');
        }
        return this._cardService;
    }

    public setCardService(service: PlayerDataService): void {
        this._cardService = service;
    }

    // ======================== 选中卡牌查询接口 ========================

    public getSelectedCardIds(): string[] {
        return [...this._selectedCardIds];
    }

    // ======================== 生命周期方法 ========================

    public start(): void {
        console.log('[BagUI] 背包界面初始化开始');

        if (!this._cardService) {
            console.warn('[BagUI] PlayerDataService 未注入，背包初始化推迟');
            return;
        }

        // 默认渲染河畔区域的卡牌
        this.renderCardsByArea(this._currentAreaId);
        this.bindModeButtonEvents();
        this.updateModeTitle();

        console.log('[BagUI] 背包界面初始化完成');
    }

    // ======================== 公开刷新接口 ========================

    /**
     * refresh —— 供外部（如 GameManager）在数据变动后手动调用，重新渲染当前分区
     */
    public refresh(): void {
        console.log('[BagUI] 正在执行背包数据重绘...');
        this._selectedCardIds = [];
        this.renderCardsByArea(this._currentAreaId);
    }

    // ======================== 分类切换 ========================

    /**
     * onTabClicked —— 分类标签按钮点击回调
     *
     * 在 Cocos Editor 中通过 Button.ClickEvents 绑定此方法，
     * customEventData 填写对应的 areaId（如 'huan-river' 或 'suburbs'）。
     */
    public onTabClicked(btn: Button, customEventData: string): void {
        if (!customEventData || customEventData === this._currentAreaId) return;

        console.log('[BagUI] 切换到区域: ' + customEventData);
        this._currentAreaId = customEventData;
        this._selectedCardIds = [];
        this.renderCardsByArea(this._currentAreaId);
    }

    // ======================== 分区渲染 ========================

    /**
     * renderCardsByArea —— 按区域筛选并渲染卡牌
     *
     * 步骤：
     *   1. 清空 content 中的旧卡牌
     *   2. 从 PlayerDataService 获取玩家已拥有的卡牌 ID
     *   3. 通过 oracleCards 筛选出拥有且 areaId 匹配的卡牌
     *   4. 实例化 Prefab 并加入 content
     */
    private renderCardsByArea(areaId: string): void {
        if (!this.cardPrefab || !this.contentNode) {
            console.error('[BagUI] cardPrefab 或 contentNode 未赋值，无法渲染');
            return;
        }

        // 1. 清空旧卡牌
        this.clearAllCards();

        // 2. 获取已拥有的卡牌
        const ownedIds: readonly string[] = this.cardService.getOwnedCardIds();

        const missingIds = ownedIds.filter(id => !ORACLE_CARD_BY_ID.has(id));
        if (missingIds.length > 0) {
            console.warn('[BagUI] 以下卡牌 ID 在 oracleCards 中未找到，已跳过渲染：' + missingIds.join(', '));
        }

        // 3. 通过索引筛选出拥有且 areaId 匹配的卡牌
        const matchedCards: OracleCard[] = ownedIds
            .map(id => ORACLE_CARD_BY_ID.get(id))
            .filter((card): card is OracleCard =>
                card !== undefined && card.areaId === areaId
            );

        if (ownedIds.length > 0 && matchedCards.length === 0) {
            console.log('[BagUI] 当前区域「' + areaId + '」没有可显示的卡牌');
        }

        // 4. 渲染卡牌
        for (const card of matchedCards) {
            const cardNode = instantiate(this.cardPrefab);
            cardNode.name = 'Card_' + card.modernChar;

            let cardItem: CardItem | null = cardNode.getComponent(CardItem);
            if (!cardItem) {
                cardItem = cardNode.addComponent(CardItem);
            }

            cardItem.init(card.id, card, this._currentMode);
            this._cardItems.push(cardItem);

            // 监听卡牌选中事件
            cardNode.on('card-selected', (data: { cardId: string; isSelected: boolean }) => {
                this.onCardSelected(data.cardId, data.isSelected);
            });

            this.loadCardSprites(cardItem, card);
            cardNode.parent = this.contentNode;
        }

        // 滚动到顶部
        if (this.scrollView) {
            this.scrollView.scrollToTop(0.1, true);
        }

        console.log('[BagUI] 区域「' + areaId + '」共渲染 ' + matchedCards.length + ' 张卡牌');
    }

    // ======================== 异步图片加载 ========================

    private loadCardSprites(cardItem: CardItem, card: OracleCard): void {
        const { oracleImagePath } = card;
        if (!oracleImagePath) return;

        const pathWithoutExt = oracleImagePath.replace(/\.\w+$/, '');
        resources.load(pathWithoutExt + '/spriteFrame', SpriteFrame, (err: Error | null, spriteFrame: SpriteFrame) => {
            if (err) {
                console.warn('[BagUI] 甲骨文图片加载失败：' + oracleImagePath, err);
                return;
            }
            cardItem.setOracleSprite(spriteFrame);
        });
    }

    // ======================== 选中状态管理 ========================

    private onCardSelected(cardId: string, isSelected: boolean): void {
        if (isSelected) {
            for (const item of this._cardItems) {
                if (item.getCardId() !== cardId) {
                    item.setSelected(false);
                }
            }
            this._selectedCardIds = [cardId];
        } else {
            this._selectedCardIds = [];
        }
        console.log('[BagUI] 当前选中卡牌: ' + (this._selectedCardIds.join(', ') || '无'));
    }

    private clearAllCards(): void {
        if (!this.contentNode) return;
        for (let i = this.contentNode.children.length - 1; i >= 0; i--) {
            this.contentNode.children[i].destroy();
        }
        this._cardItems = [];
    }

    // ======================== 模式切换 ========================

    private bindModeButtonEvents(): void {
        if (this.btnStudyMode) {
            this.btnStudyMode.node.on(Node.EventType.TOUCH_END, this.switchToStudyMode, this);
        }
        if (this.btnExamMode) {
            this.btnExamMode.node.on(Node.EventType.TOUCH_END, this.switchToExamMode, this);
        }
    }

    private switchToStudyMode(): void {
        if (this._currentMode === 'STUDY_MODE') return;
        this._currentMode = 'STUDY_MODE';
        this._selectedCardIds = [];
        this.applyModeToAllCards();
        if (this.lblModeTitle) { this.lblModeTitle.string = '图鉴学习模式'; }
    }

    private switchToExamMode(): void {
        if (this._currentMode === 'EXAM_MODE') return;
        this._currentMode = 'EXAM_MODE';
        this.applyModeToAllCards();
        if (this.lblModeTitle) { this.lblModeTitle.string = '占卜答题模式'; }
    }

    private applyModeToAllCards(): void {
        for (const cardItem of this._cardItems) {
            cardItem.setMode(this._currentMode);
        }
    }

    private updateModeTitle(): void {
        if (this.lblModeTitle) {
            this.lblModeTitle.string = this._currentMode === 'STUDY_MODE'
                ? '图鉴学习模式'
                : '占卜答题模式';
        }
    }

    // ======================== 清理 ========================

    public onDestroy(): void {
        if (this.btnStudyMode) {
            this.btnStudyMode.node.off(Node.EventType.TOUCH_END, this.switchToStudyMode, this);
        }
        if (this.btnExamMode) {
            this.btnExamMode.node.off(Node.EventType.TOUCH_END, this.switchToExamMode, this);
        }
        this._cardItems = [];
        this._selectedCardIds = [];
        this._cardService = null;
    }
}
