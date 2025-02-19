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

import React from 'react'
import styled from 'styled-components'
import {
  Plate,
  createReactPlugin,
  createHistoryPlugin,
  createParagraphPlugin,
  createBlockquotePlugin,
  createCodeBlockPlugin,
  createHeadingPlugin,
  createBoldPlugin,
  createItalicPlugin,
  createUnderlinePlugin,
  createStrikethroughPlugin,
  createCodePlugin,
  createPlateComponents,
  createIndentPlugin,
  createNormalizeTypesPlugin,
  createPlateOptions,
  createLinkPlugin,
  createImagePlugin,
  createBasicMarkPlugins,
  createListPlugin,
  createAutoformatPlugin,
  createResetNodePlugin,
  createTrailingBlockPlugin,
  createHorizontalRulePlugin,
  createSelectOnBackspacePlugin,
  createSoftBreakPlugin,
  createExitBreakPlugin,
  useEditorRef,
} from '@udecode/plate'
import { wrapFieldsWithMeta } from '../../wrapFieldWithMeta'

import { CONFIG } from './config'
import { ToolbarButtons } from './toolbar'
import { createTinaImagePlugin, Img } from './image'
import { createMDXPlugin, createMDXTextPlugin, MdxElement } from './mdx'

import { InputProps } from '../../../components'

const options = createPlateOptions()

const wrapValue = (value) => {
  return value.children
    ? [
        ...value.children?.map(normalize),
        { type: 'p', children: [{ type: 'text', text: '' }] },
      ]
    : // Empty values need at least one item
      [{ type: 'p', children: [{ type: 'text', text: '' }] }]
}

export const RichEditor = wrapFieldsWithMeta<
  InputProps,
  { templates: unknown[] }
>((props) => {
  /**
   * FIXME: this is storing the initial value as a way to determine if we should reset the
   * slate editor. Since slate holds onto its own state, treating it as a traditional
   * controlled component doesn't work.
   */
  const initialValue = React.useMemo(
    () => JSON.stringify(props.input.value),
    []
  )
  /**
   * Used to refresh slate's state
   */
  const [key, setKey] = React.useState(0)

  React.useEffect(() => {
    /**
     * If we get a new value from props.input.value and it's equal
     * to our current value, odds are that it's a reset from the form.
     * Note that this would also happen if the editor adds some text then
     * deletes it, but that's ok, a refresh to slate won't do any harm in that case
     */
    if (initialValue === JSON.stringify(props.input.value)) {
      setKey((key) => key + 1)
    }
  }, [JSON.stringify(props.input.value)])

  const templates = props.field.templates
  const name = props.input.name

  const components = createPlateComponents({
    img: (props) => <Img {...props} name={name} />,
    mdxJsxTextElement: (props) => {
      return <MdxElement {...props} templates={templates} inline={true} />
    },
    mdxJsxFlowElement: (props) => {
      return <MdxElement {...props} templates={templates} inline={false} />
    },
  })

  const pluginsBasic = [
    createTinaImagePlugin(),
    createMDXPlugin(),
    createMDXTextPlugin(),
    createReactPlugin(),
    createHistoryPlugin(),
    createHorizontalRulePlugin(),
    createParagraphPlugin(),
    createBlockquotePlugin(),
    createCodeBlockPlugin(),
    createHeadingPlugin(),
    createLinkPlugin(),
    createListPlugin(),
    createImagePlugin(),
    createBoldPlugin(),
    createItalicPlugin(),
    createUnderlinePlugin(),
    createStrikethroughPlugin(),
    createCodePlugin(),
    ...createBasicMarkPlugins(),
    createIndentPlugin(CONFIG.indent),
    createAutoformatPlugin(CONFIG.autoformat),
    createResetNodePlugin(CONFIG.resetBlockType),
    createSoftBreakPlugin(CONFIG.softBreak),
    createExitBreakPlugin(CONFIG.exitBreak),
    createNormalizeTypesPlugin(CONFIG.forceLayout),
    createTrailingBlockPlugin(CONFIG.trailingBlock),
    createSelectOnBackspacePlugin(CONFIG.selectOnBackspace),
  ]
  return (
    <>
      <ToolbarButtons name={props.input.name} templates={templates} />
      <RichTextInput>
        <Plate
          id={props.input.name}
          initialValue={wrapValue(props.input.value)}
          key={key}
          plugins={pluginsBasic}
          components={components}
          options={options}
          onChange={(value) => {
            props.input.onChange({ type: 'root', children: value })
          }}
        />
      </RichTextInput>
    </>
  )
})

const normalize = (node: any) => {
  if (['mdxJsxFlowElement', 'mdxJsxTextElement', 'img'].includes(node.type)) {
    return {
      ...node,
      children: [{ type: 'text', text: '' }],
    }
  }
  if (node.children) {
    if (node.children.length > 0) {
      return {
        ...node,
        children: node.children.map(normalize),
      }
    } else {
      return {
        ...node,
        children: [{ type: 'text', text: '' }],
      }
    }
  }
  return node
}

export const RichTextInput = ({ children }) => {
  return (
    <div
      className="prose shadow-inner focus:shadow-outline focus:border-blue-500 block w-full bg-white border border-gray-200 text-gray-600 focus:text-gray-900 rounded-md p-5 mb-5"
      style={{ minHeight: '100px', maxWidth: `100%` }}
    >
      {children}
    </div>
  )
}
