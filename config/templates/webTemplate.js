/**
 * Web 管理端配置模板
 */
export const webTemplate = {
  enabled: true,
  publicUrl: '',
  host: '127.0.0.1',
  port: 2655,
  basePath: '/',
  apiBasePath: '/api',
  localOnly: true,
  allowExternalManageAccess: false,
  accessLog: true,
  queryLog: false,
  backgroundEditor: {
    enabled: true,
    tokenTtlMinutes: 30,
    maxImageMB: 2
  }
}
