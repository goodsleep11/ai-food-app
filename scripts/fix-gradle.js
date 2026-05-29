// 修复 expo prebuild 生成的 Gradle 兼容性问题
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidDir = path.join(__dirname, '..', 'android');
const rootDir = path.join(__dirname, '..');

// ============================================================
// 1. 移除所有 expo 模块中对 expo-module-gradle-plugin 的引用
//    （该插件在 npm 包中缺失，直接替换为手动的函数调用）
// ============================================================
function removePluginRefs(dir) {
  const files = findGradleFiles(dir);
  let count = 0;
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    if (content.includes("id 'expo-module-gradle-plugin'") || content.includes('id "expo-module-gradle-plugin"')) {
      // 替换插件引用为直接 apply from + 函数调用
      // 替换整个 plugins 块中的 expo-module-gradle-plugin
      // 策略：删掉这行，然后在 plugins 块外面加上需要的函数调用
      content = content.replace(/  id ['"]expo-module-gradle-plugin['"]\n/, '');
      // 在最后一个 } 后面追加函数调用（plugins 块的结束）
      const appendCode = `
apply from: new File(project.rootProject.projectDir, '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle')
applyKotlinExpoModulesCorePlugin()
useDefaultAndroidSdkVersions()
useExpoPublishing()
useCoreDependencies()`;
      if (!content.includes('applyKotlinExpoModulesCorePlugin')) {
        // 在 android {} 或 dependencies {} 之前插入
        content = content.replace(/(\n(group|android|dependencies)\s*\{)/, appendCode + '\n$1');
      }
      fs.writeFileSync(file, content, 'utf-8');
      count++;
    }
  }
  if (count > 0) {
    console.log(`[OK] 移除 ${count} 个 expo 模块的 expo-module-gradle-plugin 引用`);
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
  } catch (e) { /* skip inaccessible dirs */ }
  return results;
}

// 扫描 node_modules 中的所有 expo 模块
removePluginRefs(path.join(rootDir, 'node_modules'));

// ============================================================
// 2. settings.gradle — 移除 includeBuild("./expo-module-gradle-plugin")
//    （因为不再需要了）
// ============================================================
const settingsPath = path.join(androidDir, 'settings.gradle');
let settings = fs.readFileSync(settingsPath, 'utf-8');
const pluginIncludeLine = 'includeBuild("./expo-module-gradle-plugin")';
if (settings.includes(pluginIncludeLine)) {
  settings = settings.replace(pluginIncludeLine + '\n    ', '');
  settings = settings.replace(pluginIncludeLine, '');
  fs.writeFileSync(settingsPath, settings, 'utf-8');
  console.log('[OK] settings.gradle — 移除 expo-module-gradle-plugin includeBuild');
}

// ============================================================
// 3. 根 build.gradle — 锁定版本 + gradlePluginPortal
// ============================================================
const buildGradlePath = path.join(androidDir, 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');

buildGradle = buildGradle.replace(
  /com\.android\.tools\.build:gradle(:[^\n"']*)?/g,
  'com.android.tools.build:gradle:8.3.0'
);
buildGradle = buildGradle.replace(
  /org\.jetbrains\.kotlin:kotlin-gradle-plugin(:[^\n"']*)?/g,
  'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'
);

if (!buildGradle.includes('gradlePluginPortal()')) {
  buildGradle = buildGradle.replace(
    /(allprojects\s*\{[^}]*repositories\s*\{)/,
    '$1\n        gradlePluginPortal()'
  );
}

const globalPatch = `
// ===== 兼容性补丁（Gradle 8.7 兼容） =====
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
// =============================================
`;

if (!buildGradle.includes('gradle.projectsEvaluated')) {
  buildGradle += globalPatch;
}

fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
console.log('[OK] build.gradle — AGP 8.3.0 + Kotlin 1.9.24');

// ============================================================
// 4. Gradle wrapper 锁定 8.7
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
// 5. gradle.properties
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
// 6. 修补 ExpoModulesCorePlugin.gradle — SoftwareComponent try-catch
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
