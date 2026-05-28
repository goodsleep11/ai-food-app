// 修复 expo prebuild 生成的 Gradle 兼容性问题
// 所有补丁兼容 Gradle 8.7+，不使用 afterEvaluate 避免时序冲突
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');

// ======= 1. 根 build.gradle =======
const buildGradlePath = path.join(androidDir, 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');

// 锁定版本
buildGradle = buildGradle.replace(
  /com\.android\.tools\.build:gradle:[^\n"']*/g,
  'com.android.tools.build:gradle:8.3.0'
);
buildGradle = buildGradle.replace(
  /org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^\n"']*/g,
  'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'
);

// 给 allprojects 加 gradlePluginPortal（修复 expo-module-gradle-plugin 找不到）
buildGradle = buildGradle.replace(
  /(allprojects\s*\{[^}]*repositories\s*\{[^}]*)(mavenLocal\(\))/,
  '$1gradlePluginPortal()\n        $2'
);

// 全局补丁：gradle.projectsEvaluated 替代 afterEvaluate（兼容 Gradle 8.7）
const globalPatch = `
// ===== 全局兼容性补丁（Gradle 8.7 兼容） =====
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
  buildGradle = buildGradle.replace(/\n$/, '') + '\n' + globalPatch;
}

fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
console.log('[OK] build.gradle — AGP 8.3.0 + Kotlin 1.9.24 + gradle.projectsEvaluated 补丁');

// ======= 2. Gradle wrapper 锁定 8.7 =======
const wrapperPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
let wrapper = fs.readFileSync(wrapperPath, 'utf-8');
wrapper = wrapper.replace(
  /distributionUrl=.*/,
  'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip'
);
fs.writeFileSync(wrapperPath, wrapper, 'utf-8');
console.log('[OK] gradle-wrapper.properties — Gradle 锁定为 8.7');

// ======= 3. gradle.properties 补充选项 =======
const propsPath = path.join(androidDir, 'gradle.properties');
if (fs.existsSync(propsPath)) {
  let props = fs.readFileSync(propsPath, 'utf-8');
  const additions = [
    'android.useAndroidX=true',
    'android.nonTransitiveRClass=true',
  ];
  for (const line of additions) {
    if (!props.includes(line)) {
      props += '\n' + line;
    }
  }
  fs.writeFileSync(propsPath, props, 'utf-8');
  console.log('[OK] gradle.properties — 补充必要选项');
}

console.log('\n=== Gradle 配置修复完成 ===');
