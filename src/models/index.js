import User from './User.js'
import Brand from './Brand.js'
import Product from './Product.js'
import Cart from './Cart.js'
import CartItem from './CartItem.js'
import Voucher from './Voucher.js'
import Order from './Order.js'
import OrderItem from './OrderItem.js'
import Payment from './Payment.js'

// Product Relationships
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' })
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' })

// Cart Relationships
User.hasOne(Cart, { foreignKey: 'user_id', as: 'cart' })
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

Cart.belongsToMany(Product, {
  through: CartItem,
  foreignKey: 'cart_id',
  otherKey: 'product_id',
  as: 'products'
})

Product.belongsToMany(Cart, {
  through: CartItem,
  foreignKey: 'product_id',
  otherKey: 'cart_id',
  as: 'carts'
})

Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' })
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' })
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' })
Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems' })

// Order Relationships
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' })
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

Order.belongsTo(Voucher, { foreignKey: 'voucher_id', as: 'voucher' })
Voucher.hasMany(Order, { foreignKey: 'voucher_id', as: 'orders' })

Order.belongsToMany(Product, {
  through: OrderItem,
  foreignKey: 'order_id',
  otherKey: 'product_id',
  as: 'products'
})

Product.belongsToMany(Order, {
  through: OrderItem,
  foreignKey: 'product_id',
  otherKey: 'order_id',
  as: 'orders'
})

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' })
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' })
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' })
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' })

// Payment Relationships
Order.hasOne(Payment, { foreignKey: 'order_id', as: 'payment' })
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' })

export {
  User,
  Brand,
  Product,
  Cart,
  CartItem,
  Voucher,
  Order,
  OrderItem,
  Payment
}
