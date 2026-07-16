# 殷墟小卜官 RPG

面向初高中历史与大语文学习场景的甲骨文探索、收集与占卜答题游戏。

## 当前阶段

仓库目前包含不依赖 Cocos Creator 的纯 TypeScript 核心数据层，以及早期 Cocos 组件原型。项目统一使用 Cocos Creator 3.8.8；场景、Prefab 和资源文件不得使用其他引擎版本保存。

## 开发环境

- 引擎：Cocos Creator 3.8.8
- 语言：TypeScript
- 目标平台：Android 学习机
- 屏幕方向：横屏

## 核心规则

- 野外新字拼图不消耗墨料。
- 野外旧字答对获得墨料，答错只记录错题。
- 城内占卜答对时才扣除墨料，并获得金币和段位经验。
- 城内占卜答错不扣墨料，只记录错题。
- 墨料不会小于 0，卡片不会重复进入背包，段位只升不降。

## 目录

- `core/models.ts`：卡片、题目、玩家、错题等数据结构。
- `core/data.ts`：“日”“月”两张测试卡和四道测试题。
- `core/PlayerDataService.ts`：资源、答题、背包、错题与存档规则。
- `core/RankService.ts`：五阶段位计算。
- `core/storage.ts`：与引擎无关的存储接口及内存测试实现。
- `tests/`：核心业务规则自动化测试。

## 运行测试

需要 Node.js 22.6 或更高版本：

```bash
npm test
```

Node.js 直接运行 TypeScript 类型擦除测试，不需要安装 Cocos Creator，也不需要下载第三方依赖。

## 后续接入 Cocos

确定 Cocos Creator 版本后，实现一个基于 `sys.localStorage` 的 `SaveStorage`，并由场景/UI 调用 `PlayerDataService`。核心数据层本身不引用 `cc`。
