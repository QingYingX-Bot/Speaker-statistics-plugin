/**
 * 管理页面 - 系统设置模块
 */
export class AdminSettings {
    constructor(admin) {
        this.admin = admin;
    }
    
    async loadGlobalConfig() {
        if (!this.admin.secretKey) {
            console.warn('秘钥未设置，无法加载配置');
            return;
        }
        try {
            const response = await api.getGlobalConfig(this.admin.app.userId, this.admin.secretKey);
            if (response.success && response.data) {
                this.admin.globalConfig = response.data;
                this.admin.configChanged = false;
                this.populateConfigForm(this.admin.globalConfig);
                this.updateConfigStatus();
                
                // 确保下拉框在设置值后正确更新
                requestAnimationFrame(() => {
                    const protocolSelect = document.getElementById('config-backgroundServer-protocol');
                    if (protocolSelect && protocolSelect.classList.contains('select-custom')) {
                        // 如果下拉框已经初始化，更新显示
                        if (window.updateCustomSelect) {
                            window.updateCustomSelect(protocolSelect);
                        } else {
                            // 如果还没有初始化，先初始化再更新
                            if (window.initCustomSelects) {
                                window.initCustomSelects();
                                if (window.updateCustomSelect) {
                                    window.updateCustomSelect(protocolSelect);
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            Toast.show('加载配置失败: ' + (error.message || '未知错误'), 'error');
        }
    }
    
    populateConfigForm(config) {
        if (!config) return;
        
        // 全局设置
        this.setCheckboxValue('config-global-enableStatistics', config.global?.enableStatistics);
        this.setCheckboxValue('config-global-recordMessage', config.global?.recordMessage);
        this.setCheckboxValue('config-global-enableWordCount', config.global?.enableWordCount);
        this.setCheckboxValue('config-global-debugLog', config.global?.debugLog);
        this.setCheckboxValue('config-global-enableBackup', config.global?.enableBackup);
        this.setCheckboxValue('config-global-useOkMarker', config.global?.useOkMarker);
        
        // 显示设置
        this.setInputValue('config-display-displayCount', config.display?.displayCount);
        this.setInputValue('config-display-globalStatsDisplayCount', config.display?.globalStatsDisplayCount);
        this.setCheckboxValue('config-display-useForward', config.display?.useForward);
        this.setCheckboxValue('config-display-usePicture', config.display?.usePicture);
        
        // 消息设置
        this.setCheckboxValue('config-message-onlyTextMessages', config.message?.onlyTextMessages);
        this.setCheckboxValue('config-message-countBotMessages', config.message?.countBotMessages);
        this.setCheckboxValue('config-message-updateRankingOnEveryMessage', config.message?.updateRankingOnEveryMessage);
        
        // 成就设置
        this.setCheckboxValue('config-achievements-enabled', config.achievements?.enabled);
        this.setInputValue('config-achievements-checkInterval', config.achievements?.checkInterval);
        this.setInputValue('config-achievements-rankingDisplayCount', config.achievements?.rankingDisplayCount);
        
        // 数据存储设置
        this.setInputValue('config-dataStorage-backupRetentionCount', config.dataStorage?.backupRetentionCount);
        this.setInputValue('config-dataStorage-lockTimeout', config.dataStorage?.lockTimeout);
        this.setInputValue('config-dataStorage-lockExpiration', config.dataStorage?.lockExpiration);
        this.setInputValue('config-dataStorage-maxRetries', config.dataStorage?.maxRetries);
        this.setInputValue('config-dataStorage-retryDelayBase', config.dataStorage?.retryDelayBase);
        this.setInputValue('config-dataStorage-maxRetryDelay', config.dataStorage?.maxRetryDelay);
        
        // 背景服务器设置
        this.setInputValue('config-backgroundServer-host', config.backgroundServer?.host);
        this.setInputValue('config-backgroundServer-port', config.backgroundServer?.port);
        this.setSelectValue('config-backgroundServer-protocol', config.backgroundServer?.protocol);
        this.setInputValue('config-backgroundServer-domain', config.backgroundServer?.domain);
    }
    
    setCheckboxValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    }
    
    setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value !== undefined && value !== null ? value : '';
    }
    
    setSelectValue(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value !== undefined && value !== null ? value : '';
            // 更新自定义下拉框显示（延迟执行，确保 DOM 已更新）
            if (el.classList.contains('select-custom')) {
                // 如果下拉框已经初始化，立即更新
                if (el._customSelectInstance && window.updateCustomSelect) {
                    requestAnimationFrame(() => {
                        window.updateCustomSelect(el);
                    });
                } else {
                    // 如果还没有初始化，等待初始化后再更新（最多等待 1 秒）
                    let attempts = 0;
                    const maxAttempts = 20; // 最多尝试 20 次（约 1 秒）
                    const checkInit = () => {
                        attempts++;
                        if (el._customSelectInstance && window.updateCustomSelect) {
                            window.updateCustomSelect(el);
                        } else if (attempts < maxAttempts) {
                            requestAnimationFrame(checkInit);
                        }
                    };
                    requestAnimationFrame(checkInit);
                }
            }
        }
    }
    
    setupConfigChangeListeners() {
        // 监听所有配置输入框的变化（避免重复绑定）
        const configInputs = document.querySelectorAll('[id^="config-"]:not([data-config-listener-bound])');
        configInputs.forEach(input => {
            // 标记已绑定，避免重复绑定
            input.dataset.configListenerBound = 'true';
            
            const handleChange = () => {
                this.admin.configChanged = true;
                this.updateConfigStatus();
            };
            
            input.addEventListener('change', handleChange);
            // 对于 input 类型的元素，也监听 input 事件
            if (input.tagName === 'INPUT' && input.type !== 'checkbox') {
                input.addEventListener('input', handleChange);
            }
        });
    }
    
    updateConfigStatus() {
        const statusEl = document.getElementById('configStatus');
        const saveBtn = document.getElementById('saveConfigBtn');
        
        if (this.admin.configChanged) {
            if (statusEl) {
                statusEl.textContent = '有未保存的更改';
                statusEl.classList.remove('hidden', 'text-gray-500', 'text-green-500');
                statusEl.classList.add('text-orange-500');
            }
            if (saveBtn) {
                saveBtn.disabled = false;
            }
        } else {
            // 只有在确实保存过之后才显示"所有更改已保存"
            // 初始状态不显示任何提示
            if (statusEl) {
                statusEl.classList.add('hidden');
            }
            if (saveBtn) {
                saveBtn.disabled = true;
            }
        }
    }
    
    async saveGlobalConfig() {
        if (!this.admin.secretKey) {
            Toast.show('秘钥未设置，无法保存配置', 'error');
            return;
        }
        
        const saveBtn = document.getElementById('saveConfigBtn');
        const saveIcon = document.getElementById('saveConfigIcon');
        const saveText = document.getElementById('saveConfigText');
        
        // 验证配置
        if (!this.validateConfig()) {
            return;
        }
        
        // 显示加载状态
        if (saveBtn) saveBtn.disabled = true;
        if (saveIcon) {
            saveIcon.innerHTML = '<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>';
            saveIcon.classList.add('animate-spin');
        }
        if (saveText) saveText.textContent = '保存中...';
        
        try {
            // 从表单收集配置
            const config = {
                global: {
                    enableStatistics: document.getElementById('config-global-enableStatistics')?.checked ?? true,
                    recordMessage: document.getElementById('config-global-recordMessage')?.checked ?? true,
                    enableWordCount: document.getElementById('config-global-enableWordCount')?.checked ?? true,
                    debugLog: document.getElementById('config-global-debugLog')?.checked ?? false,
                    enableBackup: document.getElementById('config-global-enableBackup')?.checked ?? true,
                    useOkMarker: document.getElementById('config-global-useOkMarker')?.checked ?? false
                },
                display: {
                    displayCount: parseInt(document.getElementById('config-display-displayCount')?.value || '10', 10),
                    globalStatsDisplayCount: parseInt(document.getElementById('config-display-globalStatsDisplayCount')?.value || '6', 10),
                    useForward: document.getElementById('config-display-useForward')?.checked ?? false,
                    usePicture: document.getElementById('config-display-usePicture')?.checked ?? true
                },
                message: {
                    onlyTextMessages: document.getElementById('config-message-onlyTextMessages')?.checked ?? false,
                    countBotMessages: document.getElementById('config-message-countBotMessages')?.checked ?? false,
                    updateRankingOnEveryMessage: document.getElementById('config-message-updateRankingOnEveryMessage')?.checked ?? false
                },
                achievements: {
                    enabled: document.getElementById('config-achievements-enabled')?.checked ?? true,
                    checkInterval: parseInt(document.getElementById('config-achievements-checkInterval')?.value || '0', 10),
                    rankingDisplayCount: parseInt(document.getElementById('config-achievements-rankingDisplayCount')?.value || '10', 10)
                },
                dataStorage: {
                    backupRetentionCount: parseInt(document.getElementById('config-dataStorage-backupRetentionCount')?.value || '10', 10),
                    lockTimeout: parseInt(document.getElementById('config-dataStorage-lockTimeout')?.value || '5000', 10),
                    lockExpiration: parseInt(document.getElementById('config-dataStorage-lockExpiration')?.value || '30000', 10),
                    maxRetries: parseInt(document.getElementById('config-dataStorage-maxRetries')?.value || '3', 10),
                    retryDelayBase: parseInt(document.getElementById('config-dataStorage-retryDelayBase')?.value || '100', 10),
                    maxRetryDelay: parseInt(document.getElementById('config-dataStorage-maxRetryDelay')?.value || '1000', 10)
                },
                backgroundServer: {
                    host: document.getElementById('config-backgroundServer-host')?.value || '0.0.0.0',
                    port: parseInt(document.getElementById('config-backgroundServer-port')?.value || '39999', 10),
                    protocol: document.getElementById('config-backgroundServer-protocol')?.value || 'http',
                    domain: document.getElementById('config-backgroundServer-domain')?.value || ''
                }
            };
            
            // 保留原有的 database 配置（如果存在）
            if (this.admin.globalConfig?.database) {
                config.database = this.admin.globalConfig.database;
            }
            
            const response = await api.saveGlobalConfig(this.admin.app.userId, this.admin.secretKey, config);
            if (response.success) {
                this.admin.globalConfig = config;
                this.admin.configChanged = false;
                // 保存成功后显示提示
                const statusEl = document.getElementById('configStatus');
                if (statusEl) {
                    statusEl.textContent = '所有更改已保存';
                    statusEl.classList.remove('hidden', 'text-gray-500', 'text-orange-500');
                    statusEl.classList.add('text-green-500');
                    setTimeout(() => {
                        statusEl.classList.add('hidden');
                    }, 3000);
                }
                this.updateConfigStatus();
                Toast.show('配置保存成功', 'success');
            } else {
                Toast.show('配置保存失败: ' + (response.message || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            Toast.show('保存配置失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            // 恢复按钮状态
            if (saveBtn) saveBtn.disabled = false;
            if (saveIcon) {
                saveIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
                saveIcon.classList.remove('animate-spin');
            }
            if (saveText) saveText.textContent = '保存配置';
        }
    }
    
    validateConfig() {
        // 验证数值范围
        const displayCount = parseInt(document.getElementById('config-display-displayCount')?.value || '10', 10);
        if (displayCount < 1 || displayCount > 100) {
            Toast.show('显示数量必须在 1-100 之间', 'error');
            document.getElementById('config-display-displayCount')?.focus();
            return false;
        }
        
        const globalStatsDisplayCount = parseInt(document.getElementById('config-display-globalStatsDisplayCount')?.value || '6', 10);
        if (globalStatsDisplayCount < 1 || globalStatsDisplayCount > 100) {
            Toast.show('全局统计显示数量必须在 1-100 之间', 'error');
            document.getElementById('config-display-globalStatsDisplayCount')?.focus();
            return false;
        }
        
        const rankingDisplayCount = parseInt(document.getElementById('config-achievements-rankingDisplayCount')?.value || '10', 10);
        if (rankingDisplayCount < 1 || rankingDisplayCount > 100) {
            Toast.show('成就排行榜显示数量必须在 1-100 之间', 'error');
            document.getElementById('config-achievements-rankingDisplayCount')?.focus();
            return false;
        }
        
        const backupRetentionCount = parseInt(document.getElementById('config-dataStorage-backupRetentionCount')?.value || '10', 10);
        if (backupRetentionCount < 1 || backupRetentionCount > 100) {
            Toast.show('备份保留数量必须在 1-100 之间', 'error');
            document.getElementById('config-dataStorage-backupRetentionCount')?.focus();
            return false;
        }
        
        const lockTimeout = parseInt(document.getElementById('config-dataStorage-lockTimeout')?.value || '5000', 10);
        if (lockTimeout < 1000) {
            Toast.show('锁定超时必须至少 1000 毫秒', 'error');
            document.getElementById('config-dataStorage-lockTimeout')?.focus();
            return false;
        }
        
        const lockExpiration = parseInt(document.getElementById('config-dataStorage-lockExpiration')?.value || '30000', 10);
        if (lockExpiration < 5000) {
            Toast.show('锁定过期必须至少 5000 毫秒', 'error');
            document.getElementById('config-dataStorage-lockExpiration')?.focus();
            return false;
        }
        
        const maxRetries = parseInt(document.getElementById('config-dataStorage-maxRetries')?.value || '3', 10);
        if (maxRetries < 1 || maxRetries > 10) {
            Toast.show('最大重试次数必须在 1-10 之间', 'error');
            document.getElementById('config-dataStorage-maxRetries')?.focus();
            return false;
        }
        
        const port = parseInt(document.getElementById('config-backgroundServer-port')?.value || '39999', 10);
        if (port < 1 || port > 65535) {
            Toast.show('端口必须在 1-65535 之间', 'error');
            document.getElementById('config-backgroundServer-port')?.focus();
            return false;
        }
        
        const protocol = document.getElementById('config-backgroundServer-protocol')?.value;
        if (!protocol || (protocol !== 'http' && protocol !== 'https')) {
            Toast.show('请选择有效的协议（HTTP 或 HTTPS）', 'error');
            document.getElementById('config-backgroundServer-protocol')?.focus();
            return false;
        }
        
        return true;
    }
}

