/**
 * 工具类统一导出文件
 * 提供统一的工具类导入入口，简化导入语句
 */

// 导出所有工具类
export { AchievementUtils } from './AchievementUtils.js';
export { CommandWrapper } from './CommandWrapper.js';
export { CommonUtils } from './CommonUtils.js';
export { KeyFileOptimizer } from './KeyFileOptimizer.js';
export { PathResolver } from './PathResolver.js';
export { PerformanceMonitor, getPerformanceMonitor } from './PerformanceMonitor.js';
export { PermissionManager, getPermissionManager } from './PermissionManager.js';
export { TextProcessor } from './TextProcessor.js';
export { TimeUtils } from './TimeUtils.js';
export { WebLinkGenerator } from './WebLinkGenerator.js';
export { UserParser } from './UserParser.js';

// 可选：提供常用工具的组合导出
export const Utils = {
    Achievement: AchievementUtils,
    Command: CommandWrapper,
    Common: CommonUtils,
    Path: PathResolver,
    Time: TimeUtils,
    Web: WebLinkGenerator,
    Performance: PerformanceMonitor,
    Permission: PermissionManager,
    Text: TextProcessor,
    Key: KeyFileOptimizer,
    User: UserParser
};

