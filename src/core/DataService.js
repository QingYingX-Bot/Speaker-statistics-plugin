import { getDatabaseService } from './database/DatabaseService.js'
import { globalConfig } from './ConfigManager.js'
import { TimeUtils } from './utils/TimeUtils.js'
import { CommonUtils } from './utils/CommonUtils.js'
import { PathResolver } from './utils/PathResolver.js'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { getFrameworkProxyUrl } from './utils/ProxyUtils.js'

/**
 * LRU 缓存类
 */
class LRUCache {
    constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
        this.maxSize = maxSize
        this.ttl = ttl
        this.cache = new Map()
        this.accessTimes = new Map()
    }

    set(key, value) {
        const now = Date.now()

        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest()
        }

        this.cache.set(key, {
            value,
            timestamp: now
        })
        this.accessTimes.set(key, now)
    }

    get(key) {
        const now = Date.now()
        const item = this.cache.get(key)

        if (!item) return null

        // 检查是否过期
        if (now - item.timestamp > this.ttl) {
            this.cache.delete(key)
            this.accessTimes.delete(key)
            return null
        }

        // 更新访问时间
        this.accessTimes.set(key, now)
        return item.value
    }

    has(key) {
        return this.get(key) !== null
    }

    delete(key) {
        this.cache.delete(key)
        this.accessTimes.delete(key)
    }

    evictOldest() {
        let oldestKey = null
        let oldestTime = Infinity

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
            this.accessTimes.delete(oldestKey)
        }
    }

    clear() {
        this.cache.clear()
        this.accessTimes.clear()
    }

    size() {
        return this.cache.size
    }
}

/**
 * 数据服务类
 * 使用 DatabaseService 进行数据操作，提供统一的数据访问接口
 */
class DataService {
    constructor() {
        this.dbService = getDatabaseService()
        this.cache = new LRUCache(500, 10 * 60 * 1000) // 500个条目，10分钟TTL
        this.groupStatsCache = new LRUCache(200, 30 * 1000) // 群统计缓存，30秒TTL
        this.rankingCache = new LRUCache(50, 2 * 60 * 1000) // 排行榜缓存，2分钟TTL
        this.globalStatsCache = new LRUCache(10, 3 * 60 * 1000) // 全局统计缓存，3分钟TTL
        this.discordUserInfoCache = new LRUCache(1000, 30 * 60 * 1000) // Discord用户信息缓存，30分钟TTL
        this.discordGuildInfoCache = new LRUCache(500, 30 * 60 * 1000) // Discord服务器信息缓存，30分钟TTL
        this.discordChannelInfoCache = new LRUCache(500, 30 * 60 * 1000) // Discord频道信息缓存，30分钟TTL
        this.messageRecorder = null // 消息记录器引用（由外部设置）
        // 当前群列表缓存（Web 等拿不到 Bot.gl 时使用，与 #群列表 一致）
        this.currentGroupIdsCache = { set: null, updatedAt: 0 }
        this.currentGroupIdsCacheTTL = 10 * 60 * 1000 // 10 分钟
        this.discordTokenCache = { value: '', loadedAt: 0 } // Discord token 缓存，避免频繁读文件
        this.httpProxyAgentCache = new Map() // 代理 agent 缓存（按 proxy URL）
        this.discordPersistentCacheTTL = 24 * 60 * 60 * 1000 // 持久化缓存TTL：24小时
        this.discordPersistentCacheLimits = {
            users: 5000,
            guilds: 1500,
            channels: 3000
        }
        this.discordPersistentCachePath = path.join(
            PathResolver.getDataDir(),
            'cache',
            'discord_profile_cache.json'
        )
        this.discordPersistentCache = {
            users: {},
            guilds: {},
            channels: {}
        }
        this.discordPersistentCacheSaveTimer = null
        this.loadDiscordPersistentCache()
        
        // 确保数据库已初始化
        this.initialize()
    }

    /**
     * 设置消息记录器引用（用于获取最新消息文本）
     * @param {MessageRecorder} messageRecorder 消息记录器实例
     */
    setMessageRecorder(messageRecorder) {
        this.messageRecorder = messageRecorder
    }

    /**
     * 初始化数据库
     */
    async initialize() {
        try {
            await this.dbService.initialize()
        } catch (err) {
            this.error('数据库初始化失败:', err)
            throw err
        }
    }

    /**
     * 记录调试日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    debug(message, ...args) {
        globalConfig.debug(`[数据服务] ${message}`, ...args)
    }

    /**
     * 记录错误日志
     * @param {string} message 日志消息
     * @param {any[]} args 额外参数
     */
    error(message, ...args) {
        globalConfig.error(`[数据服务] ${message}`, ...args)
    }

    /**
     * 规范化群 ID
     * @param {any} groupId 群 ID
     * @returns {string}
     */
    normalizeGroupId(groupId) {
        if (groupId === null || groupId === undefined) return ''
        return String(groupId).trim()
    }

    /**
     * 规范化群名称
     * @param {any} name 群名称
     * @returns {string}
     */
    normalizeGroupName(name) {
        if (name === null || name === undefined) return ''
        return String(name).trim()
    }

    /**
     * 规范化 Discord 实体 ID（移除 dc_ 前缀）
     * @param {any} id 原始ID
     * @returns {string}
     */
    normalizeDiscordId(id) {
        const normalizedId = this.normalizeGroupId(id)
        return normalizedId.replace(/^dc_/i, '')
    }

    /**
     * 根据群 ID 判断平台
     * @param {string} groupId 群 ID
     * @returns {'qq'|'discord'|'telegram'}
     */
    detectGroupPlatform(groupId = '') {
        const normalizedId = this.normalizeGroupId(groupId).toLowerCase()
        if (normalizedId.startsWith('dc_')) return 'discord'
        if (normalizedId.startsWith('tg_')) return 'telegram'
        return 'qq'
    }

    /**
     * 获取默认群显示名称
     * @param {string} groupId 群 ID
     * @returns {string}
     */
    getDefaultGroupDisplayName(groupId) {
        const normalizedId = this.normalizeGroupId(groupId)
        if (!normalizedId) return '未知群组'

        if (normalizedId.startsWith('dc_')) {
            const channelId = normalizedId.slice(3) || normalizedId
            return `Discord频道${channelId}`
        }

        if (normalizedId.startsWith('tg_')) {
            const chatId = normalizedId.slice(3) || normalizedId
            return `Telegram群组${chatId}`
        }

        return `群${normalizedId}`
    }

    /**
     * 构建群 ID 候选（兼容 number/string 与 dc_/tg_ 前缀）
     * @param {any} groupId 群 ID
     * @returns {any[]}
     */
    buildGroupIdCandidates(groupId) {
        const normalizedId = this.normalizeGroupId(groupId)
        if (!normalizedId || normalizedId === 'stdin') return []

        const candidates = [groupId, normalizedId]

        if (/^\d+$/.test(normalizedId)) {
            const numericId = Number(normalizedId)
            if (Number.isSafeInteger(numericId)) {
                candidates.push(numericId)
            }
            candidates.push(`dc_${normalizedId}`)
            candidates.push(`tg_${normalizedId}`)
        }

        if (/^(dc|tg)_\d+$/.test(normalizedId)) {
            const rawId = normalizedId.slice(3)
            candidates.push(rawId)
            const numericId = Number(rawId)
            if (Number.isSafeInteger(numericId)) {
                candidates.push(numericId)
            }
        }

        return [...new Set(candidates)]
    }

    /**
     * 从 Bot.gl 群对象中提取可展示群名称
     * @param {Object|null} runtimeGroup 运行时群对象
     * @returns {string}
     */
    extractRuntimeGroupName(runtimeGroup) {
        if (!runtimeGroup || typeof runtimeGroup !== 'object') return ''

        const directName = [
            runtimeGroup.group_name,
            runtimeGroup.groupName,
            runtimeGroup.name,
            runtimeGroup.title,
            runtimeGroup.group_title
        ].map(name => this.normalizeGroupName(name)).find(Boolean)
        if (directName) return directName

        const guildName = this.normalizeGroupName(
            runtimeGroup.guild?.name || runtimeGroup.guild_name || runtimeGroup.guildName
        )
        const channelName = this.normalizeGroupName(
            runtimeGroup.channel?.name || runtimeGroup.channel_name || runtimeGroup.channelName
        )

        if (guildName && channelName) {
            return guildName === channelName ? guildName : `${guildName}-${channelName}`
        }

        return guildName
            || channelName
            || this.normalizeGroupName(runtimeGroup.channel_name || runtimeGroup.channelName || runtimeGroup.chat_name || runtimeGroup.chatName)
            || ''
    }

    /**
     * 在 Bot.gl 中解析群对象
     * @param {any} groupId 群 ID
     * @returns {{groupId: string, group: Object}|null}
     */
    resolveRuntimeGroup(groupId) {
        if (typeof Bot === 'undefined' || !Bot.gl || Bot.gl.size === 0) {
            return null
        }

        const candidates = this.buildGroupIdCandidates(groupId)
        for (const candidate of candidates) {
            const group = Bot.gl.get(candidate)
            if (group) {
                return {
                    groupId: this.normalizeGroupId(candidate),
                    group
                }
            }
        }

        return null
    }

    /**
     * 获取运行时群信息（含平台/群名）
     * @param {any} groupId 群 ID
     * @returns {{groupId: string, groupName: string, platform: string, group: Object|null}}
     */
    getRuntimeGroupInfo(groupId) {
        const normalizedId = this.normalizeGroupId(groupId)
        if (!normalizedId) {
            return {
                groupId: '',
                groupName: '',
                platform: 'qq',
                group: null
            }
        }

        const resolved = this.resolveRuntimeGroup(normalizedId)
        const resolvedId = this.normalizeGroupId(resolved?.groupId || normalizedId)
        const runtimeGroup = resolved?.group || null

        return {
            groupId: resolvedId,
            groupName: this.extractRuntimeGroupName(runtimeGroup),
            platform: this.detectGroupPlatform(resolvedId),
            group: runtimeGroup
        }
    }

    /**
     * 获取当前 Bot.gl 中的群列表（已过滤 stdin）
     * @returns {Array<{groupId: string, groupName: string, platform: string, group: Object}>}
     */
    getRuntimeGroupEntries() {
        if (typeof Bot === 'undefined' || !Bot.gl || Bot.gl.size === 0) {
            return []
        }

        const entries = []
        const seen = new Set()

        for (const [rawId, group] of Bot.gl) {
            const groupId = this.normalizeGroupId(rawId)
            if (!groupId || groupId === 'stdin' || seen.has(groupId)) {
                continue
            }
            seen.add(groupId)
            entries.push({
                groupId,
                groupName: this.extractRuntimeGroupName(group),
                platform: this.detectGroupPlatform(groupId),
                group
            })
        }

        return entries
    }

    /**
     * 从事件中提取群名称（兼容 QQ/Discord/Telegram）
     * @param {Object} e 消息事件
     * @param {string} groupId 群 ID
     * @returns {string}
     */
    extractGroupNameFromEvent(e, groupId = '') {
        if (!e || typeof e !== 'object') return ''

        const directName = [
            e.group_name,
            e.groupName,
            e.group?.name,
            e.group?.group_name,
            e.group?.groupName,
            e.group?.title,
            e.group?.group_title,
            e.chat?.title,
            e.chat?.name
        ].map(name => this.normalizeGroupName(name)).find(Boolean)
        if (directName) return directName

        const guildName = this.normalizeGroupName(e.guild?.name || e.guild_name || e.guildName)
        const channelName = this.normalizeGroupName(e.channel?.name || e.channel_name || e.channelName)
        if (guildName && channelName) {
            return guildName === channelName ? guildName : `${guildName}-${channelName}`
        }

        if (channelName) return channelName
        if (guildName) return guildName

        const fallbackGroupId = groupId || this.normalizeGroupId(
            e.group_id || e.group?.id || e.chat_id || e.chat?.id || e.channel_id || e.channel?.id
        )
        if (!fallbackGroupId) return ''

        const runtimeInfo = this.getRuntimeGroupInfo(fallbackGroupId)
        return runtimeInfo.groupName || ''
    }

    /**
     * 获取优先群名称：DB -> 事件 -> Bot.gl -> 平台默认名
     * @param {string} groupId 群 ID
     * @param {Object|null} e 事件对象
     * @returns {Promise<string>}
     */
    async getPreferredGroupName(groupId, e = null) {
        const normalizedId = this.normalizeGroupId(groupId)
        if (!normalizedId) {
            return this.getDefaultGroupDisplayName(groupId)
        }

        try {
            const groupInfo = await this.dbService.getGroupInfo(normalizedId)
            const dbGroupName = this.normalizeGroupName(groupInfo?.group_name)
            if (dbGroupName) {
                return dbGroupName
            }
        } catch (err) {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[数据服务] 获取群信息失败: group_id=${normalizedId}`, err?.message || err)
            }
        }

        const eventGroupName = this.extractGroupNameFromEvent(e, normalizedId)
        if (eventGroupName) {
            this.dbService.saveGroupInfo(normalizedId, eventGroupName).catch(() => {})
            return eventGroupName
        }

        const runtimeInfo = this.getRuntimeGroupInfo(normalizedId)
        if (runtimeInfo.groupName) {
            this.dbService.saveGroupInfo(normalizedId, runtimeInfo.groupName).catch(() => {})
            return runtimeInfo.groupName
        }

        return this.getDefaultGroupDisplayName(normalizedId)
    }

    /**
     * 提取 Discord 服务器名（参考 RobotManagement-plugin）
     * 规则：
     * 1. 若存在 " - " 分隔，取最后一个分隔前的内容
     * 2. 否则取最后一个 "-" 前的前缀
     * @param {string} groupName 群名称
     * @param {string} groupId 群 ID
     * @returns {string}
     */
    extractDcServerName(groupName = '', groupId = '') {
        const normalizedName = this.normalizeGroupName(groupName)
        if (!normalizedName) {
            return this.getDefaultGroupDisplayName(groupId)
        }

        const splitBySpaced = normalizedName.lastIndexOf(' - ')
        if (splitBySpaced > 0) {
            return normalizedName.slice(0, splitBySpaced).trim()
        }

        const splitByDash = normalizedName.lastIndexOf('-')
        return splitByDash > 0 ? normalizedName.slice(0, splitByDash).trim() : normalizedName
    }

    /**
     * 合并 Discord 多频道统计为服务器维度（参考 RobotManagement-plugin）
     * @param {Array<Object>} groupStatsList 群统计数组
     * @returns {Array<Object>} 合并后的统计数组
     */
    mergeDiscordGroupStats(groupStatsList = []) {
        if (!Array.isArray(groupStatsList) || groupStatsList.length === 0) {
            return []
        }

        const normalGroups = []
        const dcServerMap = new Map()

        for (const item of groupStatsList) {
            const groupId = this.normalizeGroupId(item?.groupId)
            if (!groupId) continue

            const platform = this.detectGroupPlatform(groupId)
            const normalizedGroupName = this.normalizeGroupName(item?.groupName) || this.getDefaultGroupDisplayName(groupId)
            const normalizedDcGuildId = this.normalizeGroupId(item?.dcGuildId)
            const normalizedDcServerName = this.normalizeGroupName(item?.dcServerName)
            const normalizedDcGuildIconUrl = this.normalizeGroupName(item?.dcGuildIconUrl)
            const baseData = {
                groupId,
                groupName: normalizedGroupName,
                platform,
                userCount: parseInt(item?.userCount || 0, 10),
                totalMessages: parseInt(item?.totalMessages || 0, 10),
                totalWords: parseInt(item?.totalWords || 0, 10),
                todayActive: parseInt(item?.todayActive || 0, 10),
                monthActive: parseInt(item?.monthActive || 0, 10),
                channelIds: [groupId],
                channelCount: 1,
                isDcMerged: false,
                dcGuildId: normalizedDcGuildId,
                dcServerName: normalizedDcServerName,
                dcGuildIconUrl: normalizedDcGuildIconUrl,
                _userIds: new Set((Array.isArray(item?._userIds) ? item._userIds : []).map(id => String(id))),
                _todayActiveUserIds: new Set((Array.isArray(item?._todayActiveUserIds) ? item._todayActiveUserIds : []).map(id => String(id))),
                _monthActiveUserIds: new Set((Array.isArray(item?._monthActiveUserIds) ? item._monthActiveUserIds : []).map(id => String(id)))
            }

            if (platform !== 'discord') {
                normalGroups.push(baseData)
                continue
            }

            const mergeKey = normalizedDcGuildId || normalizedDcServerName || this.extractDcServerName(normalizedGroupName, groupId)
            const displayServerName = normalizedDcServerName || this.extractDcServerName(normalizedGroupName, groupId)
            const existing = dcServerMap.get(mergeKey)

            if (!existing) {
                dcServerMap.set(mergeKey, {
                    ...baseData,
                    groupName: displayServerName,
                    isDcMerged: true
                })
                continue
            }

            existing.channelIds.push(groupId)
            existing.channelCount = existing.channelIds.length
            existing.totalMessages += baseData.totalMessages
            existing.totalWords += baseData.totalWords
            if (!existing.dcGuildIconUrl && baseData.dcGuildIconUrl) {
                existing.dcGuildIconUrl = baseData.dcGuildIconUrl
            }

            // 用户数/活跃数在频道间可能重叠，按 user_id 去重后再统计
            baseData._userIds.forEach(id => existing._userIds.add(id))
            baseData._todayActiveUserIds.forEach(id => existing._todayActiveUserIds.add(id))
            baseData._monthActiveUserIds.forEach(id => existing._monthActiveUserIds.add(id))
        }

        const mergedDcGroups = Array.from(dcServerMap.values()).map(group => ({
            groupId: group.groupId,
            groupName: group.groupName,
            platform: 'discord',
            userCount: group._userIds.size > 0 ? group._userIds.size : group.userCount,
            totalMessages: group.totalMessages,
            totalWords: group.totalWords,
            todayActive: group._todayActiveUserIds.size > 0 ? group._todayActiveUserIds.size : group.todayActive,
            monthActive: group._monthActiveUserIds.size > 0 ? group._monthActiveUserIds.size : group.monthActive,
            channelIds: group.channelIds,
            channelCount: group.channelCount,
            dcGuildId: group.dcGuildId || '',
            dcServerName: group.groupName,
            dcGuildIconUrl: group.dcGuildIconUrl || '',
            isDcMerged: true
        }))

        return normalGroups
            .map(group => ({
                groupId: group.groupId,
                groupName: group.groupName,
                platform: group.platform,
                userCount: group._userIds.size > 0 ? group._userIds.size : group.userCount,
                totalMessages: group.totalMessages,
                totalWords: group.totalWords,
                todayActive: group._todayActiveUserIds.size > 0 ? group._todayActiveUserIds.size : group.todayActive,
                monthActive: group._monthActiveUserIds.size > 0 ? group._monthActiveUserIds.size : group.monthActive,
                channelIds: group.channelIds,
                channelCount: group.channelCount,
                dcGuildId: group.dcGuildId || '',
                dcServerName: group.dcServerName || '',
                dcGuildIconUrl: group.dcGuildIconUrl || '',
                isDcMerged: false
            }))
            .concat(mergedDcGroups)
    }

    /**
     * 解析 Discord 头像链接
     * @param {Object|null} user Discord 用户对象
     * @returns {string}
     */
    parseDiscordAvatarUrl(user) {
        if (!user?.id) return ''
        const avatar = this.normalizeGroupName(user.avatar)
        if (avatar) {
            const ext = avatar.startsWith('a_') ? 'gif' : 'png'
            return `https://cdn.discordapp.com/avatars/${user.id}/${avatar}.${ext}?size=256`
        }

        const discriminator = Number(user.discriminator)
        const index = Number.isFinite(discriminator) ? (discriminator % 5) : 0
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`
    }

    /**
     * 解析 Discord 服务器头像链接
     * @param {string} guildId Discord 服务器 ID
     * @param {any} guildIcon icon 字段
     * @returns {string}
     */
    parseDiscordGuildIconUrl(guildId, guildIcon) {
        const normalizedGuildId = this.normalizeGroupId(guildId)
        if (!normalizedGuildId) return ''

        const iconText = this.normalizeGroupName(guildIcon)
        if (!iconText) {
            return ''
        }

        if (/^https?:\/\//i.test(iconText)) {
            return iconText
        }

        const ext = iconText.startsWith('a_') ? 'gif' : 'png'
        return `https://cdn.discordapp.com/icons/${normalizedGuildId}/${iconText}.${ext}?size=256`
    }

    /**
     * 构建空的 Discord 持久化缓存结构
     * @returns {{users:Object,guilds:Object,channels:Object}}
     */
    createEmptyDiscordPersistentCache() {
        return {
            users: {},
            guilds: {},
            channels: {}
        }
    }

    /**
     * 规范化持久化缓存 bucket
     * @param {any} bucket bucket
     * @returns {Object}
     */
    normalizePersistentBucket(bucket) {
        if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return {}
        return bucket
    }

    /**
     * 对持久化缓存进行 TTL + 数量裁剪
     */
    pruneDiscordPersistentCache() {
        const now = Date.now()
        const ttl = this.discordPersistentCacheTTL

        const trimBucket = (bucket, maxSize) => {
            const entries = Object.entries(this.normalizePersistentBucket(bucket))
                .filter(([key, value]) => {
                    if (!key || !value || typeof value !== 'object') return false
                    const updatedAt = Number(value.updatedAt || 0)
                    if (!Number.isFinite(updatedAt) || updatedAt <= 0) return false
                    if (now - updatedAt > ttl) return false
                    return true
                })
                .sort((a, b) => Number(b[1].updatedAt || 0) - Number(a[1].updatedAt || 0))

            return Object.fromEntries(entries.slice(0, maxSize))
        }

        this.discordPersistentCache.users = trimBucket(
            this.discordPersistentCache.users,
            this.discordPersistentCacheLimits.users
        )
        this.discordPersistentCache.users = Object.fromEntries(
            Object.entries(this.discordPersistentCache.users).map(([cacheKey, value]) => {
                const userId = this.normalizeGroupId(value?.id || cacheKey)
                if (!userId) return [cacheKey, null]

                return [userId, {
                    id: userId,
                    username: this.normalizeGroupName(value?.username || value?.user_name),
                    // 仅兼容读取旧缓存字段，不作为当前写入字段
                    globalName: this.normalizeGroupName(value?.globalName || value?.global_name || value?.displayName),
                    avatarUrl: this.normalizeGroupName(value?.avatarUrl),
                    updatedAt: Number(value?.updatedAt || now)
                }]
            }).filter(([, value]) => value)
        )
        this.discordPersistentCache.guilds = trimBucket(
            this.discordPersistentCache.guilds,
            this.discordPersistentCacheLimits.guilds
        )
        this.discordPersistentCache.channels = trimBucket(
            this.discordPersistentCache.channels,
            this.discordPersistentCacheLimits.channels
        )
    }

    /**
     * 加载 Discord 持久化缓存
     */
    loadDiscordPersistentCache() {
        try {
            if (!fs.existsSync(this.discordPersistentCachePath)) {
                this.discordPersistentCache = this.createEmptyDiscordPersistentCache()
                return
            }

            const raw = fs.readFileSync(this.discordPersistentCachePath, 'utf8').trim()
            if (!raw) {
                this.discordPersistentCache = this.createEmptyDiscordPersistentCache()
                return
            }

            const parsed = JSON.parse(raw)
            this.discordPersistentCache = {
                users: this.normalizePersistentBucket(parsed?.users),
                guilds: this.normalizePersistentBucket(parsed?.guilds),
                channels: this.normalizePersistentBucket(parsed?.channels)
            }
            this.pruneDiscordPersistentCache()
        } catch (err) {
            this.discordPersistentCache = this.createEmptyDiscordPersistentCache()
        }
    }

    /**
     * 保存 Discord 持久化缓存到磁盘
     */
    saveDiscordPersistentCache() {
        try {
            this.pruneDiscordPersistentCache()
            PathResolver.ensureDirectory(path.dirname(this.discordPersistentCachePath))
            fs.writeFileSync(
                this.discordPersistentCachePath,
                JSON.stringify({
                    savedAt: new Date().toISOString(),
                    users: this.discordPersistentCache.users,
                    guilds: this.discordPersistentCache.guilds,
                    channels: this.discordPersistentCache.channels
                }, null, 2),
                'utf8'
            )
        } catch (err) {
            // ignore non-critical cache persistence errors
        }
    }

    /**
     * 延迟保存 Discord 持久化缓存，合并高频写入
     * @param {number} delayMs 延迟毫秒
     */
    scheduleSaveDiscordPersistentCache(delayMs = 1500) {
        if (this.discordPersistentCacheSaveTimer) {
            clearTimeout(this.discordPersistentCacheSaveTimer)
        }

        this.discordPersistentCacheSaveTimer = setTimeout(() => {
            this.discordPersistentCacheSaveTimer = null
            this.saveDiscordPersistentCache()
        }, Math.max(100, Number(delayMs) || 1500))

        if (typeof this.discordPersistentCacheSaveTimer?.unref === 'function') {
            this.discordPersistentCacheSaveTimer.unref()
        }
    }

    /**
     * 获取持久化的 Discord 用户信息
     * @param {string} userId 用户ID
     * @returns {{id:string,username:string,globalName:string,avatarUrl:string}|null}
     */
    getPersistentDiscordUserInfo(userId) {
        const normalizedUserId = this.normalizeGroupId(userId)
        if (!normalizedUserId) return null

        const item = this.discordPersistentCache.users[normalizedUserId]
        if (!item || typeof item !== 'object') return null

        const updatedAt = Number(item.updatedAt || 0)
        if (!Number.isFinite(updatedAt) || (Date.now() - updatedAt) > this.discordPersistentCacheTTL) {
            delete this.discordPersistentCache.users[normalizedUserId]
            this.scheduleSaveDiscordPersistentCache(800)
            return null
        }

        const avatarUrl = this.normalizeGroupName(item.avatarUrl)
        const username = this.normalizeGroupName(item.username)
        // 仅兼容历史缓存中的 global_name / displayName 字段
        const globalName = this.normalizeGroupName(item.globalName || item.global_name || item.displayName)
        if (!avatarUrl && !username && !globalName) return null

        return {
            id: normalizedUserId,
            username: username || normalizedUserId,
            globalName: globalName || '',
            avatarUrl: avatarUrl || `https://cdn.discordapp.com/embed/avatars/0.png`
        }
    }

    /**
     * 保存持久化 Discord 用户信息
     * @param {{id:string,username:string,globalName:string,avatarUrl:string}|null} userInfo 用户信息
     */
    setPersistentDiscordUserInfo(userInfo) {
        const userId = this.normalizeGroupId(userInfo?.id)
        if (!userId) return

        const username = this.normalizeGroupName(userInfo?.username || userInfo?.user_name)
        const globalName = this.normalizeGroupName(userInfo?.globalName || userInfo?.global_name)
        this.discordPersistentCache.users[userId] = {
            id: userId,
            username,
            globalName,
            avatarUrl: this.normalizeGroupName(userInfo?.avatarUrl),
            updatedAt: Date.now()
        }
        this.scheduleSaveDiscordPersistentCache()
    }

    /**
     * 获取持久化 Discord 服务器信息
     * @param {string} guildId 服务器ID
     * @returns {{guildId:string,guildName:string,guildIconUrl:string}|null}
     */
    getPersistentDiscordGuildInfo(guildId) {
        const normalizedGuildId = this.normalizeGroupId(guildId)
        if (!normalizedGuildId) return null

        const item = this.discordPersistentCache.guilds[normalizedGuildId]
        if (!item || typeof item !== 'object') return null

        const updatedAt = Number(item.updatedAt || 0)
        if (!Number.isFinite(updatedAt) || (Date.now() - updatedAt) > this.discordPersistentCacheTTL) {
            delete this.discordPersistentCache.guilds[normalizedGuildId]
            this.scheduleSaveDiscordPersistentCache(800)
            return null
        }

        return {
            guildId: normalizedGuildId,
            guildName: this.normalizeGroupName(item.guildName) || normalizedGuildId,
            guildIconUrl: this.normalizeGroupName(item.guildIconUrl)
        }
    }

    /**
     * 保存持久化 Discord 服务器信息
     * @param {{guildId:string,guildName:string,guildIconUrl:string}|null} guildInfo 服务器信息
     */
    setPersistentDiscordGuildInfo(guildInfo) {
        const guildId = this.normalizeGroupId(guildInfo?.guildId)
        if (!guildId) return

        this.discordPersistentCache.guilds[guildId] = {
            guildId,
            guildName: this.normalizeGroupName(guildInfo?.guildName),
            guildIconUrl: this.normalizeGroupName(guildInfo?.guildIconUrl),
            updatedAt: Date.now()
        }
        this.scheduleSaveDiscordPersistentCache()
    }

    /**
     * 获取持久化 Discord 频道反查信息
     * @param {string} channelId 频道ID
     * @returns {{channelId:string,guildId:string,guildName:string,guildIconUrl:string}|null}
     */
    getPersistentDiscordChannelInfo(channelId) {
        const normalizedChannelId = this.normalizeGroupId(channelId)
        if (!normalizedChannelId) return null

        const item = this.discordPersistentCache.channels[normalizedChannelId]
        if (!item || typeof item !== 'object') return null

        const updatedAt = Number(item.updatedAt || 0)
        if (!Number.isFinite(updatedAt) || (Date.now() - updatedAt) > this.discordPersistentCacheTTL) {
            delete this.discordPersistentCache.channels[normalizedChannelId]
            this.scheduleSaveDiscordPersistentCache(800)
            return null
        }

        const guildId = this.normalizeGroupId(item.guildId)
        if (!guildId) return null

        return {
            channelId: normalizedChannelId,
            guildId,
            guildName: this.normalizeGroupName(item.guildName),
            guildIconUrl: this.normalizeGroupName(item.guildIconUrl)
        }
    }

    /**
     * 保存持久化 Discord 频道反查信息
     * @param {{channelId:string,guildId:string,guildName:string,guildIconUrl:string}|null} channelInfo 频道信息
     */
    setPersistentDiscordChannelInfo(channelInfo) {
        const channelId = this.normalizeGroupId(channelInfo?.channelId)
        const guildId = this.normalizeGroupId(channelInfo?.guildId)
        if (!channelId || !guildId) return

        this.discordPersistentCache.channels[channelId] = {
            channelId,
            guildId,
            guildName: this.normalizeGroupName(channelInfo?.guildName),
            guildIconUrl: this.normalizeGroupName(channelInfo?.guildIconUrl),
            updatedAt: Date.now()
        }
        this.scheduleSaveDiscordPersistentCache()
    }

    /**
     * 获取 HTTP(S) 代理 Agent（缓存）
     * @param {string} proxyUrl 代理地址
     * @returns {any|null}
     */
    getHttpProxyAgent(proxyUrl) {
        const normalizedProxyUrl = String(proxyUrl || '').trim()
        if (!normalizedProxyUrl) return null

        const cachedAgent = this.httpProxyAgentCache.get(normalizedProxyUrl)
        if (cachedAgent) return cachedAgent

        try {
            const agent = new HttpsProxyAgent(normalizedProxyUrl)
            this.httpProxyAgentCache.set(normalizedProxyUrl, agent)
            return agent
        } catch (err) {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[数据服务] 创建代理 Agent 失败: ${normalizedProxyUrl}`, err?.message || err)
            }
            return null
        }
    }

    /**
     * 发送 Discord API 请求（GET）
     * @param {string} apiPath API 路径（例如 /api/v10/users/xxx）
     * @returns {Promise<any|null>}
     */
    async requestDiscordApiJson(apiPath) {
        const token = this.getDiscordBotToken()
        if (!token || !apiPath) return null

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        try {
            const fetchOptions = {
                method: 'GET',
                headers: {
                    Authorization: `Bot ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'DiscordBot (SpeakerStatistics, v1.0)'
                },
                signal: controller.signal
            }

            const proxyUrl = getFrameworkProxyUrl()
            const proxyAgent = this.getHttpProxyAgent(proxyUrl)
            if (proxyAgent) {
                fetchOptions.agent = proxyAgent
            }

            const response = await fetch(`https://discord.com${apiPath}`, fetchOptions)

            if (!response.ok) {
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug(`[数据服务] Discord API 请求失败: path=${apiPath}, status=${response.status}`)
                }
                return null
            }

            return await response.json().catch(() => null)
        } catch (err) {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[数据服务] Discord API 请求异常: path=${apiPath}`, err?.message || err)
            }
            return null
        } finally {
            clearTimeout(timeout)
        }
    }

    /**
     * 从运行时缓存中获取 Discord 服务器信息
     * @param {string} channelId Discord 频道 ID（不带 dc_）
     * @returns {{guildId:string,guildName:string,guildIconUrl:string}|null}
     */
    getRuntimeDiscordGuildInfoByChannelId(channelId) {
        const normalizedChannelId = this.normalizeGroupId(channelId)
        if (!normalizedChannelId || typeof Bot === 'undefined') return null

        const formatGuildInfo = (guildId, guildName, guildIcon) => {
            const gid = this.normalizeGroupId(guildId)
            if (!gid) return null
            const gname = this.normalizeGroupName(guildName)
            const iconUrl = this.parseDiscordGuildIconUrl(gid, guildIcon)
            return {
                guildId: gid,
                guildName: gname || gid,
                guildIconUrl: iconUrl
            }
        }

        try {
            const runtimeGroup = Bot?.gl?.get?.(`dc_${normalizedChannelId}`)
            const runtimeGuild = runtimeGroup?.guild
            const runtimeGuildInfo = formatGuildInfo(
                runtimeGuild?.id || runtimeGroup?.guild_id || runtimeGroup?.guildId,
                runtimeGuild?.name || runtimeGroup?.guild_name || runtimeGroup?.guildName,
                runtimeGuild?.icon || runtimeGuild?.icon_hash || runtimeGroup?.guild_icon || runtimeGroup?.guildIcon
            )
            if (runtimeGuildInfo) return runtimeGuildInfo
        } catch {}

        try {
            const botIds = Array.isArray(Bot?.uin) ? Bot.uin : Object.keys(Bot || {})
            for (const botId of botIds) {
                const bot = Bot?.[botId]
                if (!bot || bot?.adapter?.id !== 'Discord') continue

                for (const [guildId, guild] of bot.guilds || []) {
                    if (!guild?.channels?.has?.(normalizedChannelId)) continue
                    const guildInfo = formatGuildInfo(
                        guildId,
                        guild?.name,
                        guild?.icon || guild?.iconURL || guild?.iconUrl || guild?.icon_hash
                    )
                    if (guildInfo) return guildInfo
                }
            }
        } catch {}

        return null
    }

    /**
     * 通过频道 ID 获取 Discord 频道信息
     * @param {string} channelId Discord 频道 ID
     * @returns {Promise<{channelId:string,guildId:string,guildName:string,guildIconUrl:string}|null>}
     */
    async getDiscordChannelInfo(channelId) {
        const normalizedChannelId = this.normalizeDiscordId(channelId)
        if (!/^\d{5,32}$/.test(normalizedChannelId)) return null

        const cacheKey = `discord_channel_${normalizedChannelId}`
        const cached = this.discordChannelInfoCache.get(cacheKey)
        if (cached) {
            if (cached.__empty) return null
            return cached
        }

        const persistentChannelInfo = this.getPersistentDiscordChannelInfo(normalizedChannelId)
        if (persistentChannelInfo) {
            this.discordChannelInfoCache.set(cacheKey, persistentChannelInfo)
            return persistentChannelInfo
        }

        const runtimeGuildInfo = this.getRuntimeDiscordGuildInfoByChannelId(normalizedChannelId)
        if (runtimeGuildInfo) {
            const runtimeInfo = {
                channelId: normalizedChannelId,
                guildId: runtimeGuildInfo.guildId,
                guildName: runtimeGuildInfo.guildName,
                guildIconUrl: runtimeGuildInfo.guildIconUrl
            }
            this.discordChannelInfoCache.set(cacheKey, runtimeInfo)
            this.setPersistentDiscordChannelInfo(runtimeInfo)
            this.setPersistentDiscordGuildInfo({
                guildId: runtimeInfo.guildId,
                guildName: runtimeInfo.guildName,
                guildIconUrl: runtimeInfo.guildIconUrl
            })
            return runtimeInfo
        }

        const channelData = await this.requestDiscordApiJson(`/api/v10/channels/${normalizedChannelId}`)
        const guildId = this.normalizeGroupId(channelData?.guild_id)
        if (!guildId) {
            this.discordChannelInfoCache.set(cacheKey, { __empty: true })
            return null
        }

        let guildName = ''
        let guildIconUrl = ''
        const guildInfo = await this.getDiscordGuildInfo(guildId)
        if (guildInfo) {
            guildName = guildInfo.guildName
            guildIconUrl = guildInfo.guildIconUrl
        }

        const info = {
            channelId: normalizedChannelId,
            guildId,
            guildName,
            guildIconUrl
        }
        this.discordChannelInfoCache.set(cacheKey, info)
        this.setPersistentDiscordChannelInfo(info)
        this.setPersistentDiscordGuildInfo({
            guildId: info.guildId,
            guildName: info.guildName,
            guildIconUrl: info.guildIconUrl
        })
        return info
    }

    /**
     * 通过 guildId 获取 Discord 服务器信息
     * @param {string} guildId Discord 服务器 ID
     * @returns {Promise<{guildId:string,guildName:string,guildIconUrl:string}|null>}
     */
    async getDiscordGuildInfo(guildId) {
        const normalizedGuildId = this.normalizeDiscordId(guildId)
        if (!/^\d{5,32}$/.test(normalizedGuildId)) return null

        const cacheKey = `discord_guild_${normalizedGuildId}`
        const cached = this.discordGuildInfoCache.get(cacheKey)
        if (cached) {
            if (cached.__empty) return null
            return cached
        }

        const persistentGuildInfo = this.getPersistentDiscordGuildInfo(normalizedGuildId)
        if (persistentGuildInfo) {
            this.discordGuildInfoCache.set(cacheKey, persistentGuildInfo)
            return persistentGuildInfo
        }

        const guildData = await this.requestDiscordApiJson(`/api/v10/guilds/${normalizedGuildId}?with_counts=true`)
        if (!guildData?.id) {
            this.discordGuildInfoCache.set(cacheKey, { __empty: true })
            return null
        }

        const guildInfo = {
            guildId: this.normalizeGroupId(guildData.id),
            guildName: this.normalizeGroupName(guildData.name) || normalizedGuildId,
            guildIconUrl: this.parseDiscordGuildIconUrl(guildData.id, guildData.icon)
        }
        this.discordGuildInfoCache.set(cacheKey, guildInfo)
        this.setPersistentDiscordGuildInfo(guildInfo)
        return guildInfo
    }

    /**
     * 根据群统计项获取 Discord 服务器信息
     * @param {Object} group 统计项
     * @returns {Promise<{guildId:string,guildName:string,guildIconUrl:string}|null>}
     */
    async getDiscordGuildInfoForGroup(group) {
        if (!group || group.platform !== 'discord') return null

        const guildId = this.normalizeGroupId(group.dcGuildId)
        if (guildId) {
            const runtimeInfo = this.getRuntimeDiscordGuildInfoByChannelId(
                this.normalizeGroupId(Array.isArray(group.channelIds) ? group.channelIds[0] : '').replace(/^dc_/, '')
            )
            if (runtimeInfo && runtimeInfo.guildId === guildId) {
                this.setPersistentDiscordGuildInfo({
                    guildId: runtimeInfo.guildId,
                    guildName: runtimeInfo.guildName,
                    guildIconUrl: runtimeInfo.guildIconUrl
                })
                return runtimeInfo
            }
            const guildInfo = await this.getDiscordGuildInfo(guildId)
            if (guildInfo) return guildInfo
        }

        const channelIds = Array.isArray(group.channelIds) ? group.channelIds : []
        for (const channelId of channelIds) {
            const normalizedChannelId = this.normalizeGroupId(channelId).replace(/^dc_/, '')
            if (!normalizedChannelId) continue
            const channelInfo = await this.getDiscordChannelInfo(normalizedChannelId)
            if (channelInfo?.guildId) {
                this.setPersistentDiscordGuildInfo({
                    guildId: channelInfo.guildId,
                    guildName: channelInfo.guildName,
                    guildIconUrl: channelInfo.guildIconUrl
                })
                return {
                    guildId: channelInfo.guildId,
                    guildName: channelInfo.guildName || '',
                    guildIconUrl: channelInfo.guildIconUrl || ''
                }
            }
        }

        return null
    }

    /**
     * 获取用户头像链接（平台感知）
     * @param {string} userId 用户 ID
     * @param {string|null} groupId 群 ID（用于判断平台）
     * @returns {Promise<string>}
     */
    async getUserAvatarUrl(userId, groupId = null) {
        const normalizedUserId = this.normalizeGroupId(userId)
        if (!normalizedUserId) return ''

        let platform = this.detectGroupPlatform(groupId || '')
        // 全局榜等场景 groupId 为空时，按 userId 前缀判断平台（dc_/tg_）
        if (platform === 'qq') {
            const userPlatform = this.detectGroupPlatform(normalizedUserId)
            if (userPlatform !== 'qq') {
                platform = userPlatform
            }
        }

        if (platform === 'discord') {
            const userInfo = await this.getDiscordUserInfo(normalizedUserId).catch(() => null)
            if (userInfo?.avatarUrl) {
                return userInfo.avatarUrl
            }
            return `https://cdn.discordapp.com/embed/avatars/0.png`
        }

        return `https://q1.qlogo.cn/g?b=qq&s=100&nk=${normalizedUserId}`
    }

    /**
     * 获取群头像链接（平台感知）
     * @param {Object} group 群统计项
     * @returns {Promise<string>}
     */
    async getGroupAvatarUrl(group) {
        if (!group || typeof group !== 'object') return ''

        const groupId = this.normalizeGroupId(group.groupId || group.group_id)
        const platform = group.platform || this.detectGroupPlatform(groupId)

        if (platform === 'discord') {
            const iconFromGroup = this.normalizeGroupName(group.dcGuildIconUrl || group.dc_guild_icon_url)
            if (iconFromGroup) return iconFromGroup

            const guildInfo = await this.getDiscordGuildInfoForGroup(group).catch(() => null)
            if (guildInfo?.guildIconUrl) {
                return guildInfo.guildIconUrl
            }

            return 'https://cdn.discordapp.com/embed/avatars/0.png'
        }

        if (!groupId) return ''
        return `http://p.qlogo.cn/gh/${groupId}/${groupId}/100/`
    }

    /**
     * 读取 Discord token（优先环境变量，fallback 到 config/Discord.yaml）
     * @returns {string}
     */
    getDiscordBotToken() {
        if (Date.now() - this.discordTokenCache.loadedAt < 60 * 1000) {
            return this.discordTokenCache.value
        }

        let token = String(
            process.env.ROBOTMANAGEMENT_DC_API_TOKEN
            || process.env.DISCORD_BOT_TOKEN
            || ''
        ).trim()

        if (!token) {
            try {
                const discordConfigPath = path.join(process.cwd(), 'config', 'Discord.yaml')
                if (fs.existsSync(discordConfigPath)) {
                    const rawYaml = fs.readFileSync(discordConfigPath, 'utf8')
                    const tokenListBlock = rawYaml.match(/token\s*:\s*\n((?:\s*-\s*.+\n?)*)/i)?.[1] || ''
                    if (tokenListBlock) {
                        const firstToken = tokenListBlock
                            .split('\n')
                            .map(line => line.replace(/^\s*-\s*/, '').replace(/#.*$/, '').trim())
                            .filter(Boolean)[0]
                        if (firstToken) {
                            token = firstToken.replace(/^['"]|['"]$/g, '').trim()
                        }
                    }

                    if (!token) {
                        const inlineToken = rawYaml.match(/token\s*:\s*([^\n#]+)/i)?.[1] || ''
                        if (inlineToken) {
                            token = inlineToken.replace(/^['"]|['"]$/g, '').trim()
                        }
                    }
                }
            } catch (err) {
                if (globalConfig.getConfig('global.debugLog')) {
                    globalConfig.debug('[数据服务] 读取 config/Discord.yaml 失败:', err?.message || err)
                }
            }
        }

        this.discordTokenCache = {
            value: token,
            loadedAt: Date.now()
        }
        return token
    }

    /**
     * 从运行时缓存获取 Discord 用户信息（无需远程 API）
     * @param {string} userId Discord 用户 ID
     * @returns {{id:string, username:string, globalName:string, avatarUrl:string}|null}
     */
    getRuntimeDiscordUserInfo(userId) {
        const normalizedUserId = this.normalizeDiscordId(userId)
        if (!normalizedUserId || typeof Bot === 'undefined') return null

        const getMapValue = (maybeMap, key) => {
            if (!maybeMap || typeof maybeMap.get !== 'function') return null
            const direct = maybeMap.get(key)
            if (direct) return direct
            if (/^\d+$/.test(String(key))) {
                const numericKey = Number(key)
                if (Number.isSafeInteger(numericKey)) {
                    return maybeMap.get(numericKey) || null
                }
            }
            return null
        }

        const toUserInfo = (source) => {
            if (!source || typeof source !== 'object') return null
            const user = source.user && typeof source.user === 'object' ? source.user : source
            const id = this.normalizeGroupId(user.id || source.id || normalizedUserId)
            if (!id) return null

            const username = this.normalizeGroupName(
                user.username
                || source.username
                || user.userName
                || source.userName
            )
            const globalName = this.normalizeGroupName(
                user.global_name
                || user.globalName
                || source.global_name
                || source.globalName
            )

            return {
                id,
                username: username || id,
                globalName: globalName || '',
                avatarUrl: this.parseDiscordAvatarUrl(user)
            }
        }

        try {
            const botIds = Array.isArray(Bot?.uin) ? Bot.uin : Object.keys(Bot || {})
            for (const botId of botIds) {
                const bot = Bot?.[botId]
                if (!bot || bot?.adapter?.id !== 'Discord') continue

                const directUser = getMapValue(bot.users, normalizedUserId)
                const directUserInfo = toUserInfo(directUser)
                if (directUserInfo) return directUserInfo

                for (const [, guild] of bot.guilds || []) {
                    const member = getMapValue(guild?.members, normalizedUserId)
                    const memberInfo = toUserInfo(member)
                    if (memberInfo) return memberInfo
                }
            }
        } catch (err) {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug('[数据服务] 读取 Discord 运行时用户信息失败:', err?.message || err)
            }
        }

        return null
    }

    /**
     * 通过 Discord API 获取用户信息（GET /users/{userId}）
     * @param {string} userId Discord 用户 ID
     * @returns {Promise<{id:string, username:string, globalName:string, avatarUrl:string}|null>}
     */
    async requestDiscordUserInfoFromApi(userId) {
        const rawUserId = this.normalizeGroupId(userId)
        const normalizedUserId = this.normalizeDiscordId(rawUserId)
        if (!/^\d{5,32}$/.test(normalizedUserId)) return null

        try {
            const data = await this.requestDiscordApiJson(`/api/v10/users/${normalizedUserId}`)
            if (!data?.id) return null

            const username = this.normalizeGroupName(data.username)
            const globalName = this.normalizeGroupName(data.global_name)
            return {
                id: this.normalizeGroupId(data.id),
                username: username || normalizedUserId,
                globalName: globalName || '',
                avatarUrl: this.parseDiscordAvatarUrl(data)
            }
        } catch (err) {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug(`[数据服务] Discord API 获取用户信息异常: user=${normalizedUserId}`, err?.message || err)
            }
            return null
        }
    }

    /**
     * 获取 Discord 用户信息（运行时优先，API 兜底）
     * @param {string} userId Discord 用户 ID
     * @returns {Promise<{id:string, username:string, globalName:string, avatarUrl:string}|null>}
     */
    async getDiscordUserInfo(userId) {
        const normalizedUserId = this.normalizeDiscordId(userId)
        if (!normalizedUserId) return null

        const cacheKey = `discord_user_${normalizedUserId}`
        const cached = this.discordUserInfoCache.get(cacheKey)
        if (cached) {
            if (cached.__empty) return null
            return cached
        }

        const persistentUserInfo = this.getPersistentDiscordUserInfo(normalizedUserId)
        if (persistentUserInfo) {
            this.discordUserInfoCache.set(cacheKey, persistentUserInfo)
            return persistentUserInfo
        }

        const runtimeUserInfo = this.getRuntimeDiscordUserInfo(normalizedUserId)
        if (runtimeUserInfo) {
            let finalUserInfo = runtimeUserInfo
            if (!this.normalizeGroupName(runtimeUserInfo.globalName)) {
                const remoteUserInfo = await this.requestDiscordUserInfoFromApi(normalizedUserId).catch(() => null)
                if (remoteUserInfo?.id) {
                    finalUserInfo = {
                        ...runtimeUserInfo,
                        username: this.normalizeGroupName(remoteUserInfo.username || runtimeUserInfo.username || normalizedUserId),
                        globalName: this.normalizeGroupName(remoteUserInfo.globalName || runtimeUserInfo.globalName || ''),
                        avatarUrl: this.normalizeGroupName(remoteUserInfo.avatarUrl || runtimeUserInfo.avatarUrl || '')
                    }
                }
            }

            this.discordUserInfoCache.set(cacheKey, finalUserInfo)
            this.setPersistentDiscordUserInfo(finalUserInfo)
            return finalUserInfo
        }

        const remoteUserInfo = await this.requestDiscordUserInfoFromApi(normalizedUserId)
        if (remoteUserInfo) {
            this.discordUserInfoCache.set(cacheKey, remoteUserInfo)
            this.setPersistentDiscordUserInfo(remoteUserInfo)
            return remoteUserInfo
        }

        this.discordUserInfoCache.set(cacheKey, { __empty: true })
        return null
    }

    /**
     * 获取时间维度 SQL 表达式（兼容 PostgreSQL / SQLite）
     * @param {'date'|'week'|'month'|'year'} dimension 维度
     * @param {string} column 列名
     * @returns {string}
     */
    getTimeDimensionExpr(dimension, column = 'stat_hour') {
        const dbType = this.dbService.getDatabaseType()
        const safeColumn = column

        if (dbType === 'postgresql') {
            if (dimension === 'date') return `to_char(${safeColumn}, 'YYYY-MM-DD')`
            if (dimension === 'week') return `to_char(${safeColumn}, 'IYYY-"W"IW')`
            if (dimension === 'month') return `to_char(${safeColumn}, 'YYYY-MM')`
            return `to_char(${safeColumn}, 'YYYY')`
        }

        if (dimension === 'date') return `substr(${safeColumn}, 1, 10)`
        if (dimension === 'week') {
            return `printf('%04d-W%02d', CAST(strftime('%Y', ${safeColumn}) AS INTEGER), CAST(strftime('%W', ${safeColumn}) AS INTEGER))`
        }
        if (dimension === 'month') return `substr(${safeColumn}, 1, 7)`
        return `substr(${safeColumn}, 1, 4)`
    }


    /**
     * 获取用户数据（带缓存）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object|null>} 用户数据
     */
    async getUserData(groupId, userId) {
        const cacheKey = `${groupId}_${userId}`
        const cached = this.cache.get(cacheKey)
        
        if (cached) {
            return cached
        }

        // 从数据库读取
        const dbStats = await this.dbService.getUserStats(groupId, userId)
        
        if (!dbStats) {
            return null
        }

        const userData = await this.dbToUserData(dbStats, groupId, userId)
        this.cache.set(cacheKey, userData)
        
        return userData
    }

    /**
     * 保存用户数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} userData 用户数据
     * @param {Object} options 可选参数，用于指定只保存当前时间维度的数据
     */
    async saveUserData(groupId, userId, userData, options = {}) {
        await this.dbService.saveUserStats(groupId, userId, {
            nickname: userData.nickname || '',
            total_count: parseInt(userData.total || 0, 10),
            total_words: parseInt(userData.total_number_of_words || 0, 10),
            active_days: parseInt(userData.active_days || 0, 10),
            continuous_days: parseInt(userData.continuous_days || 0, 10),
            last_speaking_time: userData.last_speaking_time || null
        })
        
        this.clearCache(groupId, userId)

        const timeInfo = TimeUtils.getCurrentDateTime()
        
        if (options.onlyCurrentTime) {
            // 只保存当前日期的日统计
            const currentDate = timeInfo.formattedDate
            if (userData.daily_stats && userData.daily_stats[currentDate]) {
                await this.dbService.saveDailyStats(groupId, userId, currentDate, {
                    message_count: parseInt(userData.daily_stats[currentDate].count || 0, 10),
                    word_count: parseInt(userData.daily_stats[currentDate].words || 0, 10)
                })
            }

            // 只保存当前周的周统计
            const currentWeek = timeInfo.weekKey
            if (userData.weekly_stats && userData.weekly_stats[currentWeek]) {
                await this.dbService.saveWeeklyStats(groupId, userId, currentWeek, {
                    message_count: parseInt(userData.weekly_stats[currentWeek].count || 0, 10),
                    word_count: parseInt(userData.weekly_stats[currentWeek].words || 0, 10)
                })
            }

            // 只保存当前月的月统计
            const currentMonth = timeInfo.monthKey
            if (userData.monthly_stats && userData.monthly_stats[currentMonth]) {
                await this.dbService.saveMonthlyStats(groupId, userId, currentMonth, {
                    message_count: parseInt(userData.monthly_stats[currentMonth].count || 0, 10),
                    word_count: parseInt(userData.monthly_stats[currentMonth].words || 0, 10)
                })
            }

            // 只保存当前年的年统计
            const currentYear = timeInfo.yearKey
            if (userData.yearly_stats && userData.yearly_stats[currentYear]) {
                await this.dbService.saveYearlyStats(groupId, userId, currentYear, {
                    message_count: parseInt(userData.yearly_stats[currentYear].count || 0, 10),
                    word_count: parseInt(userData.yearly_stats[currentYear].words || 0, 10)
                })
            }
        } else {
            if (userData.daily_stats) {
                for (const [dateKey, stats] of Object.entries(userData.daily_stats)) {
                    await this.dbService.saveDailyStats(groupId, userId, dateKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }

            if (userData.weekly_stats) {
                for (const [weekKey, stats] of Object.entries(userData.weekly_stats)) {
                    await this.dbService.saveWeeklyStats(groupId, userId, weekKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }

            if (userData.monthly_stats) {
                for (const [monthKey, stats] of Object.entries(userData.monthly_stats)) {
                    await this.dbService.saveMonthlyStats(groupId, userId, monthKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }

            if (userData.yearly_stats) {
                for (const [yearKey, stats] of Object.entries(userData.yearly_stats)) {
                    await this.dbService.saveYearlyStats(groupId, userId, yearKey, {
                        message_count: parseInt(stats.count || 0, 10),
                        word_count: parseInt(stats.words || 0, 10)
                    })
                }
            }
        }

        const cacheKey = `${groupId}_${userId}`
        this.cache.set(cacheKey, userData)
        
        // 清除相关缓存
        this.groupStatsCache.delete(String(groupId))
    }

    /**
     * 将数据库格式转换为用户数据格式
     * @param {Object} dbStats 数据库统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 用户数据格式
     */
    async dbToUserData(dbStats, groupId, userId) {
        const timeInfo = TimeUtils.getCurrentDateTime()
        
        // 获取时间维度统计数据
        const dailyStats = await this.getDailyStatsForUser(groupId, userId)
        const weeklyStats = await this.getWeeklyStatsForUser(groupId, userId)
        const monthlyStats = await this.getMonthlyStatsForUser(groupId, userId)
        const yearlyStats = await this.getYearlyStatsForUser(groupId, userId)

        return {
            user_id: userId,
            nickname: dbStats.nickname || '',
            total: parseInt(dbStats.total_count || 0, 10),
            total_number_of_words: parseInt(dbStats.total_words || 0, 10),
            active_days: parseInt(dbStats.active_days || 0, 10),
            continuous_days: parseInt(dbStats.continuous_days || 0, 10),
            last_speaking_time: dbStats.last_speaking_time || null,
            daily_stats: dailyStats,
            weekly_stats: weeklyStats,
            monthly_stats: monthlyStats,
            yearly_stats: yearlyStats
        }
    }

    /**
     * 获取用户的日统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 日统计数据对象
     */
    async getDailyStatsForUser(groupId, userId) {
        const now = TimeUtils.getUTC8Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const startDate = TimeUtils.formatDate(thirtyDaysAgo)
        const endDate = TimeUtils.formatDate(now)
        
        const stats = await this.dbService.getDailyStatsByDateRange(groupId, userId, startDate, endDate)
        const result = {}
        
        for (const stat of stats) {
            const messageCount = parseInt(stat.message_count || 0, 10)
            const wordCount = parseInt(stat.word_count || 0, 10)
            
            result[stat.date_key] = {
                count: messageCount,
                words: wordCount
            }
        }
        
        return result
    }

    /**
     * 获取用户的周统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 周统计数据对象
     */
    async getWeeklyStatsForUser(groupId, userId) {
        const result = {}
        const now = TimeUtils.getUTC8Date()
        
        for (let i = 0; i < 12; i++) {
            const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
            const weekKey = TimeUtils.getWeekNumber(weekDate)
            
            const stat = await this.dbService.getWeeklyStats(groupId, userId, weekKey)
            if (stat) {
                const messageCount = parseInt(stat.message_count || 0, 10)
                const wordCount = parseInt(stat.word_count || 0, 10)
                
                result[weekKey] = {
                    count: messageCount,
                    words: wordCount
                }
            }
        }
        
        return result
    }

    /**
     * 获取用户的月统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 月统计数据对象
     */
    async getMonthlyStatsForUser(groupId, userId) {
        const result = {}
        const now = TimeUtils.getUTC8Date()
        
        for (let i = 0; i < 12; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthKey = TimeUtils.getMonthString(monthDate)
            
            const stat = await this.dbService.getMonthlyStats(groupId, userId, monthKey)
            if (stat) {
                const messageCount = parseInt(stat.message_count || 0, 10)
                const wordCount = parseInt(stat.word_count || 0, 10)
                
                result[monthKey] = {
                    count: messageCount,
                    words: wordCount
                }
            }
        }
        
        return result
    }

    /**
     * 获取用户的年统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Promise<Object>} 年统计数据对象
     */
    async getYearlyStatsForUser(groupId, userId) {
        const now = TimeUtils.getUTC8Date()
        const yearKey = now.getFullYear().toString()
        
        const stat = await this.dbService.getYearlyStats(groupId, userId, yearKey)
        
        if (stat) {
            // 确保转换为数字类型，避免字符串拼接问题
            const messageCount = parseInt(stat.message_count || 0, 10)
            const wordCount = parseInt(stat.word_count || 0, 10)
            
            return {
                [yearKey]: {
                    count: messageCount,
                    words: wordCount
                }
            }
        }
        
        return {}
    }

    /**
     * 初始化用户数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @returns {Object} 用户数据
     */
    initUserData(groupId, userId, nickname) {
        const timeInfo = TimeUtils.getCurrentDateTime()
        return {
            user_id: userId,
            nickname: nickname,
            total: 0,
            last_speaking_time: timeInfo.formattedDateTime,
            active_days: 0,
            continuous_days: 0,
            total_number_of_words: 0,
            daily_stats: {},
            weekly_stats: {},
            monthly_stats: {},
            yearly_stats: {
                [timeInfo.yearKey]: {
                    count: 0,
                    words: 0
                }
            }
        }
    }

    /**
     * 更新用户统计数据
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @param {number} wordCount 本次消息字数
     */
    async updateUserStats(groupId, userId, nickname, wordCount = 0, messageTime = null, messageId = null) {
        try {
            const currentWordCount = parseInt(wordCount || 0, 10)

            await this.dbService.recordMessage(
                groupId,
                userId,
                nickname,
                1,
                currentWordCount,
                messageTime
            )

            const updateRankingOnEveryMessage = globalConfig.getConfig('message.updateRankingOnEveryMessage') === true
            this.clearCache(groupId, userId, {
                clearRankingCache: updateRankingOnEveryMessage
            })
            
            let logKey = null
            if (messageId) {
                logKey = `stats_${messageId}`
            } else if (messageTime) {
                logKey = `stats_${groupId}_${userId}_${messageTime}`
            } else {
                logKey = `stats_${groupId}_${userId}_${Date.now()}`
            }
            
            if (this.messageRecorder && this.messageRecorder.processedLogTimes) {
                const sizeBefore = this.messageRecorder.processedLogTimes.size
                this.messageRecorder.processedLogTimes.add(logKey)
                const sizeAfter = this.messageRecorder.processedLogTimes.size
                
                if (sizeAfter > sizeBefore) {
                    if (this.messageRecorder.processedLogTimes.size > 200) {
                        const keysArray = Array.from(this.messageRecorder.processedLogTimes)
                        keysArray.slice(0, 100).forEach(key => {
                            this.messageRecorder.processedLogTimes.delete(key)
                        })
                    }
                    
                    const wordInfo = currentWordCount > 0 ? `，${global.logger.green('字数')}: ${global.logger.cyan(currentWordCount)}` : ''
                    const logMessage = `${global.logger.blue('[发言统计]')} ${global.logger.green(nickname)}(${userId}) 在群 ${groupId} 发言，已计入新统计模型${wordInfo}`
                    if (globalConfig.getConfig('global.debugLog')) {
                        global.logger.mark(logMessage)
                    }
                }
            }
        } catch (err) {
            this.error(`更新用户统计失败:`, err)
        }
    }

    /**
     * 计算连续天数（使用 TimeUtils 的通用方法）
     * @param {Object} dailyStats 日统计数据
     * @returns {number} 连续天数（最大连续天数）
     */
    calculateContinuousDays(dailyStats) {
        return TimeUtils.calculateContinuousDays(dailyStats, true)
    }

    /**
     * 获取群成员排行榜数据
     * @param {string} groupId 群号
     * @param {string} type 统计类型：'daily'|'weekly'|'monthly'|'yearly'|'total'
     * @param {Object} options 选项 { monthKey, limit }
     * @returns {Promise<Array>} 排行榜数据
     */
    async getRankingData(groupId, type = 'total', options = {}) {
        const timeInfo = TimeUtils.getCurrentDateTime()
        const limit = options.limit || 20

        try {
            switch (type) {
                case 'total':
                    const queryAllGroups = !groupId || groupId === 'all'
                    const currentGroupIdsForRank = queryAllGroups ? this.getCurrentGroupIdsForFilter() : null

                    if (queryAllGroups) {
                        const cacheKey = `ranking:total:all:${limit}:${currentGroupIdsForRank?.length ?? 'all'}`
                        const cached = this.rankingCache.get(cacheKey)
                        if (cached) {
                            return cached
                        }
                    }

                    let topUsers
                    if (queryAllGroups) {
                        topUsers = await this.dbService.getTopUsersAllGroups(limit, 'total_count', currentGroupIdsForRank)
                    } else {
                        const isArchived = await this.dbService.isGroupArchived(groupId)
                        if (isArchived) {
                            return []
                        }
                        topUsers = await this.dbService.getTopUsers(groupId, limit, 'total_count')
                    }
                    
                    const result = topUsers.map(user => ({
                        user_id: user.user_id,
                        nickname: user.nickname,
                        count: parseInt(user.total_count || 0, 10),
                        period_words: parseInt(user.total_words || 0, 10),
                        active_days: parseInt(user.active_days || 0, 10),
                        continuous_days: parseInt(user.continuous_days || 0, 10),
                        last_speaking_time: user.last_speaking_time || null
                    }))
                    
                    if (queryAllGroups) {
                        const cacheKey = `ranking:total:all:${limit}:${currentGroupIdsForRank?.length ?? 'all'}`
                        this.rankingCache.set(cacheKey, result)
                    }
                    
                    return result

                case 'daily':
                    const todayDate = timeInfo.formattedDate
                    const dailyStats = await this.dbService.getDailyStatsByGroupAndDate(groupId, todayDate)
                    
                    return dailyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                case 'weekly':
                    const weekKey = timeInfo.weekKey
                    const weeklyStats = await this.dbService.getWeeklyStatsByGroupAndWeek(groupId, weekKey)
                    
                    return weeklyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                case 'monthly':
                    if (!groupId) {
                        return []
                    }
                    const monthKey = options.monthKey || timeInfo.monthKey
                    // 确保月份键格式正确：YYYY-MM
                    const validMonthKey = monthKey.match(/^\d{4}-\d{2}$/) ? monthKey : timeInfo.monthKey
                    const monthlyStats = await this.dbService.getMonthlyStatsByGroupAndMonth(groupId, validMonthKey)
                    
                    return monthlyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                case 'yearly':
                    const yearKey = timeInfo.yearKey
                    const yearlyStats = await this.dbService.getYearlyStatsByGroupAndYear(groupId, yearKey)
                    
                    return yearlyStats.slice(0, limit).map(stat => ({
                        user_id: stat.user_id,
                        nickname: stat.nickname || stat.user_id,
                        count: parseInt(stat.message_count || 0, 10),
                        period_words: parseInt(stat.word_count || 0, 10),
                        last_speaking_time: stat.last_speaking_time || null
                    }))

                default:
                    return []
            }
        } catch (err) {
            this.error(`获取排行榜数据失败 (${type}):`, err)
            return []
        }
    }

    /**
     * 获取用户个人排名数据（用于显示个人卡片）
     * @param {string} userId 用户ID
     * @param {string} groupId 群号（总榜时可为null）
     * @param {string} type 统计类型：'daily'|'weekly'|'monthly'|'yearly'|'total'
     * @param {Object} options 选项 { monthKey }
     * @returns {Promise<Object|null>} 用户排名数据 { user_id, nickname, count, period_words, active_days, continuous_days, last_speaking_time, rank }
     */
    async getUserRankData(userId, groupId, type = 'total', options = {}) {
        const timeInfo = TimeUtils.getCurrentDateTime()
        
        try {
            switch (type) {
                case 'total':
                    const queryAllGroups = !groupId || groupId === 'all'
                    if (queryAllGroups) {
                        const currentGroupIdsForUserRank = this.getCurrentGroupIdsForFilter()
                        const allUsers = await this.dbService.getTopUsersAllGroups(999999, 'total_count', currentGroupIdsForUserRank)
                        
                        const userIndex = allUsers.findIndex(u => String(u.user_id) === String(userId))
                        if (userIndex === -1) return null
                        
                        const user = allUsers[userIndex]
                        return {
                            user_id: user.user_id,
                            nickname: user.nickname,
                            count: parseInt(user.total_count || 0, 10),
                            period_words: parseInt(user.total_words || 0, 10),
                            active_days: parseInt(user.active_days || 0, 10),
                            continuous_days: parseInt(user.continuous_days || 0, 10),
                            last_speaking_time: user.last_speaking_time || null,
                            rank: userIndex + 1
                        }
                    } else {
                        const isArchived = await this.dbService.isGroupArchived(groupId)
                        if (isArchived) {
                            return null
                        }
                        
                        const userStats = await this.dbService.getUserStats(groupId, userId)
                        if (!userStats || !userStats.total_count || userStats.total_count === 0) {
                            return null
                        }
                        
                        const allUsers = await this.dbService.getTopUsers(groupId, 999999, 'total_count')
                        const userIndex = allUsers.findIndex(u => String(u.user_id) === String(userId))
                        
                        return {
                            user_id: userStats.user_id,
                            nickname: userStats.nickname,
                            count: parseInt(userStats.total_count || 0, 10),
                            period_words: parseInt(userStats.total_words || 0, 10),
                            active_days: parseInt(userStats.active_days || 0, 10),
                            continuous_days: parseInt(userStats.continuous_days || 0, 10),
                            last_speaking_time: userStats.last_speaking_time || null,
                            rank: userIndex !== -1 ? userIndex + 1 : null
                        }
                    }

                case 'daily':
                    if (!groupId) return null
                    const todayDate = timeInfo.formattedDate
                    const dailyStats = await this.dbService.getDailyStatsByGroupAndDate(groupId, todayDate)
                    
                    const userDailyStat = dailyStats.find(s => String(s.user_id) === String(userId))
                    if (!userDailyStat) {
                        return null
                    }
                    
                    const dailyUserIndex = dailyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const userStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userDailyStat.nickname || userStats?.nickname || '未知',
                        count: parseInt(userDailyStat.message_count || 0, 10),
                        period_words: parseInt(userDailyStat.word_count || 0, 10),
                        active_days: userStats?.active_days || 0,
                        continuous_days: userStats?.continuous_days || 0,
                        last_speaking_time: userDailyStat.last_speaking_time || userStats?.last_speaking_time || null,
                        rank: dailyUserIndex !== -1 ? dailyUserIndex + 1 : null
                    }

                case 'weekly':
                    if (!groupId) return null
                    const weekKey = timeInfo.weekKey
                    const weeklyStats = await this.dbService.getWeeklyStatsByGroupAndWeek(groupId, weekKey)
                    
                    const userWeeklyStat = weeklyStats.find(s => String(s.user_id) === String(userId))
                    if (!userWeeklyStat) {
                        return null
                    }
                    
                    const weeklyUserIndex = weeklyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const weeklyUserStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userWeeklyStat.nickname || weeklyUserStats?.nickname || '未知',
                        count: parseInt(userWeeklyStat.message_count || 0, 10),
                        period_words: parseInt(userWeeklyStat.word_count || 0, 10),
                        active_days: weeklyUserStats?.active_days || 0,
                        continuous_days: weeklyUserStats?.continuous_days || 0,
                        last_speaking_time: userWeeklyStat.last_speaking_time || weeklyUserStats?.last_speaking_time || null,
                        rank: weeklyUserIndex !== -1 ? weeklyUserIndex + 1 : null
                    }

                case 'monthly':
                    if (!groupId) return null
                    const monthKey = options.monthKey || timeInfo.monthKey
                    const validMonthKey = monthKey.match(/^\d{4}-\d{2}$/) ? monthKey : timeInfo.monthKey
                    const monthlyStats = await this.dbService.getMonthlyStatsByGroupAndMonth(groupId, validMonthKey)
                    
                    const userMonthlyStat = monthlyStats.find(s => String(s.user_id) === String(userId))
                    if (!userMonthlyStat) {
                        return null
                    }
                    
                    const monthlyUserIndex = monthlyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const monthlyUserStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userMonthlyStat.nickname || monthlyUserStats?.nickname || '未知',
                        count: parseInt(userMonthlyStat.message_count || 0, 10),
                        period_words: parseInt(userMonthlyStat.word_count || 0, 10),
                        active_days: monthlyUserStats?.active_days || 0,
                        continuous_days: monthlyUserStats?.continuous_days || 0,
                        last_speaking_time: userMonthlyStat.last_speaking_time || monthlyUserStats?.last_speaking_time || null,
                        rank: monthlyUserIndex !== -1 ? monthlyUserIndex + 1 : null
                    }

                case 'yearly':
                    if (!groupId) return null
                    const yearKey = timeInfo.yearKey
                    const yearlyStats = await this.dbService.getYearlyStatsByGroupAndYear(groupId, yearKey)
                    
                    const userYearlyStat = yearlyStats.find(s => String(s.user_id) === String(userId))
                    if (!userYearlyStat) {
                        return null
                    }
                    
                    const yearlyUserIndex = yearlyStats.findIndex(s => String(s.user_id) === String(userId))
                    
                    const yearlyUserStats = await this.dbService.getUserStats(groupId, userId)
                    return {
                        user_id: userId,
                        nickname: userYearlyStat.nickname || yearlyUserStats?.nickname || '未知',
                        count: parseInt(userYearlyStat.message_count || 0, 10),
                        period_words: parseInt(userYearlyStat.word_count || 0, 10),
                        active_days: yearlyUserStats?.active_days || 0,
                        continuous_days: yearlyUserStats?.continuous_days || 0,
                        last_speaking_time: userYearlyStat.last_speaking_time || yearlyUserStats?.last_speaking_time || null,
                        rank: yearlyUserIndex !== -1 ? yearlyUserIndex + 1 : null
                    }

                default:
                    return null
            }
        } catch (err) {
            this.error(`获取用户排名数据失败 (${type}):`, err)
            return null
        }
    }

    /**
     * 获取所有群组ID列表
     * @returns {Promise<Array<string>>} 群ID数组
     */
    async getGroupIds() {
        try {
            return await this.dbService.getAllGroupIds()
        } catch (err) {
            this.error('获取群组列表失败:', err)
            return []
        }
    }

    /**
     * 获取当前群 ID 列表用于统计与 SQL 过滤
     * 与 RobotManagement-plugin 的 showGroupList / memberStatistics 一致：仅统计 Bot.gl 中的群（排除 stdin）
     * 归档群（cleanZombieGroups 归档的）不计入统计且不可查；Web 请求时使用缓存
     * @returns {string[]|null} 当前群 ID 数组，null 表示无法获取（Web 等场景则不过滤）
     */
    getCurrentGroupIdsForFilter() {
        const runtimeEntries = this.getRuntimeGroupEntries()
        if (runtimeEntries.length > 0) {
            const set = new Set(runtimeEntries.map(entry => entry.groupId))
            if (set.size > 0) return Array.from(set)
        }
        if (this.currentGroupIdsCache.set && this.currentGroupIdsCache.set.size > 0) {
            const age = Date.now() - this.currentGroupIdsCache.updatedAt
            if (age < this.currentGroupIdsCacheTTL) {
                return Array.from(this.currentGroupIdsCache.set)
            }
        }
        return null
    }

    /**
     * 从 Bot.gl 刷新当前群列表缓存（供 Web 等拿不到 Bot.gl 时使用）
     * @param {number} throttleMs 节流：距上次更新不足此毫秒数则跳过，0 表示不节流
     * @returns {Set<string>|null} 当前群 ID 集合或 null
     */
    refreshCurrentGroupIdsFromBot(throttleMs = 0) {
        if (throttleMs > 0 && this.currentGroupIdsCache.updatedAt > 0 && (Date.now() - this.currentGroupIdsCache.updatedAt) < throttleMs) {
            return this.currentGroupIdsCache.set
        }

        const runtimeEntries = this.getRuntimeGroupEntries()
        if (runtimeEntries.length === 0) return null

        const set = new Set(runtimeEntries.map(entry => entry.groupId))
        if (set.size > 0) {
            this.currentGroupIdsCache = { set, updatedAt: Date.now() }
            this.globalStatsCache.clear()
            return set
        }
        return null
    }

    /**
     * 获取全局统计数据
     * @param {number} page 页码（从1开始）
     * @param {number} pageSize 每页显示的群组数量
     * @returns {Promise<Object>} 全局统计数据
     */
    async getGlobalStats(page = 1, pageSize = 9) {
        try {
            const cacheKey = `globalStats:${page}:${pageSize}`
            const cached = this.globalStatsCache.get(cacheKey)
            if (cached) {
                global.logger?.mark?.(`[发言统计] 全局统计 使用缓存 (page=${page}, pageSize=${pageSize}), 统计群数=${cached.totalGroups}`)
                return cached
            }

            global.logger?.mark?.('[发言统计] 全局统计 开始从数据库与 Bot.gl 计算')
            const timeInfo = TimeUtils.getCurrentDateTime()
            const todayKey = timeInfo.formattedDate
            const monthKey = timeInfo.monthKey

            const [allUsersMap, allDailyStatsMap, allMonthlyStatsMap, allGroupIds, allGroupsInfoMap, archivedGroupsCount, archivedGroupIds, totalMessagesResult, totalWordsResult] = await Promise.all([
                this.dbService.getAllGroupsUsersBatch(),
                this.dbService.getAllGroupsDailyStatsBatch(todayKey),
                this.dbService.getAllGroupsMonthlyStatsBatch(monthKey),
                this.getGroupIds(),
                this.dbService.getAllGroupsInfoBatch(),
                this.dbService.get('SELECT COUNT(*) as count FROM archived_groups').then(result => parseInt(result?.count || 0, 10)).catch(() => 0),
                this.dbService.all('SELECT group_id FROM archived_groups').then(groups => new Set(groups.map(g => String(g.group_id)))).catch(() => new Set()),
                this.dbService.get(`
                    SELECT SUM(total_count) as total 
                    FROM (
                        SELECT user_id, SUM(total_msg) as total_count
                        FROM user_agg_stats
                        WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                        GROUP BY user_id
                    ) as user_aggregated
                `).then(result => parseInt(result?.total || 0, 10)).catch(() => 0),
                this.dbService.get(`
                    SELECT SUM(total_words) as total 
                    FROM (
                        SELECT user_id, SUM(total_word) as total_words
                        FROM user_agg_stats
                        WHERE group_id NOT IN (SELECT group_id FROM archived_groups)
                        GROUP BY user_id
                    ) as user_aggregated
                `).then(result => parseInt(result?.total || 0, 10)).catch(() => 0)
            ])
            
            const archivedGroupIdsSet = archivedGroupIds || new Set()

            // 仅统计 Bot.gl 中的群（与 RobotManagement-plugin #群列表/#群员统计 一致）；归档群不计入；优先 Bot.gl，Web 用缓存
            const runtimeGroupEntries = this.getRuntimeGroupEntries()
            const runtimeGroupMap = new Map(runtimeGroupEntries.map(entry => [entry.groupId, entry]))
            let currentGroupIds = null
            if (runtimeGroupEntries.length > 0) {
                const set = new Set(runtimeGroupEntries.map(entry => entry.groupId))
                currentGroupIds = set
                this.currentGroupIdsCache = { set, updatedAt: Date.now() }
            }
            if (currentGroupIds === null && this.currentGroupIdsCache.set && this.currentGroupIdsCache.set.size > 0) {
                const age = Date.now() - this.currentGroupIdsCache.updatedAt
                if (age < this.currentGroupIdsCacheTTL) {
                    currentGroupIds = this.currentGroupIdsCache.set
                    global.logger?.mark?.(`[发言统计] 全局统计 当前群列表来自缓存, 群数=${currentGroupIds.size}, 缓存已存在${Math.round(age / 1000)}秒`)
                }
            }
            if (currentGroupIds !== null && currentGroupIds.size > 0) {
                global.logger?.mark?.(`[发言统计] 全局统计 当前群列表: 来源=${runtimeGroupEntries.length > 0 ? 'Bot.gl' : '缓存'}, 群数=${currentGroupIds.size}`)
            } else {
                global.logger?.mark?.('[发言统计] 全局统计 未获取到当前群列表(Bot.gl/缓存均不可用), 将统计数据库全部非归档群')
            }
            global.logger?.mark?.(`[发言统计] 全局统计 数据库群数=${allGroupIds.length}, 已归档群数=${archivedGroupIdsSet.size}`)

            let totalGroups = 0
            let totalUsersSet = new Set()
            let totalMessages = totalMessagesResult || 0
            let totalWords = totalWordsResult || 0
            let todayActiveSet = new Set()
            let monthActive = new Set()

            const groupStatsList = []

            for (const groupId of allGroupIds) {
                if (archivedGroupIdsSet.has(String(groupId))) {
                    continue
                }
                // 只统计当前仍在的群，与 #群列表 一致
                if (currentGroupIds !== null && !currentGroupIds.has(String(groupId))) {
                    continue
                }
                try {
                    const groupIdKey = String(groupId)
                    const users = allUsersMap.get(groupId) || allUsersMap.get(groupIdKey) || []
                    if (users.length === 0) continue

                    for (const user of users) {
                        totalUsersSet.add(user.user_id)
                    }

                    let groupMessages = 0
                    let groupWords = 0

                    const dailyStatsList = allDailyStatsMap.get(groupId) || allDailyStatsMap.get(groupIdKey) || []
                    const monthlyStatsList = allMonthlyStatsMap.get(groupId) || allMonthlyStatsMap.get(groupIdKey) || []
                    
                    const dailyStatsMap = new Map(dailyStatsList.map(s => [s.user_id, s]))
                    const monthlyStatsMap = new Map(monthlyStatsList.map(s => [s.user_id, s]))

                    for (const user of users) {
                        const msgCount = parseInt(user.total_count || 0, 10)
                        const wordCount = parseInt(user.total_words || 0, 10)
                        groupMessages += msgCount
                        groupWords += wordCount

                        const dailyStat = dailyStatsMap.get(user.user_id)
                        if (dailyStat && parseInt(dailyStat.message_count || 0, 10) > 0) {
                            todayActiveSet.add(`${groupId}_${user.user_id}`)
                        }

                        const monthlyStat = monthlyStatsMap.get(user.user_id)
                        if (monthlyStat && parseInt(monthlyStat.message_count || 0, 10) > 0) {
                            monthActive.add(`${groupId}_${user.user_id}`)
                        }
                    }

                    const groupTodayActive = dailyStatsList.length
                    const groupMonthActive = monthlyStatsList.length
                    const userIds = users.map(user => String(user.user_id))
                    const todayActiveUserIds = dailyStatsList.map(stat => String(stat.user_id))
                    const monthActiveUserIds = monthlyStatsList.map(stat => String(stat.user_id))
                    const runtimeInfo = runtimeGroupMap.get(groupIdKey) || this.getRuntimeGroupInfo(groupIdKey)
                    const dcGuildId = this.normalizeGroupId(
                        runtimeInfo?.group?.guild?.id
                        || runtimeInfo?.group?.guild_id
                        || runtimeInfo?.group?.guildId
                    )
                    const dcServerName = this.normalizeGroupName(
                        runtimeInfo?.group?.guild?.name
                        || runtimeInfo?.group?.guild_name
                        || runtimeInfo?.group?.guildName
                    )
                    const dcGuildIconUrl = this.parseDiscordGuildIconUrl(
                        dcGuildId,
                        runtimeInfo?.group?.guild?.icon
                        || runtimeInfo?.group?.guild?.icon_hash
                        || runtimeInfo?.group?.guild_icon
                        || runtimeInfo?.group?.guildIcon
                    )

                    let groupName = allGroupsInfoMap.get(groupId) || allGroupsInfoMap.get(groupIdKey)

                    if (!groupName) {
                        if (runtimeInfo.groupName) {
                            groupName = runtimeInfo.groupName
                            this.dbService.saveGroupInfo(groupIdKey, groupName)
                                .catch(() => {
                                    if (globalConfig.getConfig('global.debugLog')) {
                                        globalConfig.debug('[数据服务-保存群信息] 非关键错误')
                                    }
                                })
                            allGroupsInfoMap.set(groupIdKey, groupName)
                        }
                    }

                    if (!groupName) {
                        groupName = this.dbService.getDefaultGroupDisplayName(groupIdKey)
                    }

                    groupStatsList.push({
                        groupId: groupIdKey,
                        groupName: groupName,
                        platform: this.detectGroupPlatform(groupIdKey),
                        userCount: users.length,
                        totalMessages: groupMessages,
                        totalWords: groupWords,
                        todayActive: groupTodayActive,
                        monthActive: groupMonthActive,
                        channelIds: [groupIdKey],
                        channelCount: 1,
                        isDcMerged: false,
                        dcGuildId: dcGuildId || '',
                        dcServerName: dcServerName || '',
                        dcGuildIconUrl: dcGuildIconUrl || '',
                        _userIds: userIds,
                        _todayActiveUserIds: todayActiveUserIds,
                        _monthActiveUserIds: monthActiveUserIds
                    })
                } catch (err) {
                    this.error(`获取群组 ${groupId} 统计数据失败:`, err)
                }
            }

            const mergedGroupStatsList = this.mergeDiscordGroupStats(groupStatsList)
            await Promise.all(mergedGroupStatsList.map(async group => {
                if (!group || group.platform !== 'discord') return

                const guildInfo = await this.getDiscordGuildInfoForGroup(group).catch(() => null)
                if (!guildInfo) return

                if (!group.dcGuildId && guildInfo.guildId) {
                    group.dcGuildId = guildInfo.guildId
                }
                if (!group.dcServerName && guildInfo.guildName) {
                    group.dcServerName = guildInfo.guildName
                }
                if (!group.dcGuildIconUrl && guildInfo.guildIconUrl) {
                    group.dcGuildIconUrl = guildInfo.guildIconUrl
                }

                if (group.isDcMerged && guildInfo.guildName) {
                    // 服务器维度条目优先展示真实服务器名
                    group.groupName = guildInfo.guildName
                }
            }))
            mergedGroupStatsList.sort((a, b) => b.totalMessages - a.totalMessages)
            totalGroups = mergedGroupStatsList.length

            // 仅统计当前群时，消息总量和字数按当前群重新汇总，与统计群数一致
            if (currentGroupIds !== null) {
                totalMessages = mergedGroupStatsList.reduce((s, g) => s + (g.totalMessages || 0), 0)
                totalWords = mergedGroupStatsList.reduce((s, g) => s + (g.totalWords || 0), 0)
            }
            global.logger?.mark?.(`[发言统计] 全局统计 计算完成: 统计群数=${totalGroups}, 统计用户数=${totalUsersSet.size}, 消息总量=${totalMessages}, 群列表条数=${mergedGroupStatsList.length}`)

            const totalPages = Math.ceil(mergedGroupStatsList.length / pageSize)
            const startIndex = (page - 1) * pageSize
            const endIndex = startIndex + pageSize
            const pagedGroups = mergedGroupStatsList.slice(startIndex, endIndex)

            let earliestTime = null
            let statsDurationHours = 0
            try {
                if (currentGroupIds !== null && currentGroupIds.size > 0) {
                    const ids = Array.from(currentGroupIds)
                    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
                    const earliestResult = await this.dbService.get(
                        `SELECT MIN(created_at) as earliest_time FROM user_agg_stats WHERE group_id IN (${placeholders})`,
                        ...ids
                    )
                    earliestTime = earliestResult?.earliest_time || null
                } else {
                    const earliestResult = await this.dbService.get(
                        'SELECT MIN(created_at) as earliest_time FROM user_agg_stats WHERE group_id NOT IN (SELECT group_id FROM archived_groups)'
                    )
                    earliestTime = earliestResult?.earliest_time || null
                }
                if (earliestTime) {
                    const earliestDate = new Date(earliestTime)
                    const now = new Date()
                    const diffMs = now - earliestDate
                    statsDurationHours = Math.floor(diffMs / (1000 * 60 * 60))
                }
            } catch (err) {
                this.error('获取最早统计时间失败:', err)
            }

            const result = {
                totalGroups: totalGroups,
                totalUsers: totalUsersSet.size, // 使用 Set 的大小作为唯一用户数
                totalMessages: totalMessages,
                totalWords: totalWords,
                todayActive: todayActiveSet.size,
                monthActive: monthActive.size,
                archivedGroups: archivedGroupsCount, // 归档群组数量
                groups: pagedGroups,
                currentPage: page,
                totalPages: totalPages,
                pageSize: pageSize,
                earliestTime: earliestTime,
                statsDurationHours: statsDurationHours
            }
            
            this.globalStatsCache.set(cacheKey, result)
            
            return result
        } catch (err) {
            this.error('获取全局统计数据失败:', err)
            return {
                totalGroups: 0,
                totalUsers: 0,
                totalMessages: 0,
                totalWords: 0,
                todayActive: 0,
                monthActive: 0,
                archivedGroups: 0,
                groups: [],
                currentPage: 1,
                totalPages: 0,
                pageSize: pageSize
            }
        }
    }

    /**
     * 获取群组时间分布统计
     * @param {string} groupId 群组ID
     * @param {string} type 统计类型：'hourly' | 'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { startDate, endDate }
     * @returns {Promise<Array>} 时间分布数据
     */
    async getTimeDistribution(groupId, type = 'hourly', options = {}) {
        try {
            const now = TimeUtils.getUTC8Date()
            let startDate = options.startDate
            let endDate = options.endDate || TimeUtils.formatDate(now)

            // 如果没有指定开始日期，默认最近7天
            if (!startDate) {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                startDate = TimeUtils.formatDate(sevenDaysAgo)
            }

            const result = []
            const dateExpr = this.getTimeDimensionExpr('date', 'mgs.stat_hour')
            const weekExpr = this.getTimeDimensionExpr('week', 'mgs.stat_hour')
            const monthExpr = this.getTimeDimensionExpr('month', 'mgs.stat_hour')

            switch (type) {
                case 'daily':
                    const dailyStats = await this.dbService.all(
                        `SELECT ${dateExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND ${dateExpr} >= $2 AND ${dateExpr} <= $3
                         GROUP BY ${dateExpr}
                         ORDER BY ${dateExpr}`,
                        groupId,
                        startDate,
                        endDate
                    )

                    for (const stat of dailyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'weekly':
                    const weeklyStats = await this.dbService.all(
                        `SELECT ${weekExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1
                         GROUP BY ${weekExpr}
                         ORDER BY ${weekExpr} DESC
                         LIMIT 12`,
                        groupId
                    )

                    for (const stat of weeklyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'monthly':
                    const monthlyStats = await this.dbService.all(
                        `SELECT ${monthExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1
                         GROUP BY ${monthExpr}
                         ORDER BY ${monthExpr} DESC
                         LIMIT 12`,
                        groupId
                    )

                    for (const stat of monthlyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'hourly':
                default:
                    const hourlyStats = await this.dbService.all(
                        `SELECT ${dateExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND ${dateExpr} >= $2 AND ${dateExpr} <= $3
                         GROUP BY ${dateExpr}
                         ORDER BY ${dateExpr}`,
                        groupId,
                        startDate,
                        endDate
                    )

                    for (const stat of hourlyStats) {
                        result.push({
                            date: stat.date,
                            hour: null, // 由于没有小时数据，设为 null
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取群组时间分布统计失败:`, err)
            return []
        }
    }

    /**
     * 获取用户时间分布统计
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @param {string} type 统计类型：'hourly' | 'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { startDate, endDate }
     * @returns {Promise<Array>} 时间分布数据
     */
    async getUserTimeDistribution(userId, groupId, type = 'hourly', options = {}) {
        try {
            const now = TimeUtils.getUTC8Date()
            let startDate = options.startDate
            let endDate = options.endDate || TimeUtils.formatDate(now)

            if (!startDate) {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                startDate = TimeUtils.formatDate(sevenDaysAgo)
            }

            const result = []
            const weekExpr = this.getTimeDimensionExpr('week', 'mgs.stat_hour')
            const monthExpr = this.getTimeDimensionExpr('month', 'mgs.stat_hour')

            switch (type) {
                case 'daily':
                    const dailyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDate,
                        endDate
                    )

                    for (const stat of dailyStats) {
                        result.push({
                            date: stat.date_key,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'weekly':
                    const weeklyStats = await this.dbService.all(
                        `SELECT ${weekExpr} as date,
                                SUM(message_count) as message_count,
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND user_id = $2
                         GROUP BY ${weekExpr}
                         ORDER BY ${weekExpr} DESC
                         LIMIT 12`,
                        groupId,
                        userId
                    )

                    for (const stat of weeklyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'monthly':
                    const monthlyStats = await this.dbService.all(
                        `SELECT ${monthExpr} as date,
                                SUM(message_count) as message_count,
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND user_id = $2
                         GROUP BY ${monthExpr}
                         ORDER BY ${monthExpr} DESC
                         LIMIT 12`,
                        groupId,
                        userId
                    )

                    for (const stat of monthlyStats) {
                        result.push({
                            date: stat.date,
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break

                case 'hourly':
                default:
                    const hourlyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDate,
                        endDate
                    )

                    for (const stat of hourlyStats) {
                        result.push({
                            date: stat.date_key,
                            hour: null, // 由于没有小时数据，设为 null
                            message_count: parseInt(stat.message_count || 0, 10),
                            word_count: parseInt(stat.word_count || 0, 10)
                        })
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取用户时间分布统计失败:`, err)
            return []
        }
    }

    /**
     * 获取群组消息趋势
     * @param {string} groupId 群组ID
     * @param {string} period 统计周期：'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { days, metric }
     * @returns {Promise<Array>} 趋势数据
     */
    async getGroupTrend(groupId, period = 'daily', options = {}) {
        try {
            const days = parseInt(options.days || 7, 10)
            const metric = options.metric || 'messages'
            const now = TimeUtils.getUTC8Date()
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
            const startDateStr = TimeUtils.formatDate(startDate)

            const result = []
            let previousValue = null
            const dateExpr = this.getTimeDimensionExpr('date', 'mgs.stat_hour')
            const weekExpr = this.getTimeDimensionExpr('week', 'mgs.stat_hour')
            const monthExpr = this.getTimeDimensionExpr('month', 'mgs.stat_hour')

            switch (period) {
                case 'daily':
                    const dailyStats = await this.dbService.all(
                        `SELECT ${dateExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count,
                                COUNT(DISTINCT user_id) as user_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND ${dateExpr} >= $2
                         GROUP BY ${dateExpr}
                         ORDER BY ${dateExpr}`,
                        groupId,
                        startDateStr
                    )

                    for (const stat of dailyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'weekly':
                    const safeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
                    const weeklyStats = await this.dbService.all(
                        `SELECT ${weekExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count,
                                COUNT(DISTINCT user_id) as user_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1
                         GROUP BY ${weekExpr}
                         ORDER BY ${weekExpr} DESC
                         LIMIT ${safeDays}`,
                        groupId
                    )

                    for (const stat of weeklyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'monthly':
                    const safeDaysMonthly = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
                    const monthlyStats = await this.dbService.all(
                        `SELECT ${monthExpr} as date,
                                SUM(message_count) as message_count, 
                                SUM(word_count) as word_count,
                                COUNT(DISTINCT user_id) as user_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1
                         GROUP BY ${monthExpr}
                         ORDER BY ${monthExpr} DESC
                         LIMIT ${safeDaysMonthly}`,
                        groupId
                    )

                    for (const stat of monthlyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : metric === 'words'
                            ? parseInt(stat.word_count || 0, 10)
                            : parseInt(stat.user_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取群组消息趋势失败:`, err)
            return []
        }
    }

    /**
     * 获取用户消息趋势
     * @param {string} userId 用户ID
     * @param {string} groupId 群组ID
     * @param {string} period 统计周期：'daily' | 'weekly' | 'monthly'
     * @param {Object} options 选项 { days, metric }
     * @returns {Promise<Array>} 趋势数据
     */
    async getUserTrend(userId, groupId, period = 'daily', options = {}) {
        try {
            const days = parseInt(options.days || 7, 10)
            const metric = options.metric || 'messages'
            const now = TimeUtils.getUTC8Date()
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
            const startDateStr = TimeUtils.formatDate(startDate)

            const result = []
            let previousValue = null
            const weekExpr = this.getTimeDimensionExpr('week', 'mgs.stat_hour')
            const monthExpr = this.getTimeDimensionExpr('month', 'mgs.stat_hour')

            switch (period) {
                case 'daily':
                    const dailyStats = await this.dbService.getDailyStatsByDateRange(
                        groupId,
                        userId,
                        startDateStr,
                        TimeUtils.formatDate(now)
                    )

                    for (const stat of dailyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date_key,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'weekly':
                    const safeDaysWeekly = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
                    const weeklyStats = await this.dbService.all(
                        `SELECT ${weekExpr} as date,
                                SUM(message_count) as message_count,
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND user_id = $2
                         GROUP BY ${weekExpr}
                         ORDER BY ${weekExpr} DESC
                         LIMIT ${safeDaysWeekly}`,
                        groupId,
                        userId
                    )

                    for (const stat of weeklyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break

                case 'monthly':
                    const safeDaysMonthlyUser = Math.min(Math.max(parseInt(days, 10) || 7, 1), 100)
                    const monthlyStats = await this.dbService.all(
                        `SELECT ${monthExpr} as date,
                                SUM(message_count) as message_count,
                                SUM(word_count) as word_count
                         FROM message_granular_stats mgs
                         WHERE group_id = $1 AND user_id = $2
                         GROUP BY ${monthExpr}
                         ORDER BY ${monthExpr} DESC
                         LIMIT ${safeDaysMonthlyUser}`,
                        groupId,
                        userId
                    )

                    for (const stat of monthlyStats) {
                        const value = metric === 'messages' 
                            ? parseInt(stat.message_count || 0, 10)
                            : parseInt(stat.word_count || 0, 10)

                        const change = previousValue !== null && previousValue > 0
                            ? ((value - previousValue) / previousValue * 100).toFixed(2)
                            : null

                        result.push({
                            date: stat.date,
                            value: value,
                            change: change ? parseFloat(change) : null
                        })

                        previousValue = value
                    }
                    break
            }

            return result
        } catch (err) {
            this.error(`获取用户消息趋势失败:`, err)
            return []
        }
    }

    /**
     * 清除群组统计数据（归档到暂存表）
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否成功
     */
    async clearGroupStats(groupId) {
        try {
            // 使用数据库的归档方法将数据移到暂存表
            await this.dbService.archiveGroupData(groupId)
            
            // 清除缓存
            this.groupStatsCache.delete(String(groupId))
            this.clearCache(groupId)
            
            // 更新消息记录器中的归档缓存（如果存在）
            if (this.messageRecorder && this.messageRecorder.archivedGroupsCache) {
                this.messageRecorder.archivedGroupsCache.set(String(groupId), true)
                this.messageRecorder.archivedGroupsCacheTime?.set(String(groupId), Date.now())
            }
            
            return true
        } catch (err) {
            this.error(`清除群组统计失败:`, err)
            return false
        }
    }

    /**
     * 恢复归档的群组数据
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否成功
     */
    async restoreGroupStats(groupId) {
        try {
            // 从暂存表恢复数据
            const restored = await this.dbService.restoreGroupData(groupId)
            
            if (restored) {
                // 清除缓存，强制重新加载
                this.groupStatsCache.delete(String(groupId))
                this.clearCache(groupId)
                
                // 清除消息记录器中的归档缓存（如果存在）
                if (this.messageRecorder && this.messageRecorder.archivedGroupsCache) {
                    this.messageRecorder.archivedGroupsCache.delete(String(groupId))
                    this.messageRecorder.archivedGroupsCacheTime?.delete(String(groupId))
                }
            }
            
            return restored
        } catch (err) {
            this.error(`恢复群组统计失败:`, err)
            return false
        }
    }

    /**
     * 检查群组是否已归档
     * @param {string} groupId 群号
     * @returns {Promise<boolean>} 是否已归档
     */
    async isGroupArchived(groupId) {
        try {
            return await this.dbService.isGroupArchived(groupId)
        } catch (err) {
            this.error(`检查群组归档状态失败:`, err)
            return false
        }
    }

    /**
     * 清理缓存
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} options 缓存清理选项
     * @param {boolean} options.clearRankingCache 是否清理排行榜缓存（默认 true）
     * @param {boolean} options.clearGlobalStatsCache 是否清理全局统计缓存（默认 true）
     * @param {boolean} options.clearGroupStatsCache 是否清理群统计缓存（默认 true）
     */
    clearCache(groupId, userId, options = {}) {
        const clearRankingCache = options.clearRankingCache !== false
        const clearGlobalStatsCache = options.clearGlobalStatsCache !== false
        const clearGroupStatsCache = options.clearGroupStatsCache !== false

        if (userId) {
            const cacheKey = `${groupId}_${userId}`
            this.cache.delete(cacheKey)
        } else {
            // 清除该群的所有缓存
            const keysToDelete = []
            for (const key of this.cache.cache.keys()) {
                if (key.startsWith(`${groupId}_`)) {
                    keysToDelete.push(key)
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key))
        }
        
        // 清除排行榜和统计缓存（数据更新后需要重新查询）
        if (clearRankingCache) {
            this.rankingCache.clear()
        }
        if (clearGlobalStatsCache) {
            this.globalStatsCache.clear()
        }
        if (clearGroupStatsCache) {
            this.groupStatsCache.delete(String(groupId))
        }
    }

    /**
     * 清理所有缓存
     * @returns {Object} 清理结果统计
     */
    clearAllCache() {
        const userCacheSize = this.cache.size()
        const groupStatsCacheSize = this.groupStatsCache.size()
        const rankingCacheSize = this.rankingCache.size()
        const globalStatsCacheSize = this.globalStatsCache.size()
        const discordUserInfoCacheSize = this.discordUserInfoCache.size()
        const discordGuildInfoCacheSize = this.discordGuildInfoCache.size()
        const discordChannelInfoCacheSize = this.discordChannelInfoCache.size()
        const persistentUsers = Object.keys(this.discordPersistentCache.users || {}).length
        const persistentGuilds = Object.keys(this.discordPersistentCache.guilds || {}).length
        const persistentChannels = Object.keys(this.discordPersistentCache.channels || {}).length
        
        // 清理所有缓存
        this.cache.clear()
        this.groupStatsCache.clear()
        this.rankingCache.clear()
        this.globalStatsCache.clear()
        this.discordUserInfoCache.clear()
        this.discordGuildInfoCache.clear()
        this.discordChannelInfoCache.clear()
        this.httpProxyAgentCache.clear()
        
        return {
            userCache: userCacheSize,
            groupStatsCache: groupStatsCacheSize,
            rankingCache: rankingCacheSize,
            globalStatsCache: globalStatsCacheSize,
            discordUserInfoCache: discordUserInfoCacheSize,
            discordGuildInfoCache: discordGuildInfoCacheSize,
            discordChannelInfoCache: discordChannelInfoCacheSize,
            persistentAvatarUsers: persistentUsers,
            persistentAvatarGuilds: persistentGuilds,
            persistentAvatarChannels: persistentChannels,
            total: userCacheSize
                + groupStatsCacheSize
                + rankingCacheSize
                + globalStatsCacheSize
                + discordUserInfoCacheSize
                + discordGuildInfoCacheSize
                + discordChannelInfoCacheSize
        }
    }
}

// 单例模式
let dataServiceInstance = null

/**
 * 获取数据服务实例（单例）
 * @returns {DataService} 数据服务实例
 */
export function getDataService() {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService()
    }
    return dataServiceInstance
}

export { DataService }
export default DataService
