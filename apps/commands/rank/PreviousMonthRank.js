import { CommonUtils } from '../../../core/utils/CommonUtils.js'
import { CommandWrapper } from '../../../core/utils/CommandWrapper.js'
import { TimeUtils } from '../../../core/utils/TimeUtils.js'

function getPreviousMonthKey() {
    const date = TimeUtils.getUTC8Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - 1)
    return TimeUtils.getMonthString(date)
}

async function showPreviousMonthlyRank(command, e) {
    const validation = CommonUtils.validateGroupMessage(e)
    if (!validation.valid) {
        return e.reply(validation.message)
    }

    return await CommandWrapper.safeExecute(async () => {
        const monthKey = getPreviousMonthKey()
        return await command.renderRanking(
            e,
            'monthly',
            `上月榜（${monthKey}）`,
            `${monthKey} 暂无排行榜数据`,
            String(e.group_id),
            null,
            { monthKey }
        )
    }, '获取上月榜失败', async () => {
        return e.reply('获取上月榜失败，请稍后重试')
    })
}

export { getPreviousMonthKey, showPreviousMonthlyRank }
