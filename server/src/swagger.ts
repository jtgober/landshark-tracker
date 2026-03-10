import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shark-In API',
      version: '1.0.0',
      description: 'REST API for the Shark-In event attendance tracker',
    },
    servers: [
      { url: '/api', description: 'API root' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            avatarUpdatedAt: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            date: { type: 'string' },
            time: { type: 'string' },
            location: { type: 'string' },
            type: { type: 'string', enum: ['cycling', 'swimming', 'running'] },
            description: { type: 'string' },
          },
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            avatarColor: { type: 'string' },
            status: { type: 'string', enum: ['in', 'out'] },
            lastAction: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            avatarUpdatedAt: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
          },
        },
        Activity: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            time: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['in', 'out'] },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
