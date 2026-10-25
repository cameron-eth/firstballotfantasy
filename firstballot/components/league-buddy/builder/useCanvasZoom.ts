'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

const clamp = (value: number) => Math.min(150, Math.max(10, value))
/** Gesture frames update one compositor transform, never the React card tree. */
export function useCanvasZoom() {
  const [viewportNode, attachViewport] = useState<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const spaceRef = useRef<HTMLDivElement>(null)
  const [zoom, publishZoom] = useState(100)
  const current = useRef(100)
  const request = useRef<(next: number, x?: number, y?: number) => void>(() => {})
  const setZoom = useCallback(
    (next: number | ((value: number) => number)) =>
      request.current(typeof next === 'function' ? next(current.current) : next),
    []
  )
  useEffect(() => {
    const node = viewportNode,
      content = contentRef.current,
      space = spaceRef.current
    if (!node || !content || !space) return
    let frame = 0
    let idle: ReturnType<typeof setTimeout> | undefined
    let applied = current.current
    let left = 0
    let width = content.offsetWidth,
      height = content.offsetHeight
    let pending: { value: number; x: number; y: number } | null = null
    const layout = (value: number) => {
      const scale = value / 100
      const available = node.clientWidth - 40 // viewport p-5 on both sides
      left = Math.max(0, (available - width * scale) / 2)
      space.style.width = `${Math.max(available, width * scale)}px`
      space.style.height = `${height * scale}px`
      content.style.transform = `translate3d(${left}px,0,0) scale(${scale})`
    }
    const paint = () => {
      frame = 0
      if (!pending) return
      const { value, x, y } = pending
      pending = null
      const pointX = (node.scrollLeft + x - 20 - left) / (applied / 100)
      const pointY = (node.scrollTop + y - 20) / (applied / 100)
      layout(value)
      node.scrollLeft = (pointX * value) / 100 + 20 + left - x
      node.scrollTop = (pointY * value) / 100 + 20 - y
      applied = value
    }
    const zoomAt = (next: number, clientX?: number, clientY?: number) => {
      const value = clamp(next)
      if (value === current.current) return
      const rect = node.getBoundingClientRect()
      current.current = value
      pending = {
        value,
        x: clientX === undefined ? node.clientWidth / 2 : clientX - rect.left,
        y: clientY === undefined ? node.clientHeight / 2 : clientY - rect.top,
      }
      if (!frame) frame = requestAnimationFrame(paint)
      clearTimeout(idle)
      idle = setTimeout(() => publishZoom(Math.round(current.current)), 150)
    }
    request.current = zoomAt
    layout(applied)
    const observer = new ResizeObserver(() => {
      width = content.offsetWidth
      height = content.offsetHeight
      // Content and viewport changes are rare; zoom never changes observed layout dimensions.
      layout(applied)
    })
    observer.observe(content)
    observer.observe(node)
    let pinch: { distance: number; zoom: number } | null = null
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1)
      zoomAt(current.current * Math.exp(-delta * 0.008), event.clientX, event.clientY)
    }
    const distance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        pinch = null
        return
      }
      event.preventDefault()
      pinch = { distance: distance(event.touches), zoom: current.current }
    }
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinch?.distance) return
      event.preventDefault()
      zoomAt(
        (pinch.zoom * distance(event.touches)) / pinch.distance,
        (event.touches[0].clientX + event.touches[1].clientX) / 2,
        (event.touches[0].clientY + event.touches[1].clientY) / 2
      )
    }
    const end = () => {
      pinch = null
    }
    node.addEventListener('wheel', wheel, { passive: false })
    node.addEventListener('touchstart', start, { passive: false })
    node.addEventListener('touchmove', move, { passive: false })
    node.addEventListener('touchend', end)
    node.addEventListener('touchcancel', end)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(idle)
      observer.disconnect()
      request.current = () => {}
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('touchstart', start)
      node.removeEventListener('touchmove', move)
      node.removeEventListener('touchend', end)
      node.removeEventListener('touchcancel', end)
    }
  }, [viewportNode])
  return { viewportRef: attachViewport, contentRef, spaceRef, zoom, setZoom }
}
