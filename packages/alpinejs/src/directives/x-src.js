import { directive, prefix } from "../directives";
import { addRootSelector } from "../lifecycle";
import { skipDuringClone } from "../clone";
import { reactive } from '../reactivity'
import { addScopeToNode } from '../scope'
import { injectMagics } from '../magics'
import { injectDataProviders } from '../datas'
import { initInterceptors } from '../interceptor'

addRootSelector(() => `:not(img):not(script)[${prefix('src')}]`)

directive('src', skipDuringClone((el, { expression: url  }, { evaluate }) => {

  // if no data exists, add it with _items
  const hasData = el._x_dataStack !== undefined
  if (!hasData) {
    let magicContext = {}
    injectMagics(magicContext, el)
  
    let dataProviderContext = {}
    injectDataProviders(dataProviderContext, magicContext)
  
    const data = { _items: [] }
  
    injectMagics(data, el)
    
    const reactiveData = reactive(data)
    
    initInterceptors(reactiveData)

    let undo = addScopeToNode(el, reactiveData)
    
    reactiveData['init'] && evaluate(el, reactiveData['init'])

    // cleanup(() => {
    //     reactiveData['destroy'] && evaluate(el, reactiveData['destroy'])

    //     undo()
    // })
  }

  const expression = `_items = await (await fetch(\`${url}\`)).json()`
  // todo: put non-array object in array

  if (typeof expression === 'string') {
    return !! expression.trim() && evaluate(expression, {}, false)
  }

  return evaluate(expression, {}, false)
}))
