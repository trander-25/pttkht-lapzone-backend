const User = require('./User')
const Brand = require('./Brand')
const Product = require('./Product')
const ProductDetail = require('./ProductDetail')
const Wishlist = require('./Wishlist')
const WishlistItem = require('./WishlistItem')
const Cart = require('./Cart')
const CartItem = require('./CartItem')
const Voucher = require('./Voucher')
const Order = require('./Order')
const OrderItem = require('./OrderItem')
const Payment = require('./Payment')

// Product Relationships
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' })
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' })

Product.hasOne(ProductDetail, { foreignKey: 'product_id', as: 'details' })
ProductDetail.belongsTo(Product, { foreignKey: 'product_id', as: 'product' })

// Wishlist Relationships
User.hasOne(Wishlist, { foreignKey: 'user_id', as: 'wishlist' })
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

Wishlist.belongsToMany(Product, {
  through: WishlistItem,
  foreignKey: 'wishlist_id',
  otherKey: 'product_id',
  as: 'products'
})

Product.belongsToMany(Wishlist, {
  through: WishlistItem,
  foreignKey: 'product_id',
  otherKey: 'wishlist_id',
  as: 'wishlists'
})

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

module.exports = {
  User,
  Brand,
  Product,
  ProductDetail,
  Wishlist,
  WishlistItem,
  Cart,
  CartItem,
  Voucher,
  Order,
  OrderItem,
  Payment
}
