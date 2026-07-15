import type { OracleCard, Question } from './models.ts';

export const oracleCards: readonly OracleCard[] = [
    {
        id: 'OBC-001', modernChar: '日', rarity: 'blue', areaId: 'huan-river',
        pronunciation: 'rì', originalMeaning: '太阳', modernMeaning: '太阳、白天、日期',
        evolutionDescription: '由太阳轮廓及中心标记逐渐演变为“日”。',
        oracleImagePath: 'oracle/day.png', evolutionImagePaths: [],
        curriculumPoints: ['象形字', '古文字字形演变'], relatedCardIds: ['OBC-002'],
    },
    {
        id: 'OBC-002', modernChar: '月', rarity: 'blue', areaId: 'huan-river',
        pronunciation: 'yuè', originalMeaning: '月亮', modernMeaning: '月亮、月份',
        evolutionDescription: '由弯月轮廓逐渐演变为“月”。',
        oracleImagePath: 'oracle/moon.png', evolutionImagePaths: [],
        curriculumPoints: ['象形字', '古文字字形演变'], relatedCardIds: ['OBC-001'],
    },
];

export const questions: readonly Question[] = [
    {
        id: 'Q-FIELD-DAY-001', type: 'choice', subject: 'chinese', scene: 'field',
        relatedCardIds: ['OBC-001'], difficulty: 1,
        stem: '“日”的甲骨文字形最初主要表示什么？', options: ['太阳', '月亮', '河流', '麦穗'],
        correctAnswer: '太阳', explanation: '“日”是描画太阳形状的象形字。', inkReward: 20,
    },
    {
        id: 'Q-FIELD-MOON-001', type: 'choice', subject: 'chinese', scene: 'field',
        relatedCardIds: ['OBC-002'], difficulty: 1,
        stem: '“月”的早期字形与哪种自然物最接近？', options: ['弯月', '山峰', '树木', '鱼'],
        correctAnswer: '弯月', explanation: '“月”的早期字形描画弯月。', inkReward: 20,
    },
    {
        id: 'Q-DIV-DAY-001', type: 'oracle-drag', subject: 'history', scene: 'divination',
        relatedCardIds: ['OBC-001'], difficulty: 2,
        stem: '选择表示太阳的甲骨卡片。', correctAnswer: 'OBC-001',
        explanation: '“日”的本义是太阳。', inkCost: 20, coinReward: 10, expReward: 10,
    },
    {
        id: 'Q-DIV-MOON-001', type: 'oracle-drag', subject: 'history', scene: 'divination',
        relatedCardIds: ['OBC-002'], difficulty: 2,
        stem: '选择表示月亮的甲骨卡片。', correctAnswer: 'OBC-002',
        explanation: '“月”的本义是月亮。', inkCost: 20, coinReward: 10, expReward: 10,
    },
];
