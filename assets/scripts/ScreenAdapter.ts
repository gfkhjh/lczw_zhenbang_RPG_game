/**
 * ScreenAdapter —— 多端屏幕自适应控制器
 *
 * 挂在 Canvas 根节点上。采用「SHOW_ALL」等比缩放策略：
 *   1. 固定 Canvas 坐标系为设计分辨率（designWidth × designHeight）
 *   2. 将 Canvas 节点整体等比缩放以填满屏幕
 *   3. 在 lateUpdate 中覆盖 Canvas 的 _alignCanvasWithScreen 自动缩放，
 *      确保每帧都维持正确的等比缩放，不会发生任何拉伸变形。
 *
 * 原理：Cocos Creator 的触控事件会自动通过节点层级变换坐标系，
 * 因此 Canvas 缩放后触控坐标依然正确映射到设计分辨率空间。
 */

import { _decorator, Component, Canvas, UITransform, view, Vec3 } from "cc";

const { ccclass, property } = _decorator;

@ccclass("ScreenAdapter")
export class ScreenAdapter extends Component {

    // ======================== 设计分辨率（可在属性面板调整） ========================

    @property({
        displayName: "设计宽度",
        tooltip: "游戏设计分辨率宽度（像素）。所有 UI 和场景元素按此坐标系布局。实际渲染时等比缩放适应屏幕。",
    })
    public designWidth: number = 1280;

    @property({
        displayName: "设计高度",
        tooltip: "游戏设计分辨率高度（像素）。",
    })
    public designHeight: number = 720;

    @property({
        displayName: "缩放策略",
        tooltip: "SHOW_ALL = 完整显示设计区域（可能有黑边）；FIT_WIDTH = 宽度填满；FIT_HEIGHT = 高度填满。",
    })
    public fitMode: "SHOW_ALL" | "FIT_WIDTH" | "FIT_HEIGHT" = "SHOW_ALL";

    // ======================== 运行时缓存 ========================

    private _cachedScale: number = 1;
    private _cachedOffsetX: number = 0;
    private _cachedOffsetY: number = 0;

    // ======================== 生命周期 ========================

    public onLoad(): void {
        this.applyAdapter();
    }

    public lateUpdate(): void {
        const transform = this.getComponent(UITransform);
        if (!transform) return;

        const currentW = transform.width;
        const currentH = transform.height;

        if (Math.abs(currentW - this.designWidth) > 1 || Math.abs(currentH - this.designHeight) > 1) {
            this.applyAdapter();
        } else {
            this.repositionCanvas();
        }
    }

    // ======================== 核心适配逻辑 ========================

    private applyAdapter(): void {
        const transform = this.getComponent(UITransform);
        if (!transform) return;

        const frameSize = view.getFrameSize();
        const screenW = frameSize.width;
        const screenH = frameSize.height;

        let uniformScale: number;
        const scaleX = screenW / this.designWidth;
        const scaleY = screenH / this.designHeight;

        switch (this.fitMode) {
            case "SHOW_ALL":
                uniformScale = Math.min(scaleX, scaleY);
                break;
            case "FIT_WIDTH":
                uniformScale = scaleX;
                break;
            case "FIT_HEIGHT":
                uniformScale = scaleY;
                break;
            default:
                uniformScale = Math.min(scaleX, scaleY);
        }

        this._cachedScale = uniformScale;
        transform.setContentSize(this.designWidth, this.designHeight);
        this.repositionCanvas();
    }

    private repositionCanvas(): void {
        const frameSize = view.getFrameSize();
        const screenW = frameSize.width;
        const screenH = frameSize.height;

        const scale = this._cachedScale;

        this.node.setScale(new Vec3(scale, scale, 1));

        this._cachedOffsetX = (screenW - this.designWidth * scale) / 2;
        this._cachedOffsetY = (screenH - this.designHeight * scale) / 2;
        this.node.setPosition(this._cachedOffsetX, this._cachedOffsetY, this.node.position.z);
    }

    // ======================== 工具方法 ========================

    public screenToDesign(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX - this._cachedOffsetX) / this._cachedScale,
            y: (screenY - this._cachedOffsetY) / this._cachedScale,
        };
    }

    public getScale(): number {
        return this._cachedScale;
    }
}
