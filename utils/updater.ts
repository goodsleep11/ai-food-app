import { Alert, Linking, Platform } from 'react-native';

const GITHUB_REPO = 'goodsleep11/ai-food-app';
const CURRENT_VERSION = '1.0.0';

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  changelog: string;
}

/**
 * 检查 GitHub Releases 是否有新版本
 * 返回 null 表示已是最新，否则返回新版本信息
 */
export async function checkForUpdate(): Promise<ReleaseInfo | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    );

    if (!response.ok) return null;

    const release = await response.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');

    if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
      const apkAsset = release.assets?.find(
        (a: any) => a.name?.endsWith('.apk')
      );
      return {
        version: latestVersion,
        downloadUrl: apkAsset?.browser_download_url || release.html_url,
        changelog: release.body || '暂无更新日志',
      };
    }

    return null;
  } catch {
    return null; // 网络问题静默失败
  }
}

/**
 * 显示更新提示
 */
export function showUpdatePrompt(release: ReleaseInfo) {
  Alert.alert(
    `发现新版本 v${release.version}`,
    `当前版本: v${CURRENT_VERSION}\n\n更新内容:\n${release.changelog.slice(0, 200)}`,
    [
      { text: '稍后再说', style: 'cancel' },
      {
        text: '立即更新',
        onPress: () => {
          Linking.openURL(release.downloadUrl);
        },
      },
    ]
  );
}

/**
 * 简易版本号比较 (支持 x.y.z 格式)
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
