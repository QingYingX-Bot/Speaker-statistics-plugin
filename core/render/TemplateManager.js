import fs from 'fs'
import path from 'path'
import { PathResolver } from '../utils/PathResolver.js'
import { globalConfig } from '../ConfigManager.js'
import { CommonUtils } from '../utils/CommonUtils.js'
import { TimeUtils } from '../utils/TimeUtils.js'

/**
 * 模板管理器
 * 负责加载和渲染 HTML 模板
 */
class TemplateManager {
    constructor(dataService = null) {
        this.resourcesPath = PathResolver.getResourcesDir()
        this.templatesPath = PathResolver.getTemplatesDir()
        this.templateFolderMap = {
            'imageRankingTemplate.html': 'ranking',
            'userStatsTemplate.html': 'user-stats',
            'groupStatsTemplate.html': 'group-stats',
            'globalStatsTemplate.html': 'global-stats',
            'helpPanel.html': 'help-panel'
        }
        this.version = this.getVersion()
        this.templateCache = new Map()
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
     * 获取模板统一生成时间
     * @returns {string}
     */
    getGenerateTime() {
        return TimeUtils.formatDateTime(TimeUtils.getUTC8Date()).replace(/-/g, '/')
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
            let template = ''
            const folderName = this.templateFolderMap[templateName]
            if (folderName) {
                const templatePath = path.join(this.resourcesPath, folderName, 'index.html')
                const stylePath = path.join(this.resourcesPath, folderName, 'style.css')

                if (fs.existsSync(templatePath)) {
                    template = fs.readFileSync(templatePath, 'utf8')

                    if (fs.existsSync(stylePath)) {
                        const styleContent = fs.readFileSync(stylePath, 'utf8')
                        if (template.includes('{{INLINE_STYLE}}')) {
                            template = template.replace(/\{\{INLINE_STYLE\}\}/g, styleContent)
                        } else if (template.includes('</head>')) {
                            template = template.replace('</head>', `<style>\n${styleContent}\n</style>\n</head>`)
                        }
                    }
                }
            }

            // 兼容旧路径（resources/templates/*.html）
            if (!template) {
                const fallbackTemplatePath = path.join(this.templatesPath, templateName)
                if (!fs.existsSync(fallbackTemplatePath)) {
                    globalConfig.error(`模板文件不存在: ${templateName}`)
                    return ''
                }
                template = fs.readFileSync(fallbackTemplatePath, 'utf8')
            }

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
     * 以占位符方式批量替换模板变量
     * @param {string} template 模板内容
     * @param {Object} variables 变量映射
     * @returns {string}
     */
    replaceTemplateVars(template, variables = {}) {
        let result = template || ''
        for (const [key, value] of Object.entries(variables)) {
            const token = `{{${key}}}`
            result = result.split(token).join(String(value ?? ''))
        }
        return result
    }

    /**
     * 获取用户统计卡片样式
     */
    getUserStatsCardStyle() {
        return 'background: linear-gradient(45deg, #2c3e50, #3498db);'
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

        return this.replaceTemplateVars(template, {
            TITLE: title,
            TOTAL_COUNT: CommonUtils.formatNumber(totalCount),
            GROUP_NAME: groupName,
            GROUP_ID: groupId,
            RANKING_ITEMS: rankingItems,
            USER_CARD: userCard,
            GENERATE_TIME: this.getGenerateTime(),
            VERSION: this.version
        })
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
            const displayName = await this.getPreferredUserDisplayName(item.user_id, groupId, item.nickname)
            const avatarUrl = await this.getUserAvatarUrl(item.user_id, groupId)

            const itemHtml = `
        <div class="rank-item">
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
        const displayName = await this.getPreferredUserDisplayName(userInfo.data.user_id, groupId, userInfo.data.nickname)
        const avatarUrl = await this.getUserAvatarUrl(userInfo.data.user_id, groupId)
        
        // 计算百分比（与主排行榜条目保持一致）
        const count = userInfo.data.count || 0
        const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0

        return `
      <div class="user-card">
        <div class="rank-item">
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
        const backgroundStyle = this.getUserStatsCardStyle()

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

        return this.replaceTemplateVars(template, {
            BACKGROUND_STYLE: backgroundStyle,
            TITLE: '个人统计',
            AVATAR_URL: avatarUrl,
            DISPLAY_NAME: displayName,
            LAST_SPEAKING_TIME: lastSpeakingTime,
            GLOBAL_INFO: globalInfo,
            STATS_GRID: statsGridHtml,
            GENERATE_TIME: this.getGenerateTime(),
            VERSION: this.version
        })
    }

    /**
     * 渲染群统计模板
     */
    async renderGroupStatsTemplate(groupStats, groupId, groupName, topUsers) {
        const template = this.loadTemplate('groupStatsTemplate.html')
        if (!template) return ''

        // 生成前三用户HTML
        const topUsersHtml = await this.generateTopUsersHtml(topUsers, groupId)

        return this.replaceTemplateVars(template, {
            GROUP_ID: groupId,
            USER_COUNT: CommonUtils.formatNumber(groupStats.userCount || 0),
            TOTAL_MESSAGES: CommonUtils.formatNumber(groupStats.totalMessages || 0),
            TODAY_ACTIVE: CommonUtils.formatNumber(groupStats.todayActive || 0),
            MONTH_ACTIVE: CommonUtils.formatNumber(groupStats.monthActive || 0),
            TOP_USERS: topUsersHtml,
            GENERATE_TIME: this.getGenerateTime(),
            VERSION: this.version
        })
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

        const generateTime = this.getGenerateTime()
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

        // 生成群聊统计列表HTML（使用当前页的群列表，与 pageSize 一致，不截断）
        const groups = globalStats.groups || []
        const groupsHtml = await this.generateGroupsStatsHtml(groups)

        return this.replaceTemplateVars(template, {
            TOTAL_GROUPS: CommonUtils.formatNumber(globalStats.totalGroups || 0),
            TOTAL_USERS: CommonUtils.formatNumber(globalStats.totalUsers || 0),
            TOTAL_MESSAGES: CommonUtils.formatNumber(globalStats.totalMessages || 0),
            TODAY_ACTIVE: CommonUtils.formatNumber(globalStats.todayActive || 0),
            MONTH_ACTIVE: CommonUtils.formatNumber(globalStats.monthActive || 0),
            STATS_DURATION_HOURS: CommonUtils.formatNumber(globalStats.statsDurationHours || 0),
            GROUPS_LIST: groupsHtml || '',
            NO_GROUPS_STYLE: globalStats.groups && globalStats.groups.length === 0 ? '' : 'display: none;',
            GENERATE_TIME: this.getGenerateTime(),
            CURRENT_PAGE: globalStats.currentPage || 1,
            TOTAL_PAGES: globalStats.totalPages || 1,
            DISPLAY_GROUPS_COUNT: CommonUtils.formatNumber((globalStats.groups || []).length),
            VERSION: this.version
        })
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
