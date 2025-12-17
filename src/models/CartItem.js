import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

const CartItem = sequelize.define('cart_items', {
  cart_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
})

export default CartItem
