import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onImageCaptured: (base64: string) => void;
}

/**
 * 相机 / 相册选择模态框
 * 支持实时拍照和从相册选取，自动压缩图片到 1024px 宽以内
 */
export default function CameraModal({ visible, onClose, onImageCaptured }: CameraModalProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [loading, setLoading] = useState(false);

  // ---- 拍照 ----
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (photo?.base64) {
        const compressed = await compressImage(photo.base64);
        onImageCaptured(compressed);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('拍照失败', err.message || '请重试');
    } finally {
      setLoading(false);
    }
  };

  // ---- 从相册选择 ----
  const handlePickFromGallery = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('需要相册权限', '请在设置中允许访问相册以选择食物图片');
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const compressed = await compressImage(result.assets[0].base64);
        onImageCaptured(compressed);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('选取图片失败', err.message || '请重试');
    } finally {
      setLoading(false);
    }
  };

  // ---- 切换前后摄像头 ----
  const toggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // ---- 权限未授权时显示 ----
  if (!permission) {
    return null; // 权限状态加载中
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>需要相机权限</Text>
          <Text style={styles.permissionDesc}>AI 食物识别助手需要使用相机来拍摄食物照片</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>授予相机权限</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
            <Text style={styles.galleryBtnText}>从相册选择</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>返回</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ---- 相机界面 ----
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>处理中...</Text>
          </View>
        )}

        {/* 相机预览 */}
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          {/* 顶部操作栏 */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeBtnCircle} onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.flipBtn} onPress={toggleFacing}>
              <Text style={styles.flipIcon}>🔄</Text>
            </TouchableOpacity>
          </View>

          {/* 底部操作栏 */}
          <View style={styles.bottomBar}>
            {/* 相册按钮 */}
            <TouchableOpacity style={styles.galleryCircle} onPress={handlePickFromGallery}>
              <Text style={styles.galleryIconText}>🖼️</Text>
            </TouchableOpacity>

            {/* 拍照按钮 - 大圆 */}
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.7}>
              <View style={styles.captureInner} />
            </TouchableOpacity>

            {/* 占位保持对称 */}
            <View style={styles.placeholder} />
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

/**
 * 压缩图片：限制最大宽度 1024px，转 base64
 */
async function compressImage(base64: string): Promise<string> {
  try {
    // 先将 base64 写入临时文件
    const tempFile = FileSystem.cacheDirectory + `temp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempFile, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 使用 ImageManipulator 压缩
    const result = await ImageManipulator.manipulateAsync(
      tempFile,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // 清理临时文件
    FileSystem.deleteAsync(tempFile, { idempotent: true }).catch(() => {});

    return result.base64 || base64;
  } catch {
    // 压缩失败则返回原图
    return base64;
  }
}

// ==================== 样式 ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  // 顶部栏
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  closeBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  flipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipIcon: {
    fontSize: 18,
  },
  // 底部栏
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 30,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  galleryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryIconText: {
    fontSize: 22,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFF',
  },
  placeholder: {
    width: 48,
  },
  // 加载遮罩
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
  },
  // 权限页面
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  closeBtn: {
    paddingVertical: 12,
  },
  closeBtnText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});
