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

import { defineSchema, defineConfig } from 'tinacms'

const schema = defineSchema({
  collections: [
    {
      name: 'page',
      path: 'content/page',
      label: 'Page',
      format: 'mdx',
      fields: [
        {
          label: 'Title',
          name: 'Title',
          type: 'string',
          ui: {
            // defaultValue: 'Title',
            // Examples of how you COULD use a custom form
            // component: ({ form, field, input }) => {
            //   return (
            //     <div>
            //       <label>This is a test</label>
            //       <input {...input}></input>
            //     </div>
            //   )
            // },
            // validate: (val) => {
            //   if (val?.length > 5) {
            //     return 'Too Long!!!'
            //   }
            // },
          },
        },
        {
          name: 'body',
          label: 'Main Content',
          type: 'rich-text',
          isBody: true,
        },
      ],
    },
    {
      label: 'Blog Posts',
      name: 'post',
      path: 'content/post',
      format: 'md',
      fields: [
        {
          type: 'string',
          label: 'Title',
          name: 'title',
        },
        {
          type: 'object',
          label: 'Related Posts',
          name: 'relatedPosts',
          list: true,
          ui: {
            itemProps: (item) => {
              return { label: item?.label }
            },
          },
          fields: [
            {
              name: 'post',
              type: 'reference',
              collections: ['post', 'page'],
            },
            {
              name: 'label',
              type: 'string',
            },
          ],
        },
        {
          type: 'object',
          label: 'Something',
          name: 'foo',
          fields: [
            {
              name: 'bar',
              label: 'Bar',
              type: 'string',
            },
          ],
        },
        {
          type: 'string',

          label: 'Topic',
          name: 'topic',
          options: ['programming', 'blacksmithing'],
          list: true,
        },
        {
          type: 'rich-text',
          label: 'Blog Post Body',
          name: 'body',
          isBody: true,
          templates: [
            {
              name: 'Gallery',
              label: 'Gallery',
              fields: [
                {
                  label: 'Images',
                  name: 'images',
                  type: 'object',
                  list: true,
                  fields: [
                    {
                      type: 'image',
                      name: 'src',
                      label: 'Source',
                    },
                    {
                      type: 'string',
                      name: 'width',
                      label: 'Width',
                    },
                    {
                      type: 'string',
                      name: 'height',
                      label: 'Height',
                    },
                  ],
                },
                {
                  type: 'string',
                  name: 'alignment',
                  label: 'Alignment',
                  options: ['left', 'center', 'right'],
                },
                {
                  type: 'string',
                  name: 'gap',
                  label: 'Gap',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const branch = 'main'
// When working locally, hit our local filesystem.
// On a Vercel deployment, hit the Tina Cloud API
const apiURL =
  process.env.NODE_ENV == 'development'
    ? 'http://localhost:4001/graphql'
    : `https://content.tinajs.io/content/${process.env.NEXT_PUBLIC_TINA_CLIENT_ID}/github/${branch}`

export const tinaConfig = defineConfig({
  schema,
  apiURL,
  cmsCallback: (cms) => {
    cms.flags.set('tina-admin', true)
    return cms
  },
})

export default schema
