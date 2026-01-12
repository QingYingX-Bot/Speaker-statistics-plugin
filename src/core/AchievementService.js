import fs from 'fs'
import path from 'path'
import { getDatabaseService } from './database/DatabaseService.js'
import { globalConfig } from './ConfigManager.js'
import { PathResolver } from './utils/PathResolver.js'
import { TimeUtils } from './utils/TimeUtils.js'
import { AchievementUtils } from './utils/AchievementUtils.js'

/**
 * 成就服务类
 * 负责成就的定义、检查、解锁和管理（使用数据库存储）
 */
class AchievementService {
    static watchingStarted = false
    static achievementWatchers = new Map()
    
    constructor(dataService) {
        this.dataService = dataService
        this.dbService = getDatabaseService()
        this.configDir = PathResolver.getConfigDir()
        this.dataDir = PathResolver.getDataDir()
        this.achievementsDir = path.join(this.dataDir, 'achievements')

        this.achievementCache = new Map()
        this.cacheTimestamp = 0
        this.cacheTTL = 5 * 60 * 1000

        this.achievementDefinitions = null
        this.categories = null
        this.rarities = null
        this.definitionsLoaded = false
        
        this.userAchievementDefinitions = null
        this.userAchievementDefinitionsLoaded = false
        this.userAchievementDefinitionsTimestamp = 0

        this.reloadTimeout = null
        this.startWatchingAchievements()
    }

    /**
     * 获取成就定义（带缓存）
     */
    getAchievementDefinitions() {
        if (this.definitionsLoaded && this.achievementDefinitions &&
            (Date.now() - this.cacheTimestamp) < this.cacheTTL) {
            return this.achievementDefinitions
        }

        this.achievementDefinitions = this.loadAchievementsFromFile()
        this.categories = this.loadCategoriesFromFile()
        this.rarities = this.loadRaritiesFromFile()
        this.definitionsLoaded = true
        this.cacheTimestamp = Date.now()

        return this.achievementDefinitions
    }

    /**
     * 从JSON文件加载成就定义
     */
    loadAchievementsFromFile() {
        const achievements = {}

        try {
            const achievementsDir = path.join(this.configDir, 'achievements')
            
            if (fs.existsSync(achievementsDir) && fs.statSync(achievementsDir).isDirectory()) {
                const files = fs.readdirSync(achievementsDir).filter(file => file.endsWith('.json'))
                
                for (const file of files) {
                    const filePath = path.join(achievementsDir, file)
                    try {
                        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                        Object.assign(achievements, fileData)
                        globalConfig.debug(`已加载系统默认成就分类文件: ${file}`)
                    } catch (fileErr) {
                        globalConfig.error(`加载系统成就分类文件失败: ${file}`, fileErr)
                    }
                }
                
                if (Object.keys(achievements).length > 0) {
                    globalConfig.debug('已加载系统默认成就配置')
                } else {
                    globalConfig.error('未找到系统默认成就配置文件')
                }
            } else {
                globalConfig.error('未找到系统默认成就配置目录')
            }

            if (fs.existsSync(this.achievementsDir)) {
                const files = fs.readdirSync(this.achievementsDir).filter(file => {
                    return file.endsWith('.json')
                })

                for (const file of files) {
                    const filePath = path.join(this.achievementsDir, file)
                    try {
                        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                        Object.assign(achievements, fileData)
                        globalConfig.debug(`已加载用户自定义成就文件: ${file}`)
                    } catch (fileErr) {
                        globalConfig.error(`加载用户成就文件失败: ${file}`, fileErr)
                    }
                    }
                }

            globalConfig.debug(`共加载 ${Object.keys(achievements).length} 个成就`)
            return achievements
        } catch (err) {
            globalConfig.error('加载成就配置文件失败:', err)
            return {}
        }
    }

    /**
     * 从JSON文件加载分类定义
     */
    loadCategoriesFromFile() {
        const configPath = path.join(this.configDir, 'achievements-config.json')
        
        if (fs.existsSync(configPath)) {
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                return configData.categories || {}
            } catch (err) {
                globalConfig.error('加载成就分类配置失败:', err)
            }
        } else {
            globalConfig.error('未找到成就分类配置文件: achievements-config.json')
        }

        return {}
    }

    /**
     * 从JSON文件加载稀有度定义
     */
    loadRaritiesFromFile() {
        const configPath = path.join(this.configDir, 'achievements-config.json')
        
        if (fs.existsSync(configPath)) {
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                return configData.rarities || {}
            } catch (err) {
                globalConfig.error('加载成就稀有度配置失败:', err)
            }
        } else {
            globalConfig.error('未找到成就稀有度配置文件: achievements-config.json')
        }

        return {}
    }

    /**
     * 重新加载成就配置
     */
    reloadAchievements() {
        this.achievementDefinitions = this.loadAchievementsFromFile()
        this.categories = this.loadCategoriesFromFile()
        this.rarities = this.loadRaritiesFromFile()
        this.definitionsLoaded = false
        this.cacheTimestamp = 0
        
        this.userAchievementDefinitions = null
        this.userAchievementDefinitionsLoaded = false
        this.userAchievementDefinitionsTimestamp = 0
        
        globalConfig.debug('成就配置已重新加载')
    }

    /**
     * 开始监听成就配置文件变化
     */
    startWatchingAchievements() {
        if (AchievementService.watchingStarted) {
            return
        }
        
        try {
            const defaultAchievementsDir = path.join(this.configDir, 'achievements')
            if (fs.existsSync(defaultAchievementsDir) && fs.statSync(defaultAchievementsDir).isDirectory()) {
                if (!AchievementService.achievementWatchers.has(defaultAchievementsDir)) {
                    const watcher = fs.watch(defaultAchievementsDir, { recursive: false }, (eventType, filename) => {
                        if (eventType === 'change' && filename && filename.endsWith('.json')) {
                            this.handleAchievementFileChange()
                        }
                    })
                    AchievementService.achievementWatchers.set(defaultAchievementsDir, watcher)
                }
            }

            const configPath = path.join(this.configDir, 'achievements-config.json')
            if (fs.existsSync(configPath) && !AchievementService.achievementWatchers.has(configPath)) {
                const watcher = fs.watch(configPath, (eventType) => {
                    if (eventType === 'change') {
                        this.handleAchievementFileChange()
                    }
                })
                AchievementService.achievementWatchers.set(configPath, watcher)
            }

            if (fs.existsSync(this.achievementsDir) && !AchievementService.achievementWatchers.has(this.achievementsDir)) {
                const watcher = fs.watch(this.achievementsDir, { recursive: true }, (eventType, filename) => {
                    if (eventType === 'change' && filename && filename.endsWith('.json')) {
                        this.handleAchievementFileChange()
                    }
                })
                AchievementService.achievementWatchers.set(this.achievementsDir, watcher)
            }

            AchievementService.watchingStarted = true
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug('已启动成就配置文件监听')
            }
        } catch (err) {
            globalConfig.error('启动成就配置文件监听失败:', err)
        }
    }

    /**
     * 处理成就配置文件变化（带防抖）
     */
    handleAchievementFileChange() {
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout)
        }
        this.reloadTimeout = setTimeout(() => {
            if (globalConfig.getConfig('global.debugLog')) {
                globalConfig.debug('检测到成就配置文件变化，正在重新加载...')
            }
            this.reloadAchievements()
        }, 2000)
    }

    /**
     * 停止监听成就配置文件
     */
    stopWatchingAchievements() {
        for (const [path, watcher] of AchievementService.achievementWatchers) {
            try {
                watcher.close()
            } catch (err) {
                globalConfig.error(`关闭成就文件监听失败 (${path}):`, err)
            }
        }
        AchievementService.achievementWatchers.clear()
        AchievementService.watchingStarted = false
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout)
        }
    }

    /**
     * 获取用户成就定义（来自 users.json，带缓存优化）
     * @param {boolean} forceReload - 是否强制重新加载（默认 false）
     * @returns {Object} 用户成就定义对象
     */
    getUserAchievementDefinitions(forceReload = false) {
        // 使用缓存，避免重复读取文件和输出日志
        if (!forceReload && this.userAchievementDefinitionsLoaded && this.userAchievementDefinitions !== null) {
            // 检查文件修改时间，如果文件未修改则直接返回缓存
            const usersJsonPath = path.join(this.achievementsDir, 'users.json')
            try {
                if (fs.existsSync(usersJsonPath)) {
                    const stats = fs.statSync(usersJsonPath)
                    const fileMtime = stats.mtime.getTime()
                    if (fileMtime === this.userAchievementDefinitionsTimestamp) {
                        return this.userAchievementDefinitions
                    }
                }
            } catch (err) {
                return this.userAchievementDefinitions || {}
            }
        }
        
        const usersJsonPath = path.join(this.achievementsDir, 'users.json')
        const userDefinitions = {}
        
        try {
            if (fs.existsSync(usersJsonPath)) {
                const fileData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'))
                Object.assign(userDefinitions, fileData)
                
                const stats = fs.statSync(usersJsonPath)
                this.userAchievementDefinitionsTimestamp = stats.mtime.getTime()
                
                if (!this.userAchievementDefinitionsLoaded || forceReload) {
                    globalConfig.debug(`已加载用户成就文件: users.json (${Object.keys(userDefinitions).length} 个成就)`)
                }
            } else {
                if (!this.userAchievementDefinitionsLoaded) {
                    globalConfig.debug(`用户成就文件不存在: users.json`)
                }
            }
        } catch (err) {
            globalConfig.error(`加载用户成就文件失败: users.json`, err)
        }
        
        this.userAchievementDefinitions = userDefinitions
        this.userAchievementDefinitionsLoaded = true
        
        return userDefinitions
    }

    /**
     * 检查成就是否是用户成就（来自 users.json，需要手动授予）
     * @param {string} achievementId 成就ID
     * @returns {boolean} 是否是用户成就
     */
    isUserAchievement(achievementId) {
        const userDefinitions = this.getUserAchievementDefinitions()
        return achievementId in userDefinitions
    }

    /**
     * 获取所有成就定义（包括群专属和用户成就）
     * @param {string} groupId 群号
     * @returns {Object} 成就定义对象
     */
    getAllAchievementDefinitions(groupId) {
        const globalDefinitions = this.getAchievementDefinitions()
        
        const userDefinitions = this.getUserAchievementDefinitions()
        
        const groupAchievementsDir = path.join(this.achievementsDir, 'group', groupId)
        const groupDefinitions = {}
        
        try {
            if (fs.existsSync(groupAchievementsDir)) {
                const files = fs.readdirSync(groupAchievementsDir).filter(file => file.endsWith('.json'))
                for (const file of files) {
                    const filePath = path.join(groupAchievementsDir, file)
                    try {
                        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
                        Object.assign(groupDefinitions, fileData)
                    } catch (fileErr) {
                        globalConfig.error(`加载群专属成就文件失败: ${file}`, fileErr)
                    }
                }
            }
        } catch (err) {
            globalConfig.error(`加载群专属成就失败 (${groupId}):`, err)
        }

        return {
            ...globalDefinitions,
            ...userDefinitions,
            ...groupDefinitions
        }
    }

    /**
     * 获取用户成就数据（从数据库）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @returns {Object} 用户成就数据
     */
    async getUserAchievements(groupId, userId) {
        try {
            const allAchievements = await this.dbService.getAllUserAchievements(groupId, userId)
            const achievements = {}
            let unlockedCount = 0

            // 获取所有成就定义（用于识别全局成就：特殊成就或节日成就）
            const allDefinitions = this.getAllAchievementDefinitions(groupId)

            for (const achievement of allAchievements) {
                achievements[achievement.achievement_id] = {
                    unlocked: achievement.unlocked === true,
                    unlocked_at: achievement.unlocked_at,
                    progress: achievement.progress || 0
                }
                if (achievement.unlocked === true) {
                    unlockedCount++
                }
            }

            // 对于全局成就（特殊成就或节日成就），检查是否在其他群已解锁（当前群未解锁的情况下）
            for (const [achievementId, definition] of Object.entries(allDefinitions)) {
                const isGlobal = AchievementUtils.isGlobalAchievement(definition.rarity)
                
                if (isGlobal) {
                    // 如果当前群未解锁，检查其他群是否已解锁
                    if (!achievements[achievementId] || !achievements[achievementId].unlocked) {
                        const otherGroupAchievement = await this.dbService.getAchievementFromAnyGroup(userId, achievementId)
                        if (otherGroupAchievement && otherGroupAchievement.unlocked === true) {
                            // 如果其他群已解锁，合并到当前群的成就数据中（不写入数据库，仅用于显示）
                            achievements[achievementId] = {
                                unlocked: true,
                                unlocked_at: otherGroupAchievement.unlocked_at,
                                progress: otherGroupAchievement.progress || 0
                            }
                            unlockedCount++
                        }
                    }
                }
            }

            // 先检查并自动卸下超过24小时的自动佩戴成就
            await this.checkAndRemoveExpiredAutoDisplay(groupId, userId)
            
            // 获取显示成就
            let displayAchievement = await this.dbService.getDisplayAchievement(groupId, userId)
            
            // 如果存在显示成就，使用成就定义中的最新名称和稀有度（确保修改配置后名称会同步）
            if (displayAchievement) {
                const definition = allDefinitions[displayAchievement.achievement_id]
                if (definition) {
                    // 使用定义中的最新名称和稀有度，覆盖数据库中可能过期的数据
                    displayAchievement.achievement_name = definition.name || displayAchievement.achievement_name
                    displayAchievement.rarity = definition.rarity || displayAchievement.rarity
                }
            }
            
            // 如果没有显示成就，自动选择史诗级及以上成就（按稀有度降序，24小时时限）
            // 注意：只选择未过期的成就（解锁时间+24小时）
            if (!displayAchievement) {
                const now = TimeUtils.getUTC8Date()
                // 使用 achievements 对象而不是 allAchievements 数组，以确保包含全局成就（特殊成就或节日成就）
                const epicOrHigher = Object.entries(achievements)
                    .filter(([achievementId, achievementData]) => {
                        if (!achievementData.unlocked) return false
                        const definition = allDefinitions[achievementId]
                        if (!definition) return false
                        if (!AchievementUtils.isRarityOrHigher(definition.rarity, 'epic')) return false
                        
                        // 检查成就是否过期（解锁时间+24小时）
                        const unlockedAt = achievementData.unlocked_at
                        if (!unlockedAt) return false
                        
                        // 解析解锁时间
                        let unlockedAtDate
                        if (unlockedAt instanceof Date) {
                            unlockedAtDate = unlockedAt
                        } else if (typeof unlockedAt === 'string') {
                            if (unlockedAt.includes('T')) {
                                // ISO 8601 格式
                                unlockedAtDate = new Date(unlockedAt)
                                if (unlockedAt.endsWith('Z')) {
                                    const utc8Offset = 8 * 60 * 60 * 1000
                                    unlockedAtDate = new Date(unlockedAtDate.getTime() + utc8Offset)
                                }
                            } else {
                                // 普通格式：YYYY-MM-DD HH:mm:ss
                                const [datePart, timePart] = unlockedAt.split(' ')
                                if (datePart && timePart) {
                                    const [year, month, day] = datePart.split('-').map(Number)
                                    const [hour, minute, second] = timePart.split(':').map(Number)
                                    const utc8Offset = 8 * 60 * 60 * 1000
                                    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second || 0)
                                    unlockedAtDate = new Date(utcTimestamp - utc8Offset)
                                } else {
                                    return false
                                }
                            }
                        } else {
                            return false
                        }
                        
                        if (!unlockedAtDate || isNaN(unlockedAtDate.getTime())) {
                            return false
                        }
                        
                        // 计算卸下时间：解锁时间 + 24小时
                        const removeAt = new Date(unlockedAtDate.getTime() + 24 * 60 * 60 * 1000)
                        
                        // 如果当前时间 >= 卸下时间，说明已过期，不自动佩戴
                        if (now.getTime() >= removeAt.getTime()) {
                            return false
                        }
                        
                        return true
                    })
                    .map(([achievementId, achievementData]) => ({
                        achievement_id: achievementId,
                        unlocked: achievementData.unlocked,
                        unlocked_at: achievementData.unlocked_at,
                        definition: allDefinitions[achievementId]
                    }))
                
                // 按稀有度和解锁时间排序
                AchievementUtils.sortUnlockedAchievements(
                    epicOrHigher,
                    (item) => item.definition?.rarity || 'common',
                    (item) => new Date(item.unlocked_at).getTime()
                )
                
                if (epicOrHigher.length > 0) {
                    const topAchievement = epicOrHigher[0]
                    const definition = topAchievement.definition || allDefinitions[topAchievement.achievement_id]
                    // 使用解锁时间作为 auto_display_at（24小时从解锁时间开始计算）
                    const unlockedAt = topAchievement.unlocked_at || TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
                    
                    displayAchievement = {
                        achievement_id: topAchievement.achievement_id,
                        achievement_name: definition?.name || topAchievement.achievement_id,
                        rarity: definition?.rarity || 'common',
                        is_manual: false,
                        auto_display_at: unlockedAt
                    }
                    // 自动设置为显示成就（24小时时限，从解锁时间开始计算）
                    await this.dbService.setDisplayAchievement(groupId, userId, {
                        id: topAchievement.achievement_id,
                        name: definition?.name || topAchievement.achievement_id,
                        rarity: definition?.rarity || 'common',
                        isManual: false,
                        autoDisplayAt: unlockedAt  // 使用解锁时间，而不是当前时间
                    })
                }
            }

            return {
                achievements,
                unlockedCount,
                displayAchievement: displayAchievement ? {
                    id: displayAchievement.achievement_id,
                    name: displayAchievement.achievement_name,
                    rarity: displayAchievement.rarity,
                    isManual: displayAchievement.is_manual || false,
                    autoDisplayAt: displayAchievement.auto_display_at || null
                } : null
            }
        } catch (err) {
            globalConfig.error('获取用户成就数据失败:', err)
            return {
                achievements: {},
                unlockedCount: 0,
                displayAchievement: null
            }
        }
    }

    /**
     * 保存用户成就数据（到数据库）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @param {Object} achievementData 成就数据
     */
    async saveUserAchievement(groupId, userId, achievementId, achievementData) {
        try {
            // 确保 progress 是数字
            let progress = achievementData.progress
            if (progress === null || progress === undefined) {
                progress = 0
            } else if (typeof progress !== 'number') {
                progress = parseInt(progress, 10) || 0
            }
            
            await this.dbService.saveUserAchievement(groupId, userId, achievementId, {
                unlocked: achievementData.unlocked || false,
                unlocked_at: achievementData.unlocked_at || null,
                progress: progress
            })
        } catch (err) {
            globalConfig.error('保存用户成就数据失败:', err)
        }
    }

    /**
     * 检查并更新用户成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {Object} userData 用户数据
     * @returns {Array} 新解锁的成就列表
     */
    async checkAndUpdateAchievements(groupId, userId, userData) {
        // getUserAchievements 内部会先检查并自动卸下超过24小时的自动佩戴成就，这里不需要重复调用
        const achievementData = await this.getUserAchievements(groupId, userId)
        // 合并全量成就定义（全局 + 群专属）
        const allDefinitions = this.getAllAchievementDefinitions(groupId)
        
        const newAchievements = []
        let progressChanged = false

        // 检查每个成就（包含群专属和用户成就）
        for (const [achievementId, definition] of Object.entries(allDefinitions)) {
            // 用户成就（来自 users.json）需要手动授予，跳过自动检查
            if (this.isUserAchievement(achievementId)) {
                continue
            }

            // 判断是否为全局成就（特殊成就或节日成就）
            const isGlobal = AchievementUtils.isGlobalAchievement(definition.rarity)

            // 对于全局成就，如果已在其他群解锁，则跳过（视为已解锁）
            if (isGlobal) {
                // 先检查当前群是否已解锁
                if (!achievementData.achievements[achievementId]?.unlocked) {
                    // 检查是否在其他群已解锁
                    const unlockedInAnyGroup = await this.dbService.hasAchievementInAnyGroup(userId, achievementId)
                    if (unlockedInAnyGroup) {
                        // 在其他群已解锁，跳过检查（视为已解锁）
                        continue
                    }
                } else {
                    // 当前群已解锁，跳过
                    continue
                }
            } else {
                // 非全局成就，如果当前群已解锁，跳过
                if (achievementData.achievements[achievementId]?.unlocked) {
                    continue
                }
            }

            // 检查成就条件
            const { matched, progressed } = this.checkAchievementCondition(
                definition,
                userData,
                achievementData.achievements,
                achievementId,
                groupId,
                userId
            )
            
            if (progressed) progressChanged = true
            
            if (matched) {
                // 只在真正解锁时记录（不输出日志，由调用方统一输出）
                // 解锁成就（使用 UTC+8 时区）
                const unlockedAt = TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
                
                // 确保 progress 是数字
                let progressValue = definition.condition?.value || 1
                if (typeof progressValue !== 'number') {
                    progressValue = parseInt(progressValue, 10) || 1
                }
                
                const achievementDataToSave = {
                    unlocked: true,
                    unlocked_at: unlockedAt,
                    progress: progressValue
                }

                if (isGlobal) {
                    // 全局成就（特殊成就或节日成就）：同步到所有群
                    await this.dbService.saveFestivalAchievementToAllGroups(userId, achievementId, achievementDataToSave)
                } else {
                    // 普通成就：只保存到当前群
                    await this.saveUserAchievement(groupId, userId, achievementId, achievementDataToSave)
                }

                newAchievements.push({
                    ...definition,
                    id: achievementId,
                    unlockedAt
                })
            } else if (progressed) {
                // 进度更新但未解锁
                let currentProgress = achievementData.achievements[achievementId]?.progress || 0
                // 确保 progress 是数字
                if (typeof currentProgress !== 'number') {
                    currentProgress = parseInt(currentProgress, 10) || 0
                }
                await this.saveUserAchievement(groupId, userId, achievementId, {
                    unlocked: false,
                    unlocked_at: null,
                    progress: currentProgress
                })
            }
        }

        // 移除检查完成的日志，由调用方统一输出

        return newAchievements
    }

    /**
     * 检查成就条件
     * @param {Object} definition 成就定义
     * @param {Object} userData 用户数据
     * @param {Object} achievementData 用户成就数据
     * @param {string} achievementId 成就ID
     * @param {string} groupId 群号（用于文本检查）
     * @param {string} userId 用户ID（用于文本检查）
     * @returns {Object} { matched: boolean, progressed: boolean }
     */
    checkAchievementCondition(definition, userData, achievementData = {}, achievementId = '', groupId = '', userId = '') {
        const { condition } = definition

        if (!condition || !condition.type) {
            return { matched: false, progressed: false }
        }

        switch (condition.type) {
            case 'first_message':
                return { matched: (userData.total || 0) >= 1 }

            case 'total_count':
                return { matched: (userData.total || 0) >= (condition.value || 0) }

            case 'daily_count':
                return { matched: this.getTodayMessageCount(userData) >= (condition.value || 0) }

            case 'weekly_count':
                return { matched: this.getThisWeekMessageCount(userData) >= (condition.value || 0) }

            case 'monthly_count':
                return { matched: this.getThisMonthMessageCount(userData) >= (condition.value || 0) }

            case 'daily_words':
                return { matched: this.getTodayWordCount(userData) >= (condition.value || 0) }

            case 'weekly_words':
                return { matched: this.getThisWeekWordCount(userData) >= (condition.value || 0) }

            case 'monthly_words':
                return { matched: this.getThisMonthWordCount(userData) >= (condition.value || 0) }

            case 'daily_streak':
                return { matched: this.calculateDailyStreak(userData) >= (condition.value || 0) }

            case 'max_continuous_days':
                return { matched: this.calculateMaxContinuousDays(userData) >= (condition.value || 0) }

            case 'total_words':
                return { matched: (userData.total_number_of_words || 0) >= (condition.value || 0) }

            case 'active_days':
                return { matched: (userData.active_days || 0) >= (condition.value || 0) }

            case 'text_contains':
                return this.checkTextContains(condition, userData, achievementData, achievementId, groupId, userId)

            case 'text_contains_times':
                return this.checkTextContainsTimes(condition, userData, achievementData, achievementId, groupId, userId)

            case 'night_time':
                return { matched: this.isNightTime() }

            case 'morning_time':
                return { matched: this.isMorningTime() }

            case 'time_window':
                return this.checkTimeWindow(condition)

            case 'manual_grant':
                // 手动授予的成就（用户成就），不在此处检查，通过 grantUserAchievement 方法授予
                return { matched: false, progressed: false }

            default:
                return { matched: false, progressed: false }
        }
    }

    /**
     * 获取最新消息文本（从数据服务或消息记录器）
     */
    getRecentMessageText(userData, groupId, userId) {
        if (this.dataService && this.dataService.messageRecorder) {
            return this.dataService.messageRecorder.getRecentMessageText(groupId, userId)
        }
        return ''
    }

    /**
     * 检查文本包含条件
     */
    checkTextContains(condition, userData, achievementData, achievementId, groupId, userId) {
        try {
            const text = this.getRecentMessageText(userData, groupId, userId) || ''
            const value = condition.value
            
            if (text.length === 0 || value == null) {
                return { matched: false }
            }

            if (Array.isArray(value)) {
                return {
                    matched: value.some(v => v != null && text.includes(String(v)))
                }
            }

            if (typeof value === 'object' && value.pattern) {
                const pattern = String(value.pattern)
                const flags = value.flags ? String(value.flags) : 'i'
                const reg = new RegExp(pattern, flags)
                return {
                    matched: reg.test(text)
                }
            }

            return {
                matched: text.includes(String(value))
            }
        } catch (err) {
            globalConfig.error('text_contains 条件判断失败:', err)
            return { matched: false }
        }
    }

    /**
     * 检查文本包含次数条件
     */
    checkTextContainsTimes(condition, userData, achievementData, achievementId, groupId, userId) {
        try {
            const text = this.getRecentMessageText(userData, groupId, userId) || ''
            const value = condition.value
            const times = Number(condition.times) || 1
            
            if (text.length === 0 || value == null) {
                return { matched: false }
            }

            let hit = false
            if (Array.isArray(value)) {
                hit = value.some(v => v != null && text.includes(String(v)))
            } else if (typeof value === 'object' && value.pattern) {
                const pattern = String(value.pattern)
                const flags = value.flags ? String(value.flags) : 'i'
                const reg = new RegExp(pattern, flags)
                hit = reg.test(text)
            } else {
                hit = text.includes(String(value))
            }

            let progressed = false
            if (hit && achievementId) {
                const current = Number(achievementData[achievementId]?.progress || 0)
                const next = current + 1
                
                if (!achievementData[achievementId]) {
                    achievementData[achievementId] = {}
                }
                achievementData[achievementId].progress = next
                progressed = true

                globalConfig.debug(`[成就] 进度: id=${achievementId} ${next}/${times}`)

                if (next >= times) {
                    return {
                        matched: true,
                        progressed
                    }
                }
            }

            return {
                matched: false,
                progressed
            }
        } catch (err) {
            globalConfig.error('text_contains_times 条件判断失败:', err)
            return { matched: false }
        }
    }

    /**
     * 检查时间窗口条件
     */
    checkTimeWindow(condition) {
        try {
            const { start, end, timezone } = condition
            if (!start || !end) return { matched: false }

            const now = TimeUtils.getUTC8Date()
            const nowMs = now.getTime()
            const currentYear = now.getFullYear()

            const parse = (s) => {
                if (typeof s !== 'string') return NaN
                
                if (/^\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
                    const dateStr = `${currentYear}-${s}`
                    return new Date(dateStr).getTime()
                }
                
                if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
                    return new Date(s).getTime()
                }
                
                return Date.parse(s)
            }

            const startMs = parse(start)
            const endMs = parse(end)

            if (!isFinite(startMs) || !isFinite(endMs)) {
                return { matched: false }
            }

            let finalEndMs = endMs
            if (endMs < startMs) {
                const endDate = new Date(endMs)
                endDate.setFullYear(endDate.getFullYear() + 1)
                finalEndMs = endDate.getTime()
            }

            return { matched: nowMs >= startMs && nowMs <= finalEndMs }
        } catch (err) {
            globalConfig.error('time_window 条件判断失败:', err)
            return { matched: false }
        }
    }

    /**
     * 计算连续发言天数（从今天往前的连续天数，遇到中断即停止）
     */
    calculateDailyStreak(userData) {
        if (!userData.daily_stats) return 0
        return TimeUtils.calculateContinuousDays(userData.daily_stats, false)
    }

    getTodayMessageCount(userData) {
        const today = TimeUtils.formatDate(TimeUtils.getUTC8Date())
        return userData.daily_stats?.[today]?.count || 0
    }

    getTodayWordCount(userData) {
        const today = TimeUtils.formatDate(TimeUtils.getUTC8Date())
        return userData.daily_stats?.[today]?.words || 0
    }

    isNightTime() {
        const now = TimeUtils.getUTC8Date()
        const hour = now.getHours()
        return hour >= 22 || hour < 6
    }

    isMorningTime() {
        const now = TimeUtils.getUTC8Date()
        const hour = now.getHours()
        return hour >= 6 && hour < 9
    }

    getThisWeekMessageCount(userData) {
        const now = TimeUtils.getUTC8Date()
        const weekKey = TimeUtils.getWeekNumber(now)
        return userData.weekly_stats?.[weekKey]?.count || 0
    }

    getThisMonthMessageCount(userData) {
        const now = TimeUtils.getUTC8Date()
        const monthKey = TimeUtils.getMonthString(now)
        return userData.monthly_stats?.[monthKey]?.count || 0
    }

    getThisWeekWordCount(userData) {
        const now = TimeUtils.getUTC8Date()
        const weekKey = TimeUtils.getWeekNumber(now)
        return userData.weekly_stats?.[weekKey]?.words || 0
    }

    getThisMonthWordCount(userData) {
        const now = TimeUtils.getUTC8Date()
        const monthKey = TimeUtils.getMonthString(now)
        return userData.monthly_stats?.[monthKey]?.words || 0
    }

    calculateMaxContinuousDays(userData) {
        if (!userData.daily_stats) return 0
        return TimeUtils.calculateContinuousDays(userData.daily_stats, true)
    }

    /**
     * 设置用户显示成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @param {string} achievementName 成就名称
     * @param {string} rarity 稀有度
     * @param {boolean} isManual 是否手动设置（默认true）
     * @param {string|null} autoDisplayAt 自动佩戴时间（UTC+8时区字符串，格式：YYYY-MM-DD HH:mm:ss）。如果为null且isManual=false，使用当前时间
     * @returns {Promise<boolean>}
     */
    async setDisplayAchievement(groupId, userId, achievementId, achievementName, rarity, isManual = true, autoDisplayAt = null) {
        try {
            // 如果是自动佩戴且未提供autoDisplayAt，使用当前时间
            // 如果提供了autoDisplayAt，使用提供的值（通常是解锁时间）
            let displayAt = autoDisplayAt
            if (!isManual && !displayAt) {
                displayAt = TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
            }
            
            await this.dbService.setDisplayAchievement(groupId, userId, {
                id: achievementId,
                name: achievementName,
                rarity: rarity,
                isManual: isManual,
                autoDisplayAt: displayAt
            })
            return true
        } catch (err) {
            globalConfig.error('设置显示成就失败:', err)
            return false
        }
    }

    /**
     * 手动授予用户成就（来自 users.json）
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     * @param {string} achievementId 成就ID
     * @returns {Promise<{success: boolean, message: string, achievement?: Object}>}
     */
    async grantUserAchievement(groupId, userId, achievementId) {
        try {
            if (!groupId || groupId === 'undefined' || groupId === 'null') {
                return {
                    success: false,
                    message: '此命令仅支持在群聊中使用'
                }
            }

            if (!this.isUserAchievement(achievementId)) {
                return {
                    success: false,
                    message: `成就 ${achievementId} 不是用户成就，无法手动授予`
                }
            }

            const userDefinitions = this.getUserAchievementDefinitions()
            const definition = userDefinitions[achievementId]
            
            if (!definition) {
                return {
                    success: false,
                    message: `未找到成就定义: ${achievementId}`
                }
            }

            const userAchievements = await this.getUserAchievements(groupId, userId)
            const isAlreadyUnlocked = userAchievements.achievements[achievementId]?.unlocked

            const unlockedAt = TimeUtils.formatDateTime(TimeUtils.getUTC8Date())
            
            const achievementDataToSave = {
                unlocked: true,
                unlocked_at: unlockedAt,
                progress: 1
            }

            const userGroups = await this.dbService.getUserGroups(userId)
            
            for (const gId of userGroups) {
                await this.saveUserAchievement(gId, userId, achievementId, achievementDataToSave)
            }
            
            for (const gId of userGroups) {
                await this.setDisplayAchievement(
                    gId,
                    userId,
                    achievementId,
                    definition.name,
                    definition.rarity || 'mythic',
                    true
                )
            }

            const groupCount = userGroups.length
            const scopeText = groupCount > 1 ? `（已同步到 ${groupCount} 个群聊）` : ''

            return {
                success: true,
                message: isAlreadyUnlocked 
                    ? `成就 "${definition.name}" 已经解锁，已重新设置为显示成就${scopeText}` 
                    : `成功授予成就 "${definition.name}" 并设置为显示成就${scopeText}`,
                achievement: {
                    id: achievementId,
                    name: definition.name,
                    rarity: definition.rarity || 'mythic',
                    isGlobal: true
                }
            }
        } catch (err) {
            globalConfig.error('授予用户成就失败:', err)
            return {
                success: false,
                message: `授予成就失败: ${err.message}`
            }
        }
    }

    /**
     * 检查并自动卸下超过24小时的自动佩戴成就
     * @param {string} groupId 群号
     * @param {string} userId 用户ID
     */
    async checkAndRemoveExpiredAutoDisplay(groupId, userId) {
        try {
            const displayAchievement = await this.dbService.getDisplayAchievement(groupId, userId)
            if (!displayAchievement) return

            if (displayAchievement.is_manual === true || displayAchievement.is_manual === 1) return

            if (!displayAchievement.auto_display_at) return

            let autoDisplayAt
            const autoDisplayAtValue = displayAchievement.auto_display_at
            
            if (autoDisplayAtValue instanceof Date) {
                autoDisplayAt = autoDisplayAtValue
            } else if (typeof autoDisplayAtValue === 'string') {
                if (autoDisplayAtValue.includes('T')) {
                    autoDisplayAt = new Date(autoDisplayAtValue)
                    if (isNaN(autoDisplayAt.getTime())) {
                        globalConfig.warn(`auto_display_at ISO 格式解析失败: ${autoDisplayAtValue}`)
                        return
                    }
                    if (autoDisplayAtValue.endsWith('Z')) {
                        const utc8Offset = 8 * 60 * 60 * 1000
                        autoDisplayAt = new Date(autoDisplayAt.getTime() + utc8Offset)
                    }
                } else {
                    const [datePart, timePart] = autoDisplayAtValue.split(' ')
                    if (!datePart || !timePart) {
                        globalConfig.warn(`auto_display_at 格式不正确: ${autoDisplayAtValue}`)
                        return
                    }
                    const [year, month, day] = datePart.split('-').map(Number)
                    const [hour, minute, second] = timePart.split(':').map(Number)
                    
                    const utc8Offset = 8 * 60 * 60 * 1000
                    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second || 0)
                    autoDisplayAt = new Date(utcTimestamp - utc8Offset)
                }
            } else {
                globalConfig.warn(`auto_display_at 类型不正确: ${typeof autoDisplayAtValue}, 值: ${autoDisplayAtValue}`)
                return
            }
            
            if (!autoDisplayAt || isNaN(autoDisplayAt.getTime())) {
                globalConfig.warn(`auto_display_at 是无效的日期: ${autoDisplayAtValue}`)
                return
            }
            
            // 计算卸下时间：解锁时间（auto_display_at）+ 24小时
            const removeAt = new Date(autoDisplayAt.getTime() + 24 * 60 * 60 * 1000)
            
            // 获取当前 UTC+8 时区的时间
            const now = TimeUtils.getUTC8Date()

            // 如果当前时间 >= 卸下时间，自动卸下
            if (now.getTime() >= removeAt.getTime()) {
                const deleteResult = await this.dbService.run(
                    'DELETE FROM user_display_achievements WHERE group_id = $1 AND user_id = $2',
                    groupId,
                    userId
                )
                
                // 验证删除是否成功
                const verifyDeleted = await this.dbService.getDisplayAchievement(groupId, userId)
                if (verifyDeleted) {
                    globalConfig.error(`❌ 自动卸下失败: 用户 ${userId} 在群 ${groupId} 的自动佩戴成就仍然存在（解锁时间: ${autoDisplayAtValue}, 卸下时间: ${TimeUtils.formatDateTime(removeAt)}）`)
                } else {
                    // 使用 logger 输出重要信息（始终显示）
                    global.logger.mark(`[发言统计] ✅ 自动卸下用户 ${userId} 在群 ${groupId} 的自动佩戴成就（解锁时间: ${autoDisplayAtValue}, 卸下时间: ${TimeUtils.formatDateTime(removeAt)}, 当前时间: ${TimeUtils.formatDateTime(now)}）`)
                }
            } else if (globalConfig.getConfig('global.debugLog')) {
                const remainingMs = removeAt.getTime() - now.getTime()
                const remainingHours = remainingMs / (1000 * 60 * 60)
                globalConfig.debug(`成就未过期: 用户 ${userId} 在群 ${groupId}（解锁时间: ${autoDisplayAtValue}, 剩余时间: ${remainingHours.toFixed(2)}小时）`)
            }
        } catch (err) {
            globalConfig.error('检查自动卸下成就失败:', err)
        }
    }
}

export { AchievementService }
export default AchievementService

