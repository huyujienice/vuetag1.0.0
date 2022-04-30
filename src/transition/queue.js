var _ = require('../util')
var queue = []
var queued = false

//!提供一个全局执行队列，在nextTick中(同一个loop)执行提前塞入的任务
// 全局唯一的执行队列，有何作用？

/**
 * Push a job into the queue.
 *
 * @param {Function} job
 */

exports.push = function (job) {
  queue.push(job)
  if (!queued) {
    queued = true
    _.nextTick(flush)
  }
}

/**
 * Flush the queue, and do one forced reflow before
 * triggering transitions.
 */
//document.documentElement是会返回文档对象根元素的只读属性，如HTML文档的<html>元素
function flush () {
  // Force layout
  var f = document.documentElement.offsetHeight
  for (var i = 0; i < queue.length; i++) {
    queue[i]()
  }
  queue = []
  queued = false
  // dummy return, so js linters don't complain about
  // unused variable f
  return f
}
