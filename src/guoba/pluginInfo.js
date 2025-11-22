import path from 'path';
import { fileURLToPath } from 'url';

// 获取插件根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRootDir = path.resolve(__dirname, '../..');

/**
 * 插件信息配置
 * 用于 Guoba-Plugin 前端显示
 */
export function getPluginInfo() {
  return {
    // name 为插件唯一标识，尽量不要与其他插件重复
    name: 'speaker-statistics-plugin',
    // title 为显示名称
    title: 'Speaker Statistics Plugin',
    // 插件描述
    description: '群聊水群统计插件 for Yunzai-Bot',
    // 作者可以为字符串也可以为数组，当有多个作者时建议使用数组
    author: 'QingYing & AI',
    // 作者主页地址
    authorLink: 'https://gitee.com/QingYingX',
    // 仓库地址
    link: 'https://gitee.com/qingyingxbot/Speaker-statistics-plugin',
    isV3: true,
    isV2: false,
    // 是否显示在左侧菜单，可选值：auto、true、false
    // 当为 auto 时，如果配置项大于等于 3 个，则显示在左侧菜单
    showInMenu: true,
    // 显示图标，此为个性化配置
    // 图标可在 https://icon-sets.iconify.design 这里进行搜索
    icon: 'iconoir:bubble-search-solid',
    // 图标颜色
    iconColor: '#42a5f5',
    // 如果想要显示成图片，也可以填写图标路径（绝对路径）
    // iconPath: path.join(pluginRootDir, 'resources/images/icon.png')
  };
}

