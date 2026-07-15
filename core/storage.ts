export interface SaveStorage {
    save(key: string, value: string): void;
    load(key: string): string | null;
    remove(key: string): void;
}

export class MemorySaveStorage implements SaveStorage {
    private readonly values = new Map<string, string>();

    public save(key: string, value: string): void { this.values.set(key, value); }
    public load(key: string): string | null { return this.values.get(key) ?? null; }
    public remove(key: string): void { this.values.delete(key); }
}
