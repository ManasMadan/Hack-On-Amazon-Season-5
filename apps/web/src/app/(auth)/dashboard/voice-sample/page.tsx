"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Label } from "@repo/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { useCustomSession } from "@/hooks/useCustomSession";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Plus,
  Trash2,
  ArrowLeft,
  Volume2,
  CheckCircle,
  XCircle,
  Upload,
  Shield,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import Link from "next/link";
import { Progress } from "@repo/ui/progress";

export default function VoiceSamplePage() {
  const { data: session } = useCustomSession();
  const trpc = useTRPC();

  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{
    blob: Blob;
    url: string;
    base64: string;
  } | null>(null);
  const [testAudio, setTestAudio] = useState<{
    blob: Blob;
    url: string;
    base64: string;
  } | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [isTestRecording, setIsTestRecording] = useState(false);
  const [testRecordingTime, setTestRecordingTime] = useState(0);
  const [testMediaRecorder, setTestMediaRecorder] =
    useState<MediaRecorder | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const testRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const {
    data: voiceSamples,
    refetch: refetchVoiceSamples,
    isPending: voiceSamplesLoading,
  } = useQuery(trpc.voiceAuth.listVoiceSamples.queryOptions());

  const { data: voiceStats, refetch: refetchVoiceStats } = useQuery(
    trpc.voiceAuth.getVoiceAuthStats.queryOptions()
  );

  // Mutations
  const { mutateAsync: addVoiceSample, isPending: isAddingVoiceSample } =
    useMutation(
      trpc.voiceAuth.addVoiceSample.mutationOptions({
        onSuccess: () => {
          refetchVoiceSamples();
          refetchVoiceStats();
        },
      })
    );

  const { mutateAsync: deleteVoiceSample, isPending: isDeletingVoiceSample } =
    useMutation(
      trpc.voiceAuth.deleteVoiceSample.mutationOptions({
        onSuccess: () => {
          refetchVoiceSamples();
          refetchVoiceStats();
        },
      })
    );

  const { mutateAsync: testVoiceAuth, isPending: isTestingVoice } = useMutation(
    trpc.voiceAuth.testVoiceAuthentication.mutationOptions()
  );

  // Recording utilities
  const startRecording = async (isTest = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Check if the browser supports the desired format
      const options = {
        mimeType: "audio/wav",
        audioBitsPerSecond: 16000,
      };

      // Fallback if wav is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "audio/webm;codecs=opus";
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: options.mimeType });

        // Convert to WAV with 16kHz if not already
        const wavBlob = await convertToWav16k(blob);
        const url = URL.createObjectURL(wavBlob);
        const base64 = await blobToBase64(wavBlob);

        if (isTest) {
          setTestAudio({ blob: wavBlob, url, base64 });
        } else {
          setRecordedAudio({ blob: wavBlob, url, base64 });
        }

        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();

      if (isTest) {
        setTestMediaRecorder(recorder);
        setIsTestRecording(true);
        setTestRecordingTime(0);
        testRecordingTimerRef.current = setInterval(() => {
          setTestRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      }
    } catch (error) {
      toast.error("Failed to access microphone");
    }
  };

  const convertToWav16k = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      const fileReader = new FileReader();
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Resample to 16kHz if needed
          const targetSampleRate = 16000;
          let resampledBuffer = audioBuffer;

          if (audioBuffer.sampleRate !== targetSampleRate) {
            const offlineContext = new OfflineAudioContext(
              1, // mono
              audioBuffer.duration * targetSampleRate,
              targetSampleRate
            );

            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();

            resampledBuffer = await offlineContext.startRendering();
          }

          // Convert to WAV
          const wavBuffer = audioBufferToWav(resampledBuffer);
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

          audioContext.close();
          resolve(wavBlob);
        } catch (error) {
          audioContext.close();
          reject(error);
        }
      };

      fileReader.onerror = () => reject(fileReader.error);
      fileReader.readAsArrayBuffer(blob);
    });
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = buffer.getChannelData(0);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    // Convert samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const value = channelData[i] ?? 0;
      const sample = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return arrayBuffer;
  };

  const stopRecording = (isTest = false) => {
    if (isTest) {
      if (testMediaRecorder) {
        testMediaRecorder.stop();
        setTestMediaRecorder(null);
      }
      setIsTestRecording(false);
      if (testRecordingTimerRef.current) {
        clearInterval(testRecordingTimerRef.current);
      }
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1] ?? "";
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handlers
  const handleAddVoiceSample = async () => {
    if (!recordedAudio) {
      toast.error("Please record an audio sample first");
      return;
    }

    try {
      await addVoiceSample({
        audioBase64: recordedAudio.base64,
        filename: `voice_sample_${Date.now()}.wav`,
      });
      setIsAddDialogOpen(false);
      setRecordedAudio(null);
      setRecordingTime(0);
      toast.success("Voice sample added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add voice sample");
    }
  };

  const handleDeleteVoiceSample = async (minioPath: string) => {
    try {
      await deleteVoiceSample({ minioPath });
      toast.success("Voice sample deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete voice sample");
    }
  };

  const handleTestVoiceAuth = async () => {
    if (!testAudio) {
      toast.error("Please record a test audio sample first");
      return;
    }

    try {
      const result = await testVoiceAuth({
        audioBase64: testAudio.base64,
        filename: `test_voice_${Date.now()}.wav`,
      });

      if (result.authenticated) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      setIsTestDialogOpen(false);
      setTestAudio(null);
      setTestRecordingTime(0);
    } catch (error: any) {
      toast.error(error.message || "Failed to test voice authentication");
    }
  };

  const playAudio = (url: string, id: string) => {
    if (audioRef.current) {
      if (isPlaying === id) {
        audioRef.current.pause();
        setIsPlaying(null);
      } else {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(id);
        audioRef.current.onended = () => setIsPlaying(null);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (testRecordingTimerRef.current)
        clearInterval(testRecordingTimerRef.current);
    };
  }, []);

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        Please log in to manage voice samples.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Voice Authentication</h1>
          <p className="text-muted-foreground">
            Manage your voice samples for secure authentication
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Volume2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Samples</p>
                <p className="text-2xl font-bold">
                  {voiceStats?.totalSamples || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">
                  {voiceStats?.isRegistered ? "Registered" : "Not Registered"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Can Authenticate
                </p>
                <p className="text-lg font-semibold">
                  {voiceStats?.canAuthenticate ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Voice Sample
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Voice Sample</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                {!recordedAudio ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      <Button
                        onClick={() =>
                          isRecording ? stopRecording() : startRecording()
                        }
                        variant={isRecording ? "destructive" : "default"}
                        size="lg"
                        className="w-24 h-24 rounded-full"
                      >
                        {isRecording ? (
                          <MicOff className="h-8 w-8" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </Button>
                      <div>
                        <p className="font-semibold">
                          {isRecording ? "Recording..." : "Ready to Record"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(recordingTime)}
                        </p>
                      </div>
                    </div>
                    {isRecording && (
                      <div className="space-y-2">
                        <Progress
                          value={(recordingTime / 30) * 100}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Speak clearly for 5-30 seconds
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={() => playAudio(recordedAudio.url, "recorded")}
                        variant="outline"
                        size="sm"
                      >
                        {isPlaying === "recorded" ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-sm">
                        Recording ready ({formatTime(recordingTime)})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setRecordedAudio(null);
                          setRecordingTime(0);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Re-record
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAddVoiceSample}
                  disabled={!recordedAudio || isAddingVoiceSample}
                  className="flex-1"
                >
                  {isAddingVoiceSample ? "Adding..." : "Add Sample"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setRecordedAudio(null);
                    setRecordingTime(0);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!voiceStats?.canAuthenticate}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Test Authentication
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Test Voice Authentication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                {!testAudio ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      <Button
                        onClick={() =>
                          isTestRecording
                            ? stopRecording(true)
                            : startRecording(true)
                        }
                        variant={isTestRecording ? "destructive" : "default"}
                        size="lg"
                        className="w-24 h-24 rounded-full"
                      >
                        {isTestRecording ? (
                          <MicOff className="h-8 w-8" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </Button>
                      <div>
                        <p className="font-semibold">
                          {isTestRecording ? "Recording..." : "Ready to Test"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(testRecordingTime)}
                        </p>
                      </div>
                    </div>
                    {isTestRecording && (
                      <div className="space-y-2">
                        <Progress
                          value={(testRecordingTime / 30) * 100}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Speak the same phrase as your samples
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={() => playAudio(testAudio.url, "test")}
                        variant="outline"
                        size="sm"
                      >
                        {isPlaying === "test" ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-sm">
                        Test recording ready ({formatTime(testRecordingTime)})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setTestAudio(null);
                          setTestRecordingTime(0);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Re-record
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleTestVoiceAuth}
                  disabled={!testAudio || isTestingVoice}
                  className="flex-1"
                >
                  {isTestingVoice ? "Testing..." : "Test Authentication"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsTestDialogOpen(false);
                    setTestAudio(null);
                    setTestRecordingTime(0);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Voice Samples List */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Samples</CardTitle>
          <CardDescription>
            Your registered voice samples for authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {voiceSamplesLoading ? (
              <div className="text-center py-8">Loading voice samples...</div>
            ) : !voiceSamples?.samples || voiceSamples.samples.length === 0 ? (
              <div className="text-center py-8">
                <Volume2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No voice samples found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add your first voice sample to enable voice authentication
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Voice Sample
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {voiceSamples.samples.map((sample: string, index: number) => (
                  <div
                    key={sample}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Volume2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          Voice Sample #{index + 1}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {sample.split("/").pop()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          playAudio(
                            `${process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "http://localhost:9000"}/voice-auth/${sample}`,
                            sample
                          )
                        }
                      >
                        {isPlaying === sample ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteVoiceSample(sample)}
                        disabled={isDeletingVoiceSample}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Tips for Better Voice Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • Record in a quiet environment with minimal background noise
            </li>
            <li>• Speak clearly and at a normal pace</li>
            <li>• Use the same phrase consistently across all samples</li>
            <li>• Record at least 3-5 samples for better accuracy</li>
            <li>• Keep recordings between 5-30 seconds long</li>
            <li>• Test authentication regularly to ensure it works properly</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
