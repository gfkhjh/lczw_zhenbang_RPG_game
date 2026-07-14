/**
 * PlayerData —— 玩家全局数据管理单例
 *
 * 集中管理玩家的所有持久化运行时数据，包括：
 * - 墨料（inkCount）
 * - 背包甲骨文卡片（bagCards）
 * - 错题记录（errorBook）
 *
 * 整个游戏生命周期内只存在一个实例，通过 PlayerData.getInstance() 获取。
 */

export default class PlayerData {

    // ======================== 单例部分 ========================

    /** 单例实例引用 */
    private static _instance: PlayerData | null = null;

    /**
     * 获取 PlayerData 单例
     * 如果实例尚未创建，则自动创建并返回。
     */
    public static getInstance(): PlayerData {
        if (PlayerData._instance === null) {
            PlayerData._instance = new PlayerData();
        }
        return PlayerData._instance;
    }

    // ======================== 数据属性 ========================

    /** 玩家墨料数量，初始值为 100 */
    public inkCount: number = 100;

    /** 玩家背包中已收集的甲骨文字名称列表（不重复） */
    public bagCards: string[] = [];

    /**
     * 错题本
     * Key   — 文字名称（字符串）
     * Value — 该文字出错的累积次数（数字）
     */
    public errorBook: Map<string, number> = new Map();

    // ======================== 构造方法 ========================

    /**
     * 构造方法（私有，防止外部直接 new）
     * 外部请始终使用 PlayerData.getInstance() 获取单例。
     */
    private constructor() {
        // 初始化时无需额外逻辑，属性默认值已在声明处设定
    }

    // ======================== 公共方法 ========================

    /**
     * 增加或减少玩家的墨料数量
     * 
     * @param amount - 要增减的数量（正数增加，负数减少）
     * 
     * 示例：
     *   PlayerData.getInstance().addInk(50);   // 墨料 +50
     *   PlayerData.getInstance().addInk(-30);  // 墨料 -30
     */
    public addInk(amount: number): void {
        this.inkCount += amount;
        console.log(`[PlayerData] 墨料变更：${amount > 0 ? "+" : ""}${amount}，当前墨料：${this.inkCount}`);
    }

    /**
     * 将指定文字加入背包
     * 如果背包中已存在该文字，则不重复添加并给出提示。
     * 
     * @param cardName - 要加入背包的文字名称
     */
    public addCardToBag(cardName: string): void {
        if (this.bagCards.indexOf(cardName) !== -1) {
            console.log(`[PlayerData] 背包中已存在文字「${cardName}」，跳过重复添加`);
            return;
        }
        this.bagCards.push(cardName);
        console.log(`[PlayerData] 文字「${cardName}」已加入背包，当前背包数量：${this.bagCards.length}`);
    }

    /**
     * 记录一次错题：将指定文字的错题次数 +1
     * 如果该文字尚未在错题本中，则自动初始化为 1。
     * 
     * @param cardName - 出错的文字名称
     */
    public recordError(cardName: string): void {
        const currentCount: number = this.errorBook.get(cardName) ?? 0;
        this.errorBook.set(cardName, currentCount + 1);
        console.log(
            `[PlayerData] 文字「${cardName}」错误次数 +1，当前累计错误：${this.errorBook.get(cardName)}`
        );
    }
}
