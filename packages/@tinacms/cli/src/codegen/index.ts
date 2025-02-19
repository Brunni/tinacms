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

import { GraphQLSchema, parse, printSchema } from 'graphql'

import { AddGeneratedClient } from './plugin'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { codegen } from '@graphql-codegen/core'
// See https://www.graphql-tools.com/docs/documents-loading for more examples of the `load documents function`
import { loadDocuments } from '@graphql-tools/load'
import { logger } from '../logger'
import { plugin as typescriptOperationsPlugin } from '@graphql-codegen/typescript-operations'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
// Docs: https://www.graphql-code-generator.com/docs/plugins/typescript-generic-sdk
import { plugin as typescriptSdkPlugin } from './sdkPlugin'

export const generateTypes = async (
  schema: GraphQLSchema,
  queryPathGlob = process.cwd(),
  fragDocPath = process.cwd(),
  options: { noSDK: boolean; verbose?: boolean } = {
    noSDK: false,
    verbose: false,
  }
) => {
  if (options.verbose) logger.info('Generating types...')
  try {
    let docs = []
    let fragDocs = []

    // Load GQL queries from user queries folder
    try {
      if (!options.noSDK) {
        docs = await loadDocuments(queryPathGlob, {
          loaders: [new GraphQLFileLoader()],
        })
      }
    } catch (e) {
      let showErrorMessage = true
      const message: string = e.message || ''
      if (
        message.includes(
          'Unable to find any GraphQL type definitions for the following pointers:'
        )
      ) {
        showErrorMessage = false
      }
      if (showErrorMessage) {
        console.error(e)
      }
    }

    // Load fragments from generated document
    try {
      if (!options.noSDK) {
        fragDocs = await loadDocuments(fragDocPath, {
          loaders: [new GraphQLFileLoader()],
        })
      }
    } catch (error) {
      console.error(error)
    }

    // See https://www.graphql-code-generator.com/docs/getting-started/programmatic-usage for more details
    const res = await codegen({
      // Filename is not used. This is because the typescript plugin returns a string instead of writing to a file.
      filename: process.cwd(),
      schema: parse(printSchema(schema)),
      documents: [...docs, ...fragDocs],
      config: {},
      plugins: [
        { typescript: {} },
        { typescriptOperations: {} },
        {
          typescriptSdk: {
            gqlImport: 'tinacms#gql',
            documentNodeImport: 'tinacms#DocumentNode',
          },
        },
        { AddGeneratedClient: {} },
      ],
      pluginMap: {
        typescript: {
          plugin: typescriptPlugin,
        },
        typescriptOperations: {
          plugin: typescriptOperationsPlugin,
        },
        typescriptSdk: {
          plugin: typescriptSdkPlugin,
        },
        AddGeneratedClient,
      },
    })
    return res
  } catch (e) {
    console.error(e)
  }
}
