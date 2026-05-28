// 修复 expo prebuild 生成的 Gradle 版本兼容性问题
// 解决: SoftwareComponent 'release'、AGP/Gradle 版本、publishing 配置
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');

// ======= 1. 修复 android/build.gradle — 锁定 AGP 版本 =======
const buildGradlePath = path.join(androidDir, 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');
buildGradle = buildGradle.replace(
  /com\.android\.tools\.build:gradle:[^\n"']*/g,
  'com.android.tools.build:gradle:8.5.2'
);
fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
console.log('[OK] build.gradle — AGP 锁定为 8.5.2');

// ======= 2. 修复 gradle-wrapper.properties — 锁定 Gradle 8.7 =======
const wrapperPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
let wrapper = fs.readFileSync(wrapperPath, 'utf-8');
wrapper = wrapper.replace(
  /distributionUrl=.*/,
  'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip'
);
fs.writeFileSync(wrapperPath, wrapper, 'utf-8');
console.log('[OK] gradle-wrapper.properties — Gradle 锁定为 8.7');

// ======= 3. 修复 android/app/build.gradle — 解决 SoftwareComponent 错误 =======
// AGP 8.x 需要 publishing 配置，否则访问 components.release 会报错
const appGradlePath = path.join(androidDir, 'app', 'build.gradle');
let appGradle = fs.readFileSync(appGradlePath, 'utf-8');

// 在 android { 块内添加 publishing 配置（插入到 android { 下一行）
// 只在文件末尾以 afterEvaluate 形式添加，避免破坏已有结构
const publishingFix = `
// [自动修复] 解决 AGP 8.x 的 "unknown property release" 错误
afterEvaluate {
    publishing {
        singleVariant("release") {}
    }
}
`;

// 只在还没有这个修复代码时才添加
if (!appGradle.includes('singleVariant("release")')) {
  appGradle = appGradle + publishingFix;
}
fs.writeFileSync(appGradlePath, appGradle, 'utf-8');
console.log('[OK] app/build.gradle — 添加 publishing 配置');

// ======= 4. 修复 gradle.properties — 启用必要选项 =======
const propsPath = path.join(androidDir, 'gradle.properties');
if (fs.existsSync(propsPath)) {
  let props = fs.readFileSync(propsPath, 'utf-8');
  const additions = [
    'android.defaults.buildfeatures.buildconfig=true',
    'android.nonTransitiveRClass=true',
    'android.useAndroidX=true',
  ];
  for (const line of additions) {
    if (!props.includes(line)) {
      props += '\n' + line;
    }
  }
  fs.writeFileSync(propsPath, props, 'utf-8');
  console.log('[OK] gradle.properties — 添加必要选项');
}

console.log('\n=== Gradle 配置修复完成 ===');
