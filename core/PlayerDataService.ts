import type { AnswerResult, PlayerProfile, Question } from './models.ts';
import { rankForExp } from './RankService.ts';
import type { SaveStorage } from './storage.ts';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'oracle-rpg-player-profile';

export function createDefaultProfile(): PlayerProfile {
    return {
        saveVersion: SAVE_VERSION, ink: 100, coins: 0, rankExp: 0, rank: 'apprentice',
        unlockedAreas: ['huan-river'], ownedCardIds: [], questionRecords: [], errorRecords: [],
    };
}

export class PlayerDataService {
    public readonly profile: PlayerProfile;
    private readonly storage: SaveStorage;

    public constructor(storage: SaveStorage, profile?: PlayerProfile) {
        this.storage = storage;
        this.profile = profile ?? createDefaultProfile();
        this.normalize();
    }

    public static load(storage: SaveStorage): PlayerDataService {
        const raw = storage.load(SAVE_KEY);
        if (!raw) return new PlayerDataService(storage);
        try {
            const value = JSON.parse(raw) as Partial<PlayerProfile>;
            if (value.saveVersion !== SAVE_VERSION) return new PlayerDataService(storage);
            return new PlayerDataService(storage, value as PlayerProfile);
        } catch {
            return new PlayerDataService(storage);
        }
    }

    public save(): void { this.storage.save(SAVE_KEY, JSON.stringify(this.profile)); }
    public clearSave(): void { this.storage.remove(SAVE_KEY); }

    public addInk(amount: number): void {
        if (!Number.isFinite(amount)) return;
        this.profile.ink = Math.max(0, this.profile.ink + amount);
        this.save();
    }

    public spendInk(amount: number): boolean {
        if (!Number.isFinite(amount) || amount < 0 || this.profile.ink < amount) return false;
        this.profile.ink -= amount;
        this.save();
        return true;
    }

    public addCard(cardId: string): boolean {
        if (!cardId || this.profile.ownedCardIds.includes(cardId)) return false;
        this.profile.ownedCardIds.push(cardId);
        this.save();
        return true;
    }

    /**
     * getOwnedCardIds —— 获取玩家当前拥有的所有卡牌 ID 列表（只读）
     *
     * 外部系统（场景模块、占卜考核系统）应通过此方法查询背包数据，
     * 不要直接穿透 profile.ownedCardIds。
     */
    public getOwnedCardIds(): readonly string[] {
        return this.profile.ownedCardIds;
    }

    /**
     * hasCard —— 查询某张卡牌是否已被拥有
     *
     * @param cardId - 卡牌唯一标识符（如 "OBC-001"）
     */
    public hasCard(cardId: string): boolean {
        return this.profile.ownedCardIds.includes(cardId);
    }

    public answer(question: Question, answer: string, answeredAt = Date.now()): AnswerResult {
        if (!question?.id) return { accepted: false, correct: false, reason: 'invalid-question', inkDelta: 0, coinDelta: 0, expDelta: 0 };
        const correct = answer === question.correctAnswer;
        const inkCost = question.scene === 'divination' && correct ? Math.max(0, question.inkCost ?? 0) : 0;
        if (correct && inkCost > this.profile.ink) {
            return { accepted: false, correct: true, reason: 'insufficient-ink', inkDelta: 0, coinDelta: 0, expDelta: 0 };
        }

        let inkDelta = 0, coinDelta = 0, expDelta = 0;
        if (correct) {
            if (question.scene === 'field') {
                inkDelta = Math.max(0, question.inkReward ?? 0);
                this.profile.ink += inkDelta;
            } else {
                inkDelta = -inkCost;
                this.profile.ink -= inkCost;
                coinDelta = Math.max(0, question.coinReward ?? 0);
                expDelta = Math.max(0, question.expReward ?? 0);
                this.profile.coins += coinDelta;
                this.profile.rankExp += expDelta;
                this.profile.rank = rankForExp(this.profile.rankExp);
            }
            this.markCorrected(question.id);
        } else {
            this.recordError(question.id, question.relatedCardIds[0] ?? '', answer, answeredAt);
        }
        this.profile.questionRecords.push({ questionId: question.id, answeredAt, correct, answer });
        this.save();
        return { accepted: true, correct, inkDelta, coinDelta, expDelta };
    }

    private recordError(questionId: string, cardId: string, answer: string, at: number): void {
        const found = this.profile.errorRecords.find(item => item.questionId === questionId);
        if (found) {
            found.wrongCount += 1; found.lastWrongAnswer = answer; found.lastWrongAt = at; found.corrected = false;
        } else {
            this.profile.errorRecords.push({ questionId, cardId, wrongCount: 1, lastWrongAnswer: answer, lastWrongAt: at, corrected: false });
        }
    }

    private markCorrected(questionId: string): void {
        const found = this.profile.errorRecords.find(item => item.questionId === questionId);
        if (found) found.corrected = true;
    }

    private normalize(): void {
        this.profile.ink = Math.max(0, Number(this.profile.ink) || 0);
        this.profile.coins = Math.max(0, Number(this.profile.coins) || 0);
        this.profile.rankExp = Math.max(0, Number(this.profile.rankExp) || 0);
        this.profile.rank = rankForExp(this.profile.rankExp);
        this.profile.unlockedAreas ??= ['huan-river'];
        this.profile.ownedCardIds ??= [];
        this.profile.questionRecords ??= [];
        this.profile.errorRecords ??= [];
    }
}
