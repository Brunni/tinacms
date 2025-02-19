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

import { TinaSchema } from '../schema'
import type { FC } from 'react'

export type UIField<F extends UIField = any, Shape = any> = {
  // name?: string
  label?: string
  description?: string
  // TODO type component
  component?: FC<any> | string | null
  // inlineComponent?: FC<any>
  parse?: (value: Shape, name: string, field: F) => any
  format?: (value: Shape, name: string, field: F) => any
  validate?(
    value: Shape,
    allValues: any,
    meta: any,
    field: UIField<F, Shape>
  ): string | object | undefined | void
  defaultValue?: Shape
  // fields?: F[]
}

export interface TinaCloudSchema<WithNamespace extends boolean> {
  templates?: GlobalTemplate<WithNamespace>[]
  collections: TinaCloudCollection<WithNamespace>[]
}
export type TinaCloudSchemaBase = TinaCloudSchema<false>
export type TinaCloudSchemaEnriched = TinaCloudSchema<true>

/**
 * As part of the build process, each node is given a `path: string[]` key
 * to help with namespacing type names, this is added as part of the
 * createTinaSchema step
 */
export interface TinaCloudSchemaWithNamespace {
  templates?: GlobalTemplate<true>[]
  collections: TinaCloudCollection<true>[]
  namespace: string[]
}

export type TinaCloudCollection<WithNamespace extends boolean> =
  | CollectionFields<WithNamespace>
  | CollectionTemplates<WithNamespace>

export type TinaCloudCollectionBase = TinaCloudCollection<false>
export type TinaCloudCollectionEnriched = TinaCloudCollection<true>

type FormatType = 'json' | 'md' | 'markdown' | 'mdx'

interface BaseCollection {
  label?: string
  name: string
  path: string
  format?: FormatType
  match?: string
}

type CollectionTemplates<WithNamespace extends boolean> =
  WithNamespace extends true
    ? CollectionTemplatesWithNamespace<WithNamespace>
    : CollectionTemplatesInner<WithNamespace>

interface CollectionTemplatesInner<WithNamespace extends boolean>
  extends BaseCollection {
  templates: (string | Template<WithNamespace>)[]
  fields?: undefined
}
export interface CollectionTemplatesWithNamespace<WithNamespace extends boolean>
  extends BaseCollection {
  templates: (string | Template<WithNamespace>)[]
  fields?: undefined
  references?: ReferenceType<WithNamespace>[]
  namespace: WithNamespace extends true ? string[] : undefined
}

type CollectionFields<WithNamespace extends boolean> =
  WithNamespace extends true
    ? CollectionFieldsWithNamespace<WithNamespace>
    : CollectionFieldsInner<WithNamespace>

export interface CollectionFieldsWithNamespace<WithNamespace extends boolean>
  extends BaseCollection {
  fields: TinaFieldInner<WithNamespace>[]
  templates?: undefined
  references?: ReferenceType<WithNamespace>[]
  namespace: string[]
}

interface CollectionFieldsInner<WithNamespace extends boolean>
  extends BaseCollection {
  fields: TinaFieldInner<WithNamespace>[]
  templates?: undefined
}

export type TinaFieldInner<WithNamespace extends boolean> =
  | ScalarType<WithNamespace>
  | ObjectType<WithNamespace>
  | ReferenceType<WithNamespace>
  | RichType<WithNamespace>

export type TinaFieldBase = TinaFieldInner<false>
export type TinaFieldEnriched = TinaFieldInner<true> & {
  /**
   * The parentTypename will always be an object type, either the type of a
   * collection (ie. `Post`) or of an object field (ie. `PageBlocks`).
   */
  parentTypename?: string
}

interface TinaField {
  name: string
  label?: string
  description?: string
  required?: boolean
  // list?: boolean
  /**
   * Any items passed to the UI field will be passed to the underlying field.
   * NOTE: only serializable values are supported, so functions like `validate`
   * will be ignored.
   */
  ui?: Record<string, any>
}

type ScalarType<WithNamespace extends boolean> = WithNamespace extends true
  ? ScalarTypeWithNamespace
  : ScalarTypeInner

type Option =
  | string
  | {
      label: string
      value: string
    }
type ScalarTypeInner = TinaField &
  TinaScalarField & {
    options?: Option[]
  }
type ScalarTypeWithNamespace = TinaField &
  TinaScalarField & {
    options?: Option[]
    namespace: string[]
  }
type TinaScalarField =
  | StringField
  | BooleanField
  | DateTimeField
  | NumberField
  | ImageField

type StringField =
  | {
      type: 'string'
      isBody?: boolean
      list?: false
      ui?: UIField<any, string>
    }
  | {
      type: 'string'
      isBody?: boolean
      list: true
      ui?: UIField<any, string[]>
    }

type BooleanField =
  | {
      type: 'boolean'
      list?: false
      ui?: object | UIField<any, boolean>
    }
  | {
      type: 'boolean'
      list: true
      ui?: object | UIField<any, boolean[]>
    }

type NumberField =
  | {
      type: 'number'
      list?: false
      ui?: object | UIField<any, number>
    }
  | {
      type: 'number'
      list: true
      ui?: object | UIField<any, number[]>
    }

type DateTimeField =
  | {
      type: 'datetime'
      dateFormat?: string
      timeFormat?: string
      list?: false
      ui?: object | UIField<any, string>
    }
  | {
      type: 'datetime'
      dateFormat?: string
      timeFormat?: string
      list: true
      ui?: object | UIField<any, string[]>
    }

type ImageField =
  | {
      type: 'image'
      list?: false
      ui?: object | UIField<any, string>
    }
  | {
      type: 'image'
      list: true
      ui?: object | UIField<any, string[]>
    }

export type ReferenceType<WithNamespace extends boolean> =
  WithNamespace extends true ? ReferenceTypeWithNamespace : ReferenceTypeInner

export type RichType<WithNamespace extends boolean> = WithNamespace extends true
  ? RichTypeWithNamespace
  : RichTypeInner
export interface ReferenceTypeInner extends TinaField {
  type: 'reference'
  list?: boolean
  reverseLookup?: { label: string; name: string }
  collections: string[]
  ui?: UIField<any, string[]>
}
export interface ReferenceTypeWithNamespace extends TinaField {
  type: 'reference'
  list?: boolean
  collections: string[]
  reverseLookup?: { label: string; name: string }
  namespace: string[]
  ui?: UIField<any, string[]>
}

export interface RichTypeWithNamespace extends TinaField {
  type: 'rich-text'
  namespace: string[]
  isBody?: boolean
  list?: boolean
  templates?: (string | (Template<true> & { inline?: boolean }))[]
}

export interface RichTypeInner extends TinaField {
  type: 'rich-text'
  isBody?: boolean
  list?: boolean
  templates?: (string | (Template<false> & { inline?: boolean }))[]
}

export type ObjectType<WithNamespace extends boolean> =
  | ObjectTemplates<WithNamespace>
  | ObjectFields<WithNamespace>

type ObjectTemplates<WithNamespace extends boolean> = WithNamespace extends true
  ? ObjectTemplatesWithNamespace<WithNamespace>
  : ObjectTemplatesInner<WithNamespace>

type ObjectTemplatesInner<WithNamespace extends boolean> =
  | ObjectTemplatesInnerWithList<WithNamespace>
  | ObjectTemplatesInnerWithoutList<WithNamespace>
interface ObjectTemplatesInnerWithList<WithNamespace extends boolean>
  extends ObjectTemplatesInnerBase<WithNamespace> {
  list?: true
  ui?:
    | object
    | ({
        // TODO: we could Type item based on fields or templates? (might be hard)
        itemProps?(item: Record<string, any>): {
          key?: string
          label?: string
        }
      } & UIField<any, string>)
}
interface ObjectTemplatesInnerWithoutList<WithNamespace extends boolean>
  extends ObjectTemplatesInnerBase<WithNamespace> {
  list?: false
  ui?: object | UIField<any, string>
}

interface ObjectTemplatesInnerBase<WithNamespace extends boolean>
  extends TinaField {
  type: 'object'
  visualSelector?: boolean
  required?: false
  list?: boolean
  /**
   * templates can either be an array of Tina templates or a reference to
   * global template definition.
   *
   * You should use `templates` when your object can be any one of multiple shapes (polymorphic)
   *
   * You can only provide one of `fields` or `template`, but not both
   */
  templates: (string | Template<WithNamespace>)[]
  fields?: undefined
}

interface ObjectTemplatesWithNamespace<WithNamespace extends boolean>
  extends TinaField {
  type: 'object'
  visualSelector?: boolean
  required?: false
  list?: boolean
  /**
   * templates can either be an array of Tina templates or a reference to
   * global template definition.
   *
   * You should use `templates` when your object can be any one of multiple shapes (polymorphic)
   *
   * You can only provide one of `fields` or `template`, but not both
   */
  templates: (string | Template<WithNamespace>)[]
  fields?: undefined
  namespace: WithNamespace extends true ? string[] : undefined
}

type ObjectFields<WithNamespace extends boolean> = WithNamespace extends true
  ? InnerObjectFieldsWithNamespace<WithNamespace>
  : InnerObjectFields<WithNamespace>

interface InnerObjectFields<WithNamespace extends boolean> extends TinaField {
  type: 'object'
  visualSelector?: boolean
  required?: false
  /**
   * fields can either be an array of Tina fields, or a reference to the fields
   * of a global template definition.
   *
   * You can only provide one of `fields` or `templates`, but not both.
   */
  fields: string | TinaFieldInner<WithNamespace>[]
  templates?: undefined
  list?: boolean
}

interface InnerObjectFieldsWithNamespace<WithNamespace extends boolean>
  extends TinaField {
  type: 'object'
  visualSelector?: boolean
  required?: false
  /**
   * fields can either be an array of Tina fields, or a reference to the fields
   * of a global template definition.
   *
   * You can only provide one of `fields` or `templates`, but not both.
   */
  fields: string | TinaFieldInner<WithNamespace>[]
  templates?: undefined
  namespace: WithNamespace extends true ? string[] : undefined
  list?: boolean
}

/**
 * Global Templates are defined once, and can be used anywhere by referencing the 'name' of the template
 *
 * TODO: ensure we don't permit infite loop with self-references
 */
export type GlobalTemplate<WithNamespace extends boolean> =
  WithNamespace extends true
    ? {
        label: string
        name: string
        ui?: object | (UIField<any, any> & { previewSrc: string })
        fields: TinaFieldInner<WithNamespace>[]
        namespace: WithNamespace extends true ? string[] : undefined
      }
    : {
        label: string
        name: string
        ui?: object | (UIField<any, any> & { previewSrc: string })
        fields: TinaFieldInner<WithNamespace>[]
      }

export type TinaCloudTemplateBase = GlobalTemplate<false>
export type TinaCloudTemplateEnriched = GlobalTemplate<true>
/**
 * Templates allow you to define an object as polymorphic
 */
export type Template<WithNamespace extends boolean> = WithNamespace extends true
  ? {
      label: string
      name: string
      fields: TinaFieldInner<WithNamespace>[]
      ui?: object | (UIField<any, any> & { previewSrc: string })
      namespace: WithNamespace extends true ? string[] : undefined
    }
  : {
      label: string
      name: string
      ui?: object | (UIField<any, any> & { previewSrc: string })
      fields: TinaFieldInner<WithNamespace>[]
    }

// Builder types
export type CollectionTemplateableUnion = {
  namespace: string[]
  type: 'union'
  templates: Templateable[]
}
export type CollectionTemplateableObject = {
  namespace: string[]
  type: 'object'
  visualSelector?: boolean
  required?: false
  template: Templateable
}
export type CollectionTemplateable =
  | CollectionTemplateableUnion
  | CollectionTemplateableObject

export type Collectable = {
  namespace: string[]
  templates?: (string | Templateable)[]
  fields?: string | TinaFieldEnriched[]
  references?: ReferenceType<true>[]
}

export type Templateable = {
  name: string
  namespace: string[]
  fields: TinaFieldEnriched[]
  ui?: object
}

export type ResolveFormArgs = {
  collection: TinaCloudCollection<true>
  basename: string
  template: Templateable
  schema: TinaSchema
}
