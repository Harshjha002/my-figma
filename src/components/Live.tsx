
import React, { useCallback, useEffect, useState } from 'react';
import LiveCursors from './cursor/LiveCursors';
import { useBroadcastEvent, useEventListener, useMyPresence, useOthers } from '@liveblocks/react';
import CursorChat from './cursor/CursorChat';
import { CursorMode, CursorState, Reaction, ReactionEvent } from '@/types/type';
import ReactionSelector from './reaction/ReactionButton';
import FlyingReaction from './reaction/FlyingReaction';
import useInterval from '@/hooks/useInterval';


type Props ={
  canvasRef:React.MutableRefObject<HTMLCanvasElement | null >
}

const Live = ({canvasRef}:Props) => {
  const others = useOthers();
  const [{ cursor }, updateMyPresence] = useMyPresence() as any;
  const [cursorState, setCursorState] = useState<CursorState>({
    mode: CursorMode.Hidden,
  });

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();

      if (cursor == null || cursorState.mode !== CursorMode.ReactionSelector) {
        const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
        const y = event.clientY - event.currentTarget.getBoundingClientRect().y;
        updateMyPresence({ cursor: { x, y } });
      }
    },
    [cursor, cursorState.mode, updateMyPresence]
  );

  const [reaction, setReaction] = useState<Reaction[]>([]);

  const broadcast = useBroadcastEvent();

  useInterval(() =>{
    setReaction((reaction) => reaction.filter((r)=> r.timestamp > Date.now() - 4000
    ))
  },1000)

  useInterval(() => {
    if (cursorState.mode === CursorMode.Reaction && cursorState.isPressed && cursor) {
      setReaction((reactions) =>
        reactions.concat([
          {
            point: { x: cursor.x, y: cursor.y },
            value: cursorState.reaction,
            timestamp: Date.now(),
          },
        ])
      )
      broadcast({
        x:cursor.x,
        y:cursor.y,
        value:cursorState.reaction
    })
    }
  }, 100);

  useEventListener((eventData) => {
    const event=eventData.event as ReactionEvent;
    setReaction((reactions) =>
        reactions.concat([
          {
            point: { x: event.x, y: event.y },
            value: event.value,
            timestamp: Date.now(),
          },
        ])
      )

  })

  const handlePointerLeave = useCallback(() => {
    setCursorState({ mode: CursorMode.Hidden });
    updateMyPresence({ cursor: null, message: null });
  }, [updateMyPresence]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
      const y = event.clientY - event.currentTarget.getBoundingClientRect().y;
      updateMyPresence({ cursor: { x, y } });
      setCursorState((state: CursorState) =>
        state.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state
      );
    },
    [cursorState.mode, updateMyPresence]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      setCursorState((state: CursorState) =>
        state.mode === CursorMode.Reaction ? { ...state, isPressed: false } : state
      );
    },
    [cursorState.mode]
  );

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === '/') {
        setCursorState({
          mode: CursorMode.Chat,
          previousMessage: null,
          message: '',
        });
      } else if (e.key === 'Escape') {
        updateMyPresence({ message: '' });
        setCursorState({ mode: CursorMode.Hidden });
      } else if (e.key === 'e') {
        setCursorState({
          mode: CursorMode.ReactionSelector,
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        e.preventDefault();
      }
    };

    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [updateMyPresence]);

  const setReactions = useCallback(
    (reaction: string) => {
      setCursorState({ mode: CursorMode.Reaction, reaction, isPressed: false });
    },
    [setCursorState]
  );

  return (
    <div
      className="h-full w-full flex justify-center items-center text-center"
      id="canvas"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <canvas   ref={canvasRef} className='h-full w-full'/>
      {reaction.map((r) => (
        <FlyingReaction
          key={r.timestamp.toString()}
          x={r.point.x}
          y={r.point.y}
          timestamp={r.timestamp}
          value={r.value}
        />
      ))}

      {cursor && (
        <CursorChat
          cursor={cursor}
          cursorState={cursorState}
          setCursorState={setCursorState}
          updateMyPresence={updateMyPresence}
        />
      )}
      {cursorState.mode === CursorMode.ReactionSelector && (
        <ReactionSelector setReaction={setReactions} />
      )}
      <LiveCursors others={others} />
    </div>
  );
};

export default Live;
