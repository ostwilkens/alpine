
export function scope(node) {
    return mergeProxies(closestDataStack(node))
}

export function addScopeToNode(node, data, referenceNode) {
    node._x_dataStack = [data, ...closestDataStack(referenceNode || node)]

    return () => {
        node._x_dataStack = node._x_dataStack.filter(i => i !== data)
    }
}

export function hasScope(node) {
    return !! node._x_dataStack
}

export function refreshScope(element, scope) {
    let existingScope = element._x_dataStack[0]

    Object.entries(scope).forEach(([key, value]) => {
        existingScope[key] = value
    })
}

export function closestDataStack(node) {
    if (node._x_dataStack) return node._x_dataStack

    if (typeof ShadowRoot === 'function' && node instanceof ShadowRoot) {
        return closestDataStack(node.host)
    }

    if (! node.parentNode) {
        return []
    }

    return closestDataStack(node.parentNode)
}

export function closestDataProxy(el) {
    return mergeProxies(closestDataStack(el))
}

export function mergeProxies(objects) {
    let thisProxy = new Proxy({}, {
        ownKeys: () => {
            return Array.from(new Set(objects.flatMap(i => Object.keys(i))))
        },

        has: (target, name) => {
            const hasOwnProperty = objects.some(obj => obj.hasOwnProperty(name))

            // if this proxy doesn't have the property, look for it on ._item
            if (!hasOwnProperty) {
                const objectsWithItem = objects.filter(obj => obj.hasOwnProperty("_item"))

                const hasItemWithProperty = objectsWithItem.some(obj => obj._item.hasOwnProperty(name))
                if (hasItemWithProperty) {
                    return true
                }
            }

            return hasOwnProperty
        },

        get: (target, name) => {

            const thisResult = (objects.find(obj => {
                if (obj.hasOwnProperty(name)) {
                    let descriptor = Object.getOwnPropertyDescriptor(obj, name)

                    // If we already bound this getter, don't rebind.
                    if ((descriptor.get && descriptor.get._x_alreadyBound) || (descriptor.set && descriptor.set._x_alreadyBound)) {
                        return true
                    }
                    
                    // Properly bind getters and setters to this wrapper Proxy.
                    if ((descriptor.get || descriptor.set) && descriptor.enumerable) {
                        // Only bind user-defined getters, not our magic properties.
                        let getter = descriptor.get
                        let setter = descriptor.set
                        let property = descriptor

                        getter = getter && getter.bind(thisProxy)
                        setter = setter && setter.bind(thisProxy)

                        if (getter) getter._x_alreadyBound = true
                        if (setter) setter._x_alreadyBound = true

                        Object.defineProperty(obj, name, {
                            ...property,
                            get: getter,
                            set: setter,
                        })
                    }

                    return true 
                }

                return false
            }) || {})[name]

            if (thisResult) {
                return thisResult
            } else {
                // if there's no hit, look if there's an ._item with this field
                const objectsWithItem = objects.filter(obj => obj.hasOwnProperty("_item"))
                if (objectsWithItem.length > 0) {
                    const itemWithProperty = objectsWithItem.find(obj => obj._item.hasOwnProperty(name))

                    if (itemWithProperty) {
                        return itemWithProperty._item[name]
                    }
                }
                
                // still no hit
                return undefined
            }
        },

        set: (target, name, value) => {
            let closestObjectWithKey = objects.find(obj => obj.hasOwnProperty(name))

            if (closestObjectWithKey) {
                closestObjectWithKey[name] = value
            } else {
                objects[objects.length - 1][name] = value
            }

            return true
        },
    })

    return thisProxy
}
