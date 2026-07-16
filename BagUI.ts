/**
 * BagUI —— 背包主界面控制器
 *
 * 挂在背包 UI 的根节点上，负责：
 * - 从 core/PlayerDataService 获取玩家已拥有的甲骨文卡牌 ID
 * - 从 core/data 的 oracleCards 常量表中查找完整的卡牌数据
 * - 通过 ScrollView 动态生成 CardItem 实例并渲染
 * - 提供图鉴学习 / 占卜答题两种模式的切换并将模式变更同步给所有卡牌子项
 *
 * ▸ 需在 Cocos Creator 属性面板绑定的组件：
 *   - cardPrefab      → CardItem 挂载的 Prefab 资源
 *   - scrollView      → 背包界面的 ScrollView 组件
 *   - contentNode     → ScrollView 的 content 节点
 *   - cardLayout      → content 上的 Layout 组件
 *   - studyModeBtn    → 切换到图鉴学习模式的按钮节点
 *   - examModeBtn     → 切换到占卜答题模式的按钮节点
 *   - modeLabel       → 显示当前模式的 Label
 */

import { _decorator, Component, Node, Label, Prefab, ScrollView, instantiate, Layout, SpriteFrame, resources } from 'cc';
import { CardItem } from './CardItem';
import { PlayerDataService } from './core/PlayerDataService';
import { oracleCards } from './core/data';
import type { OracleCard } from './core/models';

const { ccclass, property } = _decorator;

// ======================== 背包控制器组件 ========================

@ccclass('BagUI')
export class BagUI extends Component {

    // ======================== @property 引用区 ========================

    @property({ type: Prefab, displayName: '卡牌 Prefab', tooltip: '卡牌的 Prefab 资源，根节点挂载 CardItem 组件' })
    public cardPrefab: Prefab | null = null;

    @property({ type: ScrollView, displayName: 'ScrollView', tooltip: '背包界面的 ScrollView 组件' })
    public scrollView: ScrollView | null = null;

    @property({ type: Node, displayName: '卡片容器节点', tooltip: 'ScrollView 的 content 节点，所有卡牌实例放置在此' })
    public contentNode: Node | null = null;

    @property({ type: Layout, displayName: 'Layout 布局', tooltip: '卡片容器上的 Layout 组件，自动排列卡牌位置' })
    public cardLayout: Layout | null = null;

    @property({ type: Node, displayName: '学习模式按钮', tooltip: '切换到图鉴学习模式的按钮节点' })
    public studyModeBtn: Node | null = null;

    @property({ type: Node, displayName: '答题模式按钮', tooltip: '切换到占卜答题模式的按钮节点' })
    public examModeBtn: Node | null = null;

    @property({ type: Label, displayName: '模式指示 Label', tooltip: '显示当前展示模式的文字 Label' })
    public modeLabel: Label | null = null;

    // ======================== 运行时状态 ========================

    private _currentMode: string = 'STUDY_MODE';
    private _cardItems: CardItem[] = [];
    private _cardService: PlayerDataService | null = null;

    // ======================== 数据服务访问器 ========================

    public get cardService(): PlayerDataService {
        if (!this._cardService) {
            throw new Error('[BagUI] PlayerDataService 尚未注入，请先调用 setCardService()');
        }
        return this._cardService;
    }

    /**
     * 允许外部注入已存在的 PlayerDataService 实例
     */
    public setCardService(service: PlayerDataService): void {
        this._cardService = service;
    }

    // ======================== 生命周期方法 ========================

    /**
     * start —— 组件启动时自动调用
     */
    public start(): void {
        console.log('[BagUI] 背包界面初始化开始');

        // 确保 PlayerDataService 已注入
        if (!this._cardService) {
            console.warn('[BagUI] PlayerDataService 未注入，背包初始化推迟 — 请调用 setCardService() 后在适当时机手动调用 refresh()');
            return;
        }

        // 直接调用公共刷新方法，读取并渲染初始背包
        this.refresh();

        // 绑定按钮事件
        this.bindModeButtons();

        // 刷新模式指示器
        this.updateModeLabel();

        console.log('[BagUI] 背包界面初始化完成');
    }

    // ======================== 公开刷新接口 ========================

    /**
     * refresh —— 供外部（如 GameManager）在数据变动后手动调用，刷新背包渲染
     *
     * 工作流程：
     *   1. 从 PlayerDataService 获取当前玩家拥有的卡牌 ID 列表
     *   2. 在 oracleCards 常量表中查找匹配的 OracleCard 对象
     *   3. 清除旧的卡牌实例
     *   4. 直接传入 OracleCard 渲染新卡牌（CardItem 内部完成数据消费）
     *   5. 异步加载甲骨文图片资源
     */
    public refresh(): void {
        console.log('[BagUI] 正在执行背包数据重绘...');

        // 1. 从 PlayerDataService 获取最新卡牌 ID 列表
        const ownedIds: readonly string[] = this.cardService.getOwnedCardIds();

        // 2. 根据 ID 在 oracleCards 常量表中查找完整数据
        const ownedCards: OracleCard[] = ownedIds
            .map(id => oracleCards.find(card => card.id === id))
            .filter((card): card is OracleCard => card !== undefined);

        if (ownedCards.length < ownedIds.length) {
            const missing = ownedIds.filter(id => !oracleCards.find(c => c.id === id));
            console.warn('[BagUI] 以下卡牌 ID 在 oracleCards 中未找到，已跳过渲染：' + missing.join(', '));
        }

        // 3. 清除旧卡牌
        this.clearAllCards();

        // 4. 渲染新卡牌（直接传入 OracleCard，由 CardItem 内部完成数据填充与模式显隐）
        this.renderCards(ownedCards);
    }

    // ======================== 异步图片加载 ========================

    /**
     * 异步加载卡牌甲骨文图片资源并应用到对应的 CardItem
     *
     * @param cardItem - 目标 CardItem 实例
     * @param card     - 包含 oracleImagePath 的 OracleCard 数据
     */
    private loadCardSprites(cardItem: CardItem, card: OracleCard): void {
        const { oracleImagePath } = card;

        if (oracleImagePath) {
            const pathWithoutExt = oracleImagePath.replace(/\.\w+$/, '');
            resources.load(pathWithoutExt + '/spriteFrame', SpriteFrame, (err: Error | null, spriteFrame: SpriteFrame) => {
                if (err) {
                    console.warn('[BagUI] 甲骨文图片加载失败：' + oracleImagePath, err);
                    return;
                }
                cardItem.setOracleSprite(spriteFrame);
            });
        }
    }

    // ======================== 数据构建与渲染 ========================

    private renderCards(cards: OracleCard[]): void {
        if (!this.cardPrefab || !this.contentNode) {
            console.error('[BagUI] cardPrefab 或 contentNode 未赋值，无法渲染卡牌');
            return;
        }

        for (let i = 0; i < cards.length; i++) {
            const card: OracleCard = cards[i];
            const cardNode: Node = instantiate(this.cardPrefab);
            cardNode.name = 'Card_' + card.modernChar;

            let cardItem: CardItem | null = cardNode.getComponent(CardItem);
            if (!cardItem) {
                cardItem = cardNode.addComponent(CardItem);
            }

            cardItem.init(card.id, card, this._currentMode);
            this._cardItems.push(cardItem);

            // 触发异步图片加载
            this.loadCardSprites(cardItem, card);

            cardNode.parent = this.contentNode;
        }

        if (this.cardLayout) {
            this.cardLayout.updateLayout();
        }

        if (this.scrollView) {
            this.scrollView.scrollToTop(0.3, true);
        }

        console.log('[BagUI] 共渲染 ' + cards.length + ' 张卡牌');
    }

    private clearAllCards(): void {
        if (!this.contentNode) {
            return;
        }
        const children: Node[] = this.contentNode.children;
        for (let i = children.length - 1; i >= 0; i--) {
            children[i].destroy();
        }
        this._cardItems = [];
    }

    // ======================== 模式切换与清理 ========================

    private bindModeButtons(): void {
        if (this.studyModeBtn) {
            this.studyModeBtn.on(Node.EventType.TOUCH_END, this.switchToStudyMode, this);
        }
        if (this.examModeBtn) {
            this.examModeBtn.on(Node.EventType.TOUCH_END, this.switchToExamMode, this);
        }
    }

    private switchToStudyMode(): void {
        if (this._currentMode === 'STUDY_MODE') return;
        this._currentMode = 'STUDY_MODE';
        this.applyModeToAllCards();
        this.updateModeLabel();
    }

    private switchToExamMode(): void {
        if (this._currentMode === 'EXAM_MODE') return;
        this._currentMode = 'EXAM_MODE';
        this.applyModeToAllCards();
        this.updateModeLabel();
    }

    private applyModeToAllCards(): void {
        for (const cardItem of this._cardItems) {
            cardItem.setMode(this._currentMode);
        }
    }

    private updateModeLabel(): void {
        if (!this.modeLabel) return;
        switch (this._currentMode) {
            case 'STUDY_MODE':
                this.modeLabel.string = '图鉴学习模式';
                break;
            case 'EXAM_MODE':
                this.modeLabel.string = '占卜答题模式';
                break;
            default:
                this.modeLabel.string = '未知模式';
                break;
        }
    }

    public onDestroy(): void {
        if (this.studyModeBtn) {
            this.studyModeBtn.off(Node.EventType.TOUCH_END, this.switchToStudyMode, this);
        }
        if (this.examModeBtn) {
            this.examModeBtn.off(Node.EventType.TOUCH_END, this.switchToExamMode, this);
        }
        this._cardItems = [];
        this._cardService = null;
    }
}
