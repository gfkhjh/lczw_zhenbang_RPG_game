/**
 * GameManager —— 游戏总控制脚本
 *
 * 挂载在游戏场景的全局节点上，负责：
 * - 游戏初始化与数据校验
 * - 驱动核心玩法测试流程（模拟玩家操作）
 *
 * 通过 BagUI 暴露的 PlayerDataService 访问新核心数据层。
 */

import { _decorator, Component, CCInteger, CCBoolean } from 'cc';
import { BagUI } from './BagUI';
import { CocosSaveStorage } from './core/cocos-storage';
import { PlayerDataService } from './core/PlayerDataService';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    // ========================== @property 属性区 ==========================

    @property({ type: CCInteger, displayName: '探索消耗墨料', tooltip: '每次进行甲骨文探索或答题时消耗的墨料数量' })
    public exploreCost: number = 20;

    @property({ type: CCBoolean, displayName: '调试模拟模式', tooltip: '开启后 start 时自动运行 simulateGameLoop 并刷新背包 UI' })
    public debugSimulate: boolean = true;

    @property({ type: BagUI, displayName: '背包界面组件' })
    public bagUI: BagUI = null;

    // ========================== 生命周期方法 ==========================

    public start(): void {
        console.log('========== 游戏初始化开始 ==========');

        // 获取共享的 PlayerDataService 实例（由 BagUI 懒初始化）
        const service: PlayerDataService = this.bagUI.cardService;
        const profile = service.profile;

        console.log('[GameManager] 初始墨料: ' + profile.ink);
        if (profile.ownedCardIds.length === 0) {
            console.log('[GameManager] 初始已拥有卡牌: 空');
        } else {
            console.log('[GameManager] 初始已拥有卡牌: ' + profile.ownedCardIds.join(', '));
        }
        console.log('====================================\n');

        // 调试模式：自动运行模拟流程并刷新背包 UI（发布时关闭 debugSimulate 即可）
        if (this.debugSimulate) {
            this.simulateGameLoop();

            // 刷新背包 UI 展示最新数据
            this.bagUI.refresh();
        }
    }

    /**
     * simulateGameLoop —— 模拟核心玩法流程
     *
     * 使用新的 PlayerDataService API：
     *   - spendInk()   → 消耗墨料
     *   - addCard()    → 将卡牌 ID 加入背包
     *   - answer()     → 模拟答题（自动处理奖励 / 错题记录）
     */
    public simulateGameLoop(): void {
        console.log('<><><><><> 核心玩法模拟测试开始 <><><><><>\n');

        const service: PlayerDataService = this.bagUI.cardService;

        // ----------------------------------------
        // 步骤 A: 消耗墨料探索
        // ----------------------------------------
        console.log('-------- 步骤 A: 探索甲骨文 / 答题 --------');
        console.log('[GameManager] 当前墨料: ' + service.profile.ink);
        const spent = service.spendInk(this.exploreCost);
        console.log('[GameManager] 探索完毕，剩余墨料: ' + service.profile.ink + '（' + (spent ? '消耗成功' : '墨料不足') + '）\n');

        // ----------------------------------------
        // 步骤 B: 占卜获得"日"（OBC-001）并加入收藏
        // ----------------------------------------
        console.log('-------- 步骤 B: 占卜/答对，获取卡片 --------');
        const added = service.addCard('OBC-001');
        if (added) {
            console.log('[GameManager] 获得了甲骨文卡片【OBC-001 (日)】');
        } else {
            console.log('[GameManager] 卡片【OBC-001】已拥有，跳过添加');
        }
        console.log('[GameManager] 当前收藏: ' + (service.profile.ownedCardIds.join(', ') || '空') + '\n');

        // ----------------------------------------
        // 步骤 C: 模拟答题（答错）
        // ----------------------------------------
        console.log('-------- 步骤 C: 答错记录错题 --------');
        const wrongResult = service.answer(
            {
                id: 'Q-FIELD-MOON-001', type: 'choice', subject: 'chinese', scene: 'field',
                relatedCardIds: ['OBC-002'], difficulty: 1,
                stem: '"月"的早期字形与哪种自然物最接近？',
                options: ['弯月', '山峰', '树木', '鱼'],
                correctAnswer: '弯月', explanation: '"月"的早期字形描画弯月。', inkReward: 20,
            },
            '山峰'
        );
        console.log('[GameManager] 答题结果: ' + (wrongResult.correct ? '正确' : '错误'));
        console.log('[GameManager] 错题记录数: ' + service.profile.errorRecords.length + '\n');

        // ----------------------------------------
        // 最终控制台输出
        // ----------------------------------------
        console.log('========== 模拟运行结束，最终游戏状态 ==========');
        console.log('[GameManager] 最终墨料: ' + service.profile.ink);
        console.log('[GameManager] 最终收藏: ' + (service.profile.ownedCardIds.join(', ') || '空'));
        console.log('[GameManager] 错题记录数: ' + service.profile.errorRecords.length);
        console.log('================================================\n');
    }
}
