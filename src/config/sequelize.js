import { Sequelize } from 'sequelize'
import { env } from './environment.js'

const sequelize = new Sequelize(
  env.MYSQL_DATABASE || 'lapzone',
  env.MYSQL_USER || 'root',
  env.MYSQL_PASSWORD || '',
  {
    host: env.MYSQL_HOST || 'localhost',
    port: env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+07:00',
    define: {
      timestamps: false,
      freezeTableName: true
    }
  }
)

const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ MySQL connected successfully')
    
    // Sync models with database
    await sequelize.sync()
    console.log('✅ Database tables synced')
  } catch (error) {
    console.error('❌ MySQL connection failed:', error)
    process.exit(1)
  }
}

export { sequelize, connectDB }
