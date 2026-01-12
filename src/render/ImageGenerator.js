import puppeteer from 'puppeteer'
import { PathResolver } from '../core/utils/PathResolver.js'
import { TemplateManager } from './TemplateManager.js'
import { globalConfig } from '../core/ConfigManager.js'

/**
 * 图片生成器
 * 负责生成排行榜和用户统计的图片
 */
class ImageGenerator {
    constructor(dataService = null) {
        this.browser = null
        this.baseDir = PathResolver.getDataDir()
        this.templateManager = new TemplateManager(dataService)
        this.browserInitPromise = null
        this.maxConcurrentPages = 5
        this.activePages = 0
        this.pageQueue = []
        this.pagePool = []
        this.maxPoolSize = 10
        this.browserKeepAlive = true
        this.lastUsedTime = Date.now()
    }



    /**
     * 初始化浏览器
     */
    async initBrowser() {
        if (this.browserInitPromise) {
            return this.browserInitPromise
        }

        this.browserInitPromise = puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            defaultViewport: {
                width: 1800,
                height: 900
            }
        })

        try {
            this.browser = await this.browserInitPromise
            globalConfig.debug('[发言统计] 图片生成器浏览器初始化成功')
        } catch (err) {
            this.browserInitPromise = null
            globalConfig.error('[发言统计] 图片生成器浏览器初始化失败:', err)
            throw err
        }

        return this.browser
    }

    /**
     * 关闭浏览器
     */
    async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close()
                this.browser = null
                this.browserInitPromise = null
                globalConfig.debug('[发言统计] 图片生成器浏览器已关闭')
            } catch (err) {
                globalConfig.error('[发言统计] 关闭浏览器失败:', err)
            }
        }
    }

    /**
     * 获取可用页面
     */
    async getAvailablePage() {
        this.lastUsedTime = Date.now()

        // 优先从页面池获取
        if (this.pagePool.length > 0) {
            const page = this.pagePool.pop()
            this.activePages++
            return page
        }

        // 如果页面池为空且未达到并发限制，创建新页面
        if (this.activePages < this.maxConcurrentPages) {
            this.activePages++
            const browser = await this.initBrowser()
            const page = await browser.newPage()
            await page.setCacheEnabled(true)
            await page.setJavaScriptEnabled(true)
            return page
        }

        // 等待可用页面
        return new Promise((resolve) => {
            this.pageQueue.push(resolve)
        })
    }

    /**
     * 释放页面
     */
    async releasePage(page) {
        try {
            await page.goto('about:blank')
            await page.evaluate(() => {
                document.body.innerHTML = ''
            })

            if (this.pagePool.length < this.maxPoolSize) {
                this.pagePool.push(page)
            } else {
                await page.close()
            }
        } catch (err) {
            globalConfig.error('[发言统计] 释放页面失败:', err)
            try {
                await page.close()
            } catch (closeErr) {
                // 忽略关闭错误
            }
        } finally {
            this.activePages--

            // 处理等待中的请求
            if (this.pageQueue.length > 0) {
                const resolve = this.pageQueue.shift()
                this.getAvailablePage().then(page => resolve(page))
            }
        }
    }

    /**
     * 生成排行榜图片
     * @param {Array} data 排行榜数据
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @param {string} title 标题
     * @param {string} type 排行榜类型
     * @param {Object} userInfo 用户排名信息
     * @param {Object} options 其他选项
     * @returns {Promise<string>} base64 图片数据
     */
    async generateRankingImage(data, groupId, groupName, title, type = 'total', userInfo = null, options = {}) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 1800,
                height: 1
            })

            // 生成HTML
            const html = await this.templateManager.renderImageRankingTemplate(
                data,
                groupId,
                groupName,
                title,
                userInfo,
                options
            )

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 等待头像加载
            try {
                await page.waitForFunction(() => {
                    const avatars = Array.from(document.querySelectorAll('img.avatar'))
                    return avatars.every(img => img.complete && img.naturalWidth > 0)
                }, {
                    timeout: 5000,
                    polling: 200
                })
            } catch (err) {
                globalConfig.debug('[发言统计] 头像加载超时或出错:', err)
            }

            // 获取实际高度并调整视口
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 1520,
                height: bodyHeight
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true,
                optimizeForSpeed: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成排行榜图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }

    /**
     * 生成用户统计图片
     * @param {Object} userData 用户数据
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @param {string} userId 用户ID
     * @param {string} nickname 用户昵称
     * @returns {Promise<string>} base64 图片数据
     */
    async generateUserStatsImage(userData, groupId, groupName, userId, nickname) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 760,
                height: 1,
                deviceScaleFactor: 2
            })

            // 生成HTML
            const html = await this.templateManager.renderUserStatsTemplate(
                userData,
                groupId,
                groupName,
                userId,
                nickname
            )

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 等待头像加载
            try {
                await page.waitForFunction(() => {
                    const avatars = Array.from(document.querySelectorAll('img.avatar'))
                    return avatars.every(img => img.complete && img.naturalWidth > 0)
                }, {
                    timeout: 5000,
                    polling: 200
                })
            } catch (err) {
                globalConfig.debug('[发言统计] 头像加载超时或出错:', err)
            }

            // 获取实际高度并调整视口
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 760,
                height: bodyHeight,
                deviceScaleFactor: 2
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成用户统计图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }

    /**
     * 生成群统计图片
     * @param {Object} groupStats 群统计数据
     * @param {string} groupId 群号
     * @param {string} groupName 群名称
     * @param {Array} topUsers 前三用户数据
     * @returns {Promise<string>} base64 图片数据
     */
    async generateGroupStatsImage(groupStats, groupId, groupName, topUsers) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 1200,
                height: 1
            })

            // 使用模板管理器生成HTML
            const html = await this.templateManager.renderGroupStatsTemplate(
                groupStats,
                groupId,
                groupName,
                topUsers
            )

            if (!html) {
                throw new Error('群统计模板渲染失败')
            }

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 等待头像加载
            try {
                await page.waitForFunction(() => {
                    const avatars = Array.from(document.querySelectorAll('img.user-avatar'))
                    return avatars.every(img => img.complete && img.naturalWidth > 0)
                }, {
                    timeout: 5000,
                    polling: 200
                })
            } catch (err) {
                globalConfig.debug('[发言统计] 头像加载超时或出错:', err)
            }

            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 1200,
                height: bodyHeight
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成群统计图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }

    /**
     * 生成帮助面板图片
     * @param {boolean} isMaster 是否为主人
     * @returns {Promise<string>} base64 图片数据
     */
    async generateHelpPanelImage(isMaster = false) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 1800,
                height: 1
            })

            // 生成HTML
            const html = this.templateManager.renderHelpPanelTemplate(isMaster)

            if (!html) {
                throw new Error('渲染帮助面板模板失败')
            }

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 获取实际高度并调整视口
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 1520,
                height: bodyHeight
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true,
                optimizeForSpeed: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成帮助面板图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }

    /**
     * 生成全局统计图片
     * @param {Object} globalStats 全局统计数据
     * @returns {Promise<string>} base64 图片数据
     */
    async generateGlobalStatsImage(globalStats) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 2200,
                height: 1
            })

            // 生成HTML
            const html = this.templateManager.renderGlobalStatsTemplate(globalStats)

            if (!html) {
                throw new Error('渲染全局统计模板失败')
            }

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 获取实际高度并调整视口
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 2200,
                height: bodyHeight
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true,
                optimizeForSpeed: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成全局统计图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }

    /**
     * 生成成就列表图片
     * @param {Object} allDefinitions 所有成就定义（默认+自定义+群专属）
     * @param {Object} userAchievements 用户的成就解锁状态
     * @param {string} groupId 群ID
     * @param {string} userId 用户ID
     * @returns {Promise<string>} base64 图片数据
     */
    async generateAchievementListImage(allDefinitions, userAchievements, groupId, userId, displayAchievement = null) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 2400,
                height: 1
            })

            // 获取群名称
            let groupName = `群${groupId}`
            try {
                if (this.templateManager.dataService) {
                    const dbService = this.templateManager.dataService.dbService
                    if (dbService && dbService.getGroupInfo) {
                        const groupInfo = await dbService.getGroupInfo(groupId)
                        if (groupInfo && groupInfo.group_name) {
                            groupName = groupInfo.group_name
                        }
                    }
                }
                if (groupName === `群${groupId}` && typeof Bot !== 'undefined' && Bot.gl) {
                    const glGroup = Bot.gl.get(groupId)
                    if (glGroup && glGroup.name) {
                        groupName = glGroup.name
                    }
                }
            } catch (err) {
                globalConfig.debug('获取群名称失败，使用默认值:', err)
            }

            // 使用模板管理器生成HTML
            const html = this.templateManager.renderAchievementListTemplate(
                allDefinitions,
                userAchievements,
                groupId,
                groupName,
                displayAchievement
            )

            if (!html) {
                throw new Error('成就列表模板渲染失败')
            }

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 获取实际高度并调整视口
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 2400,
                height: bodyHeight
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true,
                optimizeForSpeed: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成成就列表图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }

    /**
     * 生成成就统计图片
     * @param {Array} globalStats 全局成就统计数组
     * @param {Array} groupStats 群专属成就统计数组
     * @param {string} groupId 群ID
     * @returns {Promise<string>} base64 图片数据
     */
    async generateAchievementStatisticsImage(globalStats, groupStats, groupId) {
        const page = await this.getAvailablePage()

        try {
            await page.setViewport({
                width: 2400,
                height: 1
            })

            // 获取群名称
            let groupName = `群${groupId}`
            try {
                if (this.templateManager.dataService) {
                    const dbService = this.templateManager.dataService.dbService
                    if (dbService && dbService.getGroupInfo) {
                        const groupInfo = await dbService.getGroupInfo(groupId)
                        if (groupInfo && groupInfo.group_name) {
                            groupName = groupInfo.group_name
                        }
                    }
                }
                if (groupName === `群${groupId}` && typeof Bot !== 'undefined' && Bot.gl) {
                    const glGroup = Bot.gl.get(groupId)
                    if (glGroup && glGroup.name) {
                        groupName = glGroup.name
                    }
                }
            } catch (err) {
                globalConfig.debug('获取群名称失败，使用默认值:', err)
            }

            // 使用模板管理器生成HTML
            const html = this.templateManager.renderAchievementStatisticsTemplate(
                globalStats,
                groupStats,
                groupId,
                groupName
            )

            if (!html) {
                throw new Error('成就统计模板渲染失败')
            }

            await page.setContent(html, {
                waitUntil: 'networkidle0'
            })

            // 获取实际高度并调整视口
            const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
            await page.setViewport({
                width: 2400,
                height: bodyHeight
            })

            // 生成 base64 图片
            const base64 = await page.screenshot({
                encoding: 'base64',
                fullPage: true,
                optimizeForSpeed: true
            })

            return base64
        } catch (err) {
            globalConfig.error('生成成就统计图片失败:', err)
            throw err
        } finally {
            await this.releasePage(page)
        }
    }
}

export { ImageGenerator }
export default ImageGenerator

