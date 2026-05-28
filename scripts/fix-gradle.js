// 修复 expo prebuild 生成的 Gradle 兼容性问题
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const rootDir = path.join(__dirname, '..');

// ============================================================
// 1. 创建 expo-module-gradle-plugin 复合构建（缺失会导致所有 expo 模块编译失败）
// ============================================================
const pluginDir = path.join(androidDir, 'expo-module-gradle-plugin');
if (!fs.existsSync(pluginDir)) {
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'src', 'main', 'resources', 'META-INF', 'gradle-plugins'), { recursive: true });
  const groovyDir = path.join(pluginDir, 'src', 'main', 'groovy', 'expo', 'module', 'gradle');
  fs.mkdirSync(groovyDir, { recursive: true });

  fs.writeFileSync(path.join(pluginDir, 'settings.gradle'), '', 'utf-8');

  fs.writeFileSync(path.join(pluginDir, 'build.gradle'), `
apply plugin: 'groovy'

dependencies {
  implementation gradleApi()
  implementation localGroovy()
}
`.trim(), 'utf-8');

  fs.writeFileSync(
    path.join(pluginDir, 'src', 'main', 'resources', 'META-INF', 'gradle-plugins', 'expo-module-gradle-plugin.properties'),
    'implementation-class=expo.module.gradle.ExpoModuleGradlePlugin',
    'utf-8'
  );

  fs.writeFileSync(path.join(groovyDir, 'ExpoModuleGradlePlugin.groovy'), `
package expo.module.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project

class ExpoModuleGradlePlugin implements Plugin<Project> {
  void apply(Project project) {
    def corePluginFile = new File(
      project.rootProject.findProject(':expo-modules-core')?.projectDir?.absolutePath
        ?: project.rootProject.projectDir.absolutePath + '/node_modules/expo-modules-core',
      'android/ExpoModulesCorePlugin.gradle'
    )

    if (corePluginFile.exists()) {
      project.apply from: corePluginFile
      try { project.plugins.apply('kotlin-android') } catch (Exception ignored) {}
      if (project.hasProperty('android')) {
        try { project.ext.useDefaultAndroidSdkVersions() } catch (Exception ignored) {}
      }
      try { project.ext.useExpoPublishing() } catch (Exception ignored) {}
      try { project.ext.useCoreDependencies() } catch (Exception ignored) {}
    }
  }
}
`.trim(), 'utf-8');

  console.log('[OK] 创建 expo-module-gradle-plugin 复合构建');
}

// ============================================================
// 2. settings.gradle — 只插入一行 includeBuild
// ============================================================
const settingsPath = path.join(androidDir, 'settings.gradle');
let settings = fs.readFileSync(settingsPath, 'utf-8');

const includeBuildLine = 'includeBuild("./expo-module-gradle-plugin")';
if (!settings.includes(includeBuildLine)) {
  settings = settings.replace(
    'pluginManagement {',
    'pluginManagement {\n    ' + includeBuildLine
  );
  fs.writeFileSync(settingsPath, settings, 'utf-8');
  console.log('[OK] settings.gradle — 引入 expo-module-gradle-plugin');
}

// ============================================================
// 3. 根 build.gradle — 锁定 AGP + Kotlin + gradlePluginPortal
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
// 6. 修补 ExpoModulesCorePlugin.gradle — components.release 不存在导致崩溃
// ============================================================
const corePluginPath = path.join(rootDir, 'node_modules', 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle');
if (fs.existsSync(corePluginPath)) {
  let corePlugin = fs.readFileSync(corePluginPath, 'utf-8');

  // 包裹 singleVariant("release") { withSourcesJar() } ✅ try-catch
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

  // 包裹 from components.release ✅ try-catch
  const frOld = '          from components.release';
  const frNew = '          try {\n            from components.release\n          } catch (Exception ignored) {}';
  if (corePlugin.includes(frOld) && !corePlugin.includes(frNew)) {
    corePlugin = corePlugin.replace(frOld, frNew);
  }

  fs.writeFileSync(corePluginPath, corePlugin, 'utf-8');
  console.log('[OK] ExpoModulesCorePlugin.gradle — SoftwareComponent try-catch 保护');
}

console.log('\n=== Gradle 配置修复完成 ===');
