import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

const Payment = sequelize.define('payments', {
  payment_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('COD', 'MOMO'),
    defaultValue: 'COD'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('PENDING', 'PAID'),
    defaultValue: 'PENDING'
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
})

export default Payment
