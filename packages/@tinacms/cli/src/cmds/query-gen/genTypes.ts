/**
Copyright 2021 Forestry.io Holdings, Inc.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { DocumentNode, GraphQLSchema, printSchema } from 'graphql'

import fs from 'fs-extra'
import { generateTypes } from '../../codegen'
import { logText } from '../../utils/theme'
import { logger } from '../../logger'

export async function genTypes(
  { schema }: { schema: GraphQLSchema },
  next: () => void,
  options
) {
  const typesPath = process.cwd() + '/.tina/__generated__/types.ts'
  const fragPath = process.cwd() + '/.tina/__generated__/*.{graphql,gql}'
  const queryPathGlob = process.cwd() + '/.tina/queries/**/*.{graphql,gql}'

  const typescriptTypes = await generateTypes(
    schema,
    queryPathGlob,
    fragPath,
    options
  )

  await fs.outputFile(
    typesPath,
    `//@ts-nocheck
// DO NOT MODIFY THIS FILE. This file is automatically generated by Tina
${typescriptTypes}
`
  )
  logger.info(`\tTypescript types => ${logText(typesPath)}`)

  const schemaString = await printSchema(schema)
  const schemaPath = process.cwd() + '/.tina/__generated__/schema.gql'

  await fs.outputFile(
    schemaPath,
    `# DO NOT MODIFY THIS FILE. This file is automatically generated by Tina
${schemaString}
schema {
  query: Query
  mutation: Mutation
}
  `
  )
  logger.info(`\tGraphQL types ====> ${logText(schemaPath)}\n`)
  next()
}
