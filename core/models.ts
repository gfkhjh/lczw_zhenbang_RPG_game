export type CardRarity = 'blue' | 'red' | 'gold';
export type QuestionType = 'choice' | 'fill' | 'material' | 'oracle-drag';
export type Subject = 'history' | 'chinese';

export interface OracleCard {
    id: string;
    modernChar: string;
    rarity: CardRarity;
    areaId: string;
    pronunciation: string;
    originalMeaning: string;
    modernMeaning: string;
    evolutionDescription: string;
    oracleImagePath: string;
    evolutionImagePaths: string[];
    curriculumPoints: string[];
    relatedCardIds: string[];
}

export interface Question {
    id: string;
    type: QuestionType;
    subject: Subject;
    scene: 'field' | 'divination';
    relatedCardIds: string[];
    difficulty: number;
    stem: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    inkReward?: number;
    coinReward?: number;
    expReward?: number;
    inkCost?: number;
}

export interface ErrorRecord {
    questionId: string;
    cardId: string;
    wrongCount: number;
    lastWrongAnswer: string;
    lastWrongAt: number;
    corrected: boolean;
}

export interface QuestionRecord {
    questionId: string;
    answeredAt: number;
    correct: boolean;
    answer: string;
}

export type RankId = 'apprentice' | 'scribe' | 'ritualist' | 'high-priest' | 'chief-diviner';

export interface PlayerProfile {
    saveVersion: number;
    ink: number;
    coins: number;
    rankExp: number;
    rank: RankId;
    unlockedAreas: string[];
    ownedCardIds: string[];
    questionRecords: QuestionRecord[];
    errorRecords: ErrorRecord[];
}

export interface AnswerResult {
    accepted: boolean;
    correct: boolean;
    reason?: 'insufficient-ink' | 'invalid-question';
    inkDelta: number;
    coinDelta: number;
    expDelta: number;
}
