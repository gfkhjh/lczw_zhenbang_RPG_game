/**
 * GameManager —— 游戏总控制脚本
 *
 * 挂载在游戏场景的全局节点上，负责：
 * - 游戏初始化与数据校验
 * - 驱动核心玩法测试流程（模拟玩家操作）
 *
 * 通过 PlayerData 单例读写墨料、背包与错题本数据。
 */

import { _decorator, Component, CCInteger } from 'cc';
import PlayerData from './PlayerData';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    // ======================== @property 属性区 ========================

    /**
     * 每次探索/答题消耗的墨料数量
     * 可在 Cocos Creator 编辑器属性面板中直接调整
     */
    @property({ type: CCInteger, displayName: '探索消耗墨料', tooltip: '每次进行甲骨文探索或答题时消耗的墨料数量' })
    public exploreCost: number = 20;

    // ======================== 生命周期方法 ========================

    /**
     * start —— 组件启动时自动调用
     *
     * 在这里完成游戏初始化工作：
     * 1. 打印当前初始墨料和背包状态
     * 2. 等待真实的场景交互驱动游戏流程
     */
    public start(): void {
        console.log('========== 游戏初始化开始 ==========');

        // 获取 PlayerData 单例，准备读写数据
        const playerData: PlayerData = PlayerData.getInstance();

        // 打印初始墨料数量
        console.log(`[GameManager] 初始墨料：${playerData.inkCount}`);

        // 打印初始背包状态（空背包则明确提示）
        if (playerData.bagCards.length === 0) {
            console.log('[GameManager] 初始背包：空，尚未收集任何甲骨文文字');
        } else {
            console.log(`[GameManager] 初始背包：${playerData.bagCards.join(', ')}`);
        }

        // 打印初始错题本状态
        console.log('[GameManager] 初始错题本记录数：' + playerData.errorBook.size);

        console.log('==================================\n');

        // 正式启动不再自动运行固定模拟流程。
        // simulateGameLoop 仅保留为开发期手动调试入口。
    }

    // ======================== 测试/模拟方法 ========================

    /**
     * simulateGameLoop —— 模拟玩家的一次完整游戏流程
     *
     * 依次模拟以下行为（每步都通过 PlayerData 单例读写数据）：
     *   A. 消耗墨料进行一次甲骨文探索/答题
     *   B. 回答正确，获得「日」字卡片
     *   C. 再次消耗墨料答题，答错后记录错题「月」
     *
     * 该方法仅用于开发和测试阶段，正式上线后可移除以减小包体。
     */
    public simulateGameLoop(): void {
        console.log('********** 模拟游戏流程开始 **********\n');

        // ============================
        // 步骤 A：消耗墨料，进行探索/答题
        // ============================
        console.log('-------- 步骤 A：甲骨文探索 / 答题 --------');

        // 从单例读取当前墨料
        const playerDataBeforeA: PlayerData = PlayerData.getInstance();
        console.log(`[GameManager] 当前墨料：${playerDataBeforeA.inkCount}`);
        console.log(`[GameManager] 消耗 ${this.exploreCost} 点墨料进行甲骨文探索...`);

        // 调用 addInk 消耗墨料（传入负数即减少）
        playerDataBeforeA.addInk(-this.exploreCost);

        // 打印探索后的剩余墨料
        console.log(`[GameManager] 探索结束，剩余墨料：${playerDataBeforeA.inkCount}\n`);

        // ============================
        // 步骤 B：回答正确，将「日」加入背包
        // ============================
        console.log('-------- 步骤 B：回答正确，获得卡片 --------');

        const playerDataAfterB: PlayerData = PlayerData.getInstance();
        console.log('[GameManager] 玩家回答正确！获得甲骨文文字「日」');

        // 调用 addCardToBag 将新文字加入背包
        playerDataAfterB.addCardToBag('日');

        // 打印当前背包所有卡片
        console.log(`[GameManager] 当前背包：${playerDataAfterB.bagCards.join('、')}\n`);

        // ============================
        // 步骤 C：再次消耗墨料，答题错误并记入错题本
        // ============================
        console.log('-------- 步骤 C：答题错误，记录错题 --------');

        const playerDataBeforeC: PlayerData = PlayerData.getInstance();
        console.log(`[GameManager] 当前墨料：${playerDataBeforeC.inkCount}`);
        console.log(`[GameManager] 再次消耗 ${this.exploreCost} 点墨料进行答题...`);

        // 再次消耗墨料
        playerDataBeforeC.addInk(-this.exploreCost);
        console.log(`[GameManager] 答题结束，剩余墨料：${playerDataBeforeC.inkCount}`);

        // 模拟答错，将「月」记录进错题本
        console.log('[GameManager] 很遗憾，回答错误...');
        playerDataBeforeC.recordError('月');

        console.log(`[GameManager] 当前错题本条目数：${playerDataBeforeC.errorBook.size}`);
        console.log(`[GameManager] 文字「月」的累计错误次数：${playerDataBeforeC.errorBook.get('月')}\n`);

        // ============================
        // 最终状态汇总输出
        // ============================
        console.log('========== 模拟流程结束，最终游戏状态 ==========');
        const finalData: PlayerData = PlayerData.getInstance();
        console.log(`最终墨料：${finalData.inkCount}`);
        console.log(`最终背包：${finalData.bagCards.join('、')}`);
        console.log(`错题本记录数：${finalData.errorBook.size}`);
        console.log('================================================\n');
    }
}
