// 修复 expo prebuild 生成的 Gradle 兼容性问题
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const rootDir = path.join(__dirname, '..');

// ============================================================
// 1. 移除 expo-font 对 expo-module-gradle-plugin 的引用
//    （该插件 npm 包为空，直接调用核心函数替代）
// ============================================================
function removePluginRefs(dir) {
  const files = findGradleFiles(dir);
  let count = 0;
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    if (content.includes("id 'expo-module-gradle-plugin'") || content.includes('id "expo-module-gradle-plugin"')) {
      content = content.replace(/  id ['"]expo-module-gradle-plugin['"]\n/, '');
      const appendCode = `
apply from: new File(project.rootProject.projectDir, '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle')
applyKotlinExpoModulesCorePlugin()
useDefaultAndroidSdkVersions()
useExpoPublishing()
useCoreDependencies()`;
      if (!content.includes('applyKotlinExpoModulesCorePlugin')) {
        content = content.replace(/(\n(group|android|dependencies)\s*\{)/, appendCode + '\n$1');
      }
      fs.writeFileSync(file, content, 'utf-8');
      count++;
    }
  }
  if (count > 0) {
    console.log(`[OK] 移除 ${count} 个 expo 模块对 expo-module-gradle-plugin 的引用`);
  }
}

function findGradleFiles(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === 'node_modules') continue;
      if (entry.isDirectory()) {
        results = results.concat(findGradleFiles(fullPath));
      } else if (entry.name === 'build.gradle' || entry.name === 'build.gradle.kts') {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

removePluginRefs(path.join(rootDir, 'node_modules'));

// ============================================================
// 2. 根 build.gradle — 添加 gradlePluginPortal（不锁版本，用默认的）
// ============================================================
const buildGradlePath = path.join(androidDir, 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');

// 只加 gradlePluginPortal，不锁 AGP/Kotlin 版本
if (!buildGradle.includes('gradlePluginPortal()')) {
  buildGradle = buildGradle.replace(
    /(allprojects\s*\{[^}]*repositories\s*\{)/,
    '$1\n        gradlePluginPortal()'
  );
}

// 全局兜底补丁：给所有 Android 子模块加 publishing 配置
const globalPatch = `
// ===== 兼容性补丁 =====
gradle.projectsEvaluated {
    subprojects { proj ->
        if (proj.hasProperty('android')) {
            try {
                proj.android {
                    publishing {
                        singleVariant('release') {
                            withSourcesJar()
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}
// ======================
`;

if (!buildGradle.includes('gradle.projectsEvaluated')) {
  buildGradle += globalPatch;
}

fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
console.log('[OK] build.gradle — gradlePluginPortal + 兜底补丁');

// ============================================================
// 3. Gradle wrapper 锁定 8.7
// ============================================================
const wrapperPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
let wrapper = fs.readFileSync(wrapperPath, 'utf-8');
wrapper = wrapper.replace(
  /distributionUrl=.*/,
  'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip'
);
fs.writeFileSync(wrapperPath, wrapper, 'utf-8');
console.log('[OK] gradle-wrapper.properties — Gradle 8.7');

// ============================================================
// 4. gradle.properties
// ============================================================
const propsPath = path.join(androidDir, 'gradle.properties');
if (fs.existsSync(propsPath)) {
  let props = fs.readFileSync(propsPath, 'utf-8');
  for (const line of ['android.useAndroidX=true', 'android.nonTransitiveRClass=true']) {
    if (!props.includes(line)) {
      props += '\n' + line;
    }
  }
  fs.writeFileSync(propsPath, props, 'utf-8');
  console.log('[OK] gradle.properties');
}

// ============================================================
// 5. 修补 ExpoModulesCorePlugin.gradle — SoftwareComponent try-catch
// ============================================================
const corePluginPath = path.join(rootDir, 'node_modules', 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle');
if (fs.existsSync(corePluginPath)) {
  let corePlugin = fs.readFileSync(corePluginPath, 'utf-8');

  const svOld = `      singleVariant("release") {
        withSourcesJar()
      }`;
  const svNew = `      try {
        singleVariant("release") {
          withSourcesJar()
        }
      } catch (Exception ignored) {}`;
  if (corePlugin.includes(svOld)) {
    corePlugin = corePlugin.replace(svOld, svNew);
  }

  const frOld = '          from components.release';
  const frNew = '          try {\n            from components.release\n          } catch (Exception ignored) {}';
  if (corePlugin.includes(frOld) && !corePlugin.includes(frNew)) {
    corePlugin = corePlugin.replace(frOld, frNew);
  }

  fs.writeFileSync(corePluginPath, corePlugin, 'utf-8');
  console.log('[OK] ExpoModulesCorePlugin.gradle — SoftwareComponent try-catch');
}

console.log('\n=== Gradle 配置修复完成 ===');
