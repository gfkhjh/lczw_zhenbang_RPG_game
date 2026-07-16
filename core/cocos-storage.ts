/**
 * CocosSaveStorage —— Cocos Creator sys.localStorage 适配器
 *
 * 实现 core/storage.ts 中定义的 SaveStorage 接口，
 * 让 PlayerDataService 可以直接使用 Cocos Creator 的内置本地存储。
 *
 * 用法（在 GameManager 或任何 CC 组件中）：
 *   const storage = new CocosSaveStorage();
 *   const service = PlayerDataService.load(storage);
 */

import { sys } from 'cc';
import type { SaveStorage } from './storage.ts';

export class CocosSaveStorage implements SaveStorage {

    public save(key: string, value: string): void {
        sys.localStorage.setItem(key, value);
    }

    public load(key: string): string | null {
        return sys.localStorage.getItem(key);
    }

    public remove(key: string): void {
        sys.localStorage.removeItem(key);
    }
}
