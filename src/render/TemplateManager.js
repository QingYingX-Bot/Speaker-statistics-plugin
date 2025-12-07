import fs from 'fs';
import path from 'path';
import { PathResolver } from '../core/utils/PathResolver.js';
import { getDatabaseService } from '../core/database/DatabaseService.js';
import { globalConfig } from '../core/ConfigManager.js';
import { AchievementService } from '../core/AchievementService.js';
import { CommonUtils } from '../core/utils/CommonUtils.js';
import { TimeUtils } from '../core/utils/TimeUtils.js';
import { AchievementUtils } from '../core/utils/AchievementUtils.js';

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
                festival: '🎊',
                special: '✨'
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

        // 生成头部HTML
        const headerHtml = `
			<div class="title">${title}</div>
			<div class="total-count">发言总数：<span>${CommonUtils.formatNumber(totalCount)}</span></div>
			<div class="group-info">${groupName} (${groupId})</div>
        `;

        // 生成页脚HTML
        const footerHtml = `生成时间：${generateTime} | Speaker-statistics-plugin v${version}`;

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{RANKING_ITEMS\}\}/g, rankingItems)
            .replace(/\{\{USER_CARD\}\}/g, userCard)
            .replace(/\{\{FOOTER\}\}/g, footerHtml);
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

        // 计算统计数据（确保所有值都是数字类型）
        const totalCount = parseInt(userData.total || userData.total_count || 0, 10);
        const totalWords = parseInt(userData.total_number_of_words || 0, 10);
        const activeDays = parseInt(userData.active_days || 0, 10);
        const continuousDays = parseInt(userData.continuous_days || 0, 10);
        const lastSpeakingTime = this.formatDate(userData.last_speaking_time);
        
        // 计算平均每日发言数
        const averageDaily = activeDays > 0 ? Math.round(totalCount / activeDays) : 0;
        
        // 获取排名和占比信息
        const globalRank = userData.global_rank || null;
        const messagePercentage = userData.message_percentage || '0.00';
        const todayCount = parseInt(userData.today_count || 0, 10);
        const todayWords = parseInt(userData.today_words || 0, 10);
        const monthCount = parseInt(userData.month_count || 0, 10);
        const monthWords = parseInt(userData.month_words || 0, 10);
        const groupCount = parseInt(userData.group_count || 0, 10);
        
        // 生成全局信息（群个数、总字数和总发言数）
        let globalInfo = `累计发言 ${CommonUtils.formatNumber(totalCount)} 条 · 累计字数 ${CommonUtils.formatNumber(totalWords)} 字`;
        if (groupCount > 0) {
            globalInfo = `所在群数 ${groupCount} 个 · ${globalInfo}`;
        }
        
        // 生成用户信息区域HTML
        const userProfileHtml = `
				<div class="user-profile">
					<img class="avatar" src="http://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640&img_type=jpg" />
					<div class="user-info">
						<div class="nickname">${this.generateNicknameWithAchievement(displayName, displayAchievement)}</div>
						<div class="info-container">
							<div class="info-item">
								<div class="info-icon clock-icon"></div>
								<span class="info-label">最后发言时间：</span>
								<span class="info-value">${lastSpeakingTime}</span>
							</div>
							<div class="info-item">
								<div class="info-icon globe-icon"></div>
								<span class="info-value">${globalInfo}</span>
							</div>
						</div>
					</div>
				</div>
        `;

        // 生成所有统计卡片HTML（统一在JS中生成，移除重复数据，优化排序）
        const statCards = [];
        
        // 优化后的布局：
        // 1. 今日发言（占两列，突出显示）
        statCards.push(`
					<div class="stat-card span-2">
						<div class="stat-label">今日发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(todayCount)}</div>
					</div>
        `);
        
        // 2. 连续发言天数（坚持度）
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">连续发言天数</div>
						<div class="stat-value">${CommonUtils.formatNumber(continuousDays)}</div>
					</div>
        `);
        
        // 3. 总发言天数（总体活跃度）
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">总发言天数</div>
						<div class="stat-value">${CommonUtils.formatNumber(activeDays)}</div>
					</div>
        `);
        
        // 4. 消息占比（如果有，显示贡献度）
        if (messagePercentage !== '0.00' && messagePercentage !== '0' && parseFloat(messagePercentage) > 0) {
            statCards.push(`
					<div class="stat-card">
						<div class="stat-label">消息占比</div>
						<div class="stat-value">${messagePercentage}%</div>
					</div>
            `);
            
            // 5. 平均每日发言（与消息占比并排）
            statCards.push(`
					<div class="stat-card">
						<div class="stat-label">平均每日发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(averageDaily)}</div>
					</div>
            `);
        } else {
            // 如果没有消息占比，单独显示平均每日发言
            statCards.push(`
					<div class="stat-card">
						<div class="stat-label">平均每日发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(averageDaily)}</div>
					</div>
            `);
        }
        
        // 6. 本月发言（如果与总数不同，显示本月数据）
        if (monthCount !== totalCount && monthCount > 0) {
            statCards.push(`
                    <div class="stat-card">
						<div class="stat-label">本月发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(monthCount)}</div>
                    </div>
            `);
        }
        
        // 移除的重复卡片：
        // - 发言总数（与头部"累计发言"重复）
        // - 全群排名（已从头部移除，不再显示）
        // - 累计字数（与头部"累计字数"重复）
        
        // 合并所有统计卡片
        const statsGridHtml = statCards.join('\n\t\t\t\t\t');

        const timeInfo = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;
        const title = '个人统计';

        return template
            .replace(/\{\{BACKGROUND_STYLE\}\}/g, backgroundStyle)
            .replace(/\{\{TITLE\}\}/g, title)
            .replace(/\{\{USER_PROFILE\}\}/g, userProfileHtml)
            .replace(/\{\{STATS_GRID\}\}/g, statsGridHtml)
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

        // 生成头部HTML
        const headerHtml = `
			<div class="title">群统计信息</div>
			<div class="group-id">${groupId}</div>
        `;

        // 生成统计卡片HTML
        const statsGridHtml = `
			<div class="stat-card">
				<div class="stat-value">${CommonUtils.formatNumber(groupStats.userCount || 0)}</div>
				<div class="stat-label">统计用户总数</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">${CommonUtils.formatNumber(groupStats.totalMessages || 0)}</div>
				<div class="stat-label">消息总量</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">${CommonUtils.formatNumber(groupStats.todayActive || 0)}</div>
				<div class="stat-label">今日活跃人数</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">${CommonUtils.formatNumber(groupStats.monthActive || 0)}</div>
				<div class="stat-label">本月活跃人数</div>
			</div>
        `;

        // 生成前三用户HTML
        const topUsersHtml = await this.generateTopUsersHtml(topUsers, groupId);

        // 生成页脚HTML
        const footerHtml = `生成时间：${timeInfo} | Speaker-statistics-plugin v${version}`;

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{STATS_GRID\}\}/g, statsGridHtml)
            .replace(/\{\{TOP_USERS\}\}/g, topUsersHtml)
            .replace(/\{\{FOOTER\}\}/g, footerHtml);
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

        // 生成头部HTML
        const headerHtml = `
			<div class="title">全局统计</div>
			<div class="subtitle">所有群聊的综合统计信息</div>
        `;

        // 生成概览统计卡片HTML
        const overviewCardsHtml = `
			<div class="overview-card">
				<div class="overview-number">${CommonUtils.formatNumber(globalStats.totalGroups || 0)}</div>
				<div class="overview-label">统计群数</div>
			</div>
			<div class="overview-card">
				<div class="overview-number">${CommonUtils.formatNumber(globalStats.totalUsers || 0)}</div>
				<div class="overview-label">统计用户总数</div>
			</div>
			<div class="overview-card">
				<div class="overview-number">${CommonUtils.formatNumber(globalStats.totalMessages || 0)}</div>
				<div class="overview-label">消息总量</div>
			</div>
			<div class="overview-card">
				<div class="overview-number">${CommonUtils.formatNumber(globalStats.todayActive || 0)}</div>
				<div class="overview-label">今日活跃人数</div>
			</div>
			<div class="overview-card">
				<div class="overview-number">${CommonUtils.formatNumber(globalStats.monthActive || 0)}</div>
				<div class="overview-label">本月活跃人数</div>
			</div>
			<div class="overview-card">
				<div class="overview-number">${CommonUtils.formatNumber(globalStats.statsDurationHours || 0)}</div>
				<div class="overview-label">统计时长（小时）</div>
			</div>
        `;

        // 生成群聊统计卡片HTML
        const groupsHtml = this.generateGroupsStatsHtml(globalStats.groups || []);

        // 处理无群组情况
        const noGroupsHtml = globalStats.groups && globalStats.groups.length === 0 
            ? '<div class="no-groups" id="no-groups"><div class="text">暂无群聊统计数据</div></div>'
            : '<div class="no-groups" id="no-groups" style="display: none;"><div class="text">暂无群聊统计数据</div></div>';

        // 生成页脚HTML
        const footerHtml = `
			<div class="timestamp">生成时间：${timestamp}</div>
			<div class="pagination-info">第 ${globalStats.currentPage || 1} 页，共 ${globalStats.totalPages || 1} 页（显示 ${CommonUtils.formatNumber((globalStats.groups || []).length)} 个群聊）</div>
			<div class="version">Speaker-statistics-plugin v${version}</div>
        `;

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{OVERVIEW_STATS\}\}/g, overviewCardsHtml)
            .replace(/\{\{GROUPS_GRID\}\}/g, groupsHtml || '')
            .replace(/\{\{NO_GROUPS\}\}/g, noGroupsHtml)
            .replace(/\{\{FOOTER\}\}/g, footerHtml);
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

    /**
     * 渲染成就列表模板
     * @param {Object} allDefinitions 所有成就定义（默认+自定义+群专属）
     * @param {Object} userAchievements 用户的成就解锁状态
     * @param {string} groupId 群ID
     * @param {string} groupName 群名称
     * @returns {string} 渲染后的HTML
     */
    renderAchievementListTemplate(allDefinitions, userAchievements, groupId, groupName, displayAchievement = null) {
        const template = this.loadTemplate('achievementListTemplate.html');
        if (!template) return '';

        const timestamp = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;

        // 计算已解锁数量
        let unlockedCount = 0;
        for (const [id, _] of Object.entries(allDefinitions)) {
            if (userAchievements[id]?.unlocked) {
                unlockedCount++;
            }
        }

        // 分离已解锁和未解锁的成就
        const unlockedAchievements = [];
        const lockedAchievements = [];

        for (const [id, definition] of Object.entries(allDefinitions)) {
            const isUnlocked = userAchievements[id]?.unlocked || false;
            const unlockTime = userAchievements[id]?.unlocked_at 
                ? new Date(userAchievements[id].unlocked_at).getTime() 
                : 0;

            if (isUnlocked) {
                unlockedAchievements.push({ id, definition, unlockTime });
            } else {
                lockedAchievements.push({ id, definition, unlockTime: 0 });
            }
        }

        // 已解锁成就排序：先按稀有度，再按解锁时间倒序（最新的在前）
        AchievementUtils.sortUnlockedAchievements(
            unlockedAchievements,
            (item) => item.definition.rarity,
            (item) => item.unlockTime
        );

        // 未解锁成就排序：按稀有度，稀有度相同时按名称
        AchievementUtils.sortLockedAchievements(
            lockedAchievements,
            (item) => item.definition.rarity,
            (item) => item.definition.name
        );

        // 合并列表：已解锁在前，未解锁在后
        const sortedAchievements = [...unlockedAchievements, ...lockedAchievements];

        // 生成成就列表HTML
        let lastWasUnlocked = null;
        const achievementsHtml = sortedAchievements.map((item, index) => {
            const { id, definition } = item;
            const isUnlocked = userAchievements[id]?.unlocked || false;
            const unlockTime = userAchievements[id]?.unlocked_at 
                ? this.formatDate(userAchievements[id].unlocked_at) 
                : null;
            
            // 检查是否是当前佩戴的成就
            const isDisplayed = displayAchievement && displayAchievement.id === id;
            let displayStatusHtml = '';
            if (isDisplayed) {
                if (displayAchievement.isManual) {
                    // 手动设置，无时限
                    displayStatusHtml = '<span class="display-status manual">✅ 已佩戴（手动设置）</span>';
                } else if (displayAchievement.autoDisplayAt) {
                    // 自动佩戴，计算剩余时间
                    // 解析 autoDisplayAt 为 UTC+8 时区的 Date 对象
                    // autoDisplayAt 可能是字符串（SQLite）或 Date 对象（PostgreSQL）
                    let autoDisplayAt;
                    const autoDisplayAtValue = displayAchievement.autoDisplayAt;
                    
                    if (autoDisplayAtValue instanceof Date) {
                        // PostgreSQL 返回的是 Date 对象
                        autoDisplayAt = autoDisplayAtValue;
                    } else if (typeof autoDisplayAtValue === 'string') {
                        // 可能是 ISO 8601 格式（PostgreSQL JSON序列化）或普通格式（SQLite）
                        if (autoDisplayAtValue.includes('T')) {
                            // ISO 8601 格式：可能是 "2025-11-14T15:52:22.000Z" 或 "2025-11-14T15:52:22"
                            autoDisplayAt = new Date(autoDisplayAtValue);
                            if (isNaN(autoDisplayAt.getTime())) {
                                // 解析失败，跳过时间显示
                                displayStatusHtml = '<span class="display-status auto">✅ 已佩戴（自动）</span>';
                            } else {
                                // 如果带 Z，说明是 UTC 时间，需要加8小时转换为 UTC+8
                                if (autoDisplayAtValue.endsWith('Z')) {
                                    const utc8Offset = 8 * 60 * 60 * 1000;
                                    autoDisplayAt = new Date(autoDisplayAt.getTime() + utc8Offset);
                                }
                            }
                        } else {
                            // 普通格式：YYYY-MM-DD HH:mm:ss（UTC+8 时区）
                            const [datePart, timePart] = autoDisplayAtValue.split(' ');
                            if (!datePart || !timePart) {
                                // 格式不正确，跳过时间显示
                                displayStatusHtml = '<span class="display-status auto">✅ 已佩戴（自动）</span>';
                            } else {
                                const [year, month, day] = datePart.split('-').map(Number);
                                const [hour, minute, second] = timePart.split(':').map(Number);
                                
                                // 创建 UTC+8 时区的 Date 对象
                                const utc8Offset = 8 * 60 * 60 * 1000;
                                const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second || 0);
                                autoDisplayAt = new Date(utcTimestamp - utc8Offset);
                            }
                        }
                    } else {
                        // 未知类型，跳过时间显示
                        displayStatusHtml = '<span class="display-status auto">✅ 已佩戴（自动）</span>';
                    }
                    
                    // 如果成功解析了日期，计算剩余时间
                    if (displayStatusHtml === '' && autoDisplayAt && !isNaN(autoDisplayAt.getTime())) {
                        // 计算卸下时间：解锁时间（auto_display_at）+ 24小时
                        const removeAt = new Date(autoDisplayAt.getTime() + 24 * 60 * 60 * 1000);
                        
                        // 获取当前 UTC+8 时区的时间
                        const now = TimeUtils.getUTC8Date();
                        
                        const diffMs = removeAt.getTime() - now.getTime();
                    const diffHours = diffMs / (1000 * 60 * 60);
                        const remainingHours = Math.max(0, diffHours);
                    const remainingMinutes = Math.floor((remainingHours % 1) * 60);
                    
                    if (remainingHours > 0) {
                        const hours = Math.floor(remainingHours);
                        displayStatusHtml = `<span class="display-status auto">✅ 已佩戴（自动佩戴剩余 ${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分钟' : ''}）</span>`;
                    } else {
                        displayStatusHtml = '<span class="display-status expired">⏰ 已过期（将自动卸下）</span>';
                        }
                    }
                } else {
                    displayStatusHtml = '<span class="display-status manual">✅ 已佩戴</span>';
                }
            }
            
            const rarityEmoji = {
                common: '🥉',
                uncommon: '🥈',
                rare: '🥇',
                epic: '💎',
                legendary: '👑',
                mythic: '🔥',
                festival: '🎊',
                special: '✨'
            };
            const emoji = rarityEmoji[definition.rarity] || '🏆';

            const statusClass = isUnlocked ? 'unlocked' : 'locked';
            const statusIcon = isUnlocked ? '✅' : '🔒';

            // 在已解锁和未解锁之间添加分隔条
            let separatorHtml = '';
            if (index === 0) {
                // 第一个成就，根据状态显示对应的分隔条
                if (isUnlocked) {
                    separatorHtml = '<div class="achievement-separator"><div class="separator-line"></div><div class="separator-text">已解锁成就</div><div class="separator-line"></div></div>';
                } else {
                    separatorHtml = '<div class="achievement-separator"><div class="separator-line"></div><div class="separator-text">未解锁成就</div><div class="separator-line"></div></div>';
                }
            } else if (lastWasUnlocked === true && !isUnlocked) {
                // 从已解锁切换到未解锁
                separatorHtml = '<div class="achievement-separator"><div class="separator-line"></div><div class="separator-text">未解锁成就</div><div class="separator-line"></div></div>';
            }

            lastWasUnlocked = isUnlocked;

            const itemHtml = `<div class="achievement-item ${statusClass}">
					<div class="achievement-header">
						<div class="achievement-status ${statusClass}">${statusIcon}</div>
						<div class="achievement-badge">
							<span class="achievement-inline achievement-${definition.rarity}">${emoji} ${definition.name}</span>
						</div>
					</div>
					<div class="achievement-info">
						<div class="achievement-name-row">
							<div class="achievement-name">${definition.name}</div>
							${displayStatusHtml ? `<div class="achievement-display-status">${displayStatusHtml}</div>` : ''}
						</div>
						<div class="achievement-description-row">
							<div class="achievement-description">${definition.description || '暂无描述'}</div>
							${unlockTime ? `<div class="achievement-meta-row">
								<div class="achievement-unlock-time">解锁于：${unlockTime}</div>
							</div>` : ''}
						</div>
					</div>
				</div>`;

            return separatorHtml + itemHtml;
        }).join('\n\t\t\t\t');

        // 生成头部信息HTML
        const headerHtml = `
			<div class="title">成就列表</div>
			<div class="achievement-count">解锁进度：<span>${unlockedCount}</span> / <span>${Object.keys(allDefinitions).length}</span></div>
			<div class="group-info">${groupName || `群${groupId}`} (${CommonUtils.maskGroupId(groupId)})</div>
        `;

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{ACHIEVEMENT_ITEMS\}\}/g, achievementsHtml)
            .replace(/\{\{GENERATE_TIME\}\}/g, timestamp)
            .replace(/\{\{VERSION\}\}/g, version);
    }

    /**
     * 渲染成就统计模板（复用 achievementListTemplate.html，但显示获取人数）
     * @param {Array} globalStats 全局成就统计数组
     * @param {Array} groupStats 群专属成就统计数组
     * @param {string} groupId 群ID
     * @param {string} groupName 群名称
     * @returns {string} 渲染后的HTML
     */
    renderAchievementStatisticsTemplate(globalStats, groupStats, groupId, groupName) {
        const template = this.loadTemplate('achievementListTemplate.html');
        if (!template) return '';

        const timestamp = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/');
        const version = this.version;

        // 合并所有成就统计
        const allStats = [...globalStats, ...groupStats];
        const totalAchievements = allStats.length;

        // 按获取人数排序（降序），然后按稀有度排序
        allStats.sort((a, b) => {
            if (b.unlockCount !== a.unlockCount) {
                return b.unlockCount - a.unlockCount;
            }
            return AchievementUtils.compareRarity(b.definition.rarity, a.definition.rarity);
        });

        // 生成群专属成就ID集合（用于快速判断）
        const groupOnlyIds = new Set(groupStats.map(stat => stat.id));

        // 生成成就统计HTML
        const achievementsHtml = allStats.map((stat, index) => {
            const { definition, unlockCount, isGlobal } = stat;
            const isGroupOnly = groupOnlyIds.has(stat.id);
            
            const rarityEmoji = {
                common: '🥉',
                uncommon: '🥈',
                rare: '🥇',
                epic: '💎',
                legendary: '👑',
                mythic: '🔥',
                festival: '🎊',
                special: '✨'
            }[definition.rarity] || '🏆';
            const emoji = rarityEmoji;

            const statusClass = 'unlocked'; // 统计页面所有成就都显示为已解锁样式

            // 添加分隔条（全局成就和群专属成就之间）
            let separatorHtml = '';
            if (index === globalStats.length && groupStats.length > 0) {
                separatorHtml = '<div class="achievement-separator"><div class="separator-line"></div><div class="separator-text">群专属成就</div><div class="separator-line"></div></div>';
            }

            // 生成作用域标签
            let scopeLabel = '';
            if (isGroupOnly) {
                scopeLabel = '<span class="display-status manual">（群专属）</span>';
            } else if (isGlobal) {
                scopeLabel = '<span class="display-status auto">（全局）</span>';
            }

            const itemHtml = `<div class="achievement-item ${statusClass}">
					<div class="achievement-header">
						<div class="achievement-status ${statusClass}">📊</div>
						<div class="achievement-badge">
							<span class="achievement-inline achievement-${definition.rarity}">${emoji} ${definition.name}</span>
						</div>
					</div>
					<div class="achievement-info">
						<div class="achievement-name-row">
							<div class="achievement-name">${definition.name}</div>
							${scopeLabel}
						</div>
						<div class="achievement-description-row">
							<div class="achievement-description">${definition.description || '暂无描述'}</div>
							<div class="achievement-meta-row">
								<div class="achievement-unlock-time">获取人数: ${unlockCount} 人</div>
							</div>
						</div>
					</div>
				</div>`;

            return separatorHtml + itemHtml;
        }).join('\n\t\t\t\t');

        // 生成头部信息HTML
        const headerHtml = `
			<div class="title">成就统计</div>
			<div class="achievement-count">成就总数: <span>${totalAchievements}</span> 个</div>
			<div class="group-info">${groupName || `群${groupId}`} (${CommonUtils.maskGroupId(groupId)})</div>
        `;

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{ACHIEVEMENT_ITEMS\}\}/g, achievementsHtml)
            .replace(/\{\{GENERATE_TIME\}\}/g, timestamp)
            .replace(/\{\{VERSION\}\}/g, version);
    }
}

export { TemplateManager };
export default TemplateManager;

