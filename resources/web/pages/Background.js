/**
 * 背景设置页面
 */
export default class Background {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.currentImage = null;
        this.targetWidth = 760;
        this.targetHeight = 360;
        this.backgroundType = 'normal';
        this.fabricLoaded = false;
        this.isInitialized = false;
    }
    
    destroy() {
        // 清理画布
        if (this.canvas) {
            try {
                // 清除所有对象
                this.canvas.clear();
                // 移除所有事件监听器
                this.canvas.off();
                // 销毁画布
                this.canvas.dispose();
            } catch (e) {
                console.warn('销毁画布时出错:', e);
            }
            this.canvas = null;
        }
        
        // 清理可能残留的 canvas 元素
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (canvasWrapper) {
            const allCanvases = canvasWrapper.querySelectorAll('canvas');
            allCanvases.forEach(canvas => {
                if (canvas.id !== 'fabricCanvas') {
                    canvas.remove();
                }
            });
            const oldContainers = canvasWrapper.querySelectorAll('.canvas-container');
            oldContainers.forEach(container => container.remove());
        }
        
        this.currentImage = null;
        this.isInitialized = false;
    }
    
    async render() {
        return `
            <div class="bg-white min-h-full">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                    <!-- 页面标题 -->
                    <div class="mb-4 sm:mb-5">
                        <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">背景设置</h1>
                        <p class="text-xs text-gray-500">自定义您的统计背景图片</p>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <!-- 左侧控制面板 -->
                        <div class="lg:col-span-1 space-y-3 sm:space-y-4">
                            <!-- 背景类型选择 -->
                            <div class="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                                <label class="block text-xs font-medium text-gray-600 mb-2">背景类型</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button type="button" id="backgroundTypeNormal" class="background-type-card px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5 active:bg-primary/10" data-value="normal">
                                        <div class="text-center">普通背景</div>
                                        <div class="text-xs text-gray-500 mt-0.5">760×360</div>
                                    </button>
                                    <button type="button" id="backgroundTypeRanking" class="background-type-card px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5 active:bg-primary/10" data-value="ranking">
                                        <div class="text-center">排行榜背景</div>
                                        <div class="text-xs text-gray-500 mt-0.5">1520×200</div>
                                    </button>
                                </div>
                                <!-- 隐藏的 select 用于保持兼容性 -->
                                <select id="backgroundTypeSelect" class="hidden">
                                    <option value="normal">普通背景</option>
                                    <option value="ranking">排行榜背景</option>
                                </select>
                            </div>
                            
                            <!-- 上传图片 -->
                            <div class="bg-white rounded-lg border border-gray-200 p-4">
                                <label class="block text-xs font-medium text-gray-600 mb-2">上传图片</label>
                                <input type="file" id="imageInput" accept="image/*" class="hidden">
                                <button id="uploadBtn" class="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                    </svg>
                                    <span>选择图片</span>
                                </button>
                            </div>
                            
                            <!-- 操作按钮 -->
                            <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                                <button id="resetBtn" class="w-full px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    <span>重置</span>
                                </button>
                                <button id="rotateBtn" class="w-full px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    <span>旋转90°</span>
                                </button>
                                <button id="confirmBtn" class="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>确认设置</span>
                                </button>
                            </div>
                            
                            <!-- 目标尺寸信息 -->
                            <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                <div class="text-xs text-gray-600">
                                    <div class="font-medium mb-1">目标尺寸</div>
                                    <div class="text-gray-900 font-mono" id="targetSize">760×360</div>
                                </div>
                            </div>
                            
                            <!-- 当前背景预览 -->
                            <div class="bg-white rounded-lg border border-gray-200 p-4">
                                <div class="text-xs font-medium text-gray-600 mb-2">当前背景</div>
                                <div id="currentBackgroundPreview" class="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200 w-full lg:max-w-[800px] xl:max-w-[1000px] 2xl:max-w-[1200px] mx-auto" style="aspect-ratio: 760/360;">
                                    <div class="absolute inset-0 flex items-center justify-center z-10">
                                        <div class="text-center text-gray-400">
                                            <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <div class="text-xs">未设置背景</div>
                                        </div>
                                    </div>
                                    <img id="currentBackgroundImage" src="" alt="当前背景" class="hidden w-full h-full object-cover relative z-0">
                                </div>
                                <button id="deleteBackgroundBtn" class="mt-2 w-full px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 hidden">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                    <span>删除背景</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- 右侧预览区域 -->
                        <div class="lg:col-span-2">
                            <div class="bg-white rounded-lg border border-gray-200 p-5">
                                <div class="text-xs font-medium text-gray-600 mb-3">预览</div>
                                <div id="canvasWrapper" class="relative bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center p-2 sm:p-4" style="min-height: 300px; touch-action: none;">
                                    <!-- Canvas 容器 -->
                                    <div id="canvasContainer" class="relative w-full h-full flex items-center justify-center" style="touch-action: none;">
                                        <canvas id="fabricCanvas" style="display: block !important; max-width: 100%; max-height: 100%; position: relative; z-index: 1; touch-action: none;"></canvas>
                                    </div>
                                    <!-- 空状态提示 -->
                                    <div id="emptyCanvas" class="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                                        <div class="text-center text-gray-400">
                                            <svg class="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <div class="text-sm font-medium">请上传图片开始编辑</div>
                                            <div class="text-xs mt-1">PC端：滚轮缩放 | 移动端：双指缩放 | 单指拖拽移动</div>
                                        </div>
                                    </div>
                                    <!-- 加载状态 -->
                                    <div id="canvasLoading" class="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 hidden z-20">
                                        <div class="text-center">
                                            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                            <div class="text-xs text-gray-500">加载中...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async mounted() {
        // 验证身份
        await this.verifyIdentity();
        await this.loadFabricJS();
        this.setupEventListeners();
        this.initCanvas();
        this.loadCurrentBackground();
    }
    
    async loadFabricJS() {
        if (window.fabric) {
            this.fabricLoaded = true;
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
            script.onload = () => {
                this.fabricLoaded = true;
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Fabric.js 加载失败'));
            };
            document.head.appendChild(script);
        });
    }
    
    initCanvas() {
        if (!this.fabricLoaded) {
            setTimeout(() => this.initCanvas(), 100);
            return;
        }
        
        if (!window.fabric) {
            setTimeout(() => this.initCanvas(), 100);
            return;
        }
        
        const canvasEl = document.getElementById('fabricCanvas');
        if (!canvasEl) {
            setTimeout(() => this.initCanvas(), 100);
            return;
        }
        
        // 如果画布已经初始化，先彻底销毁它
        if (this.canvas && this.isInitialized) {
            console.log('画布已存在，先销毁旧画布');
            try {
                // 清除所有对象
                this.canvas.clear();
                // 移除所有事件监听器
                this.canvas.off();
                // 销毁画布
                this.canvas.dispose();
            } catch (e) {
                console.warn('销毁画布时出错:', e);
            }
            this.canvas = null;
            this.currentImage = null;
        }
        
        // 清理可能残留的 canvas 元素（Fabric.js 创建的 lower-canvas 和 upper-canvas）
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvasContainerEl = document.getElementById('canvasContainer');
        if (canvasWrapper) {
            // 移除所有 canvas 元素（除了主 canvas）
            const allCanvases = canvasWrapper.querySelectorAll('canvas');
            allCanvases.forEach(canvas => {
                if (canvas.id !== 'fabricCanvas') {
                    canvas.remove();
                }
            });
            // 移除可能残留的 canvas-container（Fabric.js 自动创建的）
            const oldContainers = canvasWrapper.querySelectorAll('.canvas-container');
            oldContainers.forEach(container => {
                // 保留我们手动创建的 canvasContainer
                if (container.id !== 'canvasContainer') {
                    container.remove();
                }
            });
        }
        
        // 初始化画布
        this.canvas = new fabric.Canvas('fabricCanvas', {
            width: 400,
            height: 300,
            backgroundColor: '#f8f9fa', // 使用浅灰色背景，更容易看到白色图片
            selection: true,
            preserveObjectStacking: true,
            renderOnAddRemove: true
        });
        
        // 将 Fabric.js 创建的容器移动到我们的 canvasContainer 中
        const fabricContainer = this.canvas.wrapperEl;
        if (fabricContainer && canvasContainerEl) {
            // 如果容器不在 canvasContainer 中，移动它
            if (fabricContainer.parentElement !== canvasContainerEl) {
                canvasContainerEl.innerHTML = '';
                canvasContainerEl.appendChild(fabricContainer);
            }
        }
        
        console.log('画布初始化成功', this.canvas);
        console.log('画布元素:', canvasEl);
        console.log('画布尺寸:', this.canvas.getWidth(), this.canvas.getHeight());
        
        // 优化 Fabric.js 创建的容器样式
        const fabricWrapper = this.canvas.wrapperEl;
        if (fabricWrapper) {
            fabricWrapper.style.background = 'transparent';
            fabricWrapper.style.border = 'none';
            fabricWrapper.style.boxShadow = 'none';
            fabricWrapper.style.position = 'relative';
            fabricWrapper.style.display = 'inline-block';
            fabricWrapper.style.margin = '0 auto';
            // 确保容器只有一个
            fabricWrapper.className = 'canvas-container';
            console.log('canvas-container 样式已优化');
        }
        
        // 移除 upper-canvas 的背景色，让它透明
        const upperCanvas = this.canvas.upperCanvasEl;
        if (upperCanvas) {
            upperCanvas.style.background = 'transparent';
            upperCanvas.style.position = 'absolute';
            upperCanvas.style.zIndex = '1';
            console.log('upper-canvas 背景已设为透明');
        }
        
        // 确保 lower-canvas 样式正确
        const lowerCanvas = this.canvas.lowerCanvasEl;
        if (lowerCanvas) {
            lowerCanvas.style.position = 'relative';
            lowerCanvas.style.zIndex = '0';
        }
        
        // 确保画布可交互
        this.canvas.selection = true;
        this.canvas.hoverCursor = 'move';
        this.canvas.moveCursor = 'move';
        
        // 初始化缩放相关变量
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.lastTouchDistance = 0;
        this.isPinching = false;
        this.initialScale = 1; // 图片初始缩放值
        
        // 添加缩放功能（PC端滚轮 + 移动端双指）
        this.setupZoom();
        
        // 标记为已初始化
        this.isInitialized = true;
        
        // 更新目标尺寸
        this.updateTargetSize();
        
        // 监听画布尺寸变化，确保样式保持正确
        this.canvas.on('resize', () => {
            const upperCanvas = this.canvas.upperCanvasEl;
            if (upperCanvas) {
                upperCanvas.style.background = 'transparent';
                upperCanvas.style.position = 'absolute';
                upperCanvas.style.zIndex = '1';
            }
            const lowerCanvas = this.canvas.lowerCanvasEl;
            if (lowerCanvas) {
                lowerCanvas.style.position = 'relative';
                lowerCanvas.style.zIndex = '0';
            }
            const fabricWrapperEl = this.canvas.wrapperEl;
            if (fabricWrapperEl) {
                fabricWrapperEl.style.background = 'transparent';
                fabricWrapperEl.style.border = 'none';
                fabricWrapperEl.style.boxShadow = 'none';
                fabricWrapperEl.style.position = 'relative';
                fabricWrapperEl.style.display = 'inline-block';
            }
        });
        
        // 监听画布事件，确保图片可以被选中和操作
        this.canvas.on('selection:created', () => {
            this.canvas.renderAll();
        });
        
        this.canvas.on('selection:updated', () => {
            this.canvas.renderAll();
        });
        
        this.canvas.on('object:modified', () => {
            this.canvas.renderAll();
        });
    }
    
    /**
     * 统一的缩放功能（PC端滚轮 + 移动端双指）
     */
    setupZoom() {
        const canvasEl = this.canvas.getElement();
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (!canvasEl || !canvasWrapper) return;
        
        // 缩放函数：以指定点为中心进行缩放
        const zoomAtPoint = (point, zoomFactor) => {
            if (!this.currentImage) return;
            
            const currentScale = this.currentImage.scaleX || 1;
            const newScale = currentScale * zoomFactor;
            
            // 计算相对于初始缩放的缩放比例
            const relativeZoom = newScale / this.initialScale;
            
            // 限制缩放范围
            if (relativeZoom < this.minZoom || relativeZoom > this.maxZoom) {
                return;
            }
            
            // 获取图片当前位置（center origin）
            const imgLeft = this.currentImage.left || 0;
            const imgTop = this.currentImage.top || 0;
            const imgWidth = this.currentImage.width || 1;
            const imgHeight = this.currentImage.height || 1;
            
            // 由于origin是center，需要计算图片左上角的位置
            const imgTopLeftX = imgLeft - (imgWidth * currentScale) / 2;
            const imgTopLeftY = imgTop - (imgHeight * currentScale) / 2;
            
            // 计算缩放中心点相对于图片左上角的位置（在原始尺寸下）
            const pointXInImage = (point.x - imgTopLeftX) / currentScale;
            const pointYInImage = (point.y - imgTopLeftY) / currentScale;
            
            // 应用新缩放
            this.currentImage.set({
                scaleX: newScale,
                scaleY: newScale
            });
            
            // 计算新位置（center origin），使缩放中心点指向的图片位置保持不变
            const newTopLeftX = point.x - pointXInImage * newScale;
            const newTopLeftY = point.y - pointYInImage * newScale;
            const newLeft = newTopLeftX + (imgWidth * newScale) / 2;
            const newTop = newTopLeftY + (imgHeight * newScale) / 2;
            
            this.currentImage.set({
                left: newLeft,
                top: newTop
            });
            
            this.currentImage.setCoords();
            this.canvas.renderAll();
        };
        
        // PC端滚轮缩放 - 绑定到canvasWrapper和canvas元素上
        const handleWheel = (e) => {
            if (!this.currentImage) return;
            
            // 立即阻止默认行为，防止页面滚动
            e.preventDefault();
            e.stopPropagation();
            
            // 计算缩放增量
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            
            // 获取鼠标在画布上的位置
            // 需要从事件中获取相对于canvas的位置
            const rect = canvasEl.getBoundingClientRect();
            const pointer = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            // 执行缩放
            zoomAtPoint(pointer, zoomFactor);
        };
        
        // 同时绑定到canvasWrapper和canvas元素
        canvasWrapper.addEventListener('wheel', handleWheel, { passive: false });
        canvasEl.addEventListener('wheel', handleWheel, { passive: false });
        
        // 移动端双指缩放
        let touchStartDistance = 0;
        let touchStartScale = 1;
        let touchStartCenter = null;
        let touchStartImagePos = null;
        
        const getTouchDistance = (touch1, touch2) => {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };
        
        const getTouchCenter = (touch1, touch2, canvasEl) => {
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            const rect = canvasEl.getBoundingClientRect();
            return {
                x: centerX - rect.left,
                y: centerY - rect.top
            };
        };
        
        // 移动端触摸事件 - 同时绑定到canvasWrapper和canvas元素
        const handleTouchStart = (e) => {
            if (e.touches.length === 2 && this.currentImage) {
                e.preventDefault();
                this.isPinching = true;
                
                const touches = Array.from(e.touches);
                touchStartDistance = getTouchDistance(touches[0], touches[1]);
                touchStartScale = this.currentImage.scaleX || 1;
                touchStartCenter = getTouchCenter(touches[0], touches[1], canvasEl);
                touchStartImagePos = {
                    left: this.currentImage.left || 0,
                    top: this.currentImage.top || 0
                };
            } else if (e.touches.length === 1) {
                this.isPinching = false;
            }
        };
        
        canvasWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvasEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        
        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && this.currentImage && this.isPinching) {
                e.preventDefault();
                e.stopPropagation();
                
                const touches = Array.from(e.touches);
                const currentDistance = getTouchDistance(touches[0], touches[1]);
                
                if (touchStartDistance > 0 && touchStartCenter) {
                    // 计算缩放比例
                    const scaleRatio = currentDistance / touchStartDistance;
                    const newScale = touchStartScale * scaleRatio;
                    
                    // 计算相对于初始缩放的缩放比例
                    const relativeZoom = newScale / this.initialScale;
                    
                    // 限制缩放范围
                    if (relativeZoom >= this.minZoom && relativeZoom <= this.maxZoom) {
                        // 获取当前两指中心点
                        const currentCenter = getTouchCenter(touches[0], touches[1], canvasEl);
                        
                        // 由于origin是center，需要计算图片左上角的位置
                        const imgWidth = this.currentImage.width || 1;
                        const imgHeight = this.currentImage.height || 1;
                        const startTopLeftX = touchStartImagePos.left - (imgWidth * touchStartScale) / 2;
                        const startTopLeftY = touchStartImagePos.top - (imgHeight * touchStartScale) / 2;
                        
                        // 计算中心点相对于图片左上角的位置（在touchstart时的尺寸下）
                        const centerXRelative = (touchStartCenter.x - startTopLeftX) / touchStartScale;
                        const centerYRelative = (touchStartCenter.y - startTopLeftY) / touchStartScale;
                        
                        // 应用新缩放
                        this.currentImage.set({
                            scaleX: newScale,
                            scaleY: newScale
                        });
                        
                        // 计算新位置（center origin），使中心点指向的图片位置保持不变
                        const newTopLeftX = currentCenter.x - centerXRelative * newScale;
                        const newTopLeftY = currentCenter.y - centerYRelative * newScale;
                        const newLeft = newTopLeftX + (imgWidth * newScale) / 2;
                        const newTop = newTopLeftY + (imgHeight * newScale) / 2;
                        
                        this.currentImage.set({
                            left: newLeft,
                            top: newTop
                        });
                        
                        this.currentImage.setCoords();
                        this.canvas.renderAll();
                        
                        // 更新初始状态用于连续缩放
                        touchStartScale = newScale;
                        touchStartCenter = currentCenter;
                        touchStartImagePos = {
                            left: newLeft,
                            top: newTop
                        };
                        touchStartDistance = currentDistance;
                    }
                }
            }
        };
        
        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) {
                this.isPinching = false;
                touchStartDistance = 0;
                touchStartScale = 1;
                touchStartCenter = null;
                touchStartImagePos = null;
            }
        };
        
        canvasWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvasWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvasEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    updateTargetSize() {
        const select = document.getElementById('backgroundTypeSelect');
        const normalCard = document.getElementById('backgroundTypeNormal');
        const rankingCard = document.getElementById('backgroundTypeRanking');
        
        // 同步背景类型（优先从卡片获取，如果没有则从 select 获取）
        if (normalCard && normalCard.classList.contains('border-primary')) {
            this.backgroundType = 'normal';
        } else if (rankingCard && rankingCard.classList.contains('border-primary')) {
            this.backgroundType = 'ranking';
        } else if (select) {
            this.backgroundType = select.value;
        }
        
        // 同步 select 的值
        if (select) {
            select.value = this.backgroundType;
        }
        
        if (this.backgroundType === 'ranking') {
            this.targetWidth = 1520;
            this.targetHeight = 200;
        } else {
            this.targetWidth = 760;
            this.targetHeight = 360;
        }
        
        document.getElementById('targetSize').textContent = `${this.targetWidth}×${this.targetHeight}`;
        
        // 调整画布尺寸以适应预览
        const aspectRatio = this.targetWidth / this.targetHeight;
        const maxWidth = 600;
        const maxHeight = 400;
        
        let canvasWidth = maxWidth;
        let canvasHeight = maxWidth / aspectRatio;
        
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = maxHeight * aspectRatio;
        }
        
        if (this.canvas) {
            this.canvas.setDimensions({
                width: Math.floor(canvasWidth),
                height: Math.floor(canvasHeight)
            });
            
            // 确保样式保持正确
            const upperCanvas = this.canvas.upperCanvasEl;
            if (upperCanvas) {
                upperCanvas.style.background = 'transparent';
                upperCanvas.style.position = 'absolute';
                upperCanvas.style.zIndex = '1';
            }
            const lowerCanvas = this.canvas.lowerCanvasEl;
            if (lowerCanvas) {
                lowerCanvas.style.position = 'relative';
                lowerCanvas.style.zIndex = '0';
            }
            const fabricWrapperEl = this.canvas.wrapperEl;
            if (fabricWrapperEl) {
                fabricWrapperEl.style.background = 'transparent';
                fabricWrapperEl.style.border = 'none';
                fabricWrapperEl.style.boxShadow = 'none';
                fabricWrapperEl.style.position = 'relative';
            }
        }
        
        // 更新当前背景预览，按固定尺寸显示
        const previewContainer = document.getElementById('currentBackgroundPreview');
        if (previewContainer) {
            // 移除所有 max-w 相关的类
            const classList = previewContainer.classList;
            const maxWidthClasses = Array.from(classList).filter(cls => cls.startsWith('max-w-'));
            maxWidthClasses.forEach(cls => classList.remove(cls));
            
            // 根据背景类型设置固定的宽高比和最大宽度
            if (this.backgroundType === 'ranking') {
                // 排行榜背景：1520×200（非常宽的长条）
                previewContainer.style.aspectRatio = '1520/200';
                // 排行榜背景在PC端上可以显示得更长
                previewContainer.classList.add('lg:max-w-[1200px]', 'xl:max-w-[1400px]', '2xl:max-w-[1600px]');
            } else {
                // 普通背景：760×360
                previewContainer.style.aspectRatio = '760/360';
                // 普通背景在PC端上的最大宽度
                previewContainer.classList.add('lg:max-w-[800px]', 'xl:max-w-[1000px]', '2xl:max-w-[1200px]');
            }
            previewContainer.style.width = '100%';
            previewContainer.style.height = 'auto';
            previewContainer.style.overflow = 'hidden';
        }
    }
    
    setupEventListeners() {
        // 背景类型选择 - 卡片切换
        const normalCard = document.getElementById('backgroundTypeNormal');
        const rankingCard = document.getElementById('backgroundTypeRanking');
        const typeSelect = document.getElementById('backgroundTypeSelect');
        
        // 更新卡片选中状态
        const updateCardState = (selectedValue) => {
            // 移除所有选中状态
            [normalCard, rankingCard].forEach(card => {
                if (card) {
                    card.classList.remove('border-primary', 'bg-primary/10', 'text-primary');
                    card.classList.add('border-gray-200', 'bg-white', 'text-gray-700');
                }
            });
            
            // 添加选中状态
            const selectedCard = selectedValue === 'normal' ? normalCard : rankingCard;
            if (selectedCard) {
                selectedCard.classList.remove('border-gray-200', 'bg-white', 'text-gray-700');
                selectedCard.classList.add('border-primary', 'bg-primary/10', 'text-primary');
            }
            
            // 同步 select 的值
            if (typeSelect) {
                typeSelect.value = selectedValue;
            }
        };
        
        // 初始化选中状态
        updateCardState(this.backgroundType || 'normal');
        
        // 卡片点击事件
        if (normalCard) {
            normalCard.addEventListener('click', () => {
                this.backgroundType = 'normal';
                updateCardState('normal');
                this.updateTargetSize();
                this.loadCurrentBackground();
                if (this.currentImage) {
                    this.fitImageToCanvas();
                }
            });
        }
        
        if (rankingCard) {
            rankingCard.addEventListener('click', () => {
                this.backgroundType = 'ranking';
                updateCardState('ranking');
                this.updateTargetSize();
                this.loadCurrentBackground();
                if (this.currentImage) {
                    this.fitImageToCanvas();
                }
            });
        }
        
        // 保持 select 的 change 事件监听（兼容性）
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.backgroundType = e.target.value;
                updateCardState(e.target.value);
                this.updateTargetSize();
                this.loadCurrentBackground();
                if (this.currentImage) {
                    this.fitImageToCanvas();
                }
            });
        }
        
        // 上传按钮
        const uploadBtn = document.getElementById('uploadBtn');
        const imageInput = document.getElementById('imageInput');
        uploadBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadImage(e.target.files[0]);
            }
        });
        
        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => {
            if (this.currentImage) {
                this.fitImageToCanvas();
            }
        });
        
        // 旋转按钮
        document.getElementById('rotateBtn').addEventListener('click', () => {
            if (this.currentImage) {
                this.currentImage.rotate((this.currentImage.angle + 90) % 360);
                this.canvas.renderAll();
            }
        });
        
        // 确认按钮
        document.getElementById('confirmBtn').addEventListener('click', () => {
            this.confirmBackground();
        });
        
        // 删除背景按钮
        document.getElementById('deleteBackgroundBtn').addEventListener('click', () => {
            this.deleteBackground();
        });
    }
    
    async loadCurrentBackground() {
        try {
            // 添加时间戳防止缓存
            const timestamp = Date.now();
            let backgroundUrl = api.getBackground(this.app.userId, this.backgroundType);
            // 如果URL已经有参数，使用&，否则使用?
            backgroundUrl += (backgroundUrl.includes('?') ? '&' : '?') + `t=${timestamp}`;
            
            const previewImg = document.getElementById('currentBackgroundImage');
            const previewContainer = document.getElementById('currentBackgroundPreview');
            const deleteBtn = document.getElementById('deleteBackgroundBtn');
            const emptyState = previewContainer.querySelector('div:not([id])');
            
            // 先隐藏图片和显示空状态（确保删除后立即更新UI）
            if (previewImg) {
                previewImg.src = '';
                previewImg.classList.add('hidden');
            }
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            if (deleteBtn) {
                deleteBtn.classList.add('hidden');
            }
            
            // 检查图片是否存在
            const img = new Image();
            img.onload = () => {
                // 图片存在，显示图片
                if (previewImg) {
                    previewImg.src = backgroundUrl;
                    previewImg.classList.remove('hidden');
                    
                    // 图片加载完成后，容器已经通过 aspect-ratio 设置了固定尺寸，无需调整
                    // 图片使用 object-cover 填充容器，保持固定比例显示
                }
                if (emptyState) {
                    emptyState.classList.add('hidden');
                }
                if (deleteBtn) {
                    deleteBtn.classList.remove('hidden');
                }
            };
            img.onerror = () => {
                // 图片不存在或加载失败，显示空状态
                if (previewImg) {
                    previewImg.src = '';
                    previewImg.classList.add('hidden');
                }
                if (emptyState) {
                    emptyState.classList.remove('hidden');
                }
                if (deleteBtn) {
                    deleteBtn.classList.add('hidden');
                }
            };
            img.src = backgroundUrl;
        } catch (error) {
            console.debug('加载当前背景失败:', error);
            const previewImg = document.getElementById('currentBackgroundImage');
            const previewContainer = document.getElementById('currentBackgroundPreview');
            const deleteBtn = document.getElementById('deleteBackgroundBtn');
            const emptyState = previewContainer.querySelector('div:not([id])');
            if (previewImg) {
                previewImg.src = '';
                previewImg.classList.add('hidden');
            }
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            if (deleteBtn) {
                deleteBtn.classList.add('hidden');
            }
        }
    }
    
    loadImage(file) {
        if (!this.fabricLoaded || !window.fabric) {
            Toast.show('Fabric.js未加载完成，请稍候', 'warning');
            return;
        }
        
        if (!this.canvas) {
            Toast.show('画布未初始化，请稍候', 'warning');
            setTimeout(() => this.loadImage(file), 100);
            return;
        }
        
        const loadingEl = document.getElementById('canvasLoading');
        const emptyCanvas = document.getElementById('emptyCanvas');
        
        loadingEl.classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataURL = e.target.result;
            
            console.log('开始加载图片，数据URL长度:', dataURL.length);
            
            // 先使用原生Image对象加载图片，确保图片完全加载
            const img = new Image();
            img.onload = () => {
                console.log('原生图片加载完成，尺寸:', img.width, img.height);
                
                // 使用Fabric.js加载图片
                fabric.Image.fromURL(dataURL, (fabricImg) => {
                    console.log('Fabric图片对象创建成功', fabricImg);
                    
                    if (!fabricImg) {
                        loadingEl.classList.add('hidden');
                        Toast.show('图片加载失败', 'error');
                        return;
                    }
                    
                    // 彻底清除画布上的所有对象
                    const objects = this.canvas.getObjects();
                    objects.forEach(obj => {
                        this.canvas.remove(obj);
                    });
                    this.canvas.clear();
                    this.canvas.renderAll();
                    console.log('画布已清除，对象数量:', this.canvas.getObjects().length);
                    
                    // 隐藏空画布提示
                    if (emptyCanvas) {
                        emptyCanvas.style.display = 'none';
                    }
                    
                    // 设置图片对象
                    this.currentImage = fabricImg;
                    
                    // 确保图片有正确的尺寸
                    if (!fabricImg.width || !fabricImg.height) {
                        // 如果Fabric图片没有尺寸，使用原生图片的尺寸
                        fabricImg.set({
                            width: img.width,
                            height: img.height
                        });
                        console.log('设置Fabric图片尺寸为:', img.width, img.height);
                    } else {
                        console.log('Fabric图片尺寸:', fabricImg.width, fabricImg.height);
                    }
                    
                    // 确保图片对象已完全初始化
                    fabricImg.setCoords();
                    console.log('图片坐标已设置');
                    
                    // 添加到画布（只添加一次）
                    if (this.canvas.getObjects().length === 0) {
                        this.canvas.add(fabricImg);
                        console.log('图片已添加到画布', fabricImg);
                    } else {
                        console.warn('画布上已有对象，跳过添加');
                    }
                    
                    // 立即渲染一次，确保图片可见
                    this.canvas.renderAll();
                    console.log('初始渲染完成，对象数量:', this.canvas.getObjects().length);
                    
                    // 等待图片元素完全创建
                    setTimeout(() => {
                        // 适配画布尺寸
                        this.fitImageToCanvas();
                        
                        // 强制渲染画布
                        this.canvas.renderAll();
                        console.log('画布已渲染，图片应该可见了');
                        
                        // 再次渲染确保显示
                        requestAnimationFrame(() => {
                            this.canvas.renderAll();
                            console.log('最终渲染完成');
                        });
                        
                        // 隐藏加载状态
                        if (loadingEl) {
                            loadingEl.classList.add('hidden');
                        }
                    }, 200);
                }, {
                    crossOrigin: 'anonymous'
                });
            };
            img.onerror = () => {
                console.error('图片加载失败');
                loadingEl.classList.add('hidden');
                Toast.show('图片加载失败', 'error');
            };
            img.src = dataURL;
        };
        reader.onerror = (error) => {
            console.error('文件读取失败:', error);
            loadingEl.classList.add('hidden');
            Toast.show('图片读取失败', 'error');
        };
        reader.readAsDataURL(file);
    }
    
    fitImageToCanvas() {
        if (!this.currentImage || !this.canvas) {
            console.warn('fitImageToCanvas: 缺少图片或画布');
            return;
        }
        
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        
        console.log('画布尺寸:', canvasWidth, canvasHeight);
        
        // 获取图片的原始尺寸
        let imageWidth, imageHeight;
        
        // 优先从图片元素获取真实尺寸
        const imgElement = this.currentImage.getElement();
        if (imgElement) {
            imageWidth = imgElement.naturalWidth || imgElement.width;
            imageHeight = imgElement.naturalHeight || imgElement.height;
            console.log('从图片元素获取尺寸:', imageWidth, imageHeight, 'complete:', imgElement.complete);
            
            // 如果图片还没加载完成，等待
            if (!imgElement.complete || !imageWidth || !imageHeight) {
                console.log('图片元素未准备好，等待...');
                imgElement.onload = () => {
                    this.fitImageToCanvas();
                };
                return;
            }
        }
        
        // 如果从元素获取失败，使用 Fabric.js 对象的尺寸
        if (!imageWidth || !imageHeight || imageWidth <= 0 || imageHeight <= 0) {
            if (this.currentImage.width && this.currentImage.height) {
                imageWidth = this.currentImage.width;
                imageHeight = this.currentImage.height;
                console.log('使用Fabric对象尺寸:', imageWidth, imageHeight);
            }
        }
        
        // 如果还是没有，等待一下再试
        if (!imageWidth || !imageHeight || imageWidth <= 0 || imageHeight <= 0) {
            console.log('尺寸获取失败，等待重试...', {
                element: imgElement,
                fabricWidth: this.currentImage.width,
                fabricHeight: this.currentImage.height
            });
            setTimeout(() => this.fitImageToCanvas(), 200);
            return;
        }
        
        // 计算缩放比例，让图片适应画布（保持宽高比，图片完全显示在画布内）
        const scaleX = canvasWidth / imageWidth;
        const scaleY = canvasHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9; // 留一些边距，方便用户调整
        
        console.log('计算缩放比例:', scale, '图片尺寸:', imageWidth, imageHeight);
        
        // 设置图片属性，禁用缩放控制点，只允许移动和通过滚轮/双指缩放
        this.currentImage.set({
            scaleX: scale,
            scaleY: scale,
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
            hasControls: false, // 禁用控制点
            hasBorders: false, // 禁用边框
            lockRotation: true, // 锁定旋转
            lockScalingX: true, // 锁定X轴缩放（通过控制点）
            lockScalingY: true, // 锁定Y轴缩放（通过控制点）
            lockMovementX: false, // 允许移动
            lockMovementY: false, // 允许移动
            transparentCorners: false,
            cornerColor: '#4A90E2',
            cornerSize: 10,
            borderColor: '#4A90E2',
            borderWidth: 2
        });
        
        // 居中对象
        this.canvas.centerObject(this.currentImage);
        
        // 保存初始缩放值（用于计算相对缩放）
        this.initialScale = scale;
        
        // 立即渲染画布
        this.canvas.renderAll();
        console.log('画布渲染完成，图片尺寸:', imageWidth, imageHeight, '缩放:', scale);
        
        // 确保图片元素可见
        const imgEl = this.currentImage.getElement();
        if (imgEl) {
            console.log('图片元素状态:', {
                complete: imgEl.complete,
                naturalWidth: imgEl.naturalWidth,
                naturalHeight: imgEl.naturalHeight,
                width: imgEl.width,
                height: imgEl.height,
                src: imgEl.src.substring(0, 50) + '...'
            });
        }
        
        // 多次渲染确保显示
        setTimeout(() => {
            if (this.canvas && this.currentImage) {
                this.canvas.setActiveObject(this.currentImage);
                this.canvas.renderAll();
                console.log('画布重绘完成');
                
                // 再次渲染
                requestAnimationFrame(() => {
                    this.canvas.renderAll();
                    console.log('最终渲染完成');
                });
            }
        }, 100);
    }
    
    async confirmBackground() {
        if (!this.currentImage) {
            Toast.show('请先上传图片', 'error');
            return;
        }
        
        if (!this.fabricLoaded || !window.fabric) {
            Toast.show('Fabric.js未加载完成，请稍候', 'warning');
            return;
        }
        
        // 获取秘钥
        const secretKey = await this.getSecretKey();
        if (!secretKey) {
            return;
        }
        
        const loadingEl = document.getElementById('canvasLoading');
        loadingEl.classList.remove('hidden');
        
        try {
            // 生成图片数据
            const dataURL = this.canvas.toDataURL({
                format: 'jpeg',
                quality: 0.9,
                multiplier: 1
            });
            
            // 创建目标尺寸的canvas
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = this.targetWidth;
            finalCanvas.height = this.targetHeight;
            const ctx = finalCanvas.getContext('2d');
            
            // 创建临时图片对象
            const tempImg = new Image();
            tempImg.onload = async () => {
                try {
                    // 计算缩放比例
                    const scaleX = this.targetWidth / tempImg.width;
                    const scaleY = this.targetHeight / tempImg.height;
                    const scale = Math.max(scaleX, scaleY);
                    
                    // 计算居中位置
                    const scaledWidth = tempImg.width * scale;
                    const scaledHeight = tempImg.height * scale;
                    const offsetX = (this.targetWidth - scaledWidth) / 2;
                    const offsetY = (this.targetHeight - scaledHeight) / 2;
                    
                    // 绘制背景色
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, this.targetWidth, this.targetHeight);
                    
                    // 绘制图片
                    ctx.drawImage(tempImg, offsetX, offsetY, scaledWidth, scaledHeight);
                    
                    // 转换为blob并上传
                    finalCanvas.toBlob(async (blob) => {
                        try {
                            const file = new File([blob], 'background.jpg', { type: 'image/jpeg' });
                            await api.uploadBackground(this.app.userId, file, this.backgroundType, secretKey);
                            Toast.show('背景设置成功！', 'success');
                            loadingEl.classList.add('hidden');
                            // 重新加载当前背景预览
                            this.loadCurrentBackground();
                        } catch (error) {
                            loadingEl.classList.add('hidden');
                            Toast.show('上传失败: ' + error.message, 'error');
                        }
                    }, 'image/jpeg', 0.9);
                } catch (error) {
                    loadingEl.classList.add('hidden');
                    Toast.show('处理失败: ' + error.message, 'error');
                }
            };
            tempImg.onerror = () => {
                loadingEl.classList.add('hidden');
                Toast.show('图片处理失败', 'error');
            };
            tempImg.src = dataURL;
        } catch (error) {
            loadingEl.classList.add('hidden');
            Toast.show('处理失败: ' + error.message, 'error');
        }
    }
    
    async deleteBackground() {
        // 使用 Modal 显示确认对话框
        return new Promise((resolve) => {
            window.Modal.show('删除背景', `
                <div class="space-y-4">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-red-800 mb-1">确定要删除当前背景吗？</p>
                                <p class="text-xs text-red-600">删除后需要重新上传才能使用自定义背景</p>
                            </div>
                        </div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium" id="confirmDeleteBtn">确认删除</button>
                <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmDeleteBtn');
                const cancelBtn = document.querySelector('[onclick="Modal.hide()"]');
                
                const handleConfirm = async () => {
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.textContent = '删除中...';
                    }
                    
                    try {
                        const secretKey = await this.getSecretKey();
                        if (!secretKey) {
                            window.Modal.hide();
                            resolve();
                            return;
                        }
                        
                        await api.deleteBackground(this.app.userId, this.backgroundType, secretKey);
                        
                        window.Modal.hide();
                        Toast.show('背景删除成功', 'success');
                        
                        // 重新加载当前背景预览
                        await this.loadCurrentBackground();
                        
                        resolve();
                    } catch (error) {
                        console.error('删除背景失败:', error);
                        Toast.show('删除失败: ' + error.message, 'error');
                        if (confirmBtn) {
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认删除';
                        }
                    }
                };
                
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', handleConfirm);
                }
                
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        window.Modal.hide();
                        resolve();
                    });
                }
            }, 100);
        });
    }
    
    async getSecretKey() {
        // 直接使用 SecretKeyManager.get，它会自动处理本地存储、服务器获取和用户输入
        return SecretKeyManager.get(this.app.userId, true);
    }
    
    /**
     * 验证身份
     */
    async verifyIdentity() {
        // 检查是否已经验证过（使用sessionStorage，只在当前会话有效）
        const verifiedKey = sessionStorage.getItem(`background_verified_${this.app.userId}`);
        if (verifiedKey) {
            return verifiedKey;
        }
        
        // 尝试从本地存储获取秘钥
        const localKey = await SecretKeyManager.get(this.app.userId, false);
        if (localKey) {
            // 验证秘钥是否有效
            try {
                const response = await api.validateSecretKey(this.app.userId, localKey);
                if (response.success && response.data?.valid) {
                    // 验证成功，保存到sessionStorage
                    sessionStorage.setItem(`background_verified_${this.app.userId}`, localKey);
                    return localKey;
                }
            } catch (error) {
                console.warn('验证本地秘钥失败:', error);
            }
        }
        
        // 如果没有有效秘钥，弹出验证窗口
        return await this.showIdentityVerification();
    }
    
    /**
     * 显示身份验证窗口
     */
    async showIdentityVerification() {
        return new Promise((resolve) => {
            window.Modal.show('身份验证', `
                <div class="space-y-4">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-blue-800 mb-2">需要身份验证</p>
                                <p class="text-xs text-blue-700">请输入您的秘钥以访问背景设置功能</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">秘钥</label>
                        <input type="password" id="backgroundSecretKeyInput" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder="请输入秘钥">
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmBackgroundBtn">确认验证</button>
                <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
            `);
            
            setTimeout(() => {
                const confirmBtn = document.getElementById('confirmBackgroundBtn');
                const keyInput = document.getElementById('backgroundSecretKeyInput');
                
                if (confirmBtn && keyInput) {
                    const handleConfirm = async () => {
                        const secretKey = keyInput.value.trim();
                        
                        if (!secretKey) {
                            Toast.show('请输入秘钥', 'error');
                            return;
                        }
                        
                        try {
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = '验证中...';
                            
                            // 验证秘钥
                            const response = await api.validateSecretKey(this.app.userId, secretKey);
                            
                            if (!response.success || !response.data?.valid) {
                                Toast.show(response.message || '秘钥验证失败', 'error');
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = '确认验证';
                                return;
                            }
                            
                            Toast.show(response.message || '秘钥验证成功', 'success');
                            
                            // 验证成功，保存秘钥
                            await SecretKeyManager.save(this.app.userId, secretKey);
                            sessionStorage.setItem(`background_verified_${this.app.userId}`, secretKey);
                            
                            // 关闭弹窗
                            window.Modal.hide();
                            Toast.show('验证成功', 'success');
                            
                            resolve(secretKey);
                        } catch (error) {
                            console.error('验证秘钥失败:', error);
                            Toast.show('验证失败: ' + (error.message || '未知错误'), 'error');
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认验证';
                        }
                    };
                    
                    confirmBtn.addEventListener('click', handleConfirm);
                    keyInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleConfirm();
                        }
                    });
                    keyInput.focus();
                }
            }, 100);
        });
    }
}
