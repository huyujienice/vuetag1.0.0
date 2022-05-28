var _ = require('../util')

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$on = function (event, fn) {
  // this._events = {}  _events定义为对象，
  // 如果添加event为函数function，则_events[key]为function的字符串
  // event应该是自定义的字符串,例如 hook:attched，可以理解为事件名称
  (this._events[event] || (this._events[event] = []))
    .push(fn)
  modifyListenerCount(this, event, 1)
  return this
}

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$once = function (event, fn) {
  var self = this
  function on () {
    self.$off(event, on)
    fn.apply(this, arguments)
  }
  on.fn = fn
  this.$on(event, on)
  return this
}

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 */

exports.$off = function (event, fn) {
  var cbs
  // all
  // 没带参数默认全部移除
  if (!arguments.length) {
    if (this.$parent) {
      for (event in this._events) {
        cbs = this._events[event]
        if (cbs) {
          modifyListenerCount(this, event, -cbs.length)
        }
      }
    }
    this._events = {}
    return this
  }
  // specific event
  cbs = this._events[event]
  if (!cbs) {
    return this
  }
  if (arguments.length === 1) {
    modifyListenerCount(this, event, -cbs.length)
    this._events[event] = null
    return this
  }
  // specific handler
  var cb
  var i = cbs.length
  while (i--) {
    cb = cbs[i]
    if (cb === fn || cb.fn === fn) {
      modifyListenerCount(this, event, -1)
      cbs.splice(i, 1)
      break
    }
  }
  return this
}

/**
 * Trigger an event on self.
 *
 * @param {String} event
 */

// TODO 怎么传递给parent?
// 使用$dispatch向父组件传递事件，使用$broadcast向子组件传递事件

// 当手动$on上event的时候，其他组件想要触发event则可使用$dispatch和$broadcast
// 找到需要触发的event并且触发

exports.$emit = function (event) {
  var cbs = this._events[event]
  // 当事件未定义则默认向上下传递，若事件已定义则默认不传递
  this._shouldPropagate = !cbs
  if (cbs) {
    cbs = cbs.length > 1
      ? _.toArray(cbs)
      : cbs
    var args = _.toArray(arguments, 1)
    for (var i = 0, l = cbs.length; i < l; i++) {
      var res = cbs[i].apply(this, args)
      if (res === true) {
        this._shouldPropagate = true
      }
    }
  }
  return this
}

/**
 * Recursively broadcast an event to all children instances.
 *
 * @param {String} event
 * @param {...*} additional arguments
 */

// Recursively 递归的
// 向子组件传播事件

exports.$broadcast = function (event) {
  // if no child has registered for this event,
  // then there's no need to broadcast.
  if (!this._eventsCount[event]) return
  var children = this.$children
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    child.$emit.apply(child, arguments)
    if (child._shouldPropagate) {
      child.$broadcast.apply(child, arguments)
    }
  }
  return this
}

/**
 * Recursively propagate an event up the parent chain.
 *
 * @param {String} event
 * @param {...*} additional arguments
 */

// 向父组件传播事件

exports.$dispatch = function () {
  this.$emit.apply(this, arguments)
  var parent = this.$parent
  while (parent) {
    parent.$emit.apply(parent, arguments)
    parent = parent._shouldPropagate
      ? parent.$parent
      : null
  }
  return this
}

/**
 * Modify the listener counts on all parents.
 * This bookkeeping allows $broadcast to return early when
 * no child has listened to a certain event.
 *
 * @param {Vue} vm
 * @param {String} event
 * @param {Number} count
 */

// 只设置parent的原因是可能当时还不确定有多少子组件，但是父组件是唯一且已知？
// 将所有parent的_eventsCount[event]都设置好计数器
// 每次执行一次$on，_eventsCount[event]都+1

var hookRE = /^hook:/
function modifyListenerCount (vm, event, count) {
  var parent = vm.$parent
  // hooks do not get broadcasted so no need
  // to do bookkeeping for them
  if (!parent || !count || hookRE.test(event)) return
  while (parent) {
    parent._eventsCount[event] =
      (parent._eventsCount[event] || 0) + count
    parent = parent.$parent
  }
}
