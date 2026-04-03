export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    Resources: [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
        id: 'urn:ietf:params:scim:schemas:core:2.0:User',
        name: 'User',
        description: 'Greenhouse Portal User',
        attributes: [
          {
            name: 'userName',
            type: 'string',
            multiValued: false,
            required: true,
            caseExact: false,
            mutability: 'readWrite',
            returned: 'default',
            uniqueness: 'server'
          },
          {
            name: 'displayName',
            type: 'string',
            multiValued: false,
            required: false,
            mutability: 'readWrite',
            returned: 'default'
          },
          {
            name: 'active',
            type: 'boolean',
            multiValued: false,
            required: false,
            mutability: 'readWrite',
            returned: 'default'
          },
          {
            name: 'emails',
            type: 'complex',
            multiValued: true,
            required: true,
            mutability: 'readWrite',
            returned: 'default',
            subAttributes: [
              { name: 'value', type: 'string', multiValued: false, required: true },
              { name: 'type', type: 'string', multiValued: false, required: false },
              { name: 'primary', type: 'boolean', multiValued: false, required: false }
            ]
          },
          {
            name: 'name',
            type: 'complex',
            multiValued: false,
            required: false,
            mutability: 'readWrite',
            returned: 'default',
            subAttributes: [
              { name: 'givenName', type: 'string', multiValued: false },
              { name: 'familyName', type: 'string', multiValued: false }
            ]
          },
          {
            name: 'externalId',
            type: 'string',
            multiValued: false,
            required: false,
            mutability: 'readWrite',
            returned: 'default'
          }
        ]
      }
    ]
  })
}
