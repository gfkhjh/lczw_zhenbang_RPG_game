/**
 * CardItem —— 单张卡牌组件（双模式视觉状态机 + 点击交互）
 *
 * 挂载在卡牌 Prefab 的根节点上，通过 init() 接收卡牌数据，
 * 通过 setMode() 在图鉴学习模式与占卜答题模式之间切换。
 *
 * ▸ STUDY_MODE（图鉴学习）：显示汉字、拼音、释义，隐藏遮罩层
 * ▸ EXAM_MODE （占卜答题）：隐藏文字，激活遮罩，支持点击选中，
 *                           选中时 Scale 1.05 并派发自定义事件
 */

import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Color } from 'cc';
import type { OracleCard, CardRarity } from './core/models';
const { ccclass, property } = _decorator;

// ======================== 卡牌品质枚举 ========================

export enum CardQuality {
    BLUE = 0,
    RED  = 1,
    GOLD = 2,
}

// ======================== 品质特效 ========================

/** 各品质对应的发光颜色 */
const QUALITY_GLOW_COLORS: Record<CardQuality, Color> = {
    [CardQuality.BLUE]: new Color(51, 153, 255),
    [CardQuality.RED]:  new Color(255, 51, 51),
    [CardQuality.GOLD]: new Color(255, 215, 0),
};

const QUALITY_NAMES: Record<CardQuality, string> = {
    [CardQuality.BLUE]: '蓝',
    [CardQuality.RED]:  '红',
    [CardQuality.GOLD]: '金',
};

function rarityToQuality(rarity: CardRarity): CardQuality {
    switch (rarity) {
        case 'gold': return CardQuality.GOLD;
        case 'red':  return CardQuality.RED;
        case 'blue':
        default:     return CardQuality.BLUE;
    }
}

// ======================== 卡牌组件 ========================

@ccclass('CardItem')
export class CardItem extends Component {

    // ======================== @property 节点引用 ========================

    // ---------- 甲骨文图案 ----------

    @property({ type: Sprite, displayName: '甲骨文图案 Sprite', tooltip: '用于显示甲骨文原始图案的 Sprite 组件' })
    public sprOracle: Sprite | null = null;

    @property({ type: Node, displayName: '甲骨文根节点', tooltip: '甲骨文图案所在节点的根节点' })
    public oracleBoneNode: Node | null = null;

    // ---------- 品质特效 ----------

    @property({ type: Node, displayName: '品质发光节点', tooltip: '围绕卡牌的品质发光特效节点' })
    public qualityGlowNode: Node | null = null;

    @property({ type: Sprite, displayName: '品质发光 Sprite', tooltip: '品质发光节点的 Sprite 组件，运行时根据品质修改颜色' })
    public qualityGlowSprite: Sprite | null = null;

    // ---------- 学习模式文字信息 ----------

    @property({ type: Label, displayName: '汉字 Label', tooltip: '显示现代汉字的 Label（STUDY_MODE 可见）' })
    public lblHanzi: Label | null = null;

    @property({ type: Label, displayName: '拼音 Label', tooltip: '显示拼音的 Label（STUDY_MODE 可见）' })
    public lblPinyin: Label | null = null;

    @property({ type: Label, displayName: '释义 Label', tooltip: '显示文字释义的 Label（STUDY_MODE 可见）' })
    public lblDefinition: Label | null = null;

    // ---------- 答题模式遮罩 ----------

    @property({ type: Node, displayName: '答题遮罩层', tooltip: '占卜答题模式下遮盖文字信息的遮罩节点（EXAM_MODE 激活）' })
    public maskLayer: Node | null = null;

    // ======================== 运行时状态 ========================

    private _cardId: string = '';
    private _cardData: OracleCard | null = null;
    private _currentMode: string = 'STUDY_MODE';
    private isSelected: boolean = false;

    // ======================== 公开接口 ========================

    /**
     * init —— 初始化卡牌
     *
     * @param cardId - 卡牌唯一标识符
     * @param data   - 卡牌完整数据（OracleCard）
     * @param mode   - 初始展示模式：'STUDY_MODE' | 'EXAM_MODE'
     */
    public init(cardId: string, data: OracleCard, mode: string): void {
        this._cardId = cardId;
        this._cardData = data;
        this._currentMode = mode;
        this.isSelected = false;

        this.applyTextInfo(data);
        this.applyQualityEffect(data);
        this.applyModeVisibility(mode);
        this.updateSelectedVisual();

        // 注册点击事件
        this.node.on(Node.EventType.TOUCH_END, this.onCardTapped, this);

        console.log(`[CardItem] 卡牌「${data.modernChar}」初始化完成，品质：${QUALITY_NAMES[rarityToQuality(data.rarity)]}，模式：${mode === 'STUDY_MODE' ? '图鉴学习' : '占卜答题'}`);
    }

    /**
     * setMode —— 切换卡牌展示模式
     *
     * @param mode - 'STUDY_MODE' | 'EXAM_MODE'
     */
    public setMode(mode: string): void {
        if (this._currentMode === mode) return;
        this._currentMode = mode;

        // 切到图鉴学习模式时必须重置选中状态
        if (mode === 'STUDY_MODE') {
            this.isSelected = false;
            this.updateSelectedVisual();
        }

        this.applyModeVisibility(mode);
        console.log(`[CardItem] 模式切换为 ${mode === 'STUDY_MODE' ? '图鉴学习' : '占卜答题'}`);
    }

    /** 返回当前卡牌 ID */
    public getCardId(): string {
        return this._cardId;
    }

    /**
     * setSelected —— 被动设置选中状态
     *
     * 由 BagUI 在单选管理时调用，用于取消其他卡牌的选中状态。
     */
    public setSelected(selected: boolean): void {
        this.isSelected = selected;
        this.updateSelectedVisual();
    }

    /** 设置甲骨文图案 SpriteFrame（由 BagUI 异步加载后调用） */
    public setOracleSprite(spriteFrame: SpriteFrame): void {
        if (this.sprOracle) {
            this.sprOracle.spriteFrame = spriteFrame;
        }
    }

    // ======================== 私有方法 ========================

    private applyTextInfo(data: OracleCard): void {
        if (this.lblHanzi)       { this.lblHanzi.string = data.modernChar; }
        if (this.lblPinyin)      { this.lblPinyin.string = data.pronunciation; }
        if (this.lblDefinition)  { this.lblDefinition.string = data.originalMeaning + '。' + data.modernMeaning; }
    }

    private applyQualityEffect(data: OracleCard): void {
        if (this.qualityGlowSprite) {
            this.qualityGlowSprite.color = QUALITY_GLOW_COLORS[rarityToQuality(data.rarity)];
        }
    }

    /**
     * applyModeVisibility —— 瞬时切换显隐，无过渡动画
     */
    private applyModeVisibility(mode: string): void {
        const isStudy = (mode === 'STUDY_MODE');

        if (this.lblHanzi)       { this.lblHanzi.active = isStudy; }
        if (this.lblPinyin)      { this.lblPinyin.active = isStudy; }
        if (this.lblDefinition)  { this.lblDefinition.active = isStudy; }
        if (this.maskLayer)      { this.maskLayer.active = !isStudy; }
    }

    // ======================== 选中状态与点击事件 ========================

    /** 更新选中状态的视觉反馈：选中 Scale 1.05，取消则恢复 1.0 */
    private updateSelectedVisual(): void {
        if (this.isSelected) {
            this.node.setScale(1.05, 1.05, 1);
        } else {
            this.node.setScale(1, 1, 1);
        }
    }

    /** 点击回调 — 按模式分流 */
    private onCardTapped(): void {
        if (this._currentMode === 'STUDY_MODE') {
            // STUDY_MODE：仅触发点击音效占位，不做状态变更
            console.log(`[CardItem] 卡牌「${this._cardId}」点击（图鉴学习模式）`);
            return;
        }

        // EXAM_MODE：切换选中状态
        this.isSelected = !this.isSelected;
        this.updateSelectedVisual();

        console.log(`[CardItem] 卡牌「${this._cardId}」选中状态变更: isSelected=${this.isSelected}`);

        // 向父节点派发自定义事件
        this.node.emit('card-selected', {
            cardId: this._cardId,
            isSelected: this.isSelected,
        });
    }

    // ======================== 生命周期 ========================

    public onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_END, this.onCardTapped, this);
        this._cardData = null;
        console.log('[CardItem] 卡牌组件销毁');
    }
}
