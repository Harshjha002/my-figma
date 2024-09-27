'use client'

import { fabric } from "fabric";
import LeftSidebar from "@/components/LeftSidebar";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import RightSidebar from "@/components/RightSidebar";
import {  useEffect, useRef, useState } from "react";
import { handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasObjectModified, handleResize, initializeFabric, renderCanvas } from '@/lib/canvas';
import { ActiveElement } from '@/types/type';

import { useMutation, useStorage } from "@liveblocks/react";
import { defaultNavElement } from "@/constants";
import { handleDelete } from "@/lib/key-events";





export default function Home() {

  const canvasRef=useRef<HTMLCanvasElement>(null)
  const fabricRef=useRef<fabric.Canvas | null >(null)
  const isDrawing=useRef(false)
  const shapeRef=useRef<fabric.Object | null >(null)
  const selectedShapeRef=useRef<string | null>(null)

  const activeObjectRef = useRef<fabric.Object | null>(null)
  const canvasObjects = useStorage((root) => root.canvasObjects as Map<string, any>);


  const syncShapeInStorage = useMutation(({storage},object) => {
    if(!object) return;

    const {objectId} = object;

    const shapeData=object.toJSON()
    shapeData.objectId=objectId;

    const canvasObjects:any = storage.get('canvasObjects')

    canvasObjects.set(objectId,shapeData)

  },[])
  

  const [activeElement , setActiveElement] = useState<ActiveElement>({
    name:'',
    value:'',
    icon:''
  })


  const deleteAllShapes=useMutation(({storage}) => {
    const canvasObjects = storage.get('canvasObjects')

    if(!canvasObjects || canvasObjects.size === 0){
      return true;
    }

    for(const [key,value] of canvasObjects.entries()){
      canvasObjects.delete(key)
    }
    return canvasObjects.size === 0
  },[])

  const deleteShapeFromStorage = useMutation(({storage},objectId) =>{
    const canvasObjects = storage.get('canvasObjects')

    canvasObjects.delete(objectId)
  },[])

  const handleActiveElement = (elem:ActiveElement) =>{
    setActiveElement(elem)

    switch (elem?.value) {
      case 'reset':
        deleteAllShapes()
        fabricRef.current?.clear();
        setActiveElement(defaultNavElement)
        break;

      case 'delete':
      handleDelete(fabricRef.current as any , deleteShapeFromStorage)
      setActiveElement(defaultNavElement)
      break;
    
      default:
        break;
    }

    selectedShapeRef.current = elem?.value as string
  }

  useEffect(() =>{
    const canvas =initializeFabric({canvasRef , fabricRef})

    canvas.on("mouse:down",(options) => {
      handleCanvasMouseDown({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef
      })
    })

    canvas.on("mouse:move",(options) => {
      handleCanvasMouseMove({
        options,
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
        syncShapeInStorage
      })
    })
    canvas.on("mouse:up",() => {
      handleCanvasMouseUp({
        canvas,
        isDrawing,
        shapeRef,
        selectedShapeRef,
        syncShapeInStorage,
        setActiveElement,
        activeObjectRef
      })
    })

    canvas.on("object:modified",(options)=>{
      handleCanvasObjectModified({
        options,
        syncShapeInStorage
      })
    })

    window.addEventListener('resize' , () => {
      handleResize({fabricRef})
    })

    return () =>{
      canvas.dispose()
    }
  },[])

  useEffect(() => {
    renderCanvas({
      fabricRef,
      canvasObjects,
      activeObjectRef
    })
  },[canvasObjects])

  return (
    <main className="h-screen overflow-hidden" >
      <Navbar 
      activeElement={activeElement}
      handleActiveElement={handleActiveElement}
      />

      <section className="flex h-full flex-row">
        <LeftSidebar 
          allShapes={canvasObjects && Array.from(canvasObjects)}
        />
        <Live canvasRef={canvasRef}/>
        <RightSidebar/>
      </section>

    </main>
  );
}
