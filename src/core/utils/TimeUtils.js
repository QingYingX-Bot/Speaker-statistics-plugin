/**
 * 时间工具类
 * 提供各种时间格式化和计算功能
 * 统一使用 UTC+8 时区
 */
class TimeUtils {
    /**
     * 获取 UTC+8 时区的当前时间
     * @returns {Date} UTC+8 时区的日期对象
     */
    static getUTC8Date() {
        const now = new Date()
        const utc8Offset = 8 * 60 * 60 * 1000
        const utc8Timestamp = now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + utc8Offset
        return new Date(utc8Timestamp)
    }

    /**
     * 获取当前时间的详细信息（UTC+8）
     * @returns {Object} 包含年、月、日、周等信息的对象
     */
    static getCurrentTime() {
        const now = this.getUTC8Date()
        return {
            timestamp: now.getTime(),
            date: this.formatDate(now),
            year: now.getFullYear(),
            month: this.padZero(now.getMonth() + 1),
            day: this.padZero(now.getDate()),
            week: this.getWeekNumber(now),
            weekYear: this.getWeekYear(now),
            time: this.formatTime(now)
        }
    }

    /**
     * 获取当前日期时间的完整信息（UTC+8）
     * @returns {Object} 包含格式化日期时间和各种时间标识的对象
     */
    static getCurrentDateTime() {
        const now = this.getUTC8Date()
        return {
            timestamp: now.getTime(),
            formattedDate: this.formatDate(now),
            formattedTime: this.formatTime(now),
            formattedDateTime: this.formatDateTime(now),
            yearKey: now.getFullYear().toString(),
            monthKey: this.getMonthString(now),
            weekKey: this.getWeekNumber(now),
            year: now.getFullYear(),
            month: this.padZero(now.getMonth() + 1),
            day: this.padZero(now.getDate())
        }
    }

    /**
     * 格式化日期为 YYYY-MM-DD（UTC+8）
     * @param {Date} date 日期对象（应为 UTC+8 时区）
     * @returns {string} 格式化后的日期
     */
    static formatDate(date) {
        return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())}`
    }

    /**
     * 格式化时间为 HH:mm:ss（UTC+8）
     * @param {Date} date 日期对象（应为 UTC+8 时区）
     * @returns {string} 格式化后的时间
     */
    static formatTime(date) {
        return `${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}:${this.padZero(date.getSeconds())}`
    }

    /**
     * 格式化完整日期时间为 YYYY-MM-DD HH:mm:ss（UTC+8）
     * @param {Date} date 日期对象（应为 UTC+8 时区）
     * @returns {string} 格式化后的日期时间
     */
    static formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`
    }


    /**
     * 获取日期所在的ISO周数
     * @param {Date} date 日期对象
     * @returns {string} 周数，格式为 YYYY-Wxx
     */
    static getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
        return `${this.getWeekYear(date)}-W${this.padZero(weekNo)}`
    }

    /**
     * 获取周所属的年份
     * @param {Date} date 日期对象
     * @returns {number} 年份
     */
    static getWeekYear(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        return d.getUTCFullYear()
    }

    /**
     * 获取月份格式化字符串
     * @param {Date} date 日期对象
     * @returns {string} 格式为 YYYY-MM
     */
    static getMonthString(date) {
        return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}`
    }

    /**
     * 数字补零
     * @param {number} num 需要补零的数字
     * @returns {string} 补零后的字符串
     */
    static padZero(num) {
        return num.toString().padStart(2, '0')
    }

    /**
     * 计算连续天数（从今天往前，UTC+8）
     * @param {Object} dailyStats 日统计数据对象，key 为日期字符串 YYYY-MM-DD
     * @param {boolean} maxStreak 是否计算最大连续天数，false 则计算从今天往前的连续天数（遇到中断即停止）
     * @returns {number} 连续天数
     */
    static calculateContinuousDays(dailyStats, maxStreak = true) {
        if (!dailyStats || Object.keys(dailyStats).length === 0) {
            return 0
        }

        const now = this.getUTC8Date()
        let continuousDays = 0
        let currentStreak = 0

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(now)
            checkDate.setDate(checkDate.getDate() - i)
            const dateStr = this.formatDate(checkDate)

            if (dailyStats[dateStr]) {
                currentStreak++
                if (maxStreak) {
                    continuousDays = Math.max(continuousDays, currentStreak)
                } else {
                    continuousDays = currentStreak
                }
            } else {
                if (!maxStreak) {
                    break
                }
                currentStreak = 0
            }
        }

        return continuousDays
    }
}

export { TimeUtils }
