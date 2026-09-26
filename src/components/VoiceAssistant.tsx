import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { pcmToBase64, playAudioChunk } from '../lib/audioUtils.js';

export const VoiceAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>('Ready to start');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsActive(false);
    setStatus('Session ended');
  };

  const startSession = async () => {
    setErrorMsg(null);
    setStatus('Connecting to Gemini 3.8 Live API...');

    try {
      // 1. WebSocket protocol determination
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 2. Audio contexts: 16kHz for input mic, 24kHz for Live API output
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      startTimeRef.current = 0;

      ws.onopen = async () => {
        setStatus('Live connected! Listening to microphone...');
        setIsActive(true);

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true
            }
          });
          mediaStreamRef.current = stream;

          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const base64 = pcmToBase64(inputData);
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };
        } catch (micErr: any) {
          setErrorMsg('Microphone access denied or failed: ' + micErr.message);
          stopSession();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setErrorMsg(data.error);
          }
          if (data.interrupted) {
            startTimeRef.current = 0;
          }
          if (data.audio && outputAudioCtxRef.current) {
            playAudioChunk(outputAudioCtxRef.current, data.audio, startTimeRef);
          }
        } catch (e) {
          console.error('Audio message parse error', e);
        }
      };

      ws.onerror = (e) => {
        console.error('Live WS error', e);
        setErrorMsg('WebSocket connection to Live API failed');
        stopSession();
      };

      ws.onclose = () => {
        setIsActive(false);
      };
    } catch (err: any) {
      setErrorMsg('Failed to initialize voice session: ' + err.message);
      stopSession();
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isActive
              ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isActive ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold">Gemini Live Voice (gemini-3.8-live)</h4>
            {isActive && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{status}</p>
          {errorMsg && (
            <p className="text-xs text-rose-400 flex items-center space-x-1 mt-0.5">
              <AlertCircle className="w-3 h-3" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>
      </div>

      <button
        onClick={isActive ? stopSession : startSession}
        className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
          isActive
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
        }`}
      >
        {isActive ? (
          <>
            <MicOff className="w-3.5 h-3.5" />
            <span>Stop Voice</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            <span>Start Conversation</span>
          </>
        )}
      </button>
    </div>
  );
};
