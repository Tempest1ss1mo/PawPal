const express = require('express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const router = express.Router();

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: process.env.SWAGGER_TITLE || 'PawPal User Service API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    description: process.env.SWAGGER_DESCRIPTION || 'Microservice for managing users and dogs in the PawPal platform',
    contact: {
      name: 'PawPal Team',
      email: 'team@pawpal.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: '/',  // Use relative path to automatically adapt to current host
      description: 'Current server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Unauthorized'
                },
                message: {
                  type: 'string',
                  example: 'Access token is missing or invalid'
                }
              }
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Validation Error'
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        example: 'email'
                      },
                      message: {
                        type: 'string',
                        example: 'Email is required'
                      },
                      value: {
                        type: 'string',
                        example: ''
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                message: {
                  type: 'string',
                  example: 'Resource not found'
                }
              }
            }
          }
        }
      },
      ConflictError: {
        description: 'Resource conflict',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                message: {
                  type: 'string',
                  example: 'Resource already exists'
                }
              }
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  example: 'Internal Server Error'
                },
                message: {
                  type: 'string',
                  example: 'An unexpected error occurred'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                },
                path: {
                  type: 'string',
                  example: '/api/users'
                },
                method: {
                  type: 'string',
                  example: 'GET'
                }
              }
            }
          }
        }
      }
    },
    schemas: {
      Links: {
        type: 'object',
        properties: {
          self: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users/1'
              }
            }
          },
          collection: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users'
              }
            }
          }
        }
      },
      PaginationLinks: {
        type: 'object',
        properties: {
          self: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users?page=1&limit=10'
              }
            }
          },
          first: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users?page=1&limit=10'
              }
            }
          },
          prev: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users?page=1&limit=10'
              }
            }
          },
          next: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users?page=2&limit=10'
              }
            }
          },
          last: {
            type: 'object',
            properties: {
              href: {
                type: 'string',
                format: 'uri',
                example: '/api/users?page=5&limit=10'
              }
            }
          }
        }
      },
      AsyncTask: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'task_1234567890_abc'
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
            example: 'pending'
          },
          type: {
            type: 'string',
            example: 'bulk_import_users'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          },
          links: {
            $ref: '#/components/schemas/Links'
          }
        }
      },
      UserUpdate: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            maxLength: 100
          },
          email: {
            type: 'string',
            format: 'email',
            maxLength: 150
          },
          role: {
            type: 'string',
            enum: ['owner', 'walker']
          },
          phone: {
            type: 'string',
            maxLength: 20
          },
          location: {
            type: 'string',
            maxLength: 200
          },
          profile_image_url: {
            type: 'string',
            format: 'uri',
            maxLength: 500
          },
          bio: {
            type: 'string',
            maxLength: 1000
          },
          rating: {
            type: 'number',
            minimum: 0,
            maximum: 5
          },
          total_reviews: {
            type: 'integer',
            minimum: 0
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Users',
      description: 'User management operations with Sprint 2 features: ETag support, pagination, HATEOAS links, and async operations'
    },
    {
      name: 'Dogs',
      description: 'Dog management operations'
    },
    {
      name: 'Health',
      description: 'Health check operations'
    }
  ]
};

// Options for the swagger docs
const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/userRoutes.js',
    './src/routes/dogRoutes.js',
    './src/app.js'
  ]
};

// Initialize swagger-jsdoc with error handling
let swaggerSpec;
try {
  swaggerSpec = swaggerJSDoc(options);
  if (!swaggerSpec || !swaggerSpec.paths) {
    console.error('⚠️  Swagger spec generation failed or incomplete');
    swaggerSpec = { openapi: '3.0.0', info: { title: 'API Documentation', version: '1.0.0' }, paths: {} };
  }
} catch (error) {
  console.error('❌ Error generating Swagger spec:', error);
  // Fallback minimal spec
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'PawPal User Service API',
      version: '1.0.0',
      description: 'API documentation (spec generation error)'
    },
    paths: {}
  };
}

// Swagger UI options
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PawPal User Service API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
};

// Serve swagger.json with dynamic server URL
router.get('/swagger.json', (req, res) => {
  // Dynamically set server URL based on request
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  // Create a copy of swagger spec with dynamic server URL
  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: baseUrl,
        description: 'Current server'
      }
    ]
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.send(dynamicSpec);
});

// Serve swagger UI with dynamic spec
// Use a function to dynamically generate the setup with correct base URL
router.use('/', swaggerUi.serve);
router.get('/', (req, res, next) => {
  // Force HTTP protocol to avoid SSL errors
  // Since we're running on HTTP (port 3001), always use HTTP
  const protocol = 'http';  // Force HTTP to avoid HTTPS SSL errors
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  // Create dynamic spec with correct server URL
  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: baseUrl,
        description: 'Current server'
      }
    ]
  };
  
  // Setup Swagger UI with dynamic spec
  const swaggerUiHandler = swaggerUi.setup(dynamicSpec, {
    ...swaggerUiOptions,
    swaggerOptions: {
      ...swaggerUiOptions.swaggerOptions,
      url: `${baseUrl}/api-docs/swagger.json`  // Use full HTTP URL for swagger.json
    }
  });
  
  swaggerUiHandler(req, res, next);
});

// Additional documentation endpoints
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Swagger Documentation',
    timestamp: new Date().toISOString(),
    version: swaggerDefinition.info.version
  });
});

module.exports = router;
