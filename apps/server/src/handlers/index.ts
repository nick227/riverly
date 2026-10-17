// Every operationId in packages/api-spec/openapi.yaml must be exported here.
// fastify-openapi-glue fails at startup if one is missing.
export * from './system'
export * from './auth'
export * from './team'
export * from './workflow'
export * from './contacts'
export * from './jobs'
export * from './activity'
export * from './fieldwork'
export * from './files'
export * from './intake'
export * from './email'
export * from './profiles'
export * from './manage'
export * from './integrations'

