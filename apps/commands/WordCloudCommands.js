import { Config, getMessageCollector, getWordCloudGenerator } from '../../core/services/index.js'
import { logger } from '#lib'

class WordCloudCommands {
  static getRules() {
    return [
      {
        reg: '^#(?:水群词云|(群聊)?词云)\\s*(当天|三天|七天)?$',
        fnc: 'generateWordCloud'
      },
      {
        reg: '^#(?:我的词云|水群个人词云|个人词云)\\s*(当天|三天|七天)?$',
        fnc: 'generatePersonalWordCloud'
      }
    ]
  }

  isEnabled() {
    const config = Config.get()
    return config?.enabled !== false
  }

  parseDays(msg) {
    const match = String(msg || '').match(/(当天|三天|七天)/)
    if (!match) return 1
    if (match[1] === '三天') return 3
    if (match[1] === '七天') return 7
    return 1
  }

  getPeriodLabel(days) {
    if (days === 3) return '三天'
    if (days === 7) return '七天'
    return '当天'
  }

  async getServices() {
    return Promise.all([
      getMessageCollector(),
      getWordCloudGenerator()
    ])
  }

  async resolveGroupName(e) {
    const fallbackName = `群${e.group_id}`

    try {
      const groupInfo = await e.group?.getInfo?.()
      return groupInfo?.group_name || e.group?.name || e.group?.group_name || fallbackName
    } catch (err) {
      logger.debug(`获取群名失败: ${err}，使用群号作为群名`)
      return fallbackName
    }
  }

  async init() {
    if (!this.isEnabled()) {
      logger.info('[词云] 水群分析已关闭，跳过初始化')
      return
    }

    await this.getServices()
  }

  async generateWordCloud(e) {
    if (!this.isEnabled()) {
      return e.reply('水群词云功能已关闭，请在锅巴配置中开启水群分析', true)
    }

    const [messageCollector, wordCloudGenerator] = await this.getServices()

    if (!messageCollector || !wordCloudGenerator) {
      return e.reply('词云功能未就绪', true)
    }

    const days = this.parseDays(e?.msg)
    const periodLabel = this.getPeriodLabel(days)
    await e.reply(`正在生成${periodLabel}的词云，请稍候...`)

    try {
      const messages = await messageCollector.getMessages(e.group_id, days)

      if (messages.length === 0) {
        return e.reply(`没有找到最近${days}天的消息记录`, true)
      }

      const groupName = await this.resolveGroupName(e)

      const img = await wordCloudGenerator.generate(messages, {
        groupId: e.group_id,
        groupName,
        days
      })

      if (!img) {
        return e.reply('词云生成失败，请查看日志', true)
      }

      return e.reply(img)
    } catch (err) {
      logger.error(`词云生成错误: ${err}`)
      return e.reply(`词云生成失败: ${err.message}`, true)
    }
  }

  async generatePersonalWordCloud(e) {
    if (!this.isEnabled()) {
      return e.reply('水群词云功能已关闭，请在锅巴配置中开启水群分析', true)
    }

    const [messageCollector, wordCloudGenerator] = await this.getServices()

    if (!messageCollector || !wordCloudGenerator) {
      return e.reply('词云功能未就绪', true)
    }

    const days = this.parseDays(e?.msg)
    const userId = e.user_id
    const userName = e.sender?.nickname || e.nickname || `用户${userId}`
    const periodLabel = this.getPeriodLabel(days)

    await e.reply(`正在生成 ${userName} ${periodLabel}的个人词云，请稍候...`)

    try {
      const messages = await messageCollector.getRecentUserMessages(
        e.group_id,
        userId.toString(),
        1,
        null,
        days
      )

      if (messages.length === 0) {
        return e.reply(`您在最近${days}天内没有消息记录`, true)
      }

      if (messages.length < 5) {
        return e.reply(`您在最近${days}天内的消息太少（仅${messages.length}条），无法生成词云`, true)
      }

      const groupName = await this.resolveGroupName(e)

      const img = await wordCloudGenerator.generate(messages, {
        groupId: e.group_id,
        groupName,
        days,
        userName
      })

      if (!img) {
        return e.reply('词云生成失败，请查看日志', true)
      }

      return e.reply(img)
    } catch (err) {
      logger.error(`个人词云生成错误: ${err}`)
      return e.reply(`个人词云生成失败: ${err.message}`, true)
    }
  }
}

export { WordCloudCommands }
export default WordCloudCommands
