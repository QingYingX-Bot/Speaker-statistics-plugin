import fs from 'fs'
import path from 'path'
import { PathResolver } from '../core/utils/PathResolver.js'
import { getDatabaseService } from '../core/database/DatabaseService.js'
import { globalConfig } from '../core/ConfigManager.js'
import { CommonUtils } from '../core/utils/CommonUtils.js'
import { TimeUtils } from '../core/utils/TimeUtils.js'

/**
 * 模板管理器
 * 负责加载和渲染 HTML 模板
 */
class TemplateManager {
    constructor(dataService = null) {
        this.templatesPath = PathResolver.getTemplatesDir()
        this.backgroundsPath = PathResolver.getBackgroundsDir()
        this.version = this.getVersion()
        this.templateCache = new Map()
        this.backgroundCache = new Map()
        this.cacheTimestamp = new Map()
        this.cacheTTL = 30 * 60 * 1000; // 30分钟缓存
        this.dataService = dataService
    }

    /**
     * 获取插件版本号
     */
    getVersion() {
        try {
            const packagePath = path.join(PathResolver.getPluginDir(), 'package.json')
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
            return packageJson.version || '3.0.0'
        } catch (err) {
            globalConfig.error('读取版本号失败:', err)
            return '3.0.0'
        }
    }

    /**
     * 获取平台感知的默认群名称
     * @param {string} groupId 群 ID
     * @returns {string}
     */
    getDefaultGroupName(groupId) {
        const normalizedGroupId = String(groupId || '').trim()
        if (!normalizedGroupId) return '未知群组'
        if (normalizedGroupId.startsWith('dc_')) {
            return `Discord频道${normalizedGroupId.slice(3) || normalizedGroupId}`
        }
        if (normalizedGroupId.startsWith('tg_')) {
            return `Telegram群组${normalizedGroupId.slice(3) || normalizedGroupId}`
        }
        return `群${normalizedGroupId}`
    }

    /**
     * 规范化ID
     * @param {any} id 原始ID
     * @returns {string}
     */
    normalizeId(id) {
        if (id === null || id === undefined) return ''
        return String(id).trim()
    }

    /**
     * 根据群ID判断平台
     * @param {string} groupId 群ID
     * @returns {'qq'|'discord'|'telegram'}
     */
    detectGroupPlatform(groupId = '') {
        const normalizedId = this.normalizeId(groupId).toLowerCase()
        if (normalizedId.startsWith('dc_')) return 'discord'
        if (normalizedId.startsWith('tg_')) return 'telegram'
        return 'qq'
    }

    /**
     * 获取用户头像URL（平台感知）
     * @param {string} userId 用户ID
     * @param {string|null} groupId 群ID
     * @returns {Promise<string>}
     */
    async getUserAvatarUrl(userId, groupId = null) {
        const normalizedUserId = this.normalizeId(userId)
        if (!normalizedUserId) return ''

        let resolvedGroupId = groupId
        // 全局榜等场景 groupId 为空时，按 userId 前缀识别平台
        if (!this.normalizeId(resolvedGroupId)) {
            const userPlatform = this.detectGroupPlatform(normalizedUserId)
            if (userPlatform === 'discord') {
                resolvedGroupId = normalizedUserId.startsWith('dc_') ? normalizedUserId : `dc_${normalizedUserId}`
            } else if (userPlatform === 'telegram') {
                resolvedGroupId = normalizedUserId.startsWith('tg_') ? normalizedUserId : `tg_${normalizedUserId}`
            }
        }

        if (this.dataService?.getUserAvatarUrl) {
            const avatarUrl = await this.dataService.getUserAvatarUrl(normalizedUserId, resolvedGroupId).catch(() => '')
            if (avatarUrl) return avatarUrl
        }

        const platform = this.detectGroupPlatform(resolvedGroupId || normalizedUserId)
        if (platform === 'discord') {
            return 'https://cdn.discordapp.com/embed/avatars/0.png'
        }
        return `https://q1.qlogo.cn/g?b=qq&s=100&nk=${normalizedUserId}`
    }

    /**
     * 获取群头像URL（平台感知）
     * @param {Object} group 群统计项
     * @returns {Promise<string>}
     */
    async getGroupAvatarUrl(group) {
        if (!group || typeof group !== 'object') return ''

        if (this.dataService?.getGroupAvatarUrl) {
            const avatarUrl = await this.dataService.getGroupAvatarUrl(group).catch(() => '')
            if (avatarUrl) return avatarUrl
        }

        const groupId = this.normalizeId(group.groupId || group.group_id)
        if (!groupId) return ''
        return `http://p.qlogo.cn/gh/${groupId}/${groupId}/100/`
    }

    /**
     * 获取群ID展示文本（Discord 合并条目优先显示服务器ID）
     * @param {Object} group 群统计项
     * @returns {string}
     */
    getGroupDisplayId(group) {
        const groupId = this.normalizeId(group?.groupId || group?.group_id)
        if (!groupId) return ''

        const platform = group?.platform || this.detectGroupPlatform(groupId)
        if (platform === 'discord' && group?.isDcMerged && group?.dcGuildId) {
            return `dc_guild_${this.normalizeId(group.dcGuildId)}`
        }

        return groupId
    }

    /**
     * 加载模板文件（带缓存）
     * @param {string} templateName 模板文件名
     * @returns {string} 模板内容
     */
    loadTemplate(templateName) {
        // 检查缓存
        if (this.templateCache.has(templateName)) {
            const timestamp = this.cacheTimestamp.get(templateName)
            if (timestamp && (Date.now() - timestamp) < this.cacheTTL) {
                return this.templateCache.get(templateName)
            }
        }

        try {
            const templatePath = path.join(this.templatesPath, templateName)
            
            if (!fs.existsSync(templatePath)) {
                globalConfig.error(`模板文件不存在: ${templateName}`)
                return ''
            }

            const template = fs.readFileSync(templatePath, 'utf8')

            // 缓存模板
            this.templateCache.set(templateName, template)
            this.cacheTimestamp.set(templateName, Date.now())

            return template
        } catch (err) {
            globalConfig.error(`加载模板失败: ${templateName}`, err)
            return ''
        }
    }

    /**
     * 获取背景图片样式
     * @param {string} userId 用户ID
     * @param {boolean} isRanking 是否为排行榜背景
     * @returns {Object} { style: string, hasBackground: boolean }
     */
    getBackgroundStyle(userId, isRanking = false) {
        const subDir = isRanking ? 'ranking' : 'normal'
        const fileName = `${userId}.jpg`
        const backgroundPath = path.join(this.backgroundsPath, subDir, fileName)

        if (!fs.existsSync(backgroundPath)) {
            return {
                style: '',
                hasBackground: false
            }
        }

        try {
            const imageBuffer = fs.readFileSync(backgroundPath)
            const base64Image = imageBuffer.toString('base64')
            const style = `background-image: url(data:image/jpeg;base64,${base64Image}) !important;`
            return {
                style,
                hasBackground: true
            }
        } catch (err) {
            globalConfig.error(`读取背景图片失败: ${userId}`, err)
            return {
                style: '',
                hasBackground: false
            }
        }
    }

    /**
     * 获取用户统计背景样式
     */
    getUserStatsBackgroundStyle(userId) {
        const normalBackground = this.getBackgroundStyle(userId, false)
        if (normalBackground.hasBackground) {
            const base64Image = normalBackground.style.match(/base64,(.+?)\)/)?.[1] || ''
            return `background: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url(data:image/jpeg;base64,${base64Image}) no-repeat center center; background-size: cover; background-position: center;`
        }

        return 'background: linear-gradient(45deg, #2c3e50, #3498db);'
    }

    /**
     * 获取排行榜项目背景样式
     */
    getRankingItemBackgroundStyle(userId) {
        // 优先使用排行榜背景
        const rankingBackground = this.getBackgroundStyle(userId, true)
        if (rankingBackground.hasBackground) {
            return rankingBackground
        }

        // 备用普通背景
        return this.getBackgroundStyle(userId, false)
    }

    /**
     * 生成排名显示
     */
    generateRankDisplay(index) {
        if (index === 0) {
            return `<span class="medal-1">#${index + 1}</span>`
        } else if (index === 1) {
            return `<span class="medal-2">#${index + 1}</span>`
        } else if (index === 2) {
            return `<span class="medal-3">#${index + 1}</span>`
        } else {
            return `#${index + 1}`
        }
    }

    /**
     * 获取用户显示名称
     */
    getUserDisplayName(userId, groupId, nickname) {
        let displayName = nickname || userId

        try {
            if (typeof Bot !== 'undefined' && Bot.gml) {
                const userList = Bot.gml.get(groupId)
                if (userList) {
                    const userInfo = userList.get(userId)
                    if (userInfo) {
                        displayName = userInfo.card || userInfo.nickname || nickname || userId
                        displayName = displayName.replace(/[^\p{L}\p{N}\p{P}\p{S}\p{Z}]/gu, '').trim()
                        if (!displayName) {
                            displayName = nickname || userId
                        }
                    }
                }
            }
        } catch (err) {
            displayName = nickname || userId
        }

        return displayName || userId
    }

    /**
     * 获取用户优先显示名（Discord 优先显示 global_name，其次 username）
     * @param {string} userId 用户ID
     * @param {string|null} groupId 群ID
     * @param {string} nickname 兜底昵称
     * @returns {Promise<string>}
     */
    async getPreferredUserDisplayName(userId, groupId, nickname) {
        const baseDisplayName = this.getUserDisplayName(userId, groupId, nickname)
        const normalizedUserId = this.normalizeId(userId)
        const groupPlatform = this.detectGroupPlatform(groupId || '')
        const platform = groupPlatform === 'qq'
            ? this.detectGroupPlatform(normalizedUserId)
            : groupPlatform

        if (platform !== 'discord' || !this.dataService?.getDiscordUserInfo) {
            return baseDisplayName || userId
        }

        const normalizedDiscordUserId = normalizedUserId.replace(/^dc_/i, '')
        if (!normalizedDiscordUserId) return baseDisplayName || userId

        const discordUserInfo = await this.dataService.getDiscordUserInfo(normalizedDiscordUserId).catch(() => null)
        const globalName = this.normalizeId(discordUserInfo?.globalName || '')
        if (globalName) return globalName

        const username = this.normalizeId(discordUserInfo?.username || '')
        if (username) return username

        return this.normalizeId(userId) || baseDisplayName || userId
    }

    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '未知'
        try {
            const date = new Date(dateString)
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch (err) {
            return dateString
        }
    }

    /**
     * 渲染图片排行榜模板
     */
    async renderImageRankingTemplate(data, groupId, groupName, title, userInfo = null, options = {}) {
        const template = this.loadTemplate('imageRankingTemplate.html')
        if (!template) return ''

        const { showExtraStats = false, globalTotalMessages = null } = options
        let totalCount = globalTotalMessages !== null ? globalTotalMessages : 
            data.reduce((sum, item) => sum + (item.count || 0), 0)
        
        // 如果有个人卡片用户且不在显示范围内，需要将用户的消息数也加入总计数（用于准确计算百分比）
        if (userInfo && userInfo.data) {
            const userCount = userInfo.data.count || 0
            // 检查用户是否已经在显示范围内（通过检查是否有相同的user_id）
            const userInRankings = data.some(item => String(item.user_id) === String(userInfo.data.user_id))
            // 如果用户不在显示范围内，将其消息数加入总计数
            if (!userInRankings) {
                totalCount = totalCount + userCount
            }
        }

        // 生成排行榜项目HTML
        const rankingItems = await this.generateRankingItems(data, totalCount, showExtraStats, groupId)

        // 生成用户卡片HTML（需要传递totalCount以计算百分比）
        const userCard = userInfo && userInfo.data ? 
            await this.generateUserCard(userInfo, totalCount, showExtraStats, groupId) : ''

        const generateTime = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/')
        const version = this.version

        // 生成头部HTML
        const headerHtml = `
			<div class="title">${title}</div>
			<div class="total-count">发言总数：<span>${CommonUtils.formatNumber(totalCount)}</span></div>
			<div class="group-info">${groupName} (${groupId})</div>
        `

        // 生成页脚HTML
        const footerHtml = `生成时间：${generateTime} | Speaker-statistics-plugin v${version}`

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{RANKING_ITEMS\}\}/g, rankingItems)
            .replace(/\{\{USER_CARD\}\}/g, userCard)
            .replace(/\{\{FOOTER\}\}/g, footerHtml)
    }

    /**
     * 生成排行榜项目HTML
     */
    async generateRankingItems(data, totalCount, showExtraStats, groupId = null) {
        const items = []

        for (let index = 0; index < data.length; index++) {
            const item = data[index]
            const count = item.count || 0
            const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0
            const rankDisplay = this.generateRankDisplay(index)
            const backgroundInfo = this.getRankingItemBackgroundStyle(item.user_id)
            const displayName = await this.getPreferredUserDisplayName(item.user_id, groupId, item.nickname)
            const avatarUrl = await this.getUserAvatarUrl(item.user_id, groupId)

            const itemHtml = `
        <div class="rank-item ${backgroundInfo.hasBackground ? 'has-background' : ''}" style="${backgroundInfo.style || ''}">
          <div class="rank-number">${rankDisplay}</div>
          <img class="avatar" src="${avatarUrl}" alt="avatar" onerror="this.style.display='none'">
          <div class="user-info">
            <div class="nickname">${displayName}</div>
            <div class="last-active">最后发言: ${this.formatDate(item.last_speaking_time)}</div>
            ${this.generateExtraStats(item, showExtraStats)}
          </div>
          <div class="stats">
            <div class="count">${count}</div>
            <div class="percentage">${percentage}%</div>
          </div>
        </div>
      `

            items.push(itemHtml)
        }

        return items.join('')
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
        const backgroundInfo = this.getRankingItemBackgroundStyle(userInfo.data.user_id)
        const displayName = await this.getPreferredUserDisplayName(userInfo.data.user_id, groupId, userInfo.data.nickname)
        const avatarUrl = await this.getUserAvatarUrl(userInfo.data.user_id, groupId)
        
        // 计算百分比（与主排行榜条目保持一致）
        const count = userInfo.data.count || 0
        const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0

        return `
      <div class="user-card">
        <div class="rank-item ${backgroundInfo.hasBackground ? 'has-background' : ''}" style="${backgroundInfo.style || ''}">
          <div class="rank-number">#${userInfo.rank}</div>
          <img class="avatar" src="${avatarUrl}" alt="avatar" onerror="this.style.display='none'">
          <div class="user-info">
            <div class="nickname">${displayName}</div>
            <div class="last-active">最后发言: ${this.formatDate(userInfo.data.last_speaking_time)}</div>
            ${this.generateExtraStats(userInfo.data, showExtraStats)}
          </div>
          <div class="stats">
            <div class="count">${count}</div>
            <div class="percentage">${percentage}%</div>
          </div>
        </div>
      </div>
    `
    }

    /**
     * 生成额外统计信息HTML
     */
    generateExtraStats(item, showExtraStats) {
        // 兼容 period_words（排行榜数据）和 total_number_of_words（用户统计数据）
        const wordCount = item.period_words !== undefined ? item.period_words : (item.total_number_of_words || 0)
        
        if (showExtraStats) {
            return `
        <div class="extra-stats">
          <span>连续: ${item.continuous_days || 0}天</span>
          <span style="margin-left: 10px;">平均: ${item.average_speech || 0}/天</span>
          <span style="margin-left: 10px;">累计消息字数: ${CommonUtils.formatNumber(wordCount)}</span>
        </div>
      `
        } else {
            return `<div class="extra-stats"><span>累计消息字数: ${CommonUtils.formatNumber(wordCount)}</span></div>`
        }
    }

    /**
     * 渲染用户统计模板
     */
    async renderUserStatsTemplate(userData, groupId, groupName, userId, nickname) {
        const template = this.loadTemplate('userStatsTemplate.html')
        if (!template) return ''

        const displayName = await this.getPreferredUserDisplayName(userId, groupId, nickname)
        const backgroundStyle = this.getUserStatsBackgroundStyle(userId)

        // 计算统计数据（确保所有值都是数字类型）
        const totalCount = parseInt(userData.total || userData.total_count || 0, 10)
        const totalWords = parseInt(userData.total_number_of_words || 0, 10)
        const activeDays = parseInt(userData.active_days || 0, 10)
        const continuousDays = parseInt(userData.continuous_days || 0, 10)
        const lastSpeakingTime = this.formatDate(userData.last_speaking_time)
        
        // 计算平均每日发言数
        const averageDaily = activeDays > 0 ? Math.round(totalCount / activeDays) : 0
        
        // 获取排名和占比信息
        const globalRank = userData.global_rank || null
        const messagePercentage = userData.message_percentage || '0.00'
        const todayCount = parseInt(userData.today_count || 0, 10)
        const todayWords = parseInt(userData.today_words || 0, 10)
        const monthCount = parseInt(userData.month_count || 0, 10)
        const monthWords = parseInt(userData.month_words || 0, 10)
        const groupCount = parseInt(userData.group_count || 0, 10)
        
        // 生成全局信息（群个数、总字数和总发言数）
        let globalInfo = `累计发言 ${CommonUtils.formatNumber(totalCount)} 条 · 累计字数 ${CommonUtils.formatNumber(totalWords)} 字`
        if (groupCount > 0) {
            globalInfo = `所在群数 ${groupCount} 个 · ${globalInfo}`
        }
        const avatarUrl = await this.getUserAvatarUrl(userId, groupId)
        
        // 生成用户信息区域HTML
        const userProfileHtml = `
					<div class="user-profile">
						<img class="avatar" src="${avatarUrl}" onerror="this.style.display='none'" />
						<div class="user-info">
							<div class="nickname">${displayName}</div>
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
        `

        const statCards = []
        
        // 今日数据（跨两列）
        statCards.push(`
					<div class="stat-card span-2">
						<div class="stat-label">今日发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(todayCount)}</div>
						${todayWords > 0 ? `<div class="stat-subvalue">${CommonUtils.formatNumber(todayWords)} 字</div>` : ''}
					</div>
        `)
        
        // 本月数据（跨两列）
        if (monthCount !== totalCount && monthCount > 0) {
            statCards.push(`
                    <div class="stat-card span-2">
						<div class="stat-label">本月发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(monthCount)}</div>
						${monthWords > 0 ? `<div class="stat-subvalue">${CommonUtils.formatNumber(monthWords)} 字</div>` : ''}
                    </div>
            `)
        }
        
        // 总数据
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">总发言数</div>
						<div class="stat-value">${CommonUtils.formatNumber(totalCount)}</div>
					</div>
        `)
        
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">总字数</div>
						<div class="stat-value">${CommonUtils.formatNumber(totalWords)}</div>
					</div>
        `)
        
        // 天数相关
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">连续发言天数</div>
						<div class="stat-value">${CommonUtils.formatNumber(continuousDays)}</div>
					</div>
        `)
        
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">总发言天数</div>
						<div class="stat-value">${CommonUtils.formatNumber(activeDays)}</div>
					</div>
        `)
        
        // 平均和占比
        if (messagePercentage !== '0.00' && messagePercentage !== '0' && parseFloat(messagePercentage) > 0) {
            statCards.push(`
					<div class="stat-card">
						<div class="stat-label">消息占比</div>
						<div class="stat-value">${messagePercentage}%</div>
					</div>
            `)
        }
        
        statCards.push(`
					<div class="stat-card">
						<div class="stat-label">平均每日发言</div>
						<div class="stat-value">${CommonUtils.formatNumber(averageDaily)}</div>
					</div>
        `)
        const statsGridHtml = statCards.join('\n\t\t\t\t\t')

        const timeInfo = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/')
        const version = this.version
        const title = '个人统计'

        return template
            .replace(/\{\{BACKGROUND_STYLE\}\}/g, backgroundStyle)
            .replace(/\{\{TITLE\}\}/g, title)
            .replace(/\{\{USER_PROFILE\}\}/g, userProfileHtml)
            .replace(/\{\{STATS_GRID\}\}/g, statsGridHtml)
            .replace(/\{\{GENERATE_TIME\}\}/g, timeInfo)
            .replace(/\{\{VERSION\}\}/g, version)
    }

    /**
     * 渲染群统计模板
     */
    async renderGroupStatsTemplate(groupStats, groupId, groupName, topUsers) {
        const template = this.loadTemplate('groupStatsTemplate.html')
        if (!template) return ''

        const timeInfo = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/')
        const version = this.version

        // 生成头部HTML
        const headerHtml = `
			<div class="title">群统计信息</div>
			<div class="group-id">${groupId}</div>
        `

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
        `

        // 生成前三用户HTML
        const topUsersHtml = await this.generateTopUsersHtml(topUsers, groupId)

        // 生成页脚HTML
        const footerHtml = `生成时间：${timeInfo} | Speaker-statistics-plugin v${version}`

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{STATS_GRID\}\}/g, statsGridHtml)
            .replace(/\{\{TOP_USERS\}\}/g, topUsersHtml)
            .replace(/\{\{FOOTER\}\}/g, footerHtml)
    }

    /**
     * 生成前三用户HTML
     */
    async generateTopUsersHtml(topUsers, groupId) {
        if (!topUsers || topUsers.length === 0) {
            return '<div style="text-align: center; color: #718096; padding: 20px;">暂无用户数据</div>'
        }

        const items = []
        for (let i = 0; i < Math.min(topUsers.length, 3); i++) {
            const user = topUsers[i]
            const rank = i + 1
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : 'rank-3'
            const displayName = await this.getPreferredUserDisplayName(user.user_id, groupId, user.nickname || '未知用户')
            const avatarUrl = await this.getUserAvatarUrl(user.user_id, groupId)
            const count = user.total_count || user.count || 0
            const words = user.total_words || 0
            const activeDays = user.active_days || 0
            const continuousDays = user.continuous_days || 0

            const userHtml = `
                <div class="user-card">
                    <div class="rank-badge ${rankClass}">${rank}</div>
                    <img class="user-avatar" src="${avatarUrl}" alt="avatar" onerror="this.style.display='none'">
                    <div class="user-name">${displayName}</div>
                    <div class="user-stats">
                        <div class="user-stat-item">
                            <div class="user-stat-label">消息数</div>
                            <div class="user-stat-value">${CommonUtils.formatNumber(count)}</div>
                        </div>
                        <div class="user-stat-item">
                            <div class="user-stat-label">总字数</div>
                            <div class="user-stat-value">${CommonUtils.formatNumber(words)}</div>
                        </div>
                        <div class="user-stat-item">
                            <div class="user-stat-label">活跃天数</div>
                            <div class="user-stat-value">${CommonUtils.formatNumber(activeDays)}</div>
                        </div>
                        <div class="user-stat-item">
                            <div class="user-stat-label">连续天数</div>
                            <div class="user-stat-value">${CommonUtils.formatNumber(continuousDays)}</div>
                        </div>
                    </div>
                </div>
            `

            items.push(userHtml)
        }

        // 如果不足3个用户，填充空位
        while (items.length < 3) {
            items.push('<div class="user-card"></div>')
        }

        return items.join('')
    }

    /**
     * 渲染帮助面板模板
     * @param {boolean} isMaster 是否为主人
     * @returns {string} 渲染后的HTML
     */
    renderHelpPanelTemplate(isMaster = false) {
        const template = this.loadTemplate('helpPanel.html')
        if (!template) return ''

        const generateTime = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/')
        const version = this.version

        return template
            .replace(/\{\{VERSION\}\}/g, version)
            .replace(/\{\{GENERATE_TIME\}\}/g, generateTime)
            .replace(/\{\{IS_MASTER\}\}/g, isMaster ? 'true' : 'false')
    }

    /**
     * 渲染全局统计模板
     * @param {Object} globalStats 全局统计数据
     * @returns {string} 渲染后的HTML
     */
    async renderGlobalStatsTemplate(globalStats) {
        const template = this.loadTemplate('globalStatsTemplate.html')
        if (!template) return ''

        const timestamp = TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/')
        const version = this.version

        // 生成头部HTML
        const headerHtml = `
			<div class="title">全局统计</div>
			<div class="subtitle">所有群聊的综合统计信息</div>
        `

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
        `

        // 生成群聊统计列表HTML（使用当前页的群列表，与 pageSize 一致，不截断）
        const groups = globalStats.groups || []
        const groupsHtml = await this.generateGroupsStatsHtml(groups)

        // 处理无群组情况
        const noGroupsHtml = globalStats.groups && globalStats.groups.length === 0 
            ? '<div class="no-groups" id="no-groups"><div class="text">暂无群聊统计数据</div></div>'
            : '<div class="no-groups" id="no-groups" style="display: none;"><div class="text">暂无群聊统计数据</div></div>'

        // 生成页脚HTML
        const footerHtml = `
			<div class="timestamp">生成时间：${timestamp}</div>
			<div class="pagination-info">第 ${globalStats.currentPage || 1} 页，共 ${globalStats.totalPages || 1} 页（显示 ${CommonUtils.formatNumber((globalStats.groups || []).length)} 个群聊）</div>
			<div class="version">Speaker-statistics-plugin v${version}</div>
        `

        return template
            .replace(/\{\{HEADER\}\}/g, headerHtml)
            .replace(/\{\{OVERVIEW_STATS\}\}/g, overviewCardsHtml)
            .replace(/\{\{GROUPS_LIST\}\}/g, groupsHtml || '')
            .replace(/\{\{NO_GROUPS\}\}/g, noGroupsHtml)
            .replace(/\{\{FOOTER\}\}/g, footerHtml)
    }

    /**
     * 生成群聊统计列表HTML
     * @param {Array} groups 群组统计数组
     * @returns {string} 群聊统计列表HTML
     */
    async generateGroupsStatsHtml(groups) {
        if (!groups || groups.length === 0) {
            return ''
        }

        const items = await Promise.all(groups.map(async (group, index) => {
            const baseName = String(group.groupName || '').trim() || this.getDefaultGroupName(group.groupId)
            const channelCount = parseInt(group.channelCount || 1, 10)
            const dcSuffix = group.platform === 'discord' && channelCount > 1 ? ` [DC/${channelCount}频道]` : ''
            const displayName = `${baseName}${dcSuffix}`
            // 隐藏群号中间部分
            const groupDisplayId = this.getGroupDisplayId(group)
            const maskedGroupId = CommonUtils.maskGroupId(groupDisplayId)
            // 生成群聊头像URL
            const avatarUrl = await this.getGroupAvatarUrl(group)
            // 计算序号（考虑分页）
            const rank = index + 1
            
            return `
                <div class="group-item">
                    <div class="group-rank">${rank}</div>
                    <img src="${avatarUrl}" alt="${displayName}" class="group-avatar" onerror="this.style.display='none'">
                    <div class="group-info">
                        <div class="group-name-row">
                            <div class="group-name">${displayName}</div>
                            <div class="group-id">${maskedGroupId}</div>
                        </div>
                    </div>
                    <div class="group-stats">
                        <div class="group-stat-item">
                            <div class="group-stat-label">用户数</div>
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.userCount || 0)}</div>
                        </div>
                        <div class="group-stat-item">
                            <div class="group-stat-label">消息数</div>
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.totalMessages || 0)}</div>
                        </div>
                        <div class="group-stat-item">
                            <div class="group-stat-label">今日活跃</div>
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.todayActive || 0)}</div>
                        </div>
                        <div class="group-stat-item">
                            <div class="group-stat-label">本月活跃</div>
                            <div class="group-stat-number">${CommonUtils.formatNumber(group.monthActive || 0)}</div>
                        </div>
                    </div>
                </div>
            `
        }))

        return items.join('\n\t\t\t\t')
    }

}

export { TemplateManager }
export default TemplateManager
