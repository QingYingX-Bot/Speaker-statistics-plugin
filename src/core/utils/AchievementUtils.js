/**
 * 成就工具类
 * 提供成就相关的通用方法和配置
 */
class AchievementUtils {
    /**
     * 稀有度配置（用于排序和比较）
     * 数值越大，稀有度越高
     */
    static RARITY_ORDER = {
        'common': 1,
        'uncommon': 2,
        'rare': 3,
        'epic': 4,
        'legendary': 5,
        'festival': 5,  // festival 和 legendary 同级
        'mythic': 6
    };

    /**
     * 判断是否为节日成就
     * @param {string} rarity 稀有度
     * @returns {boolean} 是否为节日成就
     */
    static isFestivalAchievement(rarity) {
        return (rarity || '').toLowerCase() === 'festival';
    }

    /**
     * 获取稀有度的排序值
     * @param {string} rarity 稀有度
     * @returns {number} 排序值
     */
    static getRarityOrder(rarity) {
        return this.RARITY_ORDER[rarity?.toLowerCase()] || 0;
    }

    /**
     * 比较两个稀有度
     * @param {string} rarityA 稀有度A
     * @param {string} rarityB 稀有度B
     * @returns {number} 比较结果（负数表示A小于B，正数表示A大于B，0表示相等）
     */
    static compareRarity(rarityA, rarityB) {
        const orderA = this.getRarityOrder(rarityA);
        const orderB = this.getRarityOrder(rarityB);
        return orderB - orderA; // 降序排列（稀有度高的在前）
    }

    /**
     * 按稀有度排序成就（降序）
     * @param {Array} achievements 成就数组
     * @param {Function} getRarity 获取稀有度的函数
     * @param {Function} getSecondarySort 获取次要排序值的函数（可选）
     * @returns {Array} 排序后的成就数组
     */
    static sortByRarity(achievements, getRarity, getSecondarySort = null) {
        return achievements.sort((a, b) => {
            const rarityA = getRarity(a);
            const rarityB = getRarity(b);
            const rarityCompare = this.compareRarity(rarityA, rarityB);
            
            if (rarityCompare !== 0) {
                return rarityCompare;
            }
            
            // 稀有度相同时，使用次要排序
            if (getSecondarySort) {
                return getSecondarySort(a, b);
            }
            
            return 0;
        });
    }

    /**
     * 按稀有度和解锁时间排序已解锁成就
     * @param {Array} achievements 成就数组
     * @param {Function} getRarity 获取稀有度的函数
     * @param {Function} getUnlockTime 获取解锁时间的函数
     * @returns {Array} 排序后的成就数组
     */
    static sortUnlockedAchievements(achievements, getRarity, getUnlockTime) {
        return this.sortByRarity(achievements, getRarity, (a, b) => {
            const timeA = getUnlockTime(a);
            const timeB = getUnlockTime(b);
            // 解锁时间倒序（最新的在前）
            return timeB - timeA;
        });
    }

    /**
     * 按稀有度和名称排序未解锁成就
     * @param {Array} achievements 成就数组
     * @param {Function} getRarity 获取稀有度的函数
     * @param {Function} getName 获取名称的函数
     * @returns {Array} 排序后的成就数组
     */
    static sortLockedAchievements(achievements, getRarity, getName) {
        return this.sortByRarity(achievements, getRarity, (a, b) => {
            const nameA = getName(a);
            const nameB = getName(b);
            return nameA.localeCompare(nameB, 'zh-CN');
        });
    }

    /**
     * 判断稀有度是否达到指定级别或更高
     * @param {string} rarity 稀有度
     * @param {string} minRarity 最低稀有度（如 'epic'）
     * @returns {boolean} 是否达到
     */
    static isRarityOrHigher(rarity, minRarity) {
        return this.getRarityOrder(rarity) >= this.getRarityOrder(minRarity);
    }
}

export { AchievementUtils };
export default AchievementUtils;

