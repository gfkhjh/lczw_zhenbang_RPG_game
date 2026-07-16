/**
 * CardItem —— 单张卡牌组件
 *
 * 挂载在卡牌 Prefab 的根节点上，根据传入的卡牌数据和背包模式，
 * 控制内部各 UI 子节点的显示/隐藏状态，实现图鉴学习模式与占卜答题模式的无缝切换。
 */

import { _decorator, Component, Node, SpriteFrame, Label, Sprite, Color } from 'cc';
const { ccclass, property } = _decorator;

// ======================== 枚举定义 ========================

/**
 * 背包展示模式
 * STUDY_MODE —— 图鉴学习：显示文字、拼音、演变轨迹、释义
 * EXAM_MODE  —— 占卜答题：隐藏文字，仅显示甲骨图案 + 品质特效
 */
export enum BagMode {
    STUDY_MODE = 0,
    EXAM_MODE  = 1,
}

/**
 * 卡牌品质
 * BLUE —— 蓝色（普通）
 * RED  —— 红色（稀有）
 * GOLD —— 金色（传说）
 */
export enum CardQuality {
    BLUE = 0,
    RED  = 1,
    GOLD = 2,
}

// ======================== 数据结构定义 ========================

/**
 * ICardData —— 单张卡牌的完整数据结构
 *
 * id               —— 唯一标识符
 * character        —— 现代汉字（如 "日"）
 * pinyin           —— 拼音（如 "rì"）
 * quality          —— 品质等级
 * oracleBoneSprite —— 甲骨文图案 SpriteFrame
 * evolutionSprites —— 字形演变过程 SpriteFrame 列表
 * meaning          —— 文字释义
 */
export interface ICardData {
    id: string;
    character: string;
    pinyin: string;
    quality: CardQuality;
    oracleBoneSprite: SpriteFrame;
    evolutionSprites?: SpriteFrame[];
    meaning?: string;
}

// ======================== 品质特效颜色映射 ========================

/** 各品质对应的发光颜色 */
const QUALITY_GLOW_COLORS: Record<CardQuality, Color> = {
    [CardQuality.BLUE]: new Color(51, 153, 255),
    [CardQuality.RED]:  new Color(255, 51, 51),
    [CardQuality.GOLD]: new Color(255, 215, 0),
};

/** 品质中文名 */
const QUALITY_NAMES: Record<CardQuality, string> = {
    [CardQuality.BLUE]: '蓝',
    [CardQuality.RED]:  '红',
    [CardQuality.GOLD]: '金',
};

// ======================== 卡牌组件 ========================

@ccclass('CardItem')
export class CardItem extends Component {

    // ======================== @property 节点引用 ========================

    // ---------- 甲骨文图案 ----------

    @property({ type: Sprite, displayName: '甲骨文图案 Sprite', tooltip: '用于显示甲骨文原始图案的 Sprite 组件' })
    public oracleBoneSprite: Sprite | null = null;

    @property({ type: Node, displayName: '甲骨文根节点', tooltip: '甲骨文图案所在节点的根节点' })
    public oracleBoneNode: Node | null = null;

    // ---------- 品质特效 ----------

    @property({ type: Node, displayName: '品质发光节点', tooltip: '围绕卡牌的品质发光特效节点' })
    public qualityGlowNode: Node | null = null;

    @property({ type: Sprite, displayName: '品质发光 Sprite', tooltip: '品质发光节点的 Sprite 组件，运行时根据品质修改颜色' })
    public qualityGlowSprite: Sprite | null = null;

    // ---------- 学习模式展示元素 ----------

    @property({ type: Label, displayName: '汉字 Label', tooltip: '显示现代汉字的 Label（学习模式可见）' })
    public charLabel: Label | null = null;

    @property({ type: Label, displayName: '拼音 Label', tooltip: '显示拼音的 Label（学习模式可见）' })
    public pinyinLabel: Label | null = null;

    @property({ type: Node, displayName: '字形演变容器', tooltip: '存放字形演变 Sprite 的容器节点（学习模式可见）' })
    public evolutionContainer: Node | null = null;

    @property({ type: Label, displayName: '释义 Label', tooltip: '显示文字释义的 Label（学习模式可见）' })
    public meaningLabel: Label | null = null;

    @property({ type: Node, displayName: '文字信息根节点', tooltip: '包含汉字、拼音、演变、释义等所有文字信息的根节点' })
    public textInfoRoot: Node | null = null;

    // ======================== 运行时数据 ========================

    private _cardData: ICardData | null = null;
    private _currentMode: BagMode = BagMode.STUDY_MODE;

    // ======================== 公开方法 ========================

    /**
     * init —— 初始化卡牌
     *
     * 由父级（如 BagUI）在实例化 Prefab 后调用，传入卡牌数据和当前模式。
     *
     * @param data - 卡牌完整数据
     * @param mode - 当前背包模式
     */
    public init(data: ICardData, mode: BagMode): void {
        this._cardData = data;
        this._currentMode = mode;

        this.applyOracleBone(data);
        this.applyTextInfo(data);
        this.applyQualityEffect(data);
        this.applyModeVisibility(mode);

        console.log(`[CardItem] 卡牌「${data.character}」初始化完成，品质：${QUALITY_NAMES[data.quality]}，模式：${mode === BagMode.STUDY_MODE ? '图鉴学习' : '占卜答题'}`);
    }

    // ======================== 私有方法 ========================

    /** 设置甲骨文图案的 SpriteFrame */
    private applyOracleBone(data: ICardData): void {
        if (this.oracleBoneSprite && data.oracleBoneSprite) {
            this.oracleBoneSprite.spriteFrame = data.oracleBoneSprite;
        }
    }

    /** 填充学习模式的文字信息：汉字、拼音、演变 SpriteFrame、释义 */
    private applyTextInfo(data: ICardData): void {
        if (this.charLabel) {
            this.charLabel.string = data.character;
        }
        if (this.pinyinLabel) {
            this.pinyinLabel.string = data.pinyin;
        }
        if (this.evolutionContainer && data.evolutionSprites && data.evolutionSprites.length > 0) {
            const children: Node[] = this.evolutionContainer.children;
            const count: number = Math.min(children.length, data.evolutionSprites.length);
            for (let i = 0; i < count; i++) {
                const spriteComp: Sprite | null = children[i].getComponent(Sprite);
                if (spriteComp) {
                    spriteComp.spriteFrame = data.evolutionSprites[i];
                }
            }
        }
        if (this.meaningLabel && data.meaning) {
            this.meaningLabel.string = data.meaning;
        }
    }

    /**
     * 根据品质设置发光颜色
     * BLUE → 蓝光 | RED → 红光 | GOLD → 金光
     */
    private applyQualityEffect(data: ICardData): void {
        if (this.qualityGlowSprite) {
            this.qualityGlowSprite.color = QUALITY_GLOW_COLORS[data.quality];
        }
    }

    /**
     * 根据模式切换文字信息区的显隐
     * STUDY_MODE —— 显示（学习模式全部可见）
     * EXAM_MODE  —— 隐藏（仅留甲骨图案 + 品质特效）
     */
    private applyModeVisibility(mode: BagMode): void {
        if (this.textInfoRoot) {
            this.textInfoRoot.active = (mode === BagMode.STUDY_MODE);
        }
    }

    
    /**
     * setMode —— 更新当前卡牌的展示模式
     *
     * 在背包模式切换时由 BagUI 调用，仅变更模式相关显隐，
     * 无需重新传入完整卡牌数据，避免不必要的重复赋值。
     *
     * @param mode - 新的背包展示模式
     */
    public setMode(mode: BagMode): void {
        this._currentMode = mode;
        this.applyModeVisibility(mode);
        console.log(`[CardItem] 模式切换为 ${mode === BagMode.STUDY_MODE ? '图鉴学习' : '占卜答题'}`);
    }

    // ======================== 异步图片更新接口 ========================

    /**
     * setOracleSprite —— 设置甲骨文原图 Sprite
     *
     * 由 BagUI 在异步加载图片资源后调用，更新卡面上的甲骨文图形。
     *
     * @param spriteFrame - 已加载的甲骨文图 SpriteFrame
     */
    public setOracleSprite(spriteFrame: SpriteFrame): void {
        if (this.oracleBoneSprite) {
            this.oracleBoneSprite.spriteFrame = spriteFrame;
        }
    }

    /**
     * addEvolutionSprite —— 追加字形演变图 Sprite
     *
     * 每次调用会在字形演变容器中查找下一个可用的 Sprite 子节点并赋值。
     * 如果所有子节点已用完，则跳过加载的图片。
     *
     * @param spriteFrame - 已加载的演变图 SpriteFrame
     */
    public addEvolutionSprite(spriteFrame: SpriteFrame): void {
        if (!this.evolutionContainer) {
            return;
        }
        const children: Node[] = this.evolutionContainer.children;
        for (const child of children) {
            const spriteComp: Sprite | null = child.getComponent(Sprite);
            if (spriteComp && !spriteComp.spriteFrame) {
                spriteComp.spriteFrame = spriteFrame;
                return;
            }
        }
    }
// ======================== 生命周期 ========================

    public onDestroy(): void {
        this._cardData = null;
        console.log('[CardItem] 卡牌组件销毁');
    }
}
