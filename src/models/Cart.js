import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

const Cart = sequelize.define('carts', {
  cart_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
})

export default Cart
