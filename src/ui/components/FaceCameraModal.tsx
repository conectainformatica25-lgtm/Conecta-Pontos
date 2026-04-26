import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Camera, X, CheckCircle, RefreshCw } from 'lucide-react-native';
import { brandColors } from '../themes/colors.theme';

interface Props {
  visible: boolean;
  mode: 'enroll' | 'login'; // enroll = cadastrar, login = verificar
  employeeName?: string;
  onCapture: (photoBase64: string) => void;
  onClose: () => void;
}

export function FaceCameraModal({ visible, mode, employeeName, onCapture, onClose }: Props) {
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [visible]);

  const startCamera = async () => {
    try {
      setCameraReady(false);
      setError(null);
      setCaptured(false);
      setCapturedImage(null);

      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (e: any) {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(base64);
    setCaptured(true);
    stopCamera();
  };

  const retake = () => {
    setCaptured(false);
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Camera size={22} color={brandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {mode === 'enroll' ? 'Cadastrar Rosto' : 'Verificar Rosto'}
              </Text>
              {employeeName && (
                <Text style={styles.headerSub}>{employeeName}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Instrução */}
          <Text style={styles.instruction}>
            {!cameraReady && !error && !captured ? '🔄 Abrindo câmera...' :
             error ? `❌ ${error}` :
             captured ? '✅ Foto capturada! Confira abaixo.' :
             mode === 'enroll'
               ? '📸 Posicione seu rosto no centro e clique em Capturar'
               : '📸 Posicione seu rosto no centro para verificar'}
          </Text>

          {/* Área da câmera */}
          <View style={styles.cameraArea}>
            {/* Guia oval do rosto */}
            <View style={styles.faceGuide} pointerEvents="none" />

            {!captured ? (
              // @ts-ignore — elemento nativo HTML no contexto web
              <video
                ref={videoRef}
                style={styles.video as any}
                autoPlay
                playsInline
                muted
              />
            ) : (
              capturedImage && (
                // @ts-ignore
                <img
                  src={capturedImage}
                  style={{ ...styles.video, objectFit: 'cover' } as any}
                  alt="Foto capturada"
                />
              )
            )}

            {/* Canvas oculto para captura */}
            {/* @ts-ignore */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </View>

          {/* Botões */}
          <View style={styles.actions}>
            {!captured ? (
              <TouchableOpacity
                style={[styles.btn, !cameraReady && styles.btnDisabled]}
                onPress={capturePhoto}
                disabled={!cameraReady}
              >
                <Camera size={20} color="#fff" />
                <Text style={styles.btnText}>Capturar Foto</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={retake}>
                  <RefreshCw size={18} color={brandColors.primary} />
                  <Text style={[styles.btnText, { color: brandColors.primary }]}>Repetir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={confirm}>
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.btnText}>
                    {mode === 'enroll' ? 'Confirmar Cadastro' : 'Confirmar Login'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {error && (
            <TouchableOpacity onPress={startCamera} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar Novamente</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 24, width: '90%', maxWidth: 560,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: brandColors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4 },
  instruction: {
    fontSize: 14, color: '#4b5563', textAlign: 'center',
    marginBottom: 16, lineHeight: 20,
  },
  cameraArea: {
    width: '100%', aspectRatio: 4 / 3,
    backgroundColor: '#111',
    borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  video: {
    width: '100%', height: '100%',
    position: 'absolute', top: 0, left: 0,
  } as any,
  faceGuide: {
    position: 'absolute', zIndex: 10,
    width: 200, height: 260,
    borderRadius: 100,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
  },
  actions: {
    flexDirection: 'row', gap: 12, marginTop: 20,
  },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: brandColors.primary,
    paddingVertical: 14, borderRadius: 12,
  },
  btnSecondary: {
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  retryBtn: {
    marginTop: 12, alignItems: 'center', padding: 10,
  },
  retryText: { color: brandColors.primary, fontSize: 14, fontWeight: '600' },
});
