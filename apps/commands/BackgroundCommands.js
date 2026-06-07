import { CommandWrapper } from '../../core/utils/CommandWrapper.js'
import { webServer } from '../../core/web/WebServer.js'
import { backgroundTokenService } from '../../core/services/BackgroundTokenService.js'

class BackgroundCommands {
  static getRules() {
    return [
      {
        reg: '^#水群(?:设置背景|背景设置)$',
        fnc: 'openBackgroundEditor'
      }
    ]
  }

  getSenderId(e) {
    return String(e?.user_id || e?.sender?.user_id || '').trim()
  }

  isPrivateMessage(e) {
    return Boolean(e && !e.group_id && this.getSenderId(e))
  }

  buildEditorUrl(baseUrl, token) {
    const url = new URL(baseUrl)
    url.searchParams.set('backgroundToken', token)
    return url.toString()
  }

  async openBackgroundEditor(e) {
    if (!this.isPrivateMessage(e)) {
      return e.reply('请私聊机器人使用 #水群设置背景')
    }

    return await CommandWrapper.safeExecute(async () => {
      const cfg = webServer.getConfig()
      if (!cfg.enabled) {
        return e.reply('Web 管理端未启用，暂时无法设置背景')
      }
      if (cfg.backgroundEditor.enabled === false) {
        return e.reply('背景编辑器未启用')
      }

      const userId = this.getSenderId(e)
      const tokenInfo = backgroundTokenService.createToken(userId, cfg.backgroundEditor.tokenTtlMinutes)
      const editorUrl = this.buildEditorUrl(webServer.getAccessUrl(cfg), tokenInfo.token)
      const tips = cfg.localOnly
        ? '\n\n当前 Web 管理端仅允许本机访问，外部访问需要调整 web.localOnly 或使用反代。'
        : ''

      return e.reply([
        '排行榜背景设置链接：',
        editorUrl,
        '',
        `有效期：${cfg.backgroundEditor.tokenTtlMinutes} 分钟`,
        '新链接生成后，旧链接会失效。',
        tips
      ].join('\n'))
    }, '生成背景设置链接失败', async () => {
      return e.reply('生成背景设置链接失败，请稍后重试')
    })
  }
}

export { BackgroundCommands }
export default BackgroundCommands
