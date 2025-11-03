import { getPluginInfo } from './src/guoba/pluginInfo.js';
import { getConfigSchemas } from './src/guoba/configSchemas.js';
import { getConfigData } from './src/guoba/getConfigData.js';
import { setConfigData } from './src/guoba/setConfigData.js';

// 支持锅巴
export function supportGuoba() {
  return {
    // 插件信息，将会显示在前端页面
    pluginInfo: getPluginInfo(),
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: getConfigSchemas(),
      // 获取配置数据方法（用于前端填充显示数据）
      async getConfigData() {
        return await getConfigData();
      },
      // 设置配置的方法（前端点确定后调用的方法）
      async setConfigData(data, helpers) {
        return await setConfigData(data, helpers);
      }
    }
  };
}
