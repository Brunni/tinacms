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
  AnyField,
  Form,
  FormMetaPlugin,
  GlobalFormPlugin,
  useBranchData,
  useCMS,
} from '@tinacms/toolkit'
import type { FormOptions, TinaCMS } from '@tinacms/toolkit'
import { TinaSchema, resolveForm } from '@tinacms/schema-tools'
import { assertShape, safeAssertShape } from '../utils'
import { getIn, setIn } from 'final-form'

import { BiLinkExternal } from 'react-icons/bi'
import React from 'react'
import gql from 'graphql-tag'
import { useFormify } from './formify'

export function useGraphqlFormsUnstable<T extends object>({
  variables,
  onSubmit,
  query,
  formify,
  eventList,
}: {
  query: string
  variables: object
  onSubmit?: (args: onSubmitArgs) => void
  formify?: formifyCallback
  /**
   * This is a test utility which allows us to keep track of all the events
   * received by this hook. See `experimental-examples/unit-test-example/pages/index.js
   * for usage.
   */
  eventList?: []
}): [T, Boolean] {
  const cms = useCMS()

  const state = useFormify({
    query,
    cms,
    variables,
    formify,
    eventList: eventList,
    onSubmit,
  })

  return [state.data as T, state.status !== 'done']
}

export function useGraphqlForms<T extends object>({
  variables,
  onSubmit,
  formify = null,
  query,
}: {
  query: string
  variables: object
  onSubmit?: (args: onSubmitArgs) => void
  formify?: formifyCallback
}): [T, Boolean] {
  const cms = useCMS()
  const [formValues, setFormValues] = React.useState<FormValues>({})
  const [data, setData] = React.useState<object>(null)
  const [initialData, setInitialData] = React.useState<Data>({})
  const [pendingReset, setPendingReset] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [newUpdate, setNewUpdate] = React.useState<NewUpdate | null>(null)
  const { currentBranch } = useBranchData()

  /**
   * FIXME: this design is pretty flaky, but better than what
   * we've had previously. The way it works is we update `formValues`
   * with state from the final form subscription, so it stays perfectly
   * in-sync with form values. But since the `data` key has different needs,
   * we have to track how a change to the same path in the `data` object should
   * run.
   *
   * To do that, we tap in to the `change` and mutator (`insert`, `move`, & `remove`)
   * functions and set the `newUpdate` state with the path that is to be updated.
   *
   * So when a `title` changes, we do 2 things:
   * 1. Set `formValues` to the new values from the form, which obviously includes
   * the new `title` value
   * 2. Tell the `newUpdate` state that we had an update, and provide it the path that was updated.
   * A `newUpdate` value looks like this:
   * ```js
   * {
   *   queryName: 'getPostsDocument',
   *   get: 'getPostsDocument.values.title',
   *   set: 'getPostsDocument.data.title',
   * }
   * ```
   * That's saying:
   * > we have a new value at 'getPostsDocument.values.title', grab that value
   * > and __set__ the 'getPostsDocument.data.title' so it
   *
   * (It's also saying if this is an async update, like `data.author`, run that instead
   * and set the new value accordingly)
   *
   * The way we determine when we should check for a new value is when the `formValues`
   * key is updated, so it's probably possible to get into a state where we're setting the
   * `newUpdate` twice before the form value state is set. Some of that may be mitigated
   * by `newUpdate` being an array, so as to batch all of it's changes in succession. But
   * it just feels like there's a much better way to do all of this 🤔
   */
  const updateData = async () => {
    if (newUpdate) {
      const newValue = getIn(formValues, newUpdate.get)
      const activeForm = getIn(data, [newUpdate.queryName, 'form'].join('.'))
      if (!activeForm) {
        throw new Error(`Unable to find form for query ${newUpdate.queryName}`)
      }
      if (activeForm?.paths) {
        const asyncUpdate = activeForm.paths?.find(
          (p) => p.dataPath.join('.') === newUpdate.setReference
        )
        if (asyncUpdate) {
          const res = await cms.api.tina.request(asyncUpdate.queryString, {
            variables: { id: newValue },
          })
          const newData = setIn(data, newUpdate.set, res.node)
          const newDataAndNewJSONData = setIn(
            newData,
            newUpdate.set.replace('data', 'dataJSON'),
            newValue
          )
          setData(newDataAndNewJSONData)
          setNewUpdate(null)
          return
        }
      }
      if (newUpdate.lookup) {
        const field = getFieldUpdate(newUpdate, activeForm, formValues)
        if (field && field.typeMap) {
          newValue.forEach((item) => {
            if (!item.__typename) {
              item['__typename'] = field.typeMap[item._template]
            }
          })
        }
      }
      const newData = setIn(data, newUpdate.set, newValue)
      const newDataAndNewJSONData = setIn(
        newData,
        newUpdate.set.replace('data', 'dataJSON'),
        newValue
      )
      setData(newDataAndNewJSONData)
      setNewUpdate(null)
    }
  }

  React.useEffect(() => {
    updateData()
  }, [JSON.stringify(formValues)])

  React.useEffect(() => {
    if (pendingReset) {
      setData({ ...data, [pendingReset]: initialData[pendingReset] })
      setPendingReset(null)
    }
  }, [pendingReset])

  React.useEffect(() => {
    if (!query) {
      // don't do work on empty queries
      setIsLoading(false)
      return
    }

    const useUnstableFormify =
      cms?.flags.get('use-unstable-formify') === false ? false : true

    const formIds: string[] = []
    setIsLoading(true)
    cms.api.tina
      .requestWithForm((gql) => gql(query), {
        variables,
        useUnstableFormify,
      })
      .then((payload) => {
        cms.plugins.remove(new FormMetaPlugin({ name: 'tina-admin-link' }))

        setData(payload)
        setInitialData(payload)
        setIsLoading(false)
        Object.entries(payload).map(([queryName, result]) => {
          formIds.push(queryName)
          const canBeFormified = safeAssertShape<{
            form: { mutationInfo: string }
          }>(result, (yup) =>
            yup.object({
              values: yup.object().required(),
              form: yup.object().required(),
            })
          )
          if (!canBeFormified) {
            // This is a list or collection query, no forms can be built
            return
          }
          assertShape<{
            _internalSys: {
              collection: { name: string }
              filename: string
            }
            values: object
            form: FormOptions<any, any> & {
              mutationInfo: {
                string: string
                includeCollection: boolean
              }
            }
          }>(
            result,
            (yup) =>
              yup.object({
                values: yup.object().required(),
                form: yup.object().required(),
              }),
            `Unable to build form shape for fields at ${queryName}`
          )
          let formConfig = {} as FormOptions<any, AnyField>
          const formCommon = {
            id: queryName,
            initialValues: result.values,

            reset: () => {
              setPendingReset(queryName)
            },
            onSubmit: async (payload) => {
              try {
                const params = transformDocumentIntoMutationRequestPayload(
                  payload,
                  result.form.mutationInfo
                )
                const variables = { params }
                const mutationString = result.form.mutationInfo.string
                if (onSubmit) {
                  onSubmit({
                    queryString: mutationString,
                    mutationString,
                    variables,
                  })
                } else {
                  try {
                    await cms.api.tina.request(mutationString, {
                      variables,
                    })
                    cms.alerts.success('Document saved!')
                  } catch (e) {
                    cms.alerts.error('There was a problem saving your document')
                    console.error(e)
                  }
                }
              } catch (e) {
                console.error(e)
                cms.alerts.error('There was a problem saving your document')
              }
            },
          }
          if (cms.api.tina.schema) {
            const enrichedSchema: TinaSchema = cms.api.tina.schema
            const collection = enrichedSchema.getCollection(
              result._internalSys.collection.name
            )
            const template = enrichedSchema.getTemplateForData({
              collection,
              data: result.values,
            })
            const formInfo = resolveForm({
              collection,
              basename: collection.name,
              schema: enrichedSchema,
              template,
            })
            formConfig = {
              label: formInfo.label,
              // TODO: return correct type
              fields: formInfo.fields as any,
              ...formCommon,
            }
          } else {
            formConfig = {
              label: result.form.label,
              fields: result.form.fields,
              ...formCommon,
            }
          }

          const { createForm, createGlobalForm } = generateFormCreators(cms)
          const SKIPPED = 'SKIPPED'
          let form
          let skipped
          const skip = () => {
            skipped = SKIPPED
          }
          if (skipped) return

          if (formify) {
            form = formify(
              { formConfig, createForm, createGlobalForm, skip },
              cms
            )
          } else {
            form = createForm(formConfig)
          }

          if (!(form instanceof Form)) {
            if (skipped === SKIPPED) {
              return
            }
            throw new Error('formify must return a form or skip()')
          }
          const { change } = form.finalForm
          form.finalForm.change = (name, value) => {
            /**
             * Reference paths returned from the server don't include array values
             * as part of their paths: so ["data", "getPostDocument", "blocks", 0, "author", "name"]
             * should actually be: ["data", "getPostDocument", "blocks", "author", "name"]
             */
            let referenceName = ''
            if (typeof name === 'string') {
              referenceName = name
                .split('.')
                .filter((item) => isNaN(Number(item)))
                .join('.')
            } else {
              throw new Error(
                `Expected name to be of type string for FinalForm change callback`
              )
            }
            setNewUpdate({
              queryName,
              get: [queryName, 'values', name].join('.'),
              set: [queryName, 'data', name].join('.'),
              setReference: [queryName, 'data', referenceName].join('.'),
            })
            return change(name, value)
          }

          const { insert, move, remove, ...rest } = form.finalForm.mutators
          const prepareNewUpdate = (name: string, lookup?: string) => {
            const extra = {}
            if (lookup) {
              extra['lookup'] = lookup
            }
            const referenceName = name
              .split('.')
              .filter((item) => isNaN(Number(item)))
              .join('.')
            setNewUpdate({
              queryName,
              get: [queryName, 'values', name].join('.'),
              set: [queryName, 'data', name].join('.'),
              setReference: [queryName, 'data', referenceName].join('.'),
              ...extra,
            })
          }
          form.finalForm.mutators = {
            insert: (...args) => {
              const fieldName = args[0]
              prepareNewUpdate(fieldName, fieldName)
              insert(...args)
            },
            move: (...args) => {
              const fieldName = args[0]
              prepareNewUpdate(fieldName, fieldName)
              move(...args)
            },
            remove: (...args) => {
              const fieldName = args[0]
              prepareNewUpdate(fieldName, fieldName)
              remove(...args)
            },
            ...rest,
          }
          form.subscribe(
            ({ values }) => {
              setFormValues({ ...formValues, [queryName]: { values: values } })
            },
            { values: true }
          )
        })
      })
      .catch((e) => {
        setIsLoading(false)
        throw new Error(
          `There was a problem setting up forms for your query: ${e.message}`
        )
      })

    return () => {
      formIds.forEach((name) => {
        const formPlugin = cms.forms.find(name)
        if (formPlugin) {
          cms.forms.remove(formPlugin)
        }
      })
    }
  }, [query, JSON.stringify(variables), currentBranch])

  return [data as T, isLoading]
}

export const transformDocumentIntoMutationRequestPayload = (
  document: {
    _collection: string
    __typename?: string
    _template: string
    [key: string]: unknown
  },
  /** Whether to include the collection and template names as top-level keys in the payload */
  instructions: { includeCollection?: boolean; includeTemplate?: boolean }
) => {
  const { _collection, __typename, _template, ...rest } = document

  const params = transformParams(rest)
  const paramsWithTemplate = instructions.includeTemplate
    ? { [_template]: params }
    : params

  return instructions.includeCollection
    ? { [_collection]: paramsWithTemplate }
    : paramsWithTemplate
}

const transformParams = (data: unknown) => {
  if (['string', 'number', 'boolean'].includes(typeof data)) {
    return data
  }
  if (Array.isArray(data)) {
    return data.map((item) => transformParams(item))
  }
  try {
    assertShape<{ _template: string; __typename?: string }>(data, (yup) =>
      // @ts-ignore No idea what yup is trying to tell me:  Type 'RequiredStringSchema<string, Record<string, any>>' is not assignable to type 'AnySchema<any, any, any>
      yup.object({ _template: yup.string().required() })
    )
    const { _template, __typename, ...rest } = data
    const nested = transformParams(rest)
    return { [_template]: nested }
  } catch (e) {
    if (e.message === 'Failed to assertShape - _template is a required field') {
      if (!data) {
        return []
      }
      const accum = {}
      Object.entries(data).map(([keyName, value]) => {
        accum[keyName] = transformParams(value)
      })
      return accum
    } else {
      if (!data) {
        return []
      }
      throw e
    }
  }
}

// newUpdate.lookup is a field name (ie. blocks.0.hero)
const getFieldUpdate = (newUpdate, activeForm, formValues) => {
  const items = newUpdate.lookup.split('.')
  let currentFields = activeForm.fields
  items.map((item, index) => {
    const lookupName = items.slice(0, index + 1).join('.')
    const value = getIn(
      formValues,
      [newUpdate.queryName, 'values', lookupName].join('.')
    )
    if (isNaN(Number(item))) {
      if (Array.isArray(currentFields)) {
        currentFields = currentFields.find((field) => field.name === item)
      }
    } else {
      // Get templatable for polymorphic or homogenous
      const template = currentFields.templates
        ? currentFields.templates[value._template]
        : currentFields
      currentFields = template.fields
    }
  })
  return currentFields
}

const generateFormCreators = (cms: TinaCMS) => {
  const createForm = (formConfig) => {
    const form = new Form(formConfig)
    cms.forms.add(form)
    return form
  }
  const createGlobalForm: GlobalFormCreator = (formConfig, options) => {
    const form = new Form(formConfig)
    cms.plugins.add(new GlobalFormPlugin(form, options?.icon, options?.layout))
    return form
  }
  return { createForm, createGlobalForm }
}

export const generateFormCreatorsUnstable = (
  cms: TinaCMS,
  showInSidebar?: boolean
) => {
  const createForm = (formConfig) => {
    const form = new Form(formConfig)
    if (showInSidebar) {
      cms.forms.add(form)
    }
    return form
  }
  const createGlobalForm: GlobalFormCreator = (
    formConfig,
    options?: { icon?: any; layout: 'fullscreen' | 'popup' }
  ) => {
    const form = new Form(formConfig)
    if (showInSidebar) {
      cms.plugins.add(
        new GlobalFormPlugin(form, options?.icon, options?.layout)
      )
    }
    return form
  }
  return { createForm, createGlobalForm }
}

type FormCreator = (formConfig: FormOptions<any>) => Form
type GlobalFormCreator = (
  formConfig: FormOptions<any>,
  options?: GlobalFormOptions
) => Form
interface GlobalFormOptions {
  icon?: any
  layout: 'fullscreen' | 'popup'
}
export interface FormifyArgs {
  formConfig: FormOptions<any>
  createForm: FormCreator
  createGlobalForm: FormCreator
  skip?: () => void
}

export type formifyCallback = (args: FormifyArgs, cms: TinaCMS) => Form | void
export type onSubmitArgs = {
  /**
   * @deprecated queryString is actually a mutation string, use `mutationString` instead
   */
  queryString: string
  mutationString: string
  variables: object
}

type FormValues = {
  [queryName: string]: object
}
type Data = {
  [queryName: string]: object
}
type NewUpdate = {
  queryName: string
  get: string
  set: string
  setReference?: string
  lookup?: string
}
