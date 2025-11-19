/**
 * 背景设置页面 - 使用 Cropper.js
 */
import { Input } from '/assets/js/components/index.js';

export default class Background {
    constructor(app) {
        this.app = app;
        this.cropper = null;
        this.currentImageUrl = null;
        this.targetWidth = 760;
        this.targetHeight = 360;
        this.backgroundType = 'normal';
        this.cropperLoaded = false;
    }
    
    destroy() {
        // 清理 cropper 实例
        if (this.cropper) {
            try {
                this.cropper.destroy();
            } catch (e) {
                console.warn('销毁 cropper 时出错:', e);
            }
            this.cropper = null;
        }
        
        // 清理图片 URL
        if (this.currentImageUrl) {
            URL.revokeObjectURL(this.currentImageUrl);
            this.currentImageUrl = null;
        }
    }
    
    async render() {
        return `
            <div class="bg-white dark:bg-gray-900 min-h-full">
                <div class="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
                    <!-- 页面标题 -->
                    <div class="mb-4 sm:mb-5">
                        <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">背景设置</h1>
                        <p class="text-xs text-gray-500 dark:text-gray-400">自定义您的统计背景图片</p>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <!-- 左侧控制面板 -->
                        <div class="lg:col-span-1 space-y-3 sm:space-y-4 order-2 lg:order-1">
                            <!-- 背景类型选择 -->
                            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">背景类型</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button type="button" id="backgroundTypeNormal" class="background-type-card px-3 py-2.5 rounded-lg border-2 border-primary bg-primary/10 text-primary text-sm font-medium transition-all" data-value="normal">
                                        <div class="text-center">普通背景</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">760×360</div>
                                    </button>
                                    <button type="button" id="backgroundTypeRanking" class="background-type-card px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5 active:bg-primary/10" data-value="ranking">
                                        <div class="text-center">排行榜背景</div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">1520×200</div>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 上传图片 -->
                            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">上传图片</label>
                                ${Input.renderInput({
                                    type: 'file',
                                    id: 'imageInput',
                                    accept: 'image/*',
                                    className: 'hidden'
                                })}
                                <button id="uploadBtn" class="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                    </svg>
                                    <span>选择图片</span>
                                </button>
                            </div>
                            
                            <!-- 操作按钮 -->
                            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                                <button id="resetBtn" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2" disabled>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    <span>重置</span>
                                </button>
                                <button id="rotateBtn" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2" disabled>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                    </svg>
                                    <span>旋转90°</span>
                                </button>
                                <button id="confirmBtn" class="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium flex items-center justify-center gap-2" disabled>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>确认设置</span>
                                </button>
                            </div>
                            
                            <!-- 目标尺寸信息 -->
                            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <div class="text-xs text-gray-600 dark:text-gray-400">
                                    <div class="font-medium mb-1">目标尺寸</div>
                                    <div class="text-gray-900 dark:text-gray-100 font-mono" id="targetSize">760×360</div>
                                </div>
                            </div>
                            
                            <!-- 当前背景预览 -->
                            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">当前背景</div>
                                <div id="currentBackgroundPreview" class="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-full" style="aspect-ratio: 760/360;">
                                    <div class="absolute inset-0 flex items-center justify-center z-10">
                                        <div class="text-center text-gray-400 dark:text-gray-500">
                                            <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <div class="text-xs">未设置背景</div>
                                        </div>
                                    </div>
                                    <img id="currentBackgroundImage" src="" alt="当前背景" class="hidden w-full h-full object-cover relative z-0">
                                </div>
                                <button id="deleteBackgroundBtn" class="mt-2 w-full px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 hidden">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                    <span>删除背景</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- 右侧预览区域 -->
                        <div class="lg:col-span-2 order-1 lg:order-2">
                            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                                <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">预览</div>
                                <div id="cropperWrapper" class="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700" style="min-height: 300px; max-height: 70vh;">
                                    <!-- Cropper 容器 -->
                                    <div id="cropperContainer" class="relative w-full h-full" style="min-height: 300px; max-height: 70vh;">
                                        <img id="cropperImage" src="" alt="裁剪图片" class="hidden max-w-full max-h-full">
                                    </div>
                                    <!-- 空状态提示 -->
                                    <div id="emptyCropper" class="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                                        <div class="text-center text-gray-400 dark:text-gray-500 px-4">
                                            <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            <div class="text-sm font-medium">请上传图片开始编辑</div>
                                            <div class="text-xs mt-1 hidden sm:block">PC端：滚轮缩放 | 移动端：双指缩放 | 单指拖拽移动</div>
                                            <div class="text-xs mt-1 sm:hidden">双指缩放 | 单指拖拽</div>
                                        </div>
                                    </div>
                                    <!-- 加载状态 -->
                                    <div id="cropperLoading" class="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 hidden z-20">
                                        ${Loading.render({ text: '加载中...', size: 'medium', className: 'text-xs' })}
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
        await this.loadCropperJS();
        this.setupEventListeners();
        this.loadCurrentBackground();
    }
    
    async loadCropperJS() {
        if (window.Cropper) {
            this.cropperLoaded = true;
            return;
        }
        
        // 加载 CSS
        return new Promise((resolve, reject) => {
            // 检查是否已加载 CSS
            if (!document.querySelector('link[href*="cropper"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
                document.head.appendChild(link);
            }
            
            // 加载 JS
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
            script.onload = () => {
                this.cropperLoaded = true;
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Cropper.js 加载失败'));
            };
            document.head.appendChild(script);
        });
    }
    
    setupEventListeners() {
        // 背景类型选择
        const normalCard = document.getElementById('backgroundTypeNormal');
        const rankingCard = document.getElementById('backgroundTypeRanking');
        
        const updateCardState = (selectedValue) => {
            [normalCard, rankingCard].forEach(card => {
                if (card) {
                    const isSelected = card.dataset.value === selectedValue;
                    if (isSelected) {
                        card.classList.remove('border-gray-200', 'dark:border-gray-700', 'bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
                        card.classList.add('border-primary', 'bg-primary/10', 'text-primary');
                    } else {
                    card.classList.remove('border-primary', 'bg-primary/10', 'text-primary');
                        card.classList.add('border-gray-200', 'dark:border-gray-700', 'bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
            }
                }
            });
            
            // 更新目标尺寸
            this.updateTargetSize(selectedValue);
        };
        
        if (normalCard) {
            normalCard.addEventListener('click', () => {
                this.backgroundType = 'normal';
                updateCardState('normal');
                this.updateCropperAspectRatio();
                this.loadCurrentBackground();
            });
        }
        
        if (rankingCard) {
            rankingCard.addEventListener('click', () => {
                this.backgroundType = 'ranking';
                updateCardState('ranking');
                this.updateCropperAspectRatio();
                this.loadCurrentBackground();
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
            this.resetCropper();
        });
        
        // 旋转按钮
        document.getElementById('rotateBtn').addEventListener('click', () => {
            this.rotateCropper();
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
    
    updateTargetSize(type = null) {
        const typeToUse = type || this.backgroundType;
        if (typeToUse === 'ranking') {
            this.targetWidth = 1520;
            this.targetHeight = 200;
        } else {
            this.targetWidth = 760;
            this.targetHeight = 360;
        }
        
        const targetSizeEl = document.getElementById('targetSize');
        if (targetSizeEl) {
            targetSizeEl.textContent = `${this.targetWidth}×${this.targetHeight}`;
        }
        
        // 更新当前背景预览的宽高比
        const previewEl = document.getElementById('currentBackgroundPreview');
        if (previewEl) {
            previewEl.style.aspectRatio = `${this.targetWidth}/${this.targetHeight}`;
        }
    }
    
    updateCropperAspectRatio() {
        if (this.cropper) {
            const aspectRatio = this.targetWidth / this.targetHeight;
            const cropBoxData = this.cropper.getCropBoxData();
            const currentWidth = cropBoxData.width;
            
            // 设置新的宽高比
            this.cropper.setAspectRatio(aspectRatio);
            
            // 保持宽度不变，调整高度以适应新的宽高比
            const newHeight = currentWidth / aspectRatio;
            this.cropper.setCropBoxData({
                width: currentWidth,
                height: newHeight
            });
            
            Toast.show(`已切换为 ${this.targetWidth}×${this.targetHeight}`, 'info', 2000);
        }
    }
    
    async loadCurrentBackground() {
        try {
            const timestamp = Date.now();
            let backgroundUrl = api.getBackground(this.app.userId, this.backgroundType);
            backgroundUrl += (backgroundUrl.includes('?') ? '&' : '?') + `t=${timestamp}`;
            
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
            
            // 尝试加载图片
            const testImg = new Image();
            testImg.onload = () => {
                if (previewImg) {
                    previewImg.src = backgroundUrl;
                    previewImg.classList.remove('hidden');
                }
                if (emptyState) {
                    emptyState.classList.add('hidden');
                }
                if (deleteBtn) {
                    deleteBtn.classList.remove('hidden');
                }
            };
            testImg.onerror = () => {
                // 图片不存在，保持空状态
            };
            testImg.src = backgroundUrl;
        } catch (error) {
            console.error('加载当前背景失败:', error);
        }
    }
    
    loadImage(file) {
        if (!this.cropperLoaded || !window.Cropper) {
            Toast.show('Cropper.js未加载完成，请稍候', 'warning');
            setTimeout(() => this.loadImage(file), 100);
            return;
        }
        
        const loadingEl = document.getElementById('cropperLoading');
        const emptyCropper = document.getElementById('emptyCropper');
        const cropperImage = document.getElementById('cropperImage');
        
        loadingEl.classList.remove('hidden');
        
        // 清理旧的 cropper 实例
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        
        // 清理旧的图片 URL
        if (this.currentImageUrl) {
            URL.revokeObjectURL(this.currentImageUrl);
                    }
                    
        // 创建新的图片 URL
        this.currentImageUrl = URL.createObjectURL(file);
        
        // 设置图片源
        cropperImage.src = this.currentImageUrl;
        cropperImage.classList.remove('hidden');
                    
        // 隐藏空状态
        if (emptyCropper) {
            emptyCropper.style.display = 'none';
                    }
                    
        // 等待图片加载
        cropperImage.onload = () => {
            // 初始化 cropper
            const aspectRatio = this.targetWidth / this.targetHeight;
            
            // 检测是否为移动端
            const isMobile = window.innerWidth < 768;
            
            // 设置容器高度，移动端使用更小的高度
            const container = document.getElementById('cropperContainer');
            if (container) {
                if (isMobile) {
                    container.style.minHeight = '250px';
                    container.style.maxHeight = '50vh';
                    } else {
                    container.style.minHeight = '400px';
                    container.style.maxHeight = '70vh';
                }
            }
            
            this.cropper = new Cropper(cropperImage, {
                aspectRatio: aspectRatio,
                viewMode: 1, // 限制裁剪框不能超出图片
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                responsive: true,
                // 移动端优化
                zoomable: !isMobile, // 移动端禁用滚轮缩放，使用双指缩放
                scalable: true,
                rotatable: true,
                checkOrientation: true, // 检查图片方向
                modal: true, // 显示遮罩
                background: true, // 显示背景
                minCropBoxWidth: isMobile ? 50 : 100,
                minCropBoxHeight: isMobile ? 50 : 100,
                ready: () => {
                            loadingEl.classList.add('hidden');
                    this.updateButtonStates(true);
                    
                    // 移动端提示
                    if (isMobile) {
                        Toast.show('提示：双指缩放，单指拖拽', 'info', 3000);
                        }
                }
                });
            };
        
        cropperImage.onerror = () => {
                loadingEl.classList.add('hidden');
                Toast.show('图片加载失败', 'error');
            if (emptyCropper) {
                emptyCropper.style.display = 'flex';
            }
            cropperImage.classList.add('hidden');
        };
    }
    
    resetCropper() {
        if (this.cropper) {
            this.cropper.reset();
            Toast.show('已重置裁剪区域', 'success', 2000);
        }
    }
    
    rotateCropper() {
        if (this.cropper) {
            this.cropper.rotate(90);
            Toast.show('已旋转90度', 'success', 2000);
        }
    }
    
    updateButtonStates(enabled) {
        const resetBtn = document.getElementById('resetBtn');
        const rotateBtn = document.getElementById('rotateBtn');
        const confirmBtn = document.getElementById('confirmBtn');
        
        if (resetBtn) {
            resetBtn.disabled = !enabled;
        }
        if (rotateBtn) {
            rotateBtn.disabled = !enabled;
        }
        if (confirmBtn) {
            confirmBtn.disabled = !enabled;
        }
    }
    
    async confirmBackground() {
        if (!this.cropper) {
            Toast.show('请先上传图片', 'error');
            return;
        }
        
        // 获取秘钥
        const secretKey = await this.getSecretKey();
        if (!secretKey) {
            return;
        }
        
        const loadingEl = document.getElementById('cropperLoading');
        loadingEl.classList.remove('hidden');
        
        try {
            // 获取裁剪后的 canvas
            const canvas = this.cropper.getCroppedCanvas({
                width: this.targetWidth,
                height: this.targetHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            if (!canvas) {
                throw new Error('无法生成裁剪后的图片');
            }
            
            // 转换为 blob
            canvas.toBlob(async (blob) => {
                        try {
                    if (!blob) {
                        throw new Error('无法生成图片文件');
                    }
                    
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
    }
    
    async deleteBackground() {
        return new Promise((resolve) => {
            window.Modal.show('删除背景', `
                <div class="space-y-4">
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-red-800 dark:text-red-300 mb-1">确定要删除当前背景吗？</p>
                                <p class="text-xs text-red-600 dark:text-red-400">删除后需要重新上传才能使用自定义背景</p>
                            </div>
                        </div>
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium" id="confirmDeleteBtn">确认删除</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
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
                        Toast.show('背景删除成功！', 'success');
                        window.Modal.hide();
                        this.loadCurrentBackground();
                        resolve();
                    } catch (error) {
                        if (confirmBtn) {
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认删除';
                        }
                        Toast.show('删除失败: ' + error.message, 'error');
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
        // 尝试从 sessionStorage 获取已验证的秘钥
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
    
    async showIdentityVerification() {
        return new Promise((resolve) => {
            window.Modal.show('身份验证', `
                <div class="space-y-4">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <div class="flex-1">
                                <p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">需要身份验证</p>
                                <p class="text-xs text-blue-700 dark:text-blue-400">请输入您的秘钥以访问背景设置功能</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">秘钥</label>
                        ${Input.renderInput({
                            type: 'password',
                            id: 'backgroundSecretKeyInput',
                            placeholder: '请输入秘钥',
                            className: 'px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        })}
                    </div>
                </div>
            `, `
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium" id="confirmBackgroundBtn">确认验证</button>
                <button class="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium" onclick="Modal.hide()">取消</button>
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
                            
                            // 验证成功，保存秘钥
                            await SecretKeyManager.save(this.app.userId, secretKey);
                            sessionStorage.setItem(`background_verified_${this.app.userId}`, secretKey);
                            
                            Toast.show('验证成功', 'success');
                            window.Modal.hide();
                            resolve(secretKey);
                        } catch (error) {
                            Toast.show('验证失败: ' + error.message, 'error');
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
    
    async verifyIdentity() {
        // 验证身份，如果失败会弹出验证窗口
        await this.getSecretKey();
    }
}
