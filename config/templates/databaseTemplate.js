/**
 * 数据库配置模板
 */
export const databaseTemplate = {
  type: 'postgresql',
  path: 'speech_statistics_db.db',
  host: '',
  port: 5432,
  database: 'speech_statistics_db',
  user: 'speech_statistics_db',
  password: '',
  pool: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  ssl: false
}

