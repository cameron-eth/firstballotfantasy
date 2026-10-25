'use client'
import { useLayoutEffect, useRef, useState, useEffect, useCallback } from 'react'

const clamp = (value: number) => Math.min(150, Math.max(50, Math.round(value)))
/** Zoom only this canvas; preserve the content point under the gesture. */
export function useCanvasZoom() {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null)
  const attachViewport = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node
    setViewportNode(node)
  }, [])
  const [zoom, setZoom] = useState(100)
  const current = useRef(100)
  const anchor = useRef<{ x: number; y: number; contentX: number; contentY: number } | null>(null)
  const zoomAt = (next: number, clientX?: number, clientY?: number) => {
    const node = viewportRef.current
    if (!node) return
    const value = clamp(next)
    if (value === current.current) return
    const rect = node.getBoundingClientRect()
    const x = clientX === undefined ? node.clientWidth / 2 : clientX - rect.left
    const y = clientY === undefined ? node.clientHeight / 2 : clientY - rect.top
    anchor.current = {
      x,
      y,
      contentX: (node.scrollLeft + x) / (current.current / 100),
      contentY: (node.scrollTop + y) / (current.current / 100),
    }
    current.current = value
    setZoom(value)
  }
  useLayoutEffect(() => {
    const node = viewportRef.current
    const point = anchor.current
    if (node && point) {
      node.scrollLeft = (point.contentX * zoom) / 100 - point.x
      node.scrollTop = (point.contentY * zoom) / 100 - point.y
      anchor.current = null
    }
  }, [zoom])
  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    let pinch: { distance: number; zoom: number } | null = null
    const wheel = (event: WheelEvent) => {
      // Trackpad pinches arrive as ctrl+wheel; ordinary wheel scrolling stays native.
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
      if (event.touches.length !== 2 || !pinch || !pinch.distance) return
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
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('touchstart', start)
      node.removeEventListener('touchmove', move)
      node.removeEventListener('touchend', end)
      node.removeEventListener('touchcancel', end)
    }
  }, [viewportNode])
  return { viewportRef: attachViewport, zoom, setZoom: (next: number) => zoomAt(next) }
}
