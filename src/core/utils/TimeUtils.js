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
        const now = new Date();
        // UTC+8 偏移量（毫秒）
        const utc8Offset = 8 * 60 * 60 * 1000;
        // 获取 UTC 时间戳，然后加上 UTC+8 偏移量
        const utc8Timestamp = now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + utc8Offset;
        return new Date(utc8Timestamp);
    }

    /**
     * 获取当前时间的详细信息（UTC+8）
     * @returns {Object} 包含年、月、日、周等信息的对象
     */
    static getCurrentTime() {
        const now = this.getUTC8Date();
        return {
            timestamp: now.getTime(),
            date: this.formatDate(now),
            year: now.getFullYear(),
            month: this.padZero(now.getMonth() + 1),
            day: this.padZero(now.getDate()),
            week: this.getWeekNumber(now),
            weekYear: this.getWeekYear(now),
            time: this.formatTime(now)
        };
    }

    /**
     * 获取当前日期时间的完整信息（UTC+8）
     * @returns {Object} 包含格式化日期时间和各种时间标识的对象
     */
    static getCurrentDateTime() {
        const now = this.getUTC8Date();
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
        };
    }

    /**
     * 格式化日期为 YYYY-MM-DD（UTC+8）
     * @param {Date} date 日期对象（应为 UTC+8 时区）
     * @returns {string} 格式化后的日期
     */
    static formatDate(date) {
        return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())}`;
    }

    /**
     * 格式化时间为 HH:mm:ss（UTC+8）
     * @param {Date} date 日期对象（应为 UTC+8 时区）
     * @returns {string} 格式化后的时间
     */
    static formatTime(date) {
        return `${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}:${this.padZero(date.getSeconds())}`;
    }

    /**
     * 格式化完整日期时间为 YYYY-MM-DD HH:mm:ss（UTC+8）
     * @param {Date} date 日期对象（应为 UTC+8 时区）
     * @returns {string} 格式化后的日期时间
     */
    static formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    }

    /**
     * 格式化日期时间为数据库格式 YYYY-MM-DD HH:mm:ss（UTC+8）
     * @returns {string} 格式化后的日期时间
     */
    static formatDateTimeForDB() {
        return this.formatDateTime(this.getUTC8Date());
    }

    /**
     * 获取日期所在的ISO周数
     * @param {Date} date 日期对象
     * @returns {string} 周数，格式为 YYYY-Wxx
     */
    static getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${this.getWeekYear(date)}-W${this.padZero(weekNo)}`;
    }

    /**
     * 获取周所属的年份
     * @param {Date} date 日期对象
     * @returns {number} 年份
     */
    static getWeekYear(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        return d.getUTCFullYear();
    }

    /**
     * 获取月份格式化字符串
     * @param {Date} date 日期对象
     * @returns {string} 格式为 YYYY-MM
     */
    static getMonthString(date) {
        return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}`;
    }

    /**
     * 数字补零
     * @param {number} num 需要补零的数字
     * @returns {string} 补零后的字符串
     */
    static padZero(num) {
        return num.toString().padStart(2, '0');
    }

    /**
     * 计算两个日期之间的天数
     * @param {Date} date1 第一个日期
     * @param {Date} date2 第二个日期
     * @returns {number} 天数差
     */
    static daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const diffTime = Math.abs(date2 - date1);
        return Math.round(diffTime / oneDay);
    }

    /**
     * 计算连续天数（从今天往前，UTC+8）
     * @param {Object} dailyStats 日统计数据对象，key 为日期字符串 YYYY-MM-DD
     * @param {boolean} maxStreak 是否计算最大连续天数，false 则计算从今天往前的连续天数（遇到中断即停止）
     * @returns {number} 连续天数
     */
    static calculateContinuousDays(dailyStats, maxStreak = true) {
        if (!dailyStats || Object.keys(dailyStats).length === 0) {
            return 0;
        }

        const now = this.getUTC8Date();
        let continuousDays = 0;
        let currentStreak = 0;

        // 从今天开始往前检查
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = this.formatDate(checkDate);

            if (dailyStats[dateStr]) {
                currentStreak++;
                if (maxStreak) {
                    continuousDays = Math.max(continuousDays, currentStreak);
                } else {
                    // 如果不计算最大值，遇到第一个中断就停止
                    continuousDays = currentStreak;
                }
            } else {
                if (!maxStreak) {
                    // 如果不计算最大值，遇到中断就停止
                    break;
                }
                currentStreak = 0;
            }
        }

        return continuousDays;
    }

    /**
     * 判断日期是否是今天（UTC+8）
     * @param {string} dateString YYYY-MM-DD 格式的日期字符串
     * @returns {boolean} 是否是今天
     */
    static isToday(dateString) {
        return dateString === this.formatDate(this.getUTC8Date());
    }

    /**
     * 判断日期是否是本周（UTC+8）
     * @param {string} weekString YYYY-Wxx 格式的周字符串
     * @returns {boolean} 是否是本周
     */
    static isThisWeek(weekString) {
        return weekString === this.getWeekNumber(this.getUTC8Date());
    }

    /**
     * 判断日期是否是本月（UTC+8）
     * @param {string} monthString YYYY-MM 格式的月份字符串
     * @returns {boolean} 是否是本月
     */
    static isThisMonth(monthString) {
        return monthString === this.getMonthString(this.getUTC8Date());
    }

    /**
     * 解析月份字符串（支持中文和数字）
     * @param {string} input 输入字符串，如 "1月"、"一月"、"1"
     * @returns {Object} { monthKey: "YYYY-MM", displayText: "X月" } 或 null
     */
    static parseMonth(input) {
        if (!input) return null;

        const now = this.getUTC8Date();
        const currentYear = now.getFullYear();

        // 匹配数字月份：1-12
        const digitsMatch = input.match(/(1[0-2]|0?[1-9])\s*(?:月)?/);
        let month = null;

        if (digitsMatch) {
            month = parseInt(digitsMatch[1]);
        }

        if (month == null) {
            // 匹配中文月份
            const cnMap = {
                '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
                '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12
            };
            const cnMatch = input.match(/(十二|十一|十|九|八|七|六|五|四|三|二|一)\s*(?:月)?/);
            if (cnMatch) {
                month = cnMap[cnMatch[1]];
            }
        }

        if (!month || month < 1 || month > 12) {
            return null;
        }

        const monthKey = `${currentYear}-${month.toString().padStart(2, '0')}`;
        const displayText = `${month}月`;

        return { monthKey, displayText };
    }
}

export { TimeUtils };
