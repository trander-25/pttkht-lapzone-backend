/**
 * SWAGGER.JS - CẤU HÌNH SWAGGER UI / OPENAPI 3.0 DOCUMENTATION
 *
 * File này tạo ra API documentation tự động dựa trên OpenAPI 3.0 spec
 * Swagger UI được phục vụ tại endpoint /api-docs
 *
 * Nội dung documentation:
 * - Tất cả API endpoints (auth, products, cart, orders, etc.)
 * - Request/Response schemas
 * - Authentication methods (Cookie-based JWT và Bearer token)
 * - Error responses
 * - Có thể test API trực tiếp từ Swagger UI
 */

import swaggerJsdoc from 'swagger-jsdoc'
import { env } from './environment'

/**
 * OpenAPI 3.0 Specification
 * Định nghĩa metadata, servers, security schemes, và schemas
 */
const swaggerDefinition = {
  openapi: '3.0.0', // Phiên bản OpenAPI specification

  // Thông tin metadata về API
  info: {
    title: 'LapZone E-Commerce API Documentation',
    version: '1.0.0',
    description: `
      REST API for laptop & computer accessories e-commerce platform.
      
      **Features:** JWT auth (Google OAuth2), Shopping cart, Orders (COD/MoMo), AI chat (Gemini), Reviews, Wishlist, Homepage management
      
      **Tech:** Node.js 22, Express, MongoDB, Socket.IO, Cloudinary, Resend
      
      **Authentication:** Login → Cookies auto-saved → Auto-authenticated on all requests
      
      **Notes:** Timestamps in Unix ms | Cookies auto-sent | Cron: Auto-cancel unpaid orders after 24h
    `,
    contact: {
      name: 'LapZone Development Team',
      email: 'support@lapzone.me'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },

  // Danh sách servers - tự động switch giữa dev và production
  servers: [
    {
      // URL thay đổi dựa trên BUILD_MODE trong .env
      url: env.BUILD_MODE === 'production'
        ? 'https://lapzone.me/api/v1'
        : `http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}/api/v1`,
      description: env.BUILD_MODE === 'production' ? 'Production Server (https://lapzone.me)' : 'Development Server'
    }
  ],

  // Components: định nghĩa các schemas và security schemes tái sử dụng
  components: {
    // ============================================
    // SECURITY SCHEMES - PHƯƠNG THỨC XÁC THỰC
    // ============================================
    securitySchemes: {
      // Phương thức 1: JWT token trong HTTP-only cookie (recommended)
      // Token tự động được browser gửi kèm mỗi request
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'JWT access token stored in HTTP-only cookie. Automatically sent with requests after login.'
      },
      // Phương thức 2: Bearer token trong Authorization header (alternative)
      // Dùng khi test API với Postman/Insomnia
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Alternative: Use Bearer token in Authorization header (for testing)'
      }
    },

    // ============================================
    // SCHEMAS - ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU
    // ============================================
    schemas: {
      // Schema cho error responses
      Error: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'integer',
            example: 400
          },
          message: {
            type: 'string',
            example: 'Validation error message'
          }
        }
      },

      // Schema cho User object
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          username: {
            type: 'string',
            example: 'johndoe'
          },
          phone: {
            type: 'string',
            example: '+84987654321',
            nullable: true
          },
          sex: {
            type: 'string',
            enum: ['male', 'female'],
            nullable: true
          },
          avatar: {
            type: 'string',
            example: 'https://example.com/avatar.jpg',
            nullable: true
          },
          role: {
            type: 'string',
            enum: ['customer', 'manager', 'admin'],
            example: 'customer'
          },
          addresses: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Address'
            }
          },
          provider: {
            type: 'string',
            enum: ['local', 'google'],
            example: 'local'
          },
          isActive: {
            type: 'boolean',
            example: true
          },
          createdAt: {
            type: 'number',
            description: 'Unix timestamp in milliseconds',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            description: 'Unix timestamp in milliseconds',
            example: 1699999999999,
            nullable: true
          }
        }
      },
      Address: {
        type: 'object',
        properties: {
          addressId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          street: {
            type: 'string',
            example: '123 Main Street'
          },
          ward: {
            type: 'string',
            example: 'Ward 1'
          },
          district: {
            type: 'string',
            example: 'District 1'
          },
          province: {
            type: 'string',
            example: 'Ho Chi Minh City'
          },
          isDefault: {
            type: 'boolean',
            example: false
          }
        }
      },
      TokenResponse: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token (also set in HTTP-only cookie)',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        }
      },

      // Schema cho Product object
      Product: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          name: {
            type: 'string',
            example: 'Dell XPS 15 9520'
          },
          slug: {
            type: 'string',
            example: 'dell-xps-15-9520'
          },
          description: {
            type: 'string',
            example: 'High-performance laptop with stunning display'
          },
          price: {
            type: 'number',
            example: 45990000
          },
          originalPrice: {
            type: 'number',
            example: 52990000,
            nullable: true
          },
          stock: {
            type: 'integer',
            example: 25
          },
          brand: {
            type: 'string',
            example: 'Dell'
          },
          category: {
            type: 'string',
            example: 'Laptop'
          },
          images: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['https://cloudinary.com/image1.jpg', 'https://cloudinary.com/image2.jpg']
          },
          specifications: {
            type: 'object',
            example: {
              cpu: 'Intel Core i7-12700H',
              ram: '16GB DDR5',
              storage: '512GB NVMe SSD',
              display: '15.6" FHD+ 500 nits',
              gpu: 'NVIDIA RTX 3050 Ti'
            }
          },
          averageRating: {
            type: 'number',
            example: 4.5,
            nullable: true
          },
          totalReviews: {
            type: 'integer',
            example: 128
          },
          isActive: {
            type: 'boolean',
            example: true
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      // Schema cho Cart object
      Cart: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012'
          },
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CartItem'
            }
          },
          selectedAmount: {
            type: 'number',
            description: 'Total amount of selected items',
            example: 67980000
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      CartItem: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          name: {
            type: 'string',
            example: 'Dell XPS 15 9520'
          },
          slug: {
            type: 'string',
            example: 'dell-xps-15-9520'
          },
          price: {
            type: 'number',
            example: 45990000
          },
          image: {
            type: 'string',
            example: 'https://cloudinary.com/image.jpg'
          },
          quantity: {
            type: 'integer',
            example: 2
          },
          selected: {
            type: 'boolean',
            description: 'Whether item is selected for checkout',
            example: true
          }
        }
      },

      // Schema cho Order object
      Order: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          orderCode: {
            type: 'string',
            example: 'ORD-1234567890'
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012'
          },
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/OrderItem'
            }
          },
          total: {
            type: 'number',
            description: 'Total amount = sum of (price × quantity)',
            example: 91980000
          },
          shippingAddress: {
            $ref: '#/components/schemas/Address'
          },
          paymentMethod: {
            type: 'string',
            enum: ['COD', 'MoMo'],
            example: 'COD'
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
            example: 'PENDING'
          },
          isPaid: {
            type: 'boolean',
            example: false
          },
          paidAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          },
          momoTransactionId: {
            type: 'string',
            example: '1234567890',
            nullable: true
          },
          cancelReason: {
            type: 'string',
            example: 'Customer requested cancellation',
            nullable: true
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      OrderItem: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          name: {
            type: 'string',
            example: 'Dell XPS 15 9520'
          },
          slug: {
            type: 'string',
            example: 'dell-xps-15-9520'
          },
          price: {
            type: 'number',
            example: 45990000
          },
          image: {
            type: 'string',
            example: 'https://cloudinary.com/image.jpg'
          },
          quantity: {
            type: 'integer',
            example: 2
          }
        }
      },

      // Schema cho Review object
      Review: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          productId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012'
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439013'
          },
          username: {
            type: 'string',
            example: 'johndoe'
          },
          orderId: {
            type: 'string',
            example: '507f1f77bcf86cd799439014'
          },
          rating: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            example: 5
          },
          comment: {
            type: 'string',
            example: 'Excellent product! Highly recommended.'
          },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
            example: 'approved'
          },
          adminNote: {
            type: 'string',
            example: 'Approved by admin',
            nullable: true
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      // Schema cho Wishlist object
      Wishlist: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012'
          },
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/WishlistItem'
            }
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      WishlistItem: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          name: {
            type: 'string',
            example: 'Dell XPS 15 9520'
          },
          slug: {
            type: 'string',
            example: 'dell-xps-15-9520'
          },
          price: {
            type: 'number',
            example: 45990000
          },
          originalPrice: {
            type: 'number',
            example: 52990000,
            nullable: true
          },
          image: {
            type: 'string',
            example: 'https://cloudinary.com/image.jpg'
          },
          stock: {
            type: 'integer',
            example: 25
          },
          addedAt: {
            type: 'number',
            example: 1699999999999
          }
        }
      },

      // Schema cho Conversation object (Chat)
      Conversation: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          type: {
            type: 'string',
            enum: ['user_ai'],
            example: 'user_ai'
          },
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012'
          },
          title: {
            type: 'string',
            example: 'AI Assistant'
          },
          lastMessageAt: {
            type: 'number',
            example: 1699999999999
          },
          isActive: {
            type: 'boolean',
            example: true
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      // Schema cho Message object (Chat)
      Message: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          conversationId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012'
          },
          senderId: {
            type: 'string',
            example: '507f1f77bcf86cd799439013',
            nullable: true,
            description: 'null if sender is AI'
          },
          senderType: {
            type: 'string',
            enum: ['user', 'ai'],
            example: 'user'
          },
          content: {
            type: 'string',
            example: 'What laptops do you recommend for gaming?'
          },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  example: 'https://cloudinary.com/file.jpg'
                },
                type: {
                  type: 'string',
                  enum: ['image', 'file'],
                  example: 'image'
                },
                name: {
                  type: 'string',
                  example: 'screenshot.png'
                },
                size: {
                  type: 'number',
                  example: 1024567,
                  nullable: true
                }
              }
            }
          },
          isRead: {
            type: 'boolean',
            example: true
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          }
        }
      },

      // Schema cho Location object
      Location: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          name: {
            type: 'string',
            example: 'Hồ Chí Minh'
          },
          type: {
            type: 'string',
            enum: ['province', 'district', 'ward'],
            example: 'province'
          },
          code: {
            type: 'string',
            example: '79'
          },
          parentCode: {
            type: 'string',
            example: null,
            nullable: true
          }
        }
      },

      // Schema cho Homepage Configuration
      Homepage: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          banners: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  example: 'https://cloudinary.com/banner.jpg'
                },
                title: {
                  type: 'string',
                  example: 'Summer Sale 2025'
                },
                link: {
                  type: 'string',
                  example: '/products/sale'
                },
                order: {
                  type: 'integer',
                  example: 1
                }
              }
            }
          },
          featuredProducts: {
            type: 'array',
            items: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            }
          },
          hotDeals: {
            type: 'array',
            items: {
              type: 'string',
              example: '507f1f77bcf86cd799439012'
            }
          },
          createdAt: {
            type: 'number',
            example: 1699999999999
          },
          updatedAt: {
            type: 'number',
            example: 1699999999999,
            nullable: true
          }
        }
      },

      // Schema cho Pagination response
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1
          },
          limit: {
            type: 'integer',
            example: 20
          },
          total: {
            type: 'integer',
            example: 150
          },
          totalPages: {
            type: 'integer',
            example: 8
          }
        }
      }
    },

    // ============================================
    // RESPONSES - CÁC RESPONSE MẪU TÁI SỬ DỤNG
    // ============================================
    responses: {
      // 401 Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
      UnauthorizedError: {
        description: 'Authentication required - Missing or invalid token',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              statusCode: 401,
              message: 'Unauthorized - Please login'
            }
          }
        }
      },
      // 403 Forbidden - Không đủ quyền truy cập
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              statusCode: 403,
              message: 'Access denied - Insufficient permissions'
            }
          }
        }
      },
      // 404 Not Found - Không tìm thấy resource
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              statusCode: 404,
              message: 'Resource not found'
            }
          }
        }
      },
      // 422 Validation Error - Dữ liệu không hợp lệ (Joi validation failed)
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              statusCode: 422,
              message: '"email" must be a valid email'
            }
          }
        }
      }
    }
  },

  // ============================================
  // TAGS - NHÓM CÁC ENDPOINTS THEO CHỨC NĂNG
  // ============================================
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and account management endpoints'
    },
    {
      name: 'Users',
      description: 'User profile and management operations'
    },
    {
      name: 'Products',
      description: 'Product catalog and inventory management'
    },
    {
      name: 'Cart',
      description: 'Shopping cart operations'
    },
    {
      name: 'Orders',
      description: 'Order processing and tracking'
    },
    {
      name: 'Reviews',
      description: 'Product reviews and ratings'
    },
    {
      name: 'Wishlist',
      description: 'User wishlist management'
    },
    {
      name: 'Chat',
      description: 'Real-time chat and messaging'
    },
    {
      name: 'Locations',
      description: 'Geographic location data'
    },
    {
      name: 'Homepage',
      description: 'Homepage configuration and management'
    }
  ]
}

/**
 * Swagger Options cho swagger-jsdoc
 * Định nghĩa swaggerDefinition và đường dẫn tới các file chứa JSDoc comments
 */
const swaggerOptions = {
  swaggerDefinition,
  // Đường dẫn đến các file chứa JSDoc comments
  // swagger-jsdoc sẽ scan các file này để tìm @swagger annotations
  apis: [
    './src/routes/v1/*.js', // Tất cả route files - chứa @swagger comments cho endpoints
    './src/models/*.js', // Model schemas (optional) - có thể document schemas
    './src/controllers/*.js' // Controller docs (optional) - có thể document response examples
  ]
}

/**
 * Export Swagger Specification object
 * Sử dụng trong server.js để setup Swagger UI
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions)
