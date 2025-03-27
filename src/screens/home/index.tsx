"use client"

import type React from "react"
import { useEffect, useRef, useState, forwardRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { ColorSwatch, Group } from "@mantine/core"
import { SWATCHES } from "../../../constants"
import Draggable from "react-draggable"

// ForwardRef Wrapper for Draggable
interface DraggableLatexProps {
  children: React.ReactNode
  position: { x: number; y: number }
  onStop: (e: any, data: any) => void
}

const DraggableLatex = forwardRef<HTMLDivElement, DraggableLatexProps>(({ children, position, onStop }, ref) => (
  <Draggable nodeRef={ref as React.RefObject<HTMLElement>} defaultPosition={position} onStop={onStop}>
    <div ref={ref} className="absolute p-2 text-white rounded shadow-md">
      <div className="latex-content" dangerouslySetInnerHTML={{ __html: children as string }} />
    </div>
  </Draggable>
))


interface Response {
  expr: string
  result: string
  assign: boolean
}

interface generatedResult {
  expression: string
  result: string
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("rgb(255,255,255)")
  const [reset, setReset] = useState(false)
  const [result, setResult] = useState<generatedResult>()
  const [latesExpression, setLatexExpression] = useState<Array<string>>([])
  const [latesPosition, setLatexPosition] = useState({ x: 10, y: 200 })
  const [dictOfVars, setDictOfVars] = useState({})
  const latexRef = useRef(null)

  useEffect(() => {
    if (latesExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub])
      }, 0)
    }
  }, [latesExpression])

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.result)
    }
  }, [result])

  useEffect(() => {
    if (reset) {
      resetCanvas()
      setLatexExpression([])
      setResult(undefined)
      setDictOfVars({})
      setReset(false)
    }
  }, [reset])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        canvas.style.background = "black"
        ctx.lineCap = "round"
        ctx.lineWidth = 3
        ctx.strokeStyle = color
      }
    }
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-AMS-MML_HTMLorMML"
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      // console.log("MathJax loaded successfully!")
      if (window.MathJax) {
        window.MathJax.Hub.Config({
          tex2jax: {
            inlineMath: [["$$", "$$"]],
            displayMath: [["\\[", "\\]"]],
          },
          "HTML-CSS": {
            scale: 100,
            linebreaks: { automatic: true },
          },
        })
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub])
      } else {
        console.error("MathJax did not load properly.")
      }
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = color
      }
    }
  }, [color])

  const sendData = async () => {
    const canvas = canvasRef.current
    if (canvas) {
      const response = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      })
      const resp = await response.data
      resp.data.forEach((data: Response) => {
        if (data.assign === true) {
          setDictOfVars({
            ...dictOfVars,
            [data.expr]: data.result,
          })
        }
      })
      // console.log("response is ", resp)
      const ctx = canvas.getContext("2d")
      
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height)
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0


      if(ctx){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4
          if (imageData.data[i + 3] > 0) {
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          }
        }
      }

      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      setLatexPosition({ x: centerX, y: centerY })
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expression: data.expr,
            result: data.result,
          })
        }, 1000)
      })
    }
  }

  
  

  const resetCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }


  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        setIsDrawing(true)
      }
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        ctx.stroke()
      }
    }
  }

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `${expression} = ${answer}`
    setLatexExpression([...latesExpression, latex])
    if (window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub])
      }, 100)
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => setReset(true)} className="z-20 bg-black text-white">
          Reset
        </Button>
        <Group className="z-20">
          {SWATCHES.map((swatch: string) => (
            <ColorSwatch key={swatch} color={swatch} onClick={() => setColor(swatch)} />
          ))}
        </Group>
        <Button onClick={sendData} className="z-20 bg-black text-white">
          Calculate
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      {latesExpression.map((latex, index) => (
        <DraggableLatex
          key={index}
          ref={latexRef}
          position={latesPosition}
          onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
        >
          {latex}
        </DraggableLatex>
      ))}
    </>
  )
}

