// 修复 expo prebuild 生成的 Gradle 兼容性问题
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');

// ======= 1. AGP 8.5.2 + Kotlin 1.9.24 =======
const buildGradlePath = path.join(androidDir, 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');

// 锁定 AGP 版本
buildGradle = buildGradle.replace(
  /com\.android\.tools\.build:gradle:[^\n"']*/g,
  'com.android.tools.build:gradle:8.5.2'
);
// 锁定 Kotlin 版本
buildGradle = buildGradle.replace(
  /org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^\n"']*/g,
  'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'
);

// 添加全局 subprojects 补丁（如果还没有）
const subprojectsPatch = `
// ===== 全局兼容性补丁 =====
subprojects {
    afterEvaluate { project ->
        // 修复1: "unknown property release" (AGP 8.x 要求)
        if (project.hasProperty('android')) {
            try {
                project.android {
                    publishing {
                        singleVariant("release") {
                            withSourcesJar()
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        // 修复2: expo-module-gradle-plugin 找不到仓库
        project.repositories {
            google()
            mavenCentral()
            gradlePluginPortal()
        }
    }
}
// ===========================
`;

if (!buildGradle.includes('全局兼容性补丁')) {
  buildGradle = buildGradle + subprojectsPatch;
}

fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
console.log('[OK] build.gradle — AGP 8.5.2 + Kotlin 1.9.24 + subprojects 兼容补丁');

// ======= 2. Gradle wrapper 锁定 8.7 =======
const wrapperPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
let wrapper = fs.readFileSync(wrapperPath, 'utf-8');
wrapper = wrapper.replace(
  /distributionUrl=.*/,
  'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip'
);
fs.writeFileSync(wrapperPath, wrapper, 'utf-8');
console.log('[OK] gradle-wrapper.properties — Gradle 锁定为 8.7');

// ======= 3. gradle.properties 必要选项 =======
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
