import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

const Order = sequelize.define('orders', {
  order_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  voucher_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  receiver_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  shipment_address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  order_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  order_status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'SHIPPING', 'CANCELLED', 'COMPLETED'),
    defaultValue: 'PENDING'
  }
})

export default Order
