import assert from 'node:assert/strict';
import test from 'node:test';
import { questions } from '../core/data.ts';
import { PlayerDataService, SAVE_KEY } from '../core/PlayerDataService.ts';
import { MemorySaveStorage } from '../core/storage.ts';

const question = (id: string) => {
    const value = questions.find(item => item.id === id);
    assert.ok(value);
    return value;
};

test('ink never becomes negative and insufficient spending fails', () => {
    const player = new PlayerDataService(new MemorySaveStorage());
    assert.equal(player.spendInk(101), false);
    assert.equal(player.profile.ink, 100);
    player.addInk(-500);
    assert.equal(player.profile.ink, 0);
});

test('cards cannot be added twice', () => {
    const player = new PlayerDataService(new MemorySaveStorage());
    assert.equal(player.addCard('OBC-001'), true);
    assert.equal(player.addCard('OBC-001'), false);
    assert.deepEqual(player.profile.ownedCardIds, ['OBC-001']);
});

test('field correct answer rewards ink; wrong answer does not', () => {
    const player = new PlayerDataService(new MemorySaveStorage());
    const q = question('Q-FIELD-DAY-001');
    assert.equal(player.answer(q, '月亮').inkDelta, 0);
    assert.equal(player.profile.ink, 100);
    assert.equal(player.answer(q, '太阳').inkDelta, 20);
    assert.equal(player.profile.ink, 120);
});

test('divination only spends ink on correct answer', () => {
    const player = new PlayerDataService(new MemorySaveStorage());
    const q = question('Q-DIV-DAY-001');
    player.answer(q, 'OBC-002');
    assert.equal(player.profile.ink, 100);
    const result = player.answer(q, 'OBC-001');
    assert.deepEqual([result.inkDelta, result.coinDelta, result.expDelta], [-20, 10, 10]);
    assert.deepEqual([player.profile.ink, player.profile.coins, player.profile.rankExp], [80, 10, 10]);
});

test('errors accumulate and become corrected after a correct retry', () => {
    const player = new PlayerDataService(new MemorySaveStorage());
    const q = question('Q-FIELD-MOON-001');
    player.answer(q, '山峰', 1);
    player.answer(q, '鱼', 2);
    assert.equal(player.profile.errorRecords[0].wrongCount, 2);
    assert.equal(player.profile.errorRecords[0].corrected, false);
    player.answer(q, '弯月', 3);
    assert.equal(player.profile.errorRecords[0].corrected, true);
});

test('rank only increases from accumulated experience', () => {
    const storage = new MemorySaveStorage();
    const player = new PlayerDataService(storage);
    player.profile.rankExp = 990;
    player.answer(question('Q-DIV-DAY-001'), 'OBC-001');
    assert.equal(player.profile.rank, 'scribe');
    player.answer(question('Q-DIV-DAY-001'), 'wrong');
    assert.equal(player.profile.rank, 'scribe');
});

test('save can be loaded and corrupted save falls back safely', () => {
    const storage = new MemorySaveStorage();
    const player = new PlayerDataService(storage);
    player.addCard('OBC-001');
    player.addInk(25);
    const loaded = PlayerDataService.load(storage);
    assert.equal(loaded.profile.ink, 125);
    assert.deepEqual(loaded.profile.ownedCardIds, ['OBC-001']);
    storage.save(SAVE_KEY, '{broken json');
    assert.equal(PlayerDataService.load(storage).profile.ink, 100);
});
