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

import {
  ELEMENT_CODE_BLOCK,
  ELEMENT_CODE_LINE,
} from '@udecode/plate-code-block'
import { unwrapList, toggleList } from '@udecode/plate-list'
import type { AutoformatBlockRule } from '@udecode/plate-autoformat'

import {
  getParent,
  isElement,
  isType,
  PlateEditor,
  TEditor,
} from '@udecode/plate-core'

export const preFormat: AutoformatBlockRule['preFormat'] = (editor) =>
  unwrapList(editor as PlateEditor)

export const format = (editor: TEditor, customFormatting: any) => {
  if (editor.selection) {
    const parentEntry = getParent(editor, editor.selection)
    if (!parentEntry) return
    const [node] = parentEntry
    if (
      isElement(node) &&
      !isType(editor as PlateEditor, node, ELEMENT_CODE_BLOCK) &&
      !isType(editor as PlateEditor, node, ELEMENT_CODE_LINE)
    ) {
      customFormatting()
    }
  }
}

export const formatList = (editor: TEditor, elementType: string) => {
  format(editor, () =>
    toggleList(editor as PlateEditor, {
      type: elementType,
    })
  )
}

export const formatText = (editor: TEditor, text: string) => {
  format(editor, () => editor.insertText(text))
}
