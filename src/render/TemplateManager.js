import fs from 'fs';
import path from 'path';
import { PathResolver } from '../core/utils/PathResolver.js';
import { getDatabaseService } from '../core/database/DatabaseService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { AchievementService } from '../core/AchievementService.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';

/**
 * 模板管理器
 * 负责加载和渲染 HTML 模板
 */
class TemplateManager {
    constructor(dataService = null) {
        this.templatesPath = PathResolver.getTemplatesDir();
        this.backgroundsPath = PathResolver.getBackgroundsDir();
        this.version = this.getVersion();
        this.templateCache = new Map();
        this.backgroundCache = new Map();
        this.cacheTimestamp = new Map();
        this.cacheTTL = 30 * 60 * 1000; // 30分钟缓存
        this.dataService = dataService;
        this.achievementService = dataService ? new AchievementService(dataService) : null;
    }

    /**
     * 获取插件版本号
     */
    getVersion() {
        try {
            const packagePath = path.join(PathResolver.getPluginDir(), 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            return packageJson.version || '3.0.0';
        } catch (error) {
            globalConfig.error('读取版本号失败:', error);
            return '3.0.0';
        }
    }

    /**
     * 加载模板文件（带缓存）
     * @param {string} templateName 模板文件名
     * @returns {string} 模板内容
     */
    loadTemplate(templateName) {
        // 检查缓存
        if (this.templateCache.has(templateName)) {
            const timestamp = this.cacheTimestamp.get(templateName);
            if (timestamp && (Date.now() - timestamp) < this.cacheTTL) {
                return this.templateCache.get(templateName);
            }
        }

        try {
            const templatePath = path.join(this.templatesPath, templateName);
            
            if (!fs.existsSync(templatePath)) {
                globalConfig.error(`模板文件不存在: ${templateName}`);
                return '';
            }

            const template = fs.readFileSync(templatePath, 'utf8');

            // 缓存模板
            this.templateCache.set(templateName, template);
            this.cacheTimestamp.set(templateName, Date.now());

            return template;
        } catch (error) {
            globalConfig.error(`加载模板失败: ${templateName}`, error);
            return '';
        }
    }

    /**
     * 获取背景图片样式
     * @param {string} userId 用户ID
     * @param {boolean} isRanking 是否为排行榜背景
     * @returns {Object} { style: string, hasBackground: boolean }
     */
    getBackgroundStyle(userId, isRanking = false) {
        const subDir = isRanking ? 'ranking' : 'normal';
        const fileName = `${userId}.jpg`;
        const backgroundPath = path.join(this.backgroundsPath, subDir, fileName);

        if (!fs.existsSync(backgroundPath)) {
            return {
                style: '',
                hasBackground: false
            };
        }

        try {
            const imageBuffer = fs.readFileSync(backgroundPath);
            const base64Image = imageBuffer.toString('base64');
            const style = `background-image: url(data:image/jpeg;base64,${base64Image}) !important;`;
            return {
                style,
                hasBackground: true
            };
        } catch (error) {
            globalConfig.error(`读取背景图片失败: ${userId}`, error);
            return {
                style: '',
                hasBackground: false
            };
        }
    }

    /**
     * 获取用户统计背景样式
     */
    getUserStatsBackgroundStyle(userId) {
        const normalBackground = this.getBackgroundStyle(userId, false);
        if (normalBackground.hasBackground) {
            const base64Image = normalBackground.style.match(/base64,(.+?)\)/)?.[1] || '';
            return `background: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url(data:image/jpeg;base64,${base64Image}) no-repeat center center; background-size: cover; background-position: center;`;
        }

        return 'background: linear-gradient(45deg, #2c3e50, #3498db);';
    }

    /**
     * 获取排行榜项目背景样式
     */
    getRankingItemBackgroundStyle(userId) {
        // 优先使用排行榜背景
        const rankingBackground = this.getBackgroundStyle(userId, true);
        if (rankingBackground.hasBackground) {
            return rankingBackground;
        }

        // 备用普通背景
        return this.getBackgroundStyle(userId, false);
    }

    /**
     * 生成排名显示
     */
    generateRankDisplay(index) {
        if (index === 0) {
            return `<span class="medal-1">#${index + 1}</span>`;
        } else if (index === 1) {
            return `<span class="medal-2">#${index + 1}</span>`;
        } else if (index === 2) {
            return `<span class="medal-3">#${index + 1}</span>`;
        } else {
            return `#${index + 1}`;
        }
    }

    /**
     * 获取用户显示名称
     */
    getUserDisplayName(userId, groupId, nickname) {
        let displayName = nickname || userId;

        try {
            if (typeof Bot !== 'undefined' && Bot.gml) {
                const userList = Bot.gml.get(groupId);
                if (userList) {
                    const userInfo = userList.get(userId);
                    if (userInfo) {
                        displayName = userInfo.card || userInfo.nickname || nickname || userId;
                        displayName = displayName.replace(/[^\p{L}\p{N}\p{P}\p{S}\p{Z}]/gu, '').trim();
                        if (!displayName) {
                            displayName = nickname || userId;
                        }
                    }
                }
            }
        } catch (error) {
            displayName = nickname || userId;
        }

        return displayName || userId;
    }

    /**
     * 获取用户显示成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Object|null} 显示成就数据
     */
    async getUserDisplayAchievement(groupId, userId) {
        try {
            if (!this.achievementService) {
                return null;
            }

            const achievementData = await this.achievementService.getUserAchievements(groupId, userId);
            return achievementData.displayAchievement;
        } catch (error) {
            globalConfig.error(`获取用户显示成就失败: ${groupId}/${userId}`, error);
            return null;
        }
    }

    /**
     * 生成昵称和成就显示
     */
    generateNicknameWithAchievement(nickname, achievement) {
        if (achievement) {
            const rarityEmoji = {
                common: '🥉',
                uncommon: '🥈',
                rare: '🥇',
                epic: '💎',
                legendary: '👑',
                mythic: '🔥',
                festival: '🎊'
            };
            const emoji = rarityEmoji[achievement.rarity] || '';
            return `${nickname}<span class="achievement-inline achievement-${achievement.rarity}">${emoji} ${achievement.name}</span>`;
        }
        return nickname;
    }

    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '未知';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 渲染图片排行榜模板
     */
    async renderImageRankingTemplate(data, groupId, groupName, title, userInfo = null, options = {}) {
        const template = this.loadTemplate('imageRankingTemplate.html');
        if (!template) return '';

        const { showExtraStats = false, globalTotalMessages = null } = options;
        let totalCount = globalTotalMessages !== null ? globalTotalMessages : 
            data.reduce((sum, item) => sum + (item.count || 0), 0);
        
        // 如果有个人卡片用户且不在显示范围内，需要将用户的消息数也加入总计数（用于准确计算百分比）
        if (userInfo && userInfo.data) {
            const userCount = userInfo.data.count || 0;
            // 检查用户是否已经在显示范围内（通过检查是否有相同的user_id）
            const userInRankings = data.some(item => String(item.user_id) === String(userInfo.data.user_id));
            // 如果用户不在显示范围内，将其消息数加入总计数
            if (!userInRankings) {
                totalCount = totalCount + userCount;
            }
        }

        // 生成排行榜项目HTML
        const rankingItems = await this.generateRankingItems(data, totalCount, showExtraStats, groupId);

        // 生成用户卡片HTML（需要传递totalCount以计算百分比）
        const userCard = userInfo && userInfo.data ? 
            await this.generateUserCard(userInfo, totalCount, showExtraStats, groupId) : '';

        const generateTime = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;

        return template
            .replace(/\{\{TITLE\}\}/g, title)
            .replace(/\{\{TOTAL_COUNT\}\}/g, CommonUtils.formatNumber(totalCount))
            .replace(/\{\{GROUP_NAME\}\}/g, groupName)
            .replace(/\{\{GROUP_ID\}\}/g, groupId)
            .replace(/\{\{RANKING_ITEMS\}\}/g, rankingItems)
            .replace(/\{\{USER_CARD\}\}/g, userCard)
            .replace(/\{\{GENERATE_TIME\}\}/g, generateTime)
            .replace(/\{\{VERSION\}\}/g, version);
    }

    /**
     * 生成排行榜项目HTML
     */
    async generateRankingItems(data, totalCount, showExtraStats, groupId = null) {
        const items = [];

        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            const count = item.count || 0;
            const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
            const rankDisplay = this.generateRankDisplay(index);
            const backgroundInfo = this.getRankingItemBackgroundStyle(item.user_id);
            const displayAchievement = groupId ? await this.getUserDisplayAchievement(groupId, item.user_id) : null;
            const displayName = this.getUserDisplayName(item.user_id, groupId, item.nickname);

            const itemHtml = `
        <div class="rank-item ${backgroundInfo.hasBackground ? 'has-background' : ''}" style="${backgroundInfo.style || ''}">
          <div class="rank-number">${rankDisplay}</div>
          <img class="avatar" src="https://q1.qlogo.cn/g?b=qq&s=100&nk=${item.user_id}" alt="avatar" onerror="this.style.display='none'">
          <div class="user-info">
            <div class="nickname">${this.generateNicknameWithAchievement(displayName, displayAchievement)}</div>
            <div class="last-active">最后发言: ${this.formatDate(item.last_speaking_time)}</div>
            ${this.generateExtraStats(item, showExtraStats)}
          </div>
          <div class="stats">
            <div class="count">${count}</div>
            <div class="percentage">${percentage}%</div>
          </div>
        </div>
      `;

            items.push(itemHtml);
        }

        return items.join('');
    }

    /**
     * 生成用户卡片HTML
     * @param {Object} userInfo 用户信息 {data: {...}, rank: ...}
     * @param {number} totalCount 总消息数（用于计算百分比）
     * @param {boolean} showExtraStats 是否显示额外统计
     * @param {string|null} groupId 群号
     * @returns {Promise<string>} 用户卡片HTML
     */
    async generateUserCard(userInfo, totalCount = 0, showExtraStats = false, groupId = null) {
        const backgroundInfo = this.getRankingItemBackgroundStyle(userInfo.data.user_id);
        const displayAchievement = groupId ? await this.getUserDisplayAchievement(groupId, userInfo.data.user_id) : null;
        const displayName = this.getUserDisplayName(userInfo.data.user_id, groupId, userInfo.data.nickname);
        
        // 计算百分比（与主排行榜条目保持一致）
        const count = userInfo.data.count || 0;
        const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;

        return `
      <div class="user-card">
        <div class="rank-item ${backgroundInfo.hasBackground ? 'has-background' : ''}" style="${backgroundInfo.style || ''}">
          <div class="rank-number">#${userInfo.rank}</div>
          <img class="avatar" src="https://q1.qlogo.cn/g?b=qq&s=100&nk=${userInfo.data.user_id}" alt="avatar" onerror="this.style.display='none'">
          <div class="user-info">
            <div class="nickname">${this.generateNicknameWithAchievement(displayName, displayAchievement)}</div>
            <div class="last-active">最后发言: ${this.formatDate(userInfo.data.last_speaking_time)}</div>
            ${this.generateExtraStats(userInfo.data, showExtraStats)}
          </div>
          <div class="stats">
            <div class="count">${count}</div>
            <div class="percentage">${percentage}%</div>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * 生成额外统计信息HTML
     */
    generateExtraStats(item, showExtraStats) {
        // 兼容 period_words（排行榜数据）和 total_number_of_words（用户统计数据）
        const wordCount = item.period_words !== undefined ? item.period_words : (item.total_number_of_words || 0);
        
        if (showExtraStats) {
            return `
        <div class="extra-stats">
          <span>连续: ${item.continuous_days || 0}天</span>
          <span style="margin-left: 10px;">平均: ${item.average_speech || 0}/天</span>
          <span style="margin-left: 10px;">累计消息字数: ${CommonUtils.formatNumber(wordCount)}</span>
        </div>
      `;
        } else {
            return `<div class="extra-stats"><span>累计消息字数: ${CommonUtils.formatNumber(wordCount)}</span></div>`;
        }
    }

    /**
     * 渲染用户统计模板
     */
    async renderUserStatsTemplate(userData, groupId, groupName, userId, nickname) {
        const template = this.loadTemplate('userStatsTemplate.html');
        if (!template) return '';

        const displayName = this.getUserDisplayName(userId, groupId, nickname);
        const backgroundStyle = this.getUserStatsBackgroundStyle(userId);
        // 如果 groupId 为 null（全局统计），不获取成就（成就按群聊存储）
        const displayAchievement = groupId ? await this.getUserDisplayAchievement(groupId, userId) : null;

        // 计算统计数据
        const totalCount = userData.total || userData.total_count || 0;
        const totalWords = userData.total_number_of_words || 0;
        const activeDays = userData.active_days || 0;
        const continuousDays = userData.continuous_days || 0;
        const lastSpeakingTime = this.formatDate(userData.last_speaking_time);
        
        // 计算平均每日发言数
        const averageDaily = activeDays > 0 ? Math.round(totalCount / activeDays) : 0;
        
        // 生成全局信息（总字数和总发言数）
        const globalInfo = `累计发言 ${CommonUtils.formatNumber(totalCount)} 条 · 累计字数 ${CommonUtils.formatNumber(totalWords)} 字`;
        
        // 字数统计卡片HTML
        const wordCountCard = totalWords > 0 ? `
                    <div class="stat-card">
                        <div class="stat-label">累计字数</div>
                        <div class="stat-value">${CommonUtils.formatNumber(totalWords)}</div>
                    </div>
        ` : '';

        const timeInfo = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;
        const title = '个人统计';

        return template
            .replace(/\{\{BACKGROUND_STYLE\}\}/g, backgroundStyle)
            .replace(/\{\{TITLE\}\}/g, title)
            .replace(/\{\{USER_ID\}\}/g, userId)
            .replace(/\{\{NICKNAME\}\}/g, this.generateNicknameWithAchievement(displayName, displayAchievement))
            .replace(/\{\{LAST_SPEAKING_TIME\}\}/g, lastSpeakingTime)
            .replace(/\{\{GLOBAL_INFO\}\}/g, globalInfo)
            .replace(/\{\{COUNT\}\}/g, CommonUtils.formatNumber(totalCount))
            .replace(/\{\{CONTINUOUS_DAYS\}\}/g, continuousDays.toString())
            .replace(/\{\{TOTAL_DAYS\}\}/g, activeDays.toString())
            .replace(/\{\{AVERAGE_DAILY\}\}/g, averageDaily.toString())
            .replace(/\{\{WORD_COUNT_CARD\}\}/g, wordCountCard)
            .replace(/\{\{GENERATE_TIME\}\}/g, timeInfo)
            .replace(/\{\{VERSION\}\}/g, version);
    }

    /**
     * 渲染群统计模板
     */
    async renderGroupStatsTemplate(groupStats, groupId, groupName, topUsers) {
        const template = this.loadTemplate('groupStatsTemplate.html');
        if (!template) return '';

        const timeInfo = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;
        const title = '群统计信息';

        // 生成前三用户HTML
        const topUsersHtml = await this.generateTopUsersHtml(topUsers, groupId);

        return template
            .replace(/\{\{TITLE\}\}/g, title)
            .replace(/\{\{GROUP_ID\}\}/g, groupId)
            .replace(/\{\{USER_COUNT\}\}/g, CommonUtils.formatNumber(groupStats.userCount || 0))
            .replace(/\{\{TOTAL_MESSAGES\}\}/g, CommonUtils.formatNumber(groupStats.totalMessages || 0))
            .replace(/\{\{TODAY_ACTIVE\}\}/g, CommonUtils.formatNumber(groupStats.todayActive || 0))
            .replace(/\{\{MONTH_ACTIVE\}\}/g, CommonUtils.formatNumber(groupStats.monthActive || 0))
            .replace(/\{\{TOP_USERS\}\}/g, topUsersHtml)
            .replace(/\{\{GENERATE_TIME\}\}/g, timeInfo)
            .replace(/\{\{VERSION\}\}/g, version);
    }

    /**
     * 生成前三用户HTML
     */
    async generateTopUsersHtml(topUsers, groupId) {
        if (!topUsers || topUsers.length === 0) {
            return '<div style="text-align: center; color: #718096; padding: 20px;">暂无用户数据</div>';
        }

        const items = [];
        for (let i = 0; i < Math.min(topUsers.length, 3); i++) {
            const user = topUsers[i];
            const rank = i + 1;
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : 'rank-3';
            const displayName = this.getUserDisplayName(user.user_id, groupId, user.nickname || '未知用户');
            const count = user.total_count || user.count || 0;

            const userHtml = `
                <div class="user-card">
                    <div class="rank-badge ${rankClass}">${rank}</div>
                    <img class="user-avatar" src="https://q1.qlogo.cn/g?b=qq&s=100&nk=${user.user_id}" alt="avatar" onerror="this.style.display='none'">
                    <div class="user-name">${displayName}</div>
                    <div class="user-count">${CommonUtils.formatNumber(count)} 条</div>
                </div>
            `;

            items.push(userHtml);
        }

        // 如果不足3个用户，填充空位
        while (items.length < 3) {
            items.push('<div class="user-card"></div>');
        }

        return items.join('');
    }

    /**
     * 渲染帮助面板模板
     * @param {boolean} isMaster 是否为主人
     * @returns {string} 渲染后的HTML
     */
    renderHelpPanelTemplate(isMaster = false) {
        const template = this.loadTemplate('helpPanel.html');
        if (!template) return '';

        const generateTime = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;

        return template
            .replace(/\{\{VERSION\}\}/g, version)
            .replace(/\{\{GENERATE_TIME\}\}/g, generateTime)
            .replace(/\{\{IS_MASTER\}\}/g, isMaster ? 'true' : 'false');
    }

    /**
     * 渲染全局统计模板
     * @param {Object} globalStats 全局统计数据
     * @returns {string} 渲染后的HTML
     */
    renderGlobalStatsTemplate(globalStats) {
        const template = this.loadTemplate('globalStatsTemplate.html');
        if (!template) return '';

        const timestamp = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;

        // 生成群聊统计卡片HTML
        const groupsHtml = this.generateGroupsStatsHtml(globalStats.groups || []);

        // 处理无群组情况
        const noGroupsHtml = globalStats.groups && globalStats.groups.length === 0 
            ? '<div class="no-groups" id="no-groups"><div class="text">暂无群聊统计数据</div></div>'
            : '';

        // 先替换所有变量，totalGroups 出现两次需要分别处理
        let html = template
            .replace(/\{\{totalUsers\}\}/g, CommonUtils.formatNumber(globalStats.totalUsers || 0))
            .replace(/\{\{totalMessages\}\}/g, CommonUtils.formatNumber(globalStats.totalMessages || 0))
            .replace(/\{\{todayActive\}\}/g, CommonUtils.formatNumber(globalStats.todayActive || 0))
            .replace(/\{\{monthActive\}\}/g, CommonUtils.formatNumber(globalStats.monthActive || 0))
            .replace(/\{\{timestamp\}\}/g, timestamp)
            .replace(/\{\{version\}\}/g, version)
            .replace(/\{\{currentPage\}\}/g, (globalStats.currentPage || 1).toString())
            .replace(/\{\{totalPages\}\}/g, (globalStats.totalPages || 1).toString());

        // 替换概览中的 totalGroups（统计群数）
        html = html.replace(/\{\{totalGroups\}\}/, CommonUtils.formatNumber(globalStats.totalGroups || 0));
        // 替换页脚中的 totalGroups（显示的总群数，这里应该是当前页显示的群数）
        html = html.replace(/\{\{totalGroups\}\}/, CommonUtils.formatNumber((globalStats.groups || []).length));

        // 替换群聊统计容器
        if (groupsHtml) {
            // 使用正则表达式匹配，避免空格问题
            html = html.replace(
                /<div class="groups-grid" id="groups-container">[\s\S]*?<\/div>/,
                `<div class="groups-grid" id="groups-container">\n\t\t\t\t${groupsHtml}\n\t\t\t</div>`
            );
        }

        // 替换无群组提示
        if (noGroupsHtml) {
            html = html.replace(
                '<div class="no-groups" id="no-groups" style="display: none;">',
                '<div class="no-groups" id="no-groups">'
            );
        } else {
            html = html.replace(
                '<div class="no-groups" id="no-groups" style="display: none;">',
                '<div class="no-groups" id="no-groups" style="display: none;">'
            );
        }

        return html;
    }

    /**
     * 生成群聊统计卡片HTML
     * @param {Array} groups 群组统计数组
     * @returns {string} 群聊统计卡片HTML
     */
    generateGroupsStatsHtml(groups) {
        if (!groups || groups.length === 0) {
            return '';
        }

        const cards = groups.map(group => {
            // 显示真实的群名称，如果groupName就是默认值就不使用
            const displayName = group.groupName && !group.groupName.startsWith('群') 
                ? group.groupName 
                : null; // 如果只有群号格式，不显示
            // 隐藏群号中间部分
            const maskedGroupId = CommonUtils.maskGroupId(group.groupId);
            
            return `
                <div class="group-card">
                    <div class="group-header">
                        ${displayName ? `<div class="group-name">${displayName}</div>` : ''}
                        <div class="group-id">${maskedGroupId}</div>
                    </div>
                    <div class="group-stats">
                        <div class="group-stat-item">
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.userCount || 0)}</div>
                            <div class="group-stat-label">用户数</div>
                        </div>
                        <div class="group-stat-item">
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.totalMessages || 0)}</div>
                            <div class="group-stat-label">消息数</div>
                        </div>
                        <div class="group-stat-item">
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.todayActive || 0)}</div>
                            <div class="group-stat-label">今日活跃</div>
                        </div>
                        <div class="group-stat-item">
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.monthActive || 0)}</div>
                            <div class="group-stat-label">本月活跃</div>
                        </div>
                    </div>
                </div>
            `;
        });

        return cards.join('\n\t\t\t\t');
    }
}

export { TemplateManager };
export default TemplateManager;

