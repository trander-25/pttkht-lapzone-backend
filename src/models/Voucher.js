import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

const Voucher = sequelize.define('vouchers', {
  voucher_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  max_discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  discount_value: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
})

export default Voucher
